import Dexie, { Table } from 'dexie';
import { supabase, isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import { Memory, GrowthData, ChildProfile, Reminder, Story, AppSetting } from '../types';
import { uploadManager } from './uploadManager';
import { syncManager } from './syncManager';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export type LittleMomentsDB = Dexie & {
  memories: Table<Memory>;
  stories: Table<Story>;
  growth: Table<GrowthData>;
  profiles: Table<ChildProfile>;
  reminders: Table<Reminder>;
  app_settings: Table<AppSetting>;
  cloud_photo_cache: Table<{ url: string; userId: string; base64data: string; timestamp: number }>;
};

const db = new Dexie('LittleMomentsDB') as LittleMomentsDB;

// Helper to convert file URIs to displayable sources for the webview
export const getImageSrc = (src?: string) => {
    if (!src) return undefined;
    if (src.startsWith('file://') && Capacitor.isNativePlatform()) {
        return Capacitor.convertFileSrc(src);
    }
    return src; // Works for http, data:, and blob: URLs
};

db.version(6).stores({
  memories: 'id, childId, date, synced',
  stories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced',
  reminders: 'id, date, synced',
  app_settings: 'key'
});

db.version(7).stores({
  memories: 'id, [childId+is_deleted], date, synced',
  stories: 'id, [childId+is_deleted], date, synced',
  growth: 'id, [childId+is_deleted], month, synced',
  profiles: 'id, name, synced, is_deleted',
  reminders: 'id, date, synced, is_deleted',
  app_settings: 'key'
}).upgrade(tx => {
  const tables = ['memories', 'stories', 'growth', 'profiles', 'reminders'];
  return Promise.all(tables.map(tableName => 
    tx.table(tableName).toCollection().modify(item => {
      if (item.is_deleted === undefined) {
        item.is_deleted = 0;
      }
    })
  ));
});

// Version 8: Add compound indexes for sync performance
db.version(8).stores({
  memories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  stories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  growth: 'id, [childId+is_deleted], month, synced, [is_deleted+synced], [synced+is_deleted]',
  profiles: 'id, name, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
  reminders: 'id, date, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
});

// Version 9: Add table for cloud photo caching
db.version(9).stores({
  cloud_photo_cache: 'url, userId, timestamp'
});

// Version 10: Add is_placeholder to profiles to manage temporary local profiles
db.version(10).stores({
  profiles: 'id, name, synced, is_deleted, is_placeholder, [is_deleted+synced], [synced+is_deleted]',
});


export { db };

export const initDB = async () => {
  try {
      if (!db.isOpen()) {
        await db.open();
      }
      return { success: true };
  } catch (err: any) {
      console.error("Failed to open db:", err);
      return { success: false, error: err.message || 'Unknown DB Error' };
  }
};

const cleanForSync = (doc: any) => {
    const { synced, is_deleted, is_placeholder, ...rest } = doc;
    return rest;
};

const uploadFileToSupabase = async (file: File, userId: string, childId: string, tag: string, itemId: string, imageIndex: number): Promise<string> => {
    uploadManager.start(file.name);
    
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${itemId}_${imageIndex}.${fileExt}`;
    const filePath = `${userId}/${childId}/${tag}/${fileName}`;

    const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        uploadManager.error();
        throw error;
    }

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    
    if (!data.publicUrl) {
        uploadManager.error();
        throw new Error("Failed to get public URL.");
    }
    
    uploadManager.progress(100, file.name);
    uploadManager.finish();
    
    return data.publicUrl;
};

const syncDeletions = async () => {
    const tables = ['memories', 'stories', 'growth', 'profiles', 'reminders'];
    const supabaseTables: { [key: string]: string } = {
        memories: 'memories',
        stories: 'stories',
        growth: 'growth_data',
        profiles: 'child_profile',
        reminders: 'reminders',
    };
    
    for (const tableName of tables) {
        const itemsToDelete = await db.table(tableName).where({ is_deleted: 1, synced: 0 }).toArray();
        for (const item of itemsToDelete) {
            const { error } = await supabase.from(supabaseTables[tableName]).delete().eq('id', item.id);
            if (!error) {
                await db.table(tableName).delete(item.id);
            }
        }
    }
};

export const syncData = async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) return { success: false, reason: 'Offline or Unconfigured' };

    try {
        // FIX: Replaced async 'getSession' (v2) with sync 'session' (v1).
        const session = supabase.auth.session();
        if (!session) return { success: false, reason: 'No Active Session' };
        const userId = session.user.id;

        await syncDeletions();

        const unsyncedStories = await db.stories.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedMemories = await db.memories.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedGrowth = await db.growth.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedProfiles = await db.profiles.where({synced: 0, is_deleted: 0}).filter(p => !p.is_placeholder).toArray();
        const unsyncedReminders = await db.reminders.where({synced: 0, is_deleted: 0}).toArray();

        const totalToSync = unsyncedStories.length + unsyncedMemories.length + unsyncedGrowth.length + unsyncedProfiles.length + unsyncedReminders.length;
        if (totalToSync > 0) syncManager.start(totalToSync);
        
        let errors: string[] = [];
        
        // --- START OF FIX: Reorder sync operations ---
        
        // 1. Sync Profiles FIRST to avoid foreign key violations
        for (const p of unsyncedProfiles) {
            try {
                let profileToSync = { ...p };
                if (Capacitor.isNativePlatform() && profileToSync.profileImage && profileToSync.profileImage.startsWith('file://')) {
                    const fileData = await Filesystem.readFile({ path: profileToSync.profileImage });
                    const blob = await(await fetch(`data:image/jpeg;base64,${fileData.data}`)).blob();
                    const file = new File([blob], "profile.jpeg", { type: 'image/jpeg' });
                    const newUrl = await uploadFileToSupabase(file, userId, p.id!, 'profile', p.id!, 0);
                    await db.profiles.update(p.id!, { profileImage: newUrl });
                    profileToSync.profileImage = newUrl;
                }
                const payload = { ...cleanForSync(profileToSync), user_id: userId };
                const { error } = await supabase.from('child_profile').upsert(payload);
                if (error) throw error;
                await db.profiles.update(p.id!, { synced: 1 });
                syncManager.itemCompleted();
            } catch (error: any) {
                console.error(`Sync failed for profile ${p.id}:`, error);
                errors.push(error.message);
            }
        }

        // 2. Sync Stories
        for (const s of unsyncedStories) {
            try {
                const payload = { ...cleanForSync(s), user_id: userId };
                const { error } = await supabase.from('stories').upsert(payload);
                if (error) throw error;
                await db.stories.update(s.id, { synced: 1 }); 
                syncManager.itemCompleted();
            } catch (error: any) {
                console.error(`Sync failed for story ${s.id}:`, error);
                errors.push(error.message);
            }
        }

        // 3. Sync Memories (Upload images if needed)
        for (const mem of unsyncedMemories) {
            try {
                let memoryToSync = { ...mem };
                if (Capacitor.isNativePlatform() && memoryToSync.imageUrls && memoryToSync.imageUrls.some(url => url.startsWith('file://'))) {
                    const newUrls = await Promise.all(memoryToSync.imageUrls.map(async (url, index) => {
                        if (url.startsWith('file://')) {
                            const fileData = await Filesystem.readFile({ path: url });
                            const blob = await(await fetch(`data:image/jpeg;base64,${fileData.data}`)).blob();
                            const file = new File([blob], "upload.jpeg", { type: 'image/jpeg' });
                            return await uploadFileToSupabase(file, userId, memoryToSync.childId, 'memories', memoryToSync.id, index);
                        }
                        return url;
                    }));
                    await db.memories.update(mem.id, { imageUrls: newUrls });
                    memoryToSync.imageUrls = newUrls;
                }
                
                const supabasePayload: any = { ...cleanForSync(memoryToSync), user_id: userId };
                if (supabasePayload.imageUrls && supabasePayload.imageUrls.length > 0) {
                    supabasePayload.imageUrl = supabasePayload.imageUrls[0];
                }
                delete supabasePayload.imageUrls;

                const { error } = await supabase.from('memories').upsert(supabasePayload);
                if (error) throw error;
                await db.memories.update(mem.id, { synced: 1 });
                syncManager.itemCompleted();
            } catch (error: any) {
                console.error(`Sync failed for memory ${mem.id}:`, error);
                errors.push(error.message);
            }
        }

        // 4. Sync Growth
        for (const g of unsyncedGrowth) {
            try {
                const payload = { ...cleanForSync(g), user_id: userId };
                const { error } = await supabase.from('growth_data').upsert(payload);
                if (error) throw error;
                await db.growth.update(g.id!, { synced: 1 }); 
                syncManager.itemCompleted();
            } catch (error: any) {
                console.error(`Sync failed for growth data ${g.id}:`, error);
                errors.push(error.message);
            }
        }

        // 5. Sync Reminders
        for (const r of unsyncedReminders) {
            try {
                const payload = { ...cleanForSync(r), user_id: userId };
                const { error } = await supabase.from('reminders').upsert(payload);
                if (error) throw error;
                await db.reminders.update(r.id, { synced: 1 }); 
                syncManager.itemCompleted();
            } catch (error: any) {
                console.error(`Sync failed for reminder ${r.id}:`, error);
                errors.push(error.message);
            }
        }
        
        // --- END OF FIX ---

        if (totalToSync > 0) {
            if (errors.length > 0) syncManager.error();
            else syncManager.finish();
        }

        // Pull remote changes
        const { data: pData } = await supabase.from('child_profile').select('*');
        if (pData) {
            if (pData.length > 0) {
                const localPlaceholders = await db.profiles.where({ is_placeholder: true }).toArray();
                if (localPlaceholders.length > 0) {
                    const placeholderIds = localPlaceholders.map(p => p.id!);
                    await db.profiles.bulkDelete(placeholderIds);
                }
            }
            await db.profiles.bulkPut(pData.map(p => ({ ...p, synced: 1, is_deleted: 0, is_placeholder: false })));
        }
        const { data: sData } = await supabase.from('stories').select('*');
        if (sData) await db.stories.bulkPut(sData.map(s => ({ ...s, synced: 1, is_deleted: 0 })));
        const { data: gData } = await supabase.from('growth_data').select('*');
        if (gData) await db.growth.bulkPut(gData.map(g => ({ ...g, synced: 1, is_deleted: 0 })));
        const { data: rData } = await supabase.from('reminders').select('*');
        if (rData) await db.reminders.bulkPut(rData.map(r => ({ ...r, synced: 1, is_deleted: 0 })));
        const { data: mData } = await supabase.from('memories').select('*');
        if (mData) {
            await db.memories.bulkPut(mData.map(m => {
                const imageUrls = m.imageUrl ? [m.imageUrl] : [];
                return { ...m, imageUrls, synced: 1, is_deleted: 0 };
            }));
        }

        return { success: errors.length === 0 };
    } catch (err: any) {
        syncManager.error();
        return { success: false, error: err.message };
    }
};

export const fetchServerProfiles = async (): Promise<ChildProfile[]> => {
    if (!isSupabaseConfigured() || !navigator.onLine) return [];
    try {
        // FIX: Replaced async 'getSession' (v2) with sync 'session' (v1).
        const session = supabase.auth.session();
        if (!session) return [];
        const { data: pData, error } = await supabase.from('child_profile').select('*');
        if (error) {
            console.error("Error fetching profiles directly:", error);
            return [];
        }
        return pData || [];
    } catch (e) {
        console.error("Exception fetching profiles:", e);
        return [];
    }
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const createActionHandler = <T,>(localAction: (arg: T) => Promise<any>) => {
    return async (arg: T) => {
        const result = await localAction(arg);
        syncData().catch(err => console.error("Background sync failed", err));
        return { success: true, data: result };
    };
};

const createDeleteHandler = (tableName: string, supabaseTable: string, fileCleanup?: (id: string) => Promise<void>) => {
    return async (id: string): Promise<{ success: boolean; error?: any }> => {
        try {
            if (Capacitor.isNativePlatform() && fileCleanup) {
                await fileCleanup(id).catch(e => console.warn("File cleanup failed during deletion:", e));
            }

            if (isSupabaseConfigured() && navigator.onLine) {
                const { error } = await supabase.from(supabaseTable).delete().eq('id', id);
                if (error) throw error;
                await db.table(tableName).delete(id);
            } else {
                await db.table(tableName).update(id, { is_deleted: 1, synced: 0 });
            }
            return { success: true };
        } catch (error) {
            await db.table(tableName).update(id, { is_deleted: 1, synced: 0 });
            console.error(`Direct delete from ${tableName} failed, marked for sync:`, error);
            return { success: false, error };
        }
    };
};

const memoryFileCleanup = async (id: string) => {
    const memory = await db.memories.get(id);
    if (memory?.imageUrls) {
        for (const url of memory.imageUrls) {
            if (url.startsWith('file://')) {
                await Filesystem.deleteFile({ path: url });
            }
        }
    }
};

const profileFileCleanup = async (id: string) => {
    const profile = await db.profiles.get(id);
    if (profile?.profileImage?.startsWith('file://')) {
        await Filesystem.deleteFile({ path: profile.profileImage });
    }
};

export const DataService = {
    getSetting: async (key: string) => await db.app_settings.get(key),
    saveSetting: async (key: string, value: any) => await db.app_settings.put({ key, value }),
    removeSetting: async (key: string) => await db.app_settings.delete(key),
    clearAllUserData: async () => {
        await db.transaction('rw', [db.memories, db.stories, db.growth, db.profiles, db.reminders, db.cloud_photo_cache, db.app_settings], async () => {
            await db.memories.clear();
            await db.stories.clear();
            await db.growth.clear();
            await db.profiles.clear();
            await db.reminders.clear();
            await db.cloud_photo_cache.clear();
            // Clear all settings except the Gemini API key
            const settingsToKeep = await db.app_settings.where('key').equals('geminiApiKey').toArray();
            await db.app_settings.clear();
            if (settingsToKeep.length > 0) {
                await db.app_settings.bulkPut(settingsToKeep);
            }
        });

        if (Capacitor.isNativePlatform()) {
            try {
                const { files } = await Filesystem.readdir({ path: '', directory: Directory.Data });
                for (const file of files) {
                    if (file.name.endsWith('.jpeg')) {
                        await Filesystem.deleteFile({ path: file.name, directory: Directory.Data });
                    }
                }
            } catch (e) {
                console.warn("Could not clear app data directory", e);
            }
        }
    },

    uploadImage: async (file: File) => await blobToBase64(file),

    getMemories: async (childId?: string) => {
        const query = childId ? db.memories.where({ childId, is_deleted: 0 }) : db.memories.where('is_deleted').equals(0);
        const mems = await query.sortBy('date');
        return mems.reverse();
    },
    addMemory: createActionHandler(async (memory: Memory) => db.memories.put({ ...memory, synced: 0, is_deleted: 0 })),
    deleteMemory: createDeleteHandler('memories', 'memories', memoryFileCleanup),

    getStories: async (childId?: string) => {
        const query = childId ? db.stories.where({ childId, is_deleted: 0 }) : db.stories.where('is_deleted').equals(0);
        return (await query.sortBy('date')).reverse();
    },
    addStory: createActionHandler(async (story: Story) => db.stories.put({ ...story, synced: 0, is_deleted: 0 })),
    deleteStory: createDeleteHandler('stories', 'stories'),

    getGrowth: async (childId?: string) => {
        const query = childId ? db.growth.where({ childId, is_deleted: 0 }) : db.growth.where('is_deleted').equals(0);
        return await query.sortBy('month');
    },
    saveGrowth: createActionHandler(async (data: GrowthData) => db.growth.put({ ...data, synced: 0, is_deleted: 0 })),
    deleteGrowth: createDeleteHandler('growth', 'growth_data'),
    
    getProfiles: async () => await db.profiles.where('is_deleted').equals(0).toArray(),
    saveProfile: createActionHandler(async (profile: ChildProfile) => db.profiles.put({ ...profile, synced: 0, is_deleted: 0 })),
    deleteProfile: createDeleteHandler('profiles', 'child_profile', profileFileCleanup),

    getReminders: async () => await db.reminders.where('is_deleted').equals(0).sortBy('date'),
    saveReminder: createActionHandler(async (reminder: Reminder) => db.reminders.put({ ...reminder, synced: 0, is_deleted: 0 })),
    deleteReminder: createDeleteHandler('reminders', 'reminders'),

    getCloudPhotos: async (userId: string, childId: string): Promise<string[]> => {
        if (!navigator.onLine || !isSupabaseConfigured() || !userId || !childId) {
            return [];
        }
        
        try {
            const memoriesPath = `${userId}/${childId}/memories`;
            const profilePath = `${userId}/${childId}/profile`;
            const urls: string[] = [];

            const { data: memoriesList, error: memoriesError } = await supabase.storage.from('images').list(memoriesPath);
            if (memoriesError && memoriesError.message !== 'The resource was not found') {
                console.error(`Supabase storage error listing memories at path ${memoriesPath}:`, memoriesError);
            }

            const { data: profileList, error: profileError } = await supabase.storage.from('images').list(profilePath);
            if (profileError && profileError.message !== 'The resource was not found') {
                console.error(`Supabase storage error listing profile photos at path ${profilePath}:`, profileError);
            }
            
            if (memoriesList) {
                for (const file of memoriesList) {
                    if (file.name !== '.emptyFolderPlaceholder') {
                        const { data } = supabase.storage.from('images').getPublicUrl(`${memoriesPath}/${file.name}`);
                        if (data.publicUrl) urls.push(data.publicUrl);
                    }
                }
            }
            
            if (profileList) {
                for (const file of profileList) {
                    if (file.name !== '.emptyFolderPlaceholder') {
                        const { data } = supabase.storage.from('images').getPublicUrl(`${profilePath}/${file.name}`);
                        if (data.publicUrl) urls.push(data.publicUrl);
                    }
                }
            }
            
            return urls;
        } catch (error) {
            console.error("Failed to fetch cloud photos due to an unexpected error:", error);
            return [];
        }
    },
    
    deleteCloudPhoto: async (photoUrl: string): Promise<{ success: boolean; error?: any }> => {
        if (!isSupabaseConfigured()) return { success: false, error: new Error("Supabase not configured.") };
        try {
            const url = new URL(photoUrl);
            const pathSegments = url.pathname.split('/');
            const bucketName = 'images';
            
            const bucketIndex = pathSegments.findIndex(segment => segment === bucketName);
    
            if (bucketIndex === -1) {
                throw new Error(`Invalid Supabase storage URL: bucket '${bucketName}' not found in path: ${url.pathname}`);
            }
    
            const filePath = pathSegments.slice(bucketIndex + 1).join('/');
    
            if (!filePath) {
                 throw new Error("Could not extract file path from URL.");
            }
            
            const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    
            if (error) {
                console.error("Supabase storage delete error:", error);
                throw error;
            }
    
            await DataService.deleteCachedPhoto(photoUrl);
            
            return { success: true };
        } catch (error: any) {
            console.error("Failed to delete cloud photo:", error);
            return { success: false, error };
        }
    },

    getCachedPhoto: async (url: string) => {
        return await db.cloud_photo_cache.get(url);
    },
    cachePhoto: async (url: string, userId: string, base64data: string) => {
        await db.cloud_photo_cache.put({ url, userId, base64data, timestamp: Date.now() });
    },
    deleteCachedPhoto: async (url: string) => {
        await db.cloud_photo_cache.delete(url);
    }
};