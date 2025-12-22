import Dexie, { Table } from 'dexie';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Memory, GrowthData, ChildProfile, Reminder, Story, AppSetting } from '../types';

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
db.version(5).stores({
  memories: 'id, childId, date, synced',
  stories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced',
  reminders: 'id, date, synced'
});

db.version(6).stores({
  memories: 'id, childId, date, synced',
  stories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced',
  reminders: 'id, date, synced',
  app_settings: 'key' // New table for app settings like API keys
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
    const { synced, ...rest } = doc;
    return rest;
};

const uploadFileToSupabase = async (file: File, childId: string, tag: string): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${childId}/${tag}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
};

export const syncData = async () => {
    if (!navigator.onLine) return { success: false, reason: 'Offline' };
    if (!isSupabaseConfigured()) return { success: false, reason: 'No Supabase Configuration' };

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) return { success: false, reason: 'No Active Session' };

        let errors: string[] = [];

        // Push Stories
        const unsyncedStories = await db.stories.where('synced').equals(0).toArray();
        for (const s of unsyncedStories) {
            const { error } = await supabase.from('stories').upsert(cleanForSync(s));
            if (!error) await db.stories.update(s.id, { synced: 1 });
            else errors.push(`Stories Push: ${error.message}`);
        }

        // Memories - With background image upload
        const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
        for (const mem of unsyncedMemories) {
            if (mem.imageUrls && mem.imageUrls.some(url => url.startsWith('data:image'))) {
                const newImageUrls = await Promise.all(mem.imageUrls.map(async (url) => {
                    if (url.startsWith('data:image')) {
                        try {
                            const res = await fetch(url);
                            const blob = await res.blob();
                            const file = new File([blob], "upload.jpg", { type: blob.type });
                            return await uploadFileToSupabase(file, mem.childId, 'memories');
                        } catch (e) {
                            console.error(`Image upload failed for memory ${mem.id}, keeping local version.`, e);
                            return url; 
                        }
                    }
                    return url;
                }));
                await db.memories.update(mem.id, { imageUrls: newImageUrls });
                mem.imageUrls = newImageUrls;
            }
        }
        for (const mem of unsyncedMemories) {
            const { error } = await supabase.from('memories').upsert(cleanForSync(mem));
            if (!error) await db.memories.update(mem.id, { synced: 1 });
            else errors.push(`Memories Push: ${error.message}`);
        }

        // Growth
        const unsyncedGrowth = await db.growth.where('synced').equals(0).toArray();
        for (const g of unsyncedGrowth) {
            const { error } = await supabase.from('growth_data').upsert(cleanForSync(g));
            if (!error) await db.growth.update(g.id!, { synced: 1 });
            else errors.push(`Growth Push: ${error.message}`);
        }

        // Profiles - Handle image upload first, then sync data
        const unsyncedProfiles = await db.profiles.where('synced').equals(0).toArray();
        for (const p of unsyncedProfiles) {
            if (p.id && p.profileImage && p.profileImage.startsWith('data:image')) {
                try {
                    const res = await fetch(p.profileImage);
                    const blob = await res.blob();
                    const file = new File([blob], "profile_upload.jpg", { type: blob.type });
                    const newImageUrl = await uploadFileToSupabase(file, p.id, 'profile');
                    await db.profiles.update(p.id, { profileImage: newImageUrl });
                    p.profileImage = newImageUrl; // Update in-memory object for the next loop
                } catch (e) {
                    console.error(`Profile image upload failed for profile ${p.id}, keeping local version.`, e);
                }
            }
        }
        for (const p of unsyncedProfiles) {
            const { error } = await supabase.from('child_profile').upsert(cleanForSync(p));
            if (!error) await db.profiles.update(p.id!, { synced: 1 });
            else errors.push(`Profiles Push: ${error.message}`);
        }

        // Reminders
        const unsyncedReminders = await db.reminders.where('synced').equals(0).toArray();
        for (const r of unsyncedReminders) {
            const { error } = await supabase.from('reminders').upsert(cleanForSync(r));
            if (!error) await db.reminders.update(r.id, { synced: 1 });
            else errors.push(`Reminders Push: ${error.message}`);
        }

        // Pulling Logic
        const { data: profileData } = await supabase.from('child_profile').select('*');
        if (profileData) await db.profiles.bulkPut(profileData.map(p => ({ ...p, synced: 1 })));

        const { data: storyData } = await supabase.from('stories').select('*');
        if (storyData) await db.stories.bulkPut(storyData.map(s => ({ ...s, synced: 1 })));

        const { data: growthData } = await supabase.from('growth_data').select('*');
        if (growthData) await db.growth.bulkPut(growthData.map(g => ({ ...g, synced: 1 })));

        const { data: memoryData } = await supabase.from('memories').select('*');
        if (memoryData) await db.memories.bulkPut(memoryData.map(m => ({ ...m, synced: 1 })));

        const { data: reminderData } = await supabase.from('reminders').select('*');
        if (reminderData) await db.reminders.bulkPut(reminderData.map(r => ({ ...r, synced: 1 })));
        
        return { success: errors.length === 0 };
    } catch (err: any) {
        console.error("Sync process failed:", err);
        return { success: false, error: err.message };
    }
};

