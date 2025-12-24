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

export const syncData = async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) return { success: false, reason: 'Offline or Unconfigured' };

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, reason: 'No Active Session' };
        
        // Simplified Pull/Push logic for reliable cross-profile sync
        const { data: mData } = await supabase.from('memories').select('*');
        if (mData) {
            await db.memories.bulkPut(mData.map(m => ({
                ...m,
                imageUrls: m.imageUrl ? [m.imageUrl] : (m.imageUrls || []),
                synced: 1,
                is_deleted: 0
            })));
        }
        
        const { data: pData } = await supabase.from('child_profile').select('*');
        if (pData) await db.profiles.bulkPut(pData.map(p => ({ ...p, synced: 1, is_deleted: 0 })));

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
        if (!navigator.onLine || !isSupabaseConfigured() || !userId || !childId) return [];
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];

            // We check multiple possible tags used during upload
            const tags = ['memories', 'profile', 'photos'];
            const allUrls: string[] = [];

            const fetchFromTag = async (tag: string) => {
                const path = `${userId}/${childId}/${tag}`;
                const { data, error } = await supabase.storage.from('images').list(path, {
                    limit: 100,
                    sortBy: { column: 'name', order: 'desc' }
                });
                
                if (error) return [];
                return (data || [])
                    .filter(file => file.name !== '.emptyFolderPlaceholder')
                    .map(file => {
                        const { data: urlData } = supabase.storage.from('images').getPublicUrl(`${path}/${file.name}`);
                        return urlData.publicUrl;
                    });
            };

            const results = await Promise.all(tags.map(tag => fetchFromTag(tag)));
            results.forEach(urls => allUrls.push(...urls));
            
            return allUrls;
        } catch (error) {
            console.error("getCloudPhotos Error:", error);
            return [];
        }
    },
    
    deleteCloudPhoto: async (photoUrl: string): Promise<{ success: boolean; error?: Error }> => {
        if (!isSupabaseConfigured()) return { success: false, error: new Error("Supabase unconfigured") };
        try {
            // Robustly extract the file path from the public URL
            // Format: https://[proj].supabase.co/storage/v1/object/public/images/[userId]/[childId]/[tag]/[filename]
            const url = new URL(photoUrl);
            const pathParts = url.pathname.split('/storage/v1/object/public/images/');
            if (pathParts.length < 2) {
                // Try fallback for different URL formats
                const altParts = url.pathname.split('/images/');
                if (altParts.length < 2) throw new Error("Could not parse storage path from URL");
                var filePath = altParts[1];
            } else {
                var filePath = pathParts[1];
            }
            
            // Decodes URL characters (like %20) back to normal text for Supabase API
            const decodedPath = decodeURIComponent(filePath);
            
            const { error } = await supabase.storage.from('images').remove([decodedPath]);
            if (error) throw error;
            
            await DataService.deleteCachedPhoto(photoUrl);
            return { success: true };
        } catch (error: any) {
            console.error("deleteCloudPhoto Error:", error);
            return { success: false, error };
        }
    },

    getCachedPhoto: async (url: string) => await db.cloud_photo_cache.get(url),
    cachePhoto: async (url: string, userId: string, base64data: string) => {
        await db.cloud_photo_cache.put({ url, userId, base64data, timestamp: Date.now() });
    },
    deleteCachedPhoto: async (url: string) => await db.cloud_photo_cache.delete(url)
};