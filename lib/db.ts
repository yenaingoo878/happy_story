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

// Store definitions - Version updated to 6
db.version(6).stores({
  memories: 'id, childId, date, synced',
  stories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced',
  reminders: 'id, date, synced',
  app_settings: 'key' // New table for app settings like API keys
});

db.version(5).stores({
  memories: 'id, childId, date, synced',
  stories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced',
  reminders: 'id, date, synced'
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

        // Memories
        const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
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

        // Profiles
        const unsyncedProfiles = await db.profiles.where('synced').equals(0).toArray();
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
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${childId}/${tag}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
            
            if (uploadError) {
                console.error("Supabase upload error, falling back to local storage:", uploadError);
                // Fallback to base64 if Supabase fails for any reason (e.g., policy error)
                return fileToBase64(file);
            }
            
            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error("Caught an exception during image upload, falling back to local storage:", error);
            // Fallback to base64 on any other exception
            return fileToBase64(file);
        }
    },

    getMemories: async (childId?: string) => {
        if (childId) return await db.memories.where('childId').equals(childId).reverse().sortBy('date');
        return await db.memories.orderBy('date').reverse().toArray();
    },
    addMemory: async (memory: Memory) => {
        await db.memories.put({ ...memory, synced: 0 });
        if (isSupabaseConfigured()) await syncData();
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
        if (isSupabaseConfigured()) await syncData();
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
        if (isSupabaseConfigured()) await syncData();
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
        if (isSupabaseConfigured()) await syncData();
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
        if (isSupabaseConfigured()) await syncData();
    },
    deleteReminder: async (id: string) => {
        await db.reminders.delete(id);
        if (navigator.onLine && isSupabaseConfigured()) await supabase.from('reminders').delete().eq('id', id);
    }
};