
import Dexie, { Table } from 'dexie';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { isR2Configured, uploadFileToR2, deleteFileFromR2, listObjectsFromR2 } from './r2Client';
import { Memory, GrowthData, ChildProfile, Reminder, Story, AppSetting } from '../types';
import { uploadManager } from './uploadManager';
import { syncManager } from './syncManager';
import { Capacitor } from '@capacitor/core';

export interface CloudCacheItem {
  id: string; 
  childId: string;
  name: string;
  url: string;
  created_at: string;
}

export type LittleMomentsDB = Dexie & {
  memories: Table<Memory>;
  stories: Table<Story>;
  growth: Table<GrowthData>;
  profiles: Table<ChildProfile>;
  reminders: Table<Reminder>;
  app_settings: Table<AppSetting>;
  cloud_cache: Table<CloudCacheItem>;
};

const DB_NAME = 'LittleMomentsDB';
const db = new Dexie(DB_NAME) as LittleMomentsDB;

export const getImageSrc = (src?: string) => {
    if (!src) return undefined;
    if (src.startsWith('data:') || src.startsWith('http')) return src;
    if (src.startsWith('file://')) {
        if (Capacitor.isNativePlatform()) return Capacitor.convertFileSrc(src);
        return undefined;
    }
    return src;
};

// Version 10: Robust schema with clean indexes
db.version(10).stores({
  memories: 'id, childId, date, synced, is_deleted, [childId+is_deleted]',
  stories: 'id, childId, date, synced, is_deleted, [childId+is_deleted]',
  growth: 'id, childId, month, synced, is_deleted, [childId+is_deleted]',
  profiles: 'id, name, synced, is_deleted',
  reminders: 'id, date, synced, is_deleted',
  app_settings: 'key',
  cloud_cache: 'id, childId'
});

export { db };

/** 
 * MAPPER: Converts Cloud (snake_case) to Local (camelCase) and vice versa
 * This is crucial to fix "database error" where fields don't match.
 */
const fieldMapper = {
    toLocal: (item: any) => {
        const local: any = { ...item, synced: 1, is_deleted: 0 };
        // Map common fields
        if (item.child_id) { local.childId = item.child_id; delete local.child_id; }
        if (item.image_urls) { local.imageUrls = item.image_urls; delete local.image_urls; }
        if (item.profile_image) { local.profileImage = item.profile_image; delete local.profile_image; }
        if (item.hospital_name) { local.hospitalName = item.hospital_name; delete local.hospital_name; }
        if (item.blood_type) { local.bloodType = item.blood_type; delete local.blood_type; }
        return local;
    },
    toCloud: (item: any, userId: string) => {
        const cloud: any = { ...item, user_id: userId };
        delete cloud.synced; // Cloud doesn't need this
        // Map common fields
        if (item.childId) { cloud.child_id = item.childId; delete cloud.childId; }
        if (item.imageUrls) { cloud.image_urls = item.imageUrls; delete cloud.imageUrls; }
        if (item.profileImage) { cloud.profile_image = item.profileImage; delete cloud.profileImage; }
        if (item.hospitalName) { cloud.hospital_name = item.hospitalName; delete cloud.hospitalName; }
        if (item.bloodType) { cloud.blood_type = item.bloodType; delete cloud.bloodType; }
        return cloud;
    }
};

