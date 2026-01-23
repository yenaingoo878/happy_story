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
};

const DB_NAME = 'LittleMomentsDB';
const db = new Dexie(DB_NAME) as LittleMomentsDB;

export const getImageSrc = (src?: string) => {
    if (!src) return undefined;
    
    // If it's already a data URL (base64) or a web URL (http/https), return as is
    if (src.startsWith('data:') || src.startsWith('http')) {
        return src;
    }

    // If it's a file system URI, handle it based on platform
    if (src.startsWith('file://')) {
        if (Capacitor.isNativePlatform()) {
            return Capacitor.convertFileSrc(src);
        } else {
            return undefined;
        }
    }
    
    return src;
};

// Database Schema Definitions
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

db.version(8).stores({
  memories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  stories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  growth: 'id, [childId+is_deleted], month, synced, [is_deleted+synced], [synced+is_deleted]',
  profiles: 'id, name, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
  reminders: 'id, date, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
});

export { db };

export const resetDatabase = async () => {
    try {
        await db.delete();
        localStorage.clear();
        window.location.reload();
    } catch (err) {
        console.error("Failed to delete database:", err);
        alert("Could not reset app. Please clear browser storage manually.");
    }
};

export const initDB = async () => {
  try {
      if (!window.indexedDB) {
          throw new Error("Your browser does not support local storage (IndexedDB).");
      }
      
      if (!db.isOpen()) {
        await db.open();
      }
      return { success: true };
  } catch (err: any) {
      console.error("Dexie Open Error Details:", err);
      return { success: false, error: err.message || 'Could not initialize database.', errorName: err.name };
  }
};

const cleanForSync = (doc: any) => {
    const { synced, is_deleted, ...rest } = doc;
    return rest;
};

