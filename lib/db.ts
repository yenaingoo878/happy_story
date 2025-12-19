
import Dexie, { Table } from 'dexie';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Memory, GrowthData, ChildProfile, Reminder } from '../types';

export type LittleMomentsDB = Dexie & {
  memories: Table<Memory>;
  growth: Table<GrowthData>;
  profiles: Table<ChildProfile>;
  reminders: Table<Reminder>;
};

const db = new Dexie('LittleMomentsDB') as LittleMomentsDB;

// Store definitions
db.version(4).stores({
  memories: 'id, childId, date, synced',
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
      console.log("Local Database Initialized Successfully");
      if (isSupabaseConfigured()) {
        await syncData(); 
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

        // --- PUSH ---
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

        // --- PULL ---
        const { data: profiles, error: pError } = await supabase.from('child_profile').select('*');
        if (profiles) await db.profiles.bulkPut(profiles.map(p => ({ ...p, synced: 1 })));
        else if (pError) errors.push(`Profiles Pull: ${pError.message}`);

        const { data: growth, error: gError } = await supabase.from('growth_data').select('*');
        if (growth) await db.growth.bulkPut(growth.map(g => ({ ...g, synced: 1 })));
        else if (gError) errors.push(`Growth Pull: ${gError.message}`);

        const { data: memories, error: mError } = await supabase.from('memories').select('*');
        if (memories) await db.memories.bulkPut(memories.map(m => ({ ...m, synced: 1 })));
        else if (mError) errors.push(`Memories Pull: ${mError.message}`);

        const { data: reminders, error: rError } = await supabase.from('reminders').select('*');
        if (reminders) await db.reminders.bulkPut(reminders.map(r => ({ ...r, synced: 1 })));
        else if (rError) errors.push(`Reminders Pull: ${rError.message}`);
        
        if (errors.length > 0) {
            return { success: false, reason: errors.join('; ') };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Sync process failed:", err);
        return { success: false, error: err.message };
    }
};

export const DataService = {
    testSupabaseConnection: async () => {
        try {
            const { data, error } = await supabase.from('child_profile').select('count', { count: 'exact', head: true });
            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    uploadImage: async (file: File, childId: string, tag: string = 'general'): Promise<string> => {
        if (!isSupabaseConfigured()) {
            return URL.createObjectURL(file);
        }
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${childId}/${tag}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            if (!navigator.onLine) return URL.createObjectURL(file);
            throw error;
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
    },

    resetLocalDatabase: async () => {
        await db.delete();
        window.location.reload();
    }
};
