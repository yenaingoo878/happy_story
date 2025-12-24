import Dexie, { Table } from 'dexie';
import { supabase, isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import { Memory, GrowthData, ChildProfile, Reminder, Story, AppSetting } from '../types';
import { uploadManager } from './uploadManager';
import { syncManager } from './syncManager';

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
    const { synced, is_deleted, ...rest } = doc;
    return rest;
};

const uploadFileToSupabase = async (file: File, userId: string, childId: string, tag: string): Promise<string> => {
    uploadManager.start(file.name);
    
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, reason: 'No Active Session' };
        const userId = session.user.id;

        await syncDeletions();

        const unsyncedStories = await db.stories.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedMemories = await db.memories.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedGrowth = await db.growth.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedProfiles = await db.profiles.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedReminders = await db.reminders.where({synced: 0, is_deleted: 0}).toArray();

        const totalToSync = unsyncedStories.length + unsyncedMemories.length + unsyncedGrowth.length + unsyncedProfiles.length + unsyncedReminders.length;
        if (totalToSync > 0) syncManager.start(totalToSync);
        
        let errors: string[] = [];

        // Sync Stories
        for (const s of unsyncedStories) {
            const { error } = await supabase.from('stories').upsert(cleanForSync(s));
            if (!error) { await db.stories.update(s.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(error.message);
        }

        // Sync Memories (Upload images if needed)
        for (const mem of unsyncedMemories) {
            try {
                let memoryToSync = { ...mem };
                if (memoryToSync.imageUrls && memoryToSync.imageUrls.some(url => url.startsWith('data:image'))) {
                    const newUrls = await Promise.all(memoryToSync.imageUrls.map(async (url) => {
                        if (url.startsWith('data:image')) {
                            const res = await fetch(url);
                            const blob = await res.blob();
                            const file = new File([blob], "upload.jpg", { type: blob.type });
                            return await uploadFileToSupabase(file, userId, memoryToSync.childId, 'memories');
                        }
                        return url;
                    }));
                    await db.memories.update(mem.id, { imageUrls: newUrls });
                    memoryToSync.imageUrls = newUrls;
                }
                
                const supabasePayload: any = { ...cleanForSync(memoryToSync) };
                if (supabasePayload.imageUrls && supabasePayload.imageUrls.length > 0) {
                    supabasePayload.imageUrl = supabasePayload.imageUrls[0];
                }
                delete supabasePayload.imageUrls;

                const { error } = await supabase.from('memories').upsert(supabasePayload);
                if (error) throw error;
                await db.memories.update(mem.id, { synced: 1 });
                syncManager.itemCompleted();
            } catch (error: any) {
                errors.push(error.message);
            }
        }

        // Sync Growth
        for (const g of unsyncedGrowth) {
            const { error } = await supabase.from('growth_data').upsert(cleanForSync(g));
            if (!error) { await db.growth.update(g.id!, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(error.message);
        }

        // Sync Profiles (Upload image if needed)
        for (const p of unsyncedProfiles) {
            try {
                let profileToSync = { ...p };
                if (profileToSync.profileImage && profileToSync.profileImage.startsWith('data:image')) {
                    const res = await fetch(profileToSync.profileImage);
                    const blob = await res.blob();
                    const file = new File([blob], "profile.jpg", { type: blob.type });
                    const newUrl = await uploadFileToSupabase(file, userId, p.id!, 'profile');
                    await db.profiles.update(p.id!, { profileImage: newUrl });
                    profileToSync.profileImage = newUrl;
                }
                const { error } = await supabase.from('child_profile').upsert(cleanForSync(profileToSync));
                if (error) throw error;
                await db.profiles.update(p.id!, { synced: 1 });
                syncManager.itemCompleted();
            } catch (error: any) {
                errors.push(error.message);
            }
        }

        // Sync Reminders
        for (const r of unsyncedReminders) {
            const { error } = await supabase.from('reminders').upsert(cleanForSync(r));
            if (!error) { await db.reminders.update(r.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(error.message);
        }

        if (totalToSync > 0) {
            if (errors.length > 0) syncManager.error();
            else syncManager.finish();
        }

        // Pull remote changes
        const { data: pData } = await supabase.from('child_profile').select('*');
        if (pData) await db.profiles.bulkPut(pData.map(p => ({ ...p, synced: 1, is_deleted: 0 })));
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

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const DataService = {
    getSetting: async (key: string) => await db.app_settings.get(key),
    saveSetting: async (key: string, value: any) => await db.app_settings.put({ key, value }),
    removeSetting: async (key: string) => await db.app_settings.delete(key),
    clearAllUserData: async () => {
        await db.transaction('rw', [db.memories, db.stories, db.growth, db.profiles, db.reminders, db.cloud_photo_cache], async () => {
            await db.memories.clear();
            await db.stories.clear();
            await db.growth.clear();
            await db.profiles.clear();
            await db.reminders.clear();
            await db.cloud_photo_cache.clear();
        });
    },

    uploadImage: async (file: File) => await blobToBase64(file),

    getMemories: async (childId?: string) => {
        const query = childId ? db.memories.where({ childId, is_deleted: 0 }) : db.memories.where('is_deleted').equals(0);
        const mems = await query.sortBy('date');
        return mems.reverse();
    },
    addMemory: async (memory: Memory) => await db.memories.put({ ...memory, synced: 0, is_deleted: 0 }),
    deleteMemory: async (id: string) => await db.memories.update(id, { is_deleted: 1, synced: 0 }),

    getStories: async (childId?: string) => {
        const query = childId ? db.stories.where({ childId, is_deleted: 0 }) : db.stories.where('is_deleted').equals(0);
        return (await query.sortBy('date')).reverse();
    },
    addStory: async (story: Story) => await db.stories.put({ ...story, synced: 0, is_deleted: 0 }),
    deleteStory: async (id: string) => await db.stories.update(id, { is_deleted: 1, synced: 0 }),

    getGrowth: async (childId?: string) => {
        const query = childId ? db.growth.where({ childId, is_deleted: 0 }) : db.growth.where('is_deleted').equals(0);
        return await query.sortBy('month');
    },
    saveGrowth: async (data: GrowthData) => await db.growth.put({ ...data, synced: 0, is_deleted: 0 }),
    deleteGrowth: async (id: string) => await db.growth.update(id, { is_deleted: 1, synced: 0 }),
    
    getProfiles: async () => await db.profiles.where('is_deleted').equals(0).toArray(),
    saveProfile: async (profile: ChildProfile) => await db.profiles.put({ ...profile, synced: 0, is_deleted: 0 }),
    deleteProfile: async (id: string) => await db.profiles.update(id, { is_deleted: 1, synced: 0 }),

    getReminders: async () => await db.reminders.where('is_deleted').equals(0).sortBy('date'),
    saveReminder: async (reminder: Reminder) => await db.reminders.put({ ...reminder, synced: 0, is_deleted: 0 }),
    deleteReminder: async (id: string) => await db.reminders.update(id, { is_deleted: 1, synced: 0 }),

    getCloudPhotos: async (userId: string, childId: string): Promise<string[]> => {
        if (!navigator.onLine || !isSupabaseConfigured() || !userId || !childId) {
            console.warn("getCloudPhotos prerequisites not met:", {
                isOnline: navigator.onLine,
                isConfigured: isSupabaseConfigured(),
                userIdProvided: !!userId,
                childIdProvided: !!childId,
            });
            return [];
        }
        
        try {
            const memoriesPath = `${userId}/${childId}/memories`;
            const profilePath = `${userId}/${childId}/profile`;
            const urls: string[] = [];

            const { data: memoriesList, error: memoriesError } = await supabase.storage.from('images').list(memoriesPath);
            if (memoriesError) {
                console.error(`Supabase storage error listing memories at path ${memoriesPath}:`, memoriesError);
            }

            const { data: profileList, error: profileError } = await supabase.storage.from('images').list(profilePath);
            if (profileError) {
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
    
    deleteCloudPhoto: async (photoUrl: string): Promise<{ success: boolean; error?: Error }> => {
        if (!isSupabaseConfigured()) return { success: false, error: new Error("Supabase not configured.") };
        try {
            const url = new URL(photoUrl);
            const pathParts = url.pathname.split('/images/');
            if (pathParts.length < 2) {
                throw new Error("Invalid photo URL format.");
            }
            const filePath = pathParts[1];
            
            const { error } = await supabase.storage.from('images').remove([filePath]);
            if (error) throw error;

            await DataService.deleteCachedPhoto(photoUrl);
            
            return { success: true };
        } catch (error: any) {
            console.error("Failed to delete cloud photo:", error);
            return { success: false, error };
        }
    },

    // New Caching Methods
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