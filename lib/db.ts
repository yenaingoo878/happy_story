
import Dexie, { Table } from 'dexie';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { isR2Configured, uploadFileToR2, deleteFileFromR2, listObjectsFromR2 } from './r2Client';
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
    if (src.startsWith('data:') || src.startsWith('http')) return src;
    if (src.startsWith('file://')) {
        if (Capacitor.isNativePlatform()) return Capacitor.convertFileSrc(src);
        return undefined;
    }
    return src;
};

db.version(8).stores({
  memories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  stories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  growth: 'id, [childId+is_deleted], month, synced, [is_deleted+synced], [synced+is_deleted]',
  profiles: 'id, name, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
  reminders: 'id, date, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
  app_settings: 'key'
});

export { db };

const mapFromSupabase = (tableName: string, item: any) => {
    return { ...item, synced: 1, is_deleted: 0 };
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
    getCloudPhotos: async (userId: string, childId: string) => {
        if (!isR2Configured()) return [];
        return await listObjectsFromR2(`${userId}/${childId}/memories/`);
    },
    deleteCloudPhoto: async (userId: string, childId: string, fileName: string) => {
        if (!isR2Configured()) return { success: false };
        try {
            await deleteFileFromR2(`${userId}/${childId}/memories/${fileName}`);
            return { success: true };
        } catch (e) { return { success: false }; }
    },
    clearAllUserData: async () => {
        await Promise.all([db.memories.clear(), db.stories.clear(), db.growth.clear(), db.profiles.clear(), db.reminders.clear(), db.app_settings.clear()]);
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
    return await uploadFileToR2(blob, path);
};

export const syncData = async () => {
    if (!isSupabaseConfigured() || !navigator.onLine) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;
    
    syncManager.start(5);
    try {
        // Safe Sequential Fetching with internal catches for missing tables
        
        // Profiles
        try {
            const { data: pData } = await supabase.from('child_profile').select('*').eq('user_id', userId);
            if (pData) await db.profiles.bulkPut(pData.map(p => mapFromSupabase('child_profile', p)));
        } catch (e) { console.warn("Profiles sync error:", e); }
        syncManager.itemCompleted();

        // Growth
        try {
            const { data: gData } = await supabase.from('growth_data').select('*').eq('user_id', userId);
            if (gData) await db.growth.bulkPut(gData.map(g => mapFromSupabase('growth_data', g)));
        } catch (e) { console.warn("Growth sync error:", e); }
        syncManager.itemCompleted();

        // Reminders
        try {
            const { data: rData } = await supabase.from('reminders').select('*').eq('user_id', userId);
            if (rData) await db.reminders.bulkPut(rData.map(r => mapFromSupabase('reminders', r)));
        } catch (e) { console.warn("Reminders sync error:", e); }
        syncManager.itemCompleted();

        // Memories
        try {
            const { data: mData } = await supabase.from('memories').select('*').eq('user_id', userId);
            if (mData) await db.memories.bulkPut(mData.map(m => mapFromSupabase('memories', m)));
        } catch (e) { console.warn("Memories sync error:", e); }
        syncManager.itemCompleted();

        // Stories
        try {
            const { data: sData } = await supabase.from('stories').select('*').eq('user_id', userId);
            if (sData) await db.stories.bulkPut(sData.map(s => mapFromSupabase('stories', s)));
        } catch (e) { console.warn("Stories sync error:", e); }
        syncManager.itemCompleted();

        syncManager.finish();
    } catch (e) {
        console.error("Critical Sync Failure:", e);
        syncManager.error();
    }
};
