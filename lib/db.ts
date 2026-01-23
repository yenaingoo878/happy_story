
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

// Database Schema Definitions
db.version(8).stores({
  memories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  stories: 'id, [childId+is_deleted], date, synced, [is_deleted+synced], [synced+is_deleted]',
  growth: 'id, [childId+is_deleted], month, synced, [is_deleted+synced], [synced+is_deleted]',
  profiles: 'id, name, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
  reminders: 'id, date, synced, is_deleted, [is_deleted+synced], [synced+is_deleted]',
  app_settings: 'key'
});

export { db };

/**
 * Helper to map local fields to Supabase columns.
 */
const mapToSupabase = (tableName: string, item: any, userId: string) => {
    const basePayload = { user_id: userId, id: item.id };

    if (tableName === 'memories') {
        return {
            ...basePayload,
            childId: item.childId, 
            title: item.title,
            description: item.description,
            date: item.date,
            tags: item.tags || [],
            imageUrl: (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : (item.imageUrl || null)
        };
    }
    
    if (tableName === 'stories') {
        return {
            ...basePayload,
            childId: item.childId,
            title: item.title,
            content: item.content,
            date: item.date
        };
    }
    
    if (tableName === 'growth_data') {
        return {
            ...basePayload,
            childId: item.childId,
            month: item.month,
            height: item.height,
            weight: item.weight
        };
    }
    
    if (tableName === 'child_profile') {
        return {
            ...basePayload,
            name: item.name,
            dob: item.dob,
            gender: item.gender,
            profileImage: item.profileImage,
            birthTime: item.birthTime,
            bloodType: item.bloodType,
            hospitalName: item.hospitalName,
            birthLocation: item.birthLocation,
            country: item.country
        };
    }

    if (tableName === 'reminders') {
        return {
            ...basePayload,
            title: item.title,
            date: item.date,
            type: item.type
        };
    }
    
    return basePayload;
};

/**
 * Helper to map Supabase columns back to local camelCase.
 */
const mapFromSupabase = (tableName: string, item: any) => {
    const getField = (obj: any, keys: string[]) => {
      for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
      }
      return undefined;
    };

    if (tableName === 'memories') {
        const imageUrl = getField(item, ['imageUrl', 'imageurl', 'image_url']);
        const imageUrls = getField(item, ['imageUrls', 'imageurls', 'image_urls']);
        return {
            ...item,
            id: item.id,
            childId: getField(item, ['childId', 'childid', 'child_id', 'childID']),
            title: item.title,
            description: item.description,
            date: item.date,
            tags: item.tags || [],
            imageUrl: imageUrl,
            imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
            synced: 1,
            is_deleted: 0
        };
    }
    
    if (tableName === 'stories') {
        return {
            ...item,
            id: item.id,
            childId: getField(item, ['childId', 'childid', 'child_id', 'childID']),
            title: item.title,
            content: item.content,
            date: item.date,
            synced: 1,
            is_deleted: 0
        };
    }
    
    if (tableName === 'growth_data') {
        return {
            ...item,
            id: item.id,
            childId: getField(item, ['childId', 'childid', 'child_id', 'childID']),
            month: item.month,
            height: item.height,
            weight: item.weight,
            synced: 1,
            is_deleted: 0
        };
    }
    
    if (tableName === 'child_profile') {
        return {
            ...item,
            id: item.id,
            name: item.name,
            dob: item.dob,
            gender: item.gender,
            profileImage: getField(item, ['profileImage', 'profileimage', 'profile_image']),
            birthTime: getField(item, ['birthTime', 'birthtime', 'birth_time']),
            bloodType: getField(item, ['bloodType', 'bloodtype', 'blood_type']),
            hospitalName: getField(item, ['hospitalName', 'hospitalname', 'hospital_name']),
            birthLocation: getField(item, ['birthLocation', 'birthlocation', 'birth_location']),
            synced: 1,
            is_deleted: 0
        };
    }
    
    return { ...item, synced: 1, is_deleted: 0 };
};

export const resetDatabase = async () => {
    try {
        await db.delete();
        localStorage.clear();
        window.location.reload();
    } catch (err) {
        console.error("Failed to delete database:", err);
    }
};

export const initDB = async () => {
  try {
      if (!window.indexedDB) throw new Error("IndexedDB not supported");
      if (!db.isOpen()) await db.open();
      return { success: true };
  } catch (err: any) {
      console.error("Dexie Open Error:", err);
      return { success: false, error: err.message };
  }
};

/**
 * Uploads a file to the configured cloud storage.
 */
