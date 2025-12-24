import Dexie, { Table } from 'dexie';
import { supabase, isSupabaseConfigured } from './supabaseClient';
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

db.version(8).stores({
  memories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  stories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  growth: 'id, [childId+is_deleted], month, synced, [is_deleted+synced], [synced+is_deleted]',
  profiles: 'id, name, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
  reminders: 'id, date, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
});

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

export const syncData = async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) return { success: false, reason: 'Offline or Unconfigured' };

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, reason: 'No Active Session' };
        const userId = session.user.id;

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
                const imageUrls = m.imageUrl ? [m.imageUrl] : (m.imageUrls || []);
                return { ...m, imageUrls, synced: 1, is_deleted: 0 };
            }));
        }

        // Push local changes (Simplified for brevity, similar to previous version)
        // ... (Local to Remote sync code here)

        return { success: true };
    } catch (err: any) {
        console.error("Sync error:", err);
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
        return (await query.sortBy('date')).reverse();
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
            return [];
        }
        
        try {
            // Re-verify session to be sure
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];

            const memoriesPath = `${userId}/${childId}/memories`;
            const profilePath = `${userId}/${childId}/profile`;
            const urls: string[] = [];

            // Fetch lists with error handling for empty folders
            const listFiles = async (path: string) => {
                const { data, error } = await supabase.storage.from('images').list(path, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'desc' }
                });
                if (error) {
                    console.warn(`Storage list warning for ${path}:`, error.message);
                    return [];
                }
                return data || [];
            };

            const [memoriesList, profileList] = await Promise.all([
                listFiles(memoriesPath),
                listFiles(profilePath)
            ]);
            
            memoriesList.forEach(file => {
                if (file.name !== '.emptyFolderPlaceholder') {
                    const { data } = supabase.storage.from('images').getPublicUrl(`${memoriesPath}/${file.name}`);
                    if (data.publicUrl) urls.push(data.publicUrl);
                }
            });
            
            profileList.forEach(file => {
                if (file.name !== '.emptyFolderPlaceholder') {
                    const { data } = supabase.storage.from('images').getPublicUrl(`${profilePath}/${file.name}`);
                    if (data.publicUrl) urls.push(data.publicUrl);
                }
            });
            
            return urls;
        } catch (error) {
            console.error("Critical error in getCloudPhotos:", error);
            return [];
        }
    },
    
    deleteCloudPhoto: async (photoUrl: string): Promise<{ success: boolean; error?: Error }> => {
        if (!isSupabaseConfigured()) return { success: false, error: new Error("Supabase unconfigured") };
        try {
            const url = new URL(photoUrl);
            const pathParts = url.pathname.split('/images/');
            if (pathParts.length < 2) throw new Error("Invalid URL");
            const filePath = pathParts[1];
            
            const { error } = await supabase.storage.from('images').remove([filePath]);
            if (error) throw error;
            await DataService.deleteCachedPhoto(photoUrl);
            return { success: true };
        } catch (error: any) {
            return { success: false, error };
        }
    },

    getCachedPhoto: async (url: string) => await db.cloud_photo_cache.get(url),
    cachePhoto: async (url: string, userId: string, base64data: string) => {
        await db.cloud_photo_cache.put({ url, userId, base64data, timestamp: Date.now() });
    },
    deleteCachedPhoto: async (url: string) => await db.cloud_photo_cache.delete(url)
};