export const uploadFileToSupabase = async (fileOrBlob: File | Blob, userId: string, childId: string, tag: string, itemId: string, imageIndex: number): Promise<string> => {
    const fileNameSuffix = fileOrBlob instanceof File ? fileOrBlob.name.split('.').pop() : 'jpg';
    const displayName = fileOrBlob instanceof File ? fileOrBlob.name : `image_${imageIndex}.jpg`;
    
    uploadManager.start(displayName);
    
    const fileName = `${itemId}_${imageIndex}_${Date.now()}.${fileNameSuffix}`;
    const filePath = `${userId}/${childId}/${tag}/${fileName}`;

    const { error } = await supabase.storage
        .from('images')
        .upload(filePath, fileOrBlob, {
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
    
    uploadManager.progress(100, displayName);
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
        try {
            const itemsToDelete = await db.table(tableName).where({ is_deleted: 1, synced: 0 }).toArray();
            for (const item of itemsToDelete) {
                const { error } = await supabase.from(supabaseTables[tableName]).delete().eq('id', item.id);
                if (!error) {
                    await db.table(tableName).delete(item.id);
                }
            }
        } catch (e) {
            console.warn(`Deletion sync failed for table ${tableName}:`, e);
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

        for (const s of unsyncedStories) {
            const { error } = await supabase.from('stories').upsert(cleanForSync(s));
            if (!error) { await db.stories.update(s.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(error.message);
        }

        for (const mem of unsyncedMemories) {
            try {
                let memoryToSync = { ...mem };
                // If native and has local files, upload them
                if (Capacitor.isNativePlatform() && memoryToSync.imageUrls && memoryToSync.imageUrls.some(url => url.startsWith('file://'))) {
                    const newUrls = await Promise.all(memoryToSync.imageUrls.map(async (url, index) => {
                        if (url.startsWith('file://')) {
                            const fileData = await Filesystem.readFile({ path: url });
                            const blob = await(await fetch(`data:image/jpeg;base64,${fileData.data}`)).blob();
                            return await uploadFileToSupabase(blob, userId, memoryToSync.childId, 'memories', memoryToSync.id, index);
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

        for (const g of unsyncedGrowth) {
            const { error } = await supabase.from('growth_data').upsert(cleanForSync(g));
            if (!error) { await db.growth.update(g.id!, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(error.message);
        }

        for (const p of unsyncedProfiles) {
            try {
                let profileToSync = { ...p };
                if (Capacitor.isNativePlatform() && profileToSync.profileImage && profileToSync.profileImage.startsWith('file://')) {
                    const fileData = await Filesystem.readFile({ path: profileToSync.profileImage });
                    const blob = await(await fetch(`data:image/jpeg;base64,${fileData.data}`)).blob();
                    const newUrl = await uploadFileToSupabase(blob, userId, p.id!, 'profile', p.id!, 0);
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

        for (const r of unsyncedReminders) {
            const { error } = await supabase.from('reminders').upsert(cleanForSync(r));
            if (!error) { await db.reminders.update(r.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(error.message);
        }

        if (totalToSync > 0) {
            if (errors.length > 0) syncManager.error();
            else syncManager.finish();
        }

        // Pulling updates
        try {
            const { data: pData } = await supabase.from('child_profile').select('*');
            if (pData) await db.profiles.bulkPut(pData.map(p => ({ ...p, synced: 1, is_deleted: 0 })));
        } catch (e) {}

        try {
            const { data: sData } = await supabase.from('stories').select('*');
            if (sData) await db.stories.bulkPut(sData.map(s => ({ ...s, synced: 1, is_deleted: 0 })));
        } catch (e) {}

        try {
            const { data: gData } = await supabase.from('growth_data').select('*');
            if (gData) await db.growth.bulkPut(gData.map(g => ({ ...g, synced: 1, is_deleted: 0 })));
        } catch (e) {}

        try {
            const { data: rData } = await supabase.from('reminders').select('*');
            if (rData) await db.reminders.bulkPut(rData.map(r => ({ ...r, synced: 1, is_deleted: 0 })));
        } catch (e) {}

        try {
            const { data: mData } = await supabase.from('memories').select('*');
            if (mData) {
                await db.memories.bulkPut(mData.map(m => {
                    const imageUrls = m.imageUrl ? [m.imageUrl] : [];
                    return { ...m, imageUrls, synced: 1, is_deleted: 0 };
                }));
            }
        } catch (e) {}

        return { success: errors.length === 0 };
    } catch (err: any) {
        console.error("Critical sync error:", err);
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
        await db.transaction('rw', [db.memories, db.stories, db.growth, db.profiles, db.reminders], async () => {
            await db.memories.clear();
            await db.stories.clear();
            await db.growth.clear();
            await db.profiles.clear();
            await db.reminders.clear();
        });

        if (Capacitor.isNativePlatform()) {
            try {
                const { files } = await Filesystem.readdir({ path: '', directory: Directory.Data });
                for (const file of files) {
                    if (file.name.endsWith('.jpeg')) {
                        await Filesystem.deleteFile({ path: file.name, directory: Directory.Data });
                    }
                }
            } catch (e) {}
        }
    },

    uploadImage: async (file: File) => await blobToBase64(file),

    getMemories: async (childId?: string) => {
        const query = childId ? db.memories.where({ childId, is_deleted: 0 }) : db.memories.where('is_deleted').equals(0);
        const mems = await query.sortBy('date');
        return mems.reverse();
    },
    addMemory: createActionHandler(async (memory: Memory) => db.memories.put({ ...memory, synced: memory.synced || 0, is_deleted: 0 })),
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

    getCloudPhotos: async (userId: string, childId: string) => {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase.storage
            .from('images')
            .list(`${userId}/${childId}/memories`, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
        if (error || !data) return [];
        return data.map(file => {
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(`${userId}/${childId}/memories/${file.name}`);
            return { id: file.id, name: file.name, url: urlData.publicUrl, created_at: file.created_at };
        });
    },

    deleteCloudPhoto: async (userId: string, childId: string, fileName: string) => {
        if (!isSupabaseConfigured()) return;
        await supabase.storage.from('images').remove([`${userId}/${childId}/memories/${fileName}`]);
    }
};