const fileToBase64 = (file: File): Promise<string> => {
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

    uploadImage: async (file: File, childId: string, tag: string = 'general'): Promise<string> => {
        const isGuest = localStorage.getItem('guest_mode') === 'true';

        // For guest mode, offline, or if Supabase isn't configured, store as base64 data URI
        if (isGuest || !navigator.onLine || !isSupabaseConfigured()) {
            return fileToBase64(file);
        }

        // If online, logged-in, and Supabase is configured, try to upload
        try {
            return await uploadFileToSupabase(file, childId, tag);
        } catch (error) {
            console.error("Caught an exception during image upload, falling back to local storage:", error);
            // Fallback to base64 on any other exception
            return fileToBase64(file);
        }
    },

    getMemories: async (childId?: string): Promise<Memory[]> => {
        let memories;
        if (childId) {
            memories = await db.memories.where('childId').equals(childId).reverse().sortBy('date');
        } else {
            memories = await db.memories.orderBy('date').reverse().toArray();
        }

        // Backward compatibility layer for old data structure
        return memories.map((mem: any) => {
            if ((!mem.imageUrls || !Array.isArray(mem.imageUrls)) && typeof mem.imageUrl === 'string') {
                return {
                    ...mem,
                    imageUrls: [mem.imageUrl] // Convert single string to an array
                };
            }
            return mem as Memory;
        });
    },
    addMemory: async (memory: Memory) => {
        await db.memories.put({ ...memory, synced: 0 });
        if (isSupabaseConfigured()) syncData(); // Don't await, let it run in background
    },
    deleteMemory: async (id: string) => {
        await db.memories.delete(id);
        if (navigator.onLine && isSupabaseConfigured()) await supabase.from('memories').delete().eq('id', id);
    },

    getStories: async (childId?: string) => {
        if (childId) return await db.stories.where('childId').equals(childId).reverse().sortBy('date');
        return await db.stories.orderBy('date').reverse().toArray();
    },
    addStory: async (story: Story) => {
        await db.stories.put({ ...story, synced: 0 });
        if (isSupabaseConfigured()) syncData(); // Don't await
    },
    deleteStory: async (id: string) => {
        await db.stories.delete(id);
        if (navigator.onLine && isSupabaseConfigured()) await supabase.from('stories').delete().eq('id', id);
    },

    getGrowth: async (childId?: string) => {
        if (childId) return await db.growth.where('childId').equals(childId).sortBy('month');
        return await db.growth.orderBy('month').toArray();
    },
    saveGrowth: async (data: GrowthData) => {
        await db.growth.put({ ...data, synced: 0 });
        if (isSupabaseConfigured()) syncData(); // Don't await
    },
    deleteGrowth: async (id: string) => {
        await db.growth.delete(id);
        if (navigator.onLine && isSupabaseConfigured()) await supabase.from('growth_data').delete().eq('id', id);
    },
    
    getProfiles: async () => {
        return await db.profiles.toArray();
    },
    saveProfile: async (profile: ChildProfile) => {
        await db.profiles.put({ ...profile, synced: 0 });
        if (isSupabaseConfigured()) syncData(); // Don't await
    },
    deleteProfile: async (id: string) => {
        await db.profiles.delete(id);
        if (navigator.onLine && isSupabaseConfigured()) await supabase.from('child_profile').delete().eq('id', id);
    },

    getReminders: async () => {
        return await db.reminders.orderBy('date').toArray();
    },
    saveReminder: async (reminder: Reminder) => {
        await db.reminders.put({ ...reminder, synced: 0 });
        if (isSupabaseConfigured()) syncData(); // Don't await
    },
    deleteReminder: async (id: string) => {
        await db.reminders.delete(id);
        if (navigator.onLine && isSupabaseConfigured()) await supabase.from('reminders').delete().eq('id', id);
    }
};