export const uploadFileToCloud = async (fileOrBlob: File | Blob, userId: string, childId: string, tag: string, itemId: string, imageIndex: number): Promise<string> => {
    const fileNameSuffix = fileOrBlob instanceof File ? fileOrBlob.name.split('.').pop() : 'jpg';
    const displayName = fileOrBlob instanceof File ? fileOrBlob.name : `image_${imageIndex}.jpg`;
    
    uploadManager.start(displayName);
    const fileName = `${itemId}_${imageIndex}_${Date.now()}.${fileNameSuffix}`;
    const filePath = `${userId}/${childId}/${tag}/${fileName}`;

    try {
        let publicUrl = '';
        if (isR2Configured()) {
            publicUrl = await uploadFileToR2(fileOrBlob, filePath);
        } else if (isSupabaseConfigured()) {
            const { error } = await supabase.storage.from('images').upload(filePath, fileOrBlob, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            publicUrl = data.publicUrl;
        } else {
            throw new Error("No cloud storage configured.");
        }

        uploadManager.progress(100, displayName);
        uploadManager.finish();
        return publicUrl;
    } catch (error) {
        uploadManager.error();
        throw error;
    }
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
                if (!error) await db.table(tableName).delete(item.id);
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
            const payload = mapToSupabase('stories', s, userId);
            const { error } = await supabase.from('stories').upsert(payload);
            if (!error) { await db.stories.update(s.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(`Story ${s.id}: ${error.message}`);
        }

        for (const mem of unsyncedMemories) {
            try {
                let memoryToSync = { ...mem };
                if (memoryToSync.imageUrls && memoryToSync.imageUrls.some(url => url.startsWith('file://') || url.startsWith('data:'))) {
                    const newUrls = await Promise.all(memoryToSync.imageUrls.map(async (url, index) => {
                        if (url.startsWith('file://') || url.startsWith('data:')) {
                            let blob;
                            if (url.startsWith('file://')) {
                                const fileData = await Filesystem.readFile({ path: url });
                                blob = await(await fetch(`data:image/jpeg;base64,${fileData.data}`)).blob();
                            } else {
                                blob = await(await fetch(url)).blob();
                            }
                            return await uploadFileToCloud(blob, userId, memoryToSync.childId, 'memories', memoryToSync.id, index);
                        }
                        return url;
                    }));
                    await db.memories.update(mem.id, { imageUrls: newUrls });
                    memoryToSync.imageUrls = newUrls;
                }
                const payload = mapToSupabase('memories', memoryToSync, userId);
                const { error } = await supabase.from('memories').upsert(payload);
                if (error) throw error;
                await db.memories.update(mem.id, { synced: 1 });
                syncManager.itemCompleted();
            } catch (error: any) {
                console.error("Memory Push Error:", error);
                errors.push(`Memory ${mem.id}: ${error.message}`);
            }
        }

        for (const g of unsyncedGrowth) {
            const payload = mapToSupabase('growth_data', g, userId);
            const { error } = await supabase.from('growth_data').upsert(payload);
            if (!error) { await db.growth.update(g.id!, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(`Growth ${g.id}: ${error.message}`);
        }

        for (const p of unsyncedProfiles) {
            try {
                let profileToSync = { ...p };
                if (profileToSync.profileImage && (profileToSync.profileImage.startsWith('file://') || profileToSync.profileImage.startsWith('data:'))) {
                    let blob;
                    if (profileToSync.profileImage.startsWith('file://')) {
                        const fileData = await Filesystem.readFile({ path: profileToSync.profileImage });
                        blob = await(await fetch(`data:image/jpeg;base64,${fileData.data}`)).blob();
                    } else {
                        blob = await(await fetch(profileToSync.profileImage)).blob();
                    }
                    const newUrl = await uploadFileToCloud(blob, userId, p.id!, 'profile', p.id!, 0);
                    await db.profiles.update(p.id!, { profileImage: newUrl });
                    profileToSync.profileImage = newUrl;
                }
                const payload = mapToSupabase('child_profile', profileToSync, userId);
                const { error } = await supabase.from('child_profile').upsert(payload);
                if (error) throw error;
                await db.profiles.update(p.id!, { synced: 1 });
                syncManager.itemCompleted();
            } catch (error: any) {
                errors.push(`Profile ${p.id}: ${error.message}`);
            }
        }

        for (const r of unsyncedReminders) {
            const payload = mapToSupabase('reminders', r, userId);
            const { error } = await supabase.from('reminders').upsert(payload);
            if (!error) { await db.reminders.update(r.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(`Reminder ${r.id}: ${error.message}`);
        }

        if (totalToSync > 0) {
            if (errors.length > 0) syncManager.error();
            else syncManager.finish();
        }

        try {
            const { data: pData } = await supabase.from('child_profile').select('*').eq('user_id', userId);
            if (pData) await db.profiles.bulkPut(pData.map(p => mapFromSupabase('child_profile', p)));
            
            const { data: sData } = await supabase.from('stories').select('*').eq('user_id', userId);
            if (sData) await db.stories.bulkPut(sData.map(s => mapFromSupabase('stories', s)));
            
            const { data: gData } = await supabase.from('growth_data').select('*').eq('user_id', userId);
            if (gData) await db.growth.bulkPut(gData.map(g => mapFromSupabase('growth_data', g)));
            
            const { data: rData } = await supabase.from('reminders').select('*').eq('user_id', userId);
            if (rData) await db.reminders.bulkPut(rData.map(r => ({ ...r, synced: 1, is_deleted: 0 })));
            
            const { data: mData } = await supabase.from('memories').select('*').eq('user_id', userId);
            if (mData) {
                await db.memories.bulkPut(mData.map(m => mapFromSupabase('memories', m)));
            }
        } catch (e) {
            console.error("Error pulling cloud data:", e);
        }

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
            // Updated: Execute cleanup on all platforms to handle cloud file deletion
            if (fileCleanup) {
                await fileCleanup(id).catch(e => console.warn("File cleanup failed:", e));
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

/**
 * Cleanup logic for memory images - both local and cloud.
 */
const memoryFileCleanup = async (id: string) => {
    const memory = await db.memories.get(id);
    if (!memory) return;

    // We need user ID for cloud path reconstruction
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;

    if (memory.imageUrls) {
        for (const url of memory.imageUrls) {
            // 1. Local Filesystem cleanup (Native only)
            if (url.startsWith('file://')) {
                try { await Filesystem.deleteFile({ path: url }); } catch(e) {}
            }
            
            // 2. Cloud Storage cleanup (All platforms)
            // Checks if it's a Supabase or R2 URL
            const isCloudUrl = url.includes('supabase.co') || (isR2Configured() && url.startsWith('http'));
            
            if (isCloudUrl && userId && memory.childId) {
                try {
                    // Extract filename from the URL (last segment)
                    const fileName = url.split('/').pop();
                    if (fileName) {
                        await DataService.deleteCloudPhoto(userId, memory.childId, fileName);
                    }
                } catch (e) {
                    console.warn("Could not delete cloud photo during cleanup:", e);
                }
            }
        }
    }
};

const profileFileCleanup = async (id: string) => {
    const profile = await db.profiles.get(id);
    if (!profile) return;

    if (profile.profileImage?.startsWith('file://')) {
        try { await Filesystem.deleteFile({ path: profile.profileImage }); } catch(e) {}
    }
    
    // Cloud profile image cleanup if necessary
    const isCloudUrl = profile.profileImage?.includes('supabase.co') || (isR2Configured() && profile.profileImage?.startsWith('http'));
    if (isCloudUrl) {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        const fileName = profile.profileImage?.split('/').pop();
        if (userId && profile.id && fileName) {
            // For profile images, the path tag used was 'profile'
            const filePath = `${userId}/${profile.id}/profile/${fileName}`;
            try {
                if (isR2Configured()) await deleteFileFromR2(filePath);
                else await supabase.storage.from('images').remove([filePath]);
            } catch(e) {}
        }
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
                    if (file.name.endsWith('.jpeg')) await Filesystem.deleteFile({ path: file.name, directory: Directory.Data });
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
    getCloudPhotos: async (userId: string, childId: string) => {
        if (isR2Configured()) {
            try {
                return await listObjectsFromR2(`${userId}/${childId}/memories/`);
            } catch (e) {
                console.error("Failed to list R2 objects:", e);
                return [];
            }
        }
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase.storage.from('images').list(`${userId}/${childId}/memories`, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
            if (error || !data) return [];
            return data.map(file => {
                const { data: urlData } = supabase.storage.from('images').getPublicUrl(`${userId}/${childId}/memories/${file.name}`);
                return { id: file.id, name: file.name, url: urlData.publicUrl, created_at: file.created_at };
            });
        }
        return [];
    },
    deleteCloudPhoto: async (userId: string, childId: string, fileName: string) => {
        const filePath = `${userId}/${childId}/memories/${fileName}`;
        try {
            if (isR2Configured()) {
                await deleteFileFromR2(filePath);
                return { success: true };
            }
            if (isSupabaseConfigured()) {
                const { data, error } = await supabase.storage.from('images').remove([filePath]);
                if (error) throw error;
                return { success: data && data.length > 0 };
            }
            return { success: false, error: 'Storage not configured' };
        } catch (e: any) {
            console.error("Exception during cloud photo removal:", e);
            return { success: false, error: e.message || 'Unknown network error' };
        }
    }
};
