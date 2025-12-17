import Dexie, { Table } from 'dexie';
import { Memory, GrowthData, ChildProfile } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Use instance-based declaration to avoid TS class extension issues
const db = new Dexie('LittleMomentsDB') as Dexie & {
  memories: Table<Memory>;
  growth: Table<GrowthData>;
  profile: Table<ChildProfile>;
};

// Bumped to version 3 to support childId indexing
db.version(3).stores({
  memories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profile: 'id, synced'
});

export { db };

// --- Initialization Logic ---
export const initDB = async () => {
  const profileCount = await db.profile.count();
  if (profileCount === 0) {
      // Create a default profile if none exist
      await db.profile.add({
          id: 'main',
          name: '',
          dob: '',
          gender: 'boy',
          synced: 0
      });
  }
};

// --- Sync Logic (Bi-directional: IndexedDB <-> Supabase) ---
// (Sync logic remains mostly the same, just ensures data integrity)
export const syncData = async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) return;

    console.log("Starting Sync...");

    try {
        // --- PUSH (Local -> Cloud) ---
        
        // 1. Memories
        const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
        if (unsyncedMemories.length > 0) {
            const { error } = await supabase.from('memories').upsert(
                unsyncedMemories.map(m => {
                    const { synced, ...rest } = m;
                    return rest;
                })
            );
            if (!error) {
                await db.memories.bulkPut(unsyncedMemories.map(m => ({ ...m, synced: 1 })));
            }
        }

        // 2. Growth
        const unsyncedGrowth = await db.growth.where('synced').equals(0).toArray();
        if (unsyncedGrowth.length > 0) {
            const { error } = await supabase.from('growth_data').upsert(
                unsyncedGrowth.map(g => {
                    const { synced, ...rest } = g;
                    return rest;
                })
            );
            if (!error) {
                await db.growth.bulkPut(unsyncedGrowth.map(g => ({ ...g, synced: 1 })));
            }
        }

        // 3. Profile
        const unsyncedProfile = await db.profile.where('synced').equals(0).toArray();
        if (unsyncedProfile.length > 0) {
            const { error } = await supabase.from('child_profile').upsert(
                unsyncedProfile.map(p => {
                    const { synced, ...rest } = p;
                    return rest;
                })
            );
            if (!error) {
                await db.profile.bulkPut(unsyncedProfile.map(p => ({ ...p, synced: 1 })));
            }
        }

        console.log("Sync Complete");
    } catch (err) {
        console.error("Sync Process Failed:", err);
    }
};

// --- CRUD Wrappers ---

export const DataService = {
    // Memories (Now filtered by childId)
    getMemories: async (childId?: string) => {
        if (!childId) return [];
        // If data was created before version 3 (no childId), it might not show up unless we handle migration.
        // For now, we assume active filtering.
        return await db.memories.where('childId').equals(childId).reverse().sortBy('date');
    },
    addMemory: async (memory: Memory) => {
        await db.memories.put({ ...memory, synced: 0 });
        syncData(); 
    },
    deleteMemory: async (id: string) => {
        await db.memories.delete(id);
        if (isSupabaseConfigured() && navigator.onLine) {
            try { await supabase.from('memories').delete().eq('id', id); } catch (e) {}
        }
    },

    // Growth (Now filtered by childId)
    getGrowth: async (childId?: string) => {
        if (!childId) return [];
        return await db.growth.where('childId').equals(childId).sortBy('month');
    },
    saveGrowth: async (data: GrowthData) => {
        if (!data.id) data.id = Date.now().toString();
        await db.growth.put({ ...data, synced: 0 });
        syncData();
    },
    deleteGrowth: async (id: string) => {
        if (!id) return;
        await db.growth.delete(id); 
        if (isSupabaseConfigured() && navigator.onLine) {
             try { await supabase.from('growth_data').delete().eq('id', id); } catch (e) {}
        }
    },
    
    // Profile
    getProfiles: async () => {
        return await db.profile.toArray();
    },
    saveProfile: async (profile: ChildProfile) => {
        if (!profile.id) profile.id = Date.now().toString();
        await db.profile.put({ ...profile, synced: 0 });
        syncData();
    },
    deleteProfile: async (id: string) => {
        // 1. Delete Profile
        await db.profile.delete(id);
        // 2. Delete associated memories
        await db.memories.where('childId').equals(id).delete();
        // 3. Delete associated growth data
        await db.growth.where('childId').equals(id).delete();

        if (isSupabaseConfigured() && navigator.onLine) {
            try { 
                await supabase.from('child_profile').delete().eq('id', id);
                await supabase.from('memories').delete().eq('childId', id);
                await supabase.from('growth_data').delete().eq('childId', id);
            } catch (e) {}
        }
    }
};