export const DataService = {
    getProfiles: () => db.profiles.where({ is_deleted: 0 }).toArray(),
    saveProfile: async (profile: ChildProfile) => {
        profile.is_deleted = 0; profile.synced = 0;
        await db.profiles.put(profile);
    },
    deleteProfile: async (id: string) => { await db.profiles.update(id, { is_deleted: 1, synced: 0 }); },
    getMemories: (childId: string) => db.memories.where({ childId, is_deleted: 0 }).reverse().sortBy('date'),
    addMemory: async (memory: Memory) => {
        memory.is_deleted = 0; memory.synced = 0;
        await db.memories.put(memory);
    },
    deleteMemory: async (id: string) => { await db.memories.update(id, { is_deleted: 1, synced: 0 }); },
    getStories: (childId: string) => db.stories.where({ childId, is_deleted: 0 }).reverse().sortBy('date'),
    addStory: async (story: Story) => {
        story.is_deleted = 0; story.synced = 0;
        await db.stories.put(story);
    },
    deleteStory: async (id: string) => { await db.stories.update(id, { is_deleted: 1, synced: 0 }); },
    getGrowth: (childId: string) => db.growth.where({ childId, is_deleted: 0 }).sortBy('month'),
    saveGrowth: async (growth: GrowthData) => {
        growth.is_deleted = 0; growth.synced = 0;
        await db.growth.put(growth);
    },
    deleteGrowth: async (id: string) => { await db.growth.update(id, { is_deleted: 1, synced: 0 }); },
    getReminders: () => db.reminders.where({ is_deleted: 0 }).toArray(),
    saveReminder: async (reminder: Reminder) => {
        reminder.is_deleted = 0; reminder.synced = 0;
        await db.reminders.put(reminder);
    },
    deleteReminder: async (id: string) => { await db.reminders.update(id, { is_deleted: 1, synced: 0 }); },
    
    getCloudPhotos: async (userId: string, childId: string, onUpdate?: (photos: any[]) => void) => {
        const cached = await db.cloud_cache.where({ childId }).toArray();
        if (cached.length > 0 && onUpdate) onUpdate(cached);
        if (!isR2Configured() || !navigator.onLine) return cached;
        try {
            const freshPhotos = await listObjectsFromR2(`${userId}/${childId}/memories/`);
            await db.cloud_cache.where({ childId }).delete();
            const cacheItems: CloudCacheItem[] = freshPhotos.map(p => ({
                id: p.id || p.url, childId, name: p.name, url: p.url, created_at: p.created_at || new Date().toISOString()
            }));
            await db.cloud_cache.bulkPut(cacheItems);
            if (onUpdate) onUpdate(cacheItems);
            return cacheItems;
        } catch (e) { return cached; }
    },

    deleteCloudPhoto: async (userId: string, childId: string, fileName: string) => {
        if (!isR2Configured()) return { success: false };
        try {
            await deleteFileFromR2(`${userId}/${childId}/memories/${fileName}`);
            await db.cloud_cache.where({ name: fileName, childId }).delete();
            return { success: true };
        } catch (e) { return { success: false }; }
    },

    clearAllUserData: async () => {
        await Promise.all([
            db.memories.clear(), db.stories.clear(), db.growth.clear(), 
            db.profiles.clear(), db.reminders.clear(), db.app_settings.clear(), db.cloud_cache.clear()
        ]);
    }
};

export const initDB = async () => {
    try { if (!db.isOpen()) await db.open(); return { success: true }; } 
    catch (e: any) { return { success: false, error: e.message }; }
};

export const resetDatabase = async () => {
    await db.delete();
    window.location.reload();
};

export const uploadFileToCloud = async (blob: Blob, userId: string, childId: string, folder: string, id: string, index: number) => {
    if (!isR2Configured()) throw new Error("Cloud not configured");
    const path = `${userId}/${childId}/${folder}/${id}_${index}.jpeg`;
    const url = await uploadFileToR2(blob, path);
    await db.cloud_cache.put({ id: path, childId, name: `${id}_${index}.jpeg`, url, created_at: new Date().toISOString() });
    return url;
};

// FULL BIDIRECTIONAL SYNC
export const syncData = async () => {
    if (!isSupabaseConfigured() || !navigator.onLine) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;
    
    syncManager.start(10); // 5 pulls, 5 pushes

    const syncTable = async (tableName: string, dexieTable: Table<any>, supabaseTable: string) => {
        try {
            // 1. PULL FROM CLOUD
            const { data: cloudData } = await supabase.from(supabaseTable).select('*').eq('user_id', userId);
            if (cloudData) {
                const localItems = cloudData.map(item => fieldMapper.toLocal(item));
                await dexieTable.bulkPut(localItems);
            }
            syncManager.itemCompleted();

            // 2. PUSH TO CLOUD (items with synced=0)
            const unsynced = await dexieTable.where({ synced: 0 }).toArray();
            for (const item of unsynced) {
                const cloudItem = fieldMapper.toCloud(item, userId);
                const { error } = await supabase.from(supabaseTable).upsert(cloudItem);
                if (!error) {
                    await dexieTable.update(item.id, { synced: 1 });
                }
            }
            syncManager.itemCompleted();
        } catch (e) {
            console.warn(`Sync failed for ${tableName}`, e);
            syncManager.itemCompleted(); syncManager.itemCompleted();
        }
    };

    try {
        await syncTable('profiles', db.profiles, 'child_profile');
        await syncTable('growth', db.growth, 'growth_data');
        await syncTable('reminders', db.reminders, 'reminders');
        await syncTable('memories', db.memories, 'memories');
        await syncTable('stories', db.stories, 'stories');
        syncManager.finish();
    } catch (e) {
        syncManager.error();
    }
};
