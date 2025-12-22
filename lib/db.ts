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
};

const db = new Dexie('LittleMomentsDB') as LittleMomentsDB;

// Store definitions must be in ascending order.
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
  // This upgrade function adds the `is_deleted` property to existing objects.
  const tables = ['memories', 'stories', 'growth', 'profiles', 'reminders'];
  return Promise.all(tables.map(tableName => 
    tx.table(tableName).toCollection().modify(item => {
      if (item.is_deleted === undefined) {
        item.is_deleted = 0; // 0 for not deleted
      }
    })
  ));
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

const uploadFileToSupabase = (file: File, childId: string, tag: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${childId}/${tag}/${fileName}`;
        
        uploadManager.start(file.name);

        const xhr = new XMLHttpRequest();
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/images/${filePath}`;
        xhr.open('POST', uploadUrl, true);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || SUPABASE_ANON_KEY;
        
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('x-upsert', 'true');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                uploadManager.progress(percentComplete, file.name);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                uploadManager.progress(100, file.name);
                const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                uploadManager.finish();
                resolve(data.publicUrl);
            } else {
                uploadManager.error();
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => {
            uploadManager.error();
            reject(new Error('Network error during upload.'));
        };

        xhr.send(file);
    });
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
                await db.table(tableName).delete(item.id); // Permanent delete after cloud sync
            } else {
                console.error(`Failed to delete ${tableName} item ${item.id} from Supabase:`, error);
            }
        }
    }
};

