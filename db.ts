import Dexie, { Table } from 'dexie';
import { supabase } from './supabaseClient';
import { Memory, GrowthData, ChildProfile } from './types';

// Define the database type
export type LittleMomentsDB = Dexie & {
  memories: Table<Memory>;
  growth: Table<GrowthData>;
  profiles: Table<ChildProfile>;
};

// Initialize Dexie instance
const dbInstance = new Dexie('LittleMomentsDB');

// Define schema
dbInstance.version(1).stores({
  memories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced' 
});

// Export typed database instance
export const db = dbInstance as LittleMomentsDB;

export const generateId = () => {
  return crypto.randomUUID();
};

export const initDB = async () => {
  try {
      await db.open();
      console.log("Local Database Initialized");
      // Initial Sync
      syncData(); 
  } catch (err) {
      console.error("Failed to open db:", err);
  }
};

export const syncData = async () => {
    if (!navigator.onLine) return;

    console.log("Starting Sync...");

    // 1. PUSH Local Changes to Supabase
    const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
    for (const mem of unsyncedMemories) {
        const { error } = await supabase.from('memories').upsert({ ...mem, synced: 1 });
        if (!error) {
            await db.memories.update(mem.id, { synced: 1 });
        }
    }

    const unsyncedGrowth = await db.growth.where('synced').equals(0).toArray();
    for (const g of unsyncedGrowth) {
        const { error } = await supabase.from('growth_data').upsert({ ...g, synced: 1 });
        if (!error) {
            await db.growth.update(g.id!, { synced: 1 });
        }
    }

    const unsyncedProfiles = await db.profiles.where('synced').equals(0).toArray();
    for (const p of unsyncedProfiles) {
        const { error } = await supabase.from('child_profiles').upsert({ ...p, synced: 1 });
        if (!error) {
            await db.profiles.update(p.id!, { synced: 1 });
        }
    }

    // 2. PULL Remote Changes from Supabase (Simple Strategy: Overwrite local if remote exists)
    // For a production app, you'd want smarter conflict resolution/deltas.
    
    // Profiles
    const { data: profiles } = await supabase.from('child_profiles').select('*');
    if (profiles) {
        await db.profiles.bulkPut(profiles);
    }

    // Growth
    const { data: growth } = await supabase.from('growth_data').select('*');
    if (growth) {
        await db.growth.bulkPut(growth);
    }

    // Memories
    const { data: memories } = await supabase.from('memories').select('*');
    if (memories) {
        await db.memories.bulkPut(memories);
    }
    
    console.log("Sync Complete");
};

export const DataService = {
    // --- UTILS ---
    clearLocalData: async () => {
        await db.memories.clear();
        await db.growth.clear();
        await db.profiles.clear();
    },

    // --- STORAGE ---
    uploadImage: async (file: File, childId: string, tag: string = 'general'): Promise<string> => {
        try {
            // Sanitize filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            // Path: childId/tag/filename
            const filePath = `${childId}/${tag}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images') // Ensure you have a bucket named 'images'
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error("Upload failed:", error);
            throw error;
        }
    },

    // --- MEMORIES ---
    getMemories: async (childId?: string) => {
        if (childId) {
            return await db.memories.where('childId').equals(childId).reverse().sortBy('date');
        }
        return await db.memories.orderBy('date').reverse().toArray();
    },
    
    addMemory: async (memory: Memory) => {
        await db.memories.put({ ...memory, synced: 0 });
        syncData(); // Trigger background sync
    },
    
    deleteMemory: async (id: string) => {
        await db.memories.delete(id);
        // Also delete from Supabase
        if (navigator.onLine) {
            await supabase.from('memories').delete().eq('id', id);
        }
    },

    // --- GROWTH ---
    getGrowth: async (childId?: string) => {
        if (childId) {
            return await db.growth.where('childId').equals(childId).sortBy('month');
        }
        return await db.growth.orderBy('month').toArray();
    },
    
    saveGrowth: async (data: GrowthData) => {
        await db.growth.put({ ...data, synced: 0 });
        syncData();
    },
    
    deleteGrowth: async (id: string) => {
        await db.growth.delete(id);
         if (navigator.onLine) {
            await supabase.from('growth_data').delete().eq('id', id);
        }
    },
    
    // --- PROFILES ---
    getProfiles: async () => {
        return await db.profiles.toArray();
    },
    
    saveProfile: async (profile: ChildProfile) => {
        const id = profile.id || generateId();
        await db.profiles.put({ ...profile, id, synced: 0 });
        syncData();
        return id;
    },

    deleteProfile: async (id: string) => {
        await db.profiles.delete(id);
         if (navigator.onLine) {
            await supabase.from('child_profiles').delete().eq('id', id);
        }
    }
};