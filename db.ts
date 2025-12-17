import Dexie, { Table } from 'dexie';
import { supabase } from './supabaseClient';
import { Memory, GrowthData, ChildProfile } from './types';

// Define the interface for the database to ensure type safety
// Using intersection type to avoid class extension issues with Dexie in some environments
export type LittleMomentsDB = Dexie & {
  memories: Table<Memory>;
  growth: Table<GrowthData>;
  profiles: Table<ChildProfile>;
};

// Create Dexie instance directly
const db = new Dexie('LittleMomentsDB') as LittleMomentsDB;

// Define schema
db.version(1).stores({
  memories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced' 
});

export { db };

export const initDB = async () => {
  try {
      if (!db.isOpen()) {
        await db.open();
      }
      console.log("Local Database Initialized");
      // Initial Sync
      syncData(); 
  } catch (err) {
      console.error("Failed to open db:", err);
  }
};

// Helper function to remove local-only fields like 'synced' before sending to Supabase
const cleanForSync = (doc: any) => {
    const { synced, ...rest } = doc;
    return rest;
};

export const syncData = async () => {
    if (!navigator.onLine) return;

    console.log("Starting Sync...");

    try {
        // 1. PUSH Local Changes to Supabase
        
        // --- MEMORIES ---
        const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
        for (const mem of unsyncedMemories) {
            const payload = cleanForSync(mem);
            const { error } = await supabase.from('memories').upsert(payload);
            if (!error) {
                await db.memories.update(mem.id, { synced: 1 });
            } else {
                console.error("Sync error memories:", error);
            }
        }

        // --- GROWTH ---
        const unsyncedGrowth = await db.growth.where('synced').equals(0).toArray();
        for (const g of unsyncedGrowth) {
            const payload = cleanForSync(g);
            const { error } = await supabase.from('growth_data').upsert(payload);
            if (!error) {
                await db.growth.update(g.id!, { synced: 1 });
            } else {
                console.error("Sync error growth:", error);
            }
        }

        // --- PROFILES ---
        const unsyncedProfiles = await db.profiles.where('synced').equals(0).toArray();
        for (const p of unsyncedProfiles) {
            const payload = cleanForSync(p);
            // CRITICAL FIX: Changed 'child_profiles' to 'child_profile' to match SQL schema
            const { error } = await supabase.from('child_profile').upsert(payload);
            if (!error) {
                await db.profiles.update(p.id!, { synced: 1 });
            } else {
                console.error("Sync error profiles:", error);
            }
        }

        // 2. PULL Remote Changes from Supabase (Simple Strategy: Overwrite local if remote exists)
        
        // Profiles
        // CRITICAL FIX: Changed 'child_profiles' to 'child_profile'
        const { data: profiles, error: profileError } = await supabase.from('child_profile').select('*');
        if (profiles && !profileError) {
            const localProfiles = profiles.map(p => ({ ...p, synced: 1 }));
            await db.profiles.bulkPut(localProfiles as ChildProfile[]);
        }

        // Growth
        const { data: growth, error: growthError } = await supabase.from('growth_data').select('*');
        if (growth && !growthError) {
            const localGrowth = growth.map(g => ({ ...g, synced: 1 }));
            await db.growth.bulkPut(localGrowth as GrowthData[]);
        }

        // Memories
        const { data: memories, error: memError } = await supabase.from('memories').select('*');
        if (memories && !memError) {
            const localMemories = memories.map(m => ({ ...m, synced: 1 }));
            await db.memories.bulkPut(localMemories as Memory[]);
        }
        
        console.log("Sync Complete");
        
    } catch (err) {
        console.error("Sync process failed:", err);
    }
};

export const DataService = {
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
        await db.profiles.put({ ...profile, synced: 0 });
        syncData();
    },

    deleteProfile: async (id: string) => {
        await db.profiles.delete(id);
         if (navigator.onLine) {
            // Fixed table name here as well
            await supabase.from('child_profile').delete().eq('id', id);
        }
    }
};