export const syncData = async () => {
    if (!navigator.onLine) return { success: false, reason: 'Offline' };
    if (!isSupabaseConfigured()) return { success: false, reason: 'No Supabase Configuration' };

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) return { success: false, reason: 'No Active Session' };

        // 1. Sync Deletions First
        await syncDeletions();

        // 2. Sync Creations and Updates
        const unsyncedStories = await db.stories.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedMemories = await db.memories.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedGrowth = await db.growth.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedProfiles = await db.profiles.where({synced: 0, is_deleted: 0}).toArray();
        const unsyncedReminders = await db.reminders.where({synced: 0, is_deleted: 0}).toArray();

        const totalToSync = unsyncedStories.length + unsyncedMemories.length + unsyncedGrowth.length + unsyncedProfiles.length + unsyncedReminders.length;
        
        if (totalToSync > 0) {
            syncManager.start(totalToSync);
        }
        
        let errors: string[] = [];

        for (const s of unsyncedStories) {
            const { error } = await supabase.from('stories').upsert(cleanForSync(s));
            if (!error) { await db.stories.update(s.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(`Stories Push: ${error.message}`);
        }

        for (const mem of unsyncedMemories) {
            if (mem.imageUrls && mem.imageUrls.some(url => url.startsWith('data:image'))) {
                const newImageUrls = await Promise.all(mem.imageUrls.map(async (url) => {
                    if (url.startsWith('data:image')) {
                        try {
                            const res = await fetch(url);
                            const blob = await res.blob();
                            const file = new File([blob], "upload.jpg", { type: blob.type });
                            return await uploadFileToSupabase(file, mem.childId, 'memories');
                        } catch (e) { console.error(`Image upload failed for memory ${mem.id}, keeping local version.`, e); return url; }
                    }
                    return url;
                }));
                await db.memories.update(mem.id, { imageUrls: newImageUrls });
                mem.imageUrls = newImageUrls;
            }
        }
        for (const mem of unsyncedMemories) {
            const memoryToSync = cleanForSync(mem);
            
            // Adapt the object for the Supabase schema which expects a single `imageUrl` text field.
            const supabasePayload: any = { ...memoryToSync };
            
            if (supabasePayload.imageUrls && supabasePayload.imageUrls.length > 0) {
                supabasePayload.imageUrl = supabasePayload.imageUrls[0];
            } else if (supabasePayload.imageUrl === undefined) {
                // Ensure the field is present, even if null, to avoid schema issues.
                supabasePayload.imageUrl = null;
            }
            // This property doesn't exist in the remote 'memories' table and would cause an error.
            delete supabasePayload.imageUrls; 

            const { error } = await supabase.from('memories').upsert(supabasePayload);
            if (!error) { 
                await db.memories.update(mem.id, { synced: 1 }); 
                syncManager.itemCompleted(); 
            } else {
                console.error(`Supabase memories sync push error for id ${mem.id}:`, error);
                errors.push(`Memories Push: ${error.message}`);
            }
        }

        for (const g of unsyncedGrowth) {
            const { error } = await supabase.from('growth_data').upsert(cleanForSync(g));
            if (!error) { await db.growth.update(g.id!, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(`Growth Push: ${error.message}`);
        }

        for (const p of unsyncedProfiles) {
            if (p.id && p.profileImage && p.profileImage.startsWith('data:image')) {
                try {
                    const res = await fetch(p.profileImage);
                    const blob = await res.blob();
                    const file = new File([blob], "profile_upload.jpg", { type: blob.type });
                    const newImageUrl = await uploadFileToSupabase(file, p.id, 'profile');
                    await db.profiles.update(p.id, { profileImage: newImageUrl });
                    p.profileImage = newImageUrl;
                } catch (e) { console.error(`Profile image upload failed for profile ${p.id}, keeping local version.`, e); }
            }
        }
        for (const p of unsyncedProfiles) {
            const { error } = await supabase.from('child_profile').upsert(cleanForSync(p));
            if (!error) { await db.profiles.update(p.id!, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(`Profiles Push: ${error.message}`);
        }

        for (const r of unsyncedReminders) {
            const { error } = await supabase.from('reminders').upsert(cleanForSync(r));
            if (!error) { await db.reminders.update(r.id, { synced: 1 }); syncManager.itemCompleted(); }
            else errors.push(`Reminders Push: ${error.message}`);
        }

        if (totalToSync > 0) {
            if (errors.length > 0) syncManager.error();
            else syncManager.finish();
        }

        // 3. Pull remote changes
        const { data: profileData } = await supabase.from('child_profile').select('*');
        if (profileData) await db.profiles.bulkPut(profileData.map(p => ({ ...p, synced: 1, is_deleted: 0 })));
        const { data: storyData } = await supabase.from('stories').select('*');
        if (storyData) await db.stories.bulkPut(storyData.map(s => ({ ...s, synced: 1, is_deleted: 0 })));
        const { data: growthData } = await supabase.from('growth_data').select('*');
        if (growthData) await db.growth.bulkPut(growthData.map(g => ({ ...g, synced: 1, is_deleted: 0 })));
        const { data: reminderData } = await supabase.from('reminders').select('*');
        if (reminderData) await db.reminders.bulkPut(reminderData.map(r => ({ ...r, synced: 1, is_deleted: 0 })));
        
        // Special handling for memories to prevent data loss.
        // The remote schema only stores one `imageUrl`, while local stores an array `imageUrls`.
        // A simple overwrite would delete the extra images from the local DB.
        const { data: memoryData } = await supabase.from('memories').select('*');
        if (memoryData) {
            const memoriesToUpsert = [];
            for (const remoteMemory of memoryData) {
                const localMemory = await db.memories.get(remoteMemory.id);
                if (localMemory) {
                    // If a local version exists, merge smartly.
                    // Prioritize local `imageUrls` to prevent data loss.
                    // Overwrite other fields with remote data to get updates.
                    const mergedMemory = {
                        ...localMemory,
                        ...remoteMemory,
                        synced: 1,
                        is_deleted: 0,
                    };
                    memoriesToUpsert.push(mergedMemory);
                } else {
                    // If no local version, it's a new memory from another device.
                    // Safe to add it directly.
                    memoriesToUpsert.push({ ...remoteMemory, synced: 1, is_deleted: 0 });
                }
            }
            if (memoriesToUpsert.length > 0) {
                await db.memories.bulkPut(memoriesToUpsert);
            }
        }

        return { success: errors.length === 0 };
    } catch (err: any) {
        syncManager.error();
        console.error("Sync process failed:", err);
        return { success: false, error: err.message };
    }
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const DataService = {
    // --- App Settings ---
    getSetting: async (key: string) => {
        return await db.app_settings.get(key);
    },
    saveSetting: async (key: string, value: any) => {
        await db.app_settings.put({ key, value });
    },
    removeSetting: async (key: string) => {
        await db.app_settings.delete(key);
    },

    clearAllUserData: async () => {
        // A transaction ensures all operations succeed or fail together.
        await db.transaction('rw', [db.memories, db.stories, db.growth, db.profiles, db.reminders], async () => {
            await db.memories.clear();
            await db.stories.clear();
            await db.growth.clear();
            await db.profiles.clear();
            await db.reminders.clear();
        });
    },

    uploadImage: async (file: File, childId: string, tag: string = 'general'): Promise<string> => {
        const isGuest = localStorage.getItem('guest_mode') === 'true';

        if (isGuest || !navigator.onLine || !isSupabaseConfigured()) {
            return fileToBase64(file);
        }

        try {
            return await uploadFileToSupabase(file, childId, tag);
        } catch (error) {
            console.error("Caught an exception during image upload, falling back to local storage:", error);
            return fileToBase64(file);
        }
    },

    getMemories: async (childId?: string): Promise<Memory[]> => {
        let memories;
        if (childId) {
            // FIX: Correctly sort memories by date descending. The previous implementation with reverse().sortBy() was incorrect.
            memories = (await db.memories.where({ childId, is_deleted: 0 }).sortBy('date')).reverse();
        } else {
            // FIX: Correctly sort memories by date descending. `orderBy` is not a valid method on a Collection. Use `sortBy` and reverse the resulting array.
            memories = (await db.memories.where('is_deleted').equals(0).sortBy('date')).reverse();
        }
        return memories.map((mem: any) => {
            if ((!mem.imageUrls || !Array.isArray(mem.imageUrls)) && typeof mem.imageUrl === 'string') {
                return { ...mem, imageUrls: [mem.imageUrl] };
            }
            return mem as Memory;
        });
    },
    addMemory: async (memory: Memory) => {
        await db.memories.put({ ...memory, synced: 0, is_deleted: 0 });
        if (isSupabaseConfigured()) syncData();
    },
    deleteMemory: async (id: string) => {
        await db.memories.update(id, { is_deleted: 1, synced: 0 });
        if (isSupabaseConfigured()) syncData();
    },

    getStories: async (childId?: string) => {
        if (childId) {
            // FIX: Correctly sort stories by date descending. The previous implementation with reverse().sortBy() was incorrect.
            return (await db.stories.where({ childId, is_deleted: 0 }).sortBy('date')).reverse();
        }
        // FIX: Correctly sort stories by date descending. `orderBy` is not a valid method on a Collection. Use `sortBy` and reverse the resulting array.
        return (await db.stories.where('is_deleted').equals(0).sortBy('date')).reverse();
    },
    addStory: async (story: Story) => {
        await db.stories.put({ ...story, synced: 0, is_deleted: 0 });
        if (isSupabaseConfigured()) syncData();
    },
    deleteStory: async (id: string) => {
        await db.stories.update(id, { is_deleted: 1, synced: 0 });
        if (isSupabaseConfigured()) syncData();
    },

    getGrowth: async (childId?: string) => {
        if (childId) return await db.growth.where({ childId, is_deleted: 0 }).sortBy('month');
        // FIX: `orderBy` is not a valid method on a Collection. Use `sortBy` instead to sort ascending by month.
        return await db.growth.where('is_deleted').equals(0).sortBy('month');
    },
    saveGrowth: async (data: GrowthData) => {
        await db.growth.put({ ...data, synced: 0, is_deleted: 0 });
        if (isSupabaseConfigured()) syncData();
    },
    deleteGrowth: async (id: string) => {
        await db.growth.update(id, { is_deleted: 1, synced: 0 });
        if (isSupabaseConfigured()) syncData();
    },
    
    getProfiles: async () => {
        return await db.profiles.where('is_deleted').equals(0).toArray();
    },
    saveProfile: async (profile: ChildProfile) => {
        await db.profiles.put({ ...profile, synced: 0, is_deleted: 0 });
        if (isSupabaseConfigured()) syncData();
    },
    deleteProfile: async (id: string) => {
        await db.profiles.update(id, { is_deleted: 1, synced: 0 });
        if (isSupabaseConfigured()) syncData();
    },

    getReminders: async () => {
        // FIX: `orderBy` is not a valid method on a Collection. Use `sortBy` instead to sort ascending by date.
        return await db.reminders.where('is_deleted').equals(0).sortBy('date');
    },
    saveReminder: async (reminder: Reminder) => {
        await db.reminders.put({ ...reminder, synced: 0, is_deleted: 0 });
        if (isSupabaseConfigured()) syncData();
    },
    deleteReminder: async (id: string) => {
        await db.reminders.update(id, { is_deleted: 1, synced: 0 });
        if (isSupabaseConfigured()) syncData();
    }
};