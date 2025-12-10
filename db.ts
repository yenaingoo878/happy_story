import Dexie, { Table } from 'dexie';
import { Memory, GrowthData, ChildProfile } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MOCK_MEMORIES, MOCK_GROWTH_DATA } from './constants';

// Use instance-based declaration to avoid TS class extension issues
const db = new Dexie('LittleMomentsDB') as Dexie & {
  memories: Table<Memory>;
  growth: Table<GrowthData>;
  profile: Table<ChildProfile>;
};

// Bumped to version 2 to handle the schema change for 'growth' (id vs ++id)
db.version(2).stores({
  memories: 'id, date, synced',
  growth: 'id, month, synced',
  profile: 'id, synced' // Singleton, usually id='main'
});

export { db };

// --- Initialization Logic ---
export const initDB = async () => {
  const memCount = await db.memories.count();
  if (memCount === 0) {
    // Load Mocks if empty
    await db.memories.bulkAdd(MOCK_MEMORIES.map(m => ({...m, synced: 0})));
  }

  const growthCount = await db.growth.count();
  if (growthCount === 0) {
     const growthWithIds = MOCK_GROWTH_DATA.map((g, i) => ({
         ...g,
         id: `mock_${i}`, // Use prefix to avoid simple collision
         synced: 0
     }));
     await db.growth.bulkAdd(growthWithIds);
  }

  const profileCount = await db.profile.count();
  if (profileCount === 0) {
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
            } else {
                console.error("Push Memories Error:", error);
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
            } else {
                console.error("Push Growth Error:", error);
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
            } else {
                 console.error("Push Profile Error:", error);
            }
        }

        // --- PULL (Cloud -> Local) ---
        
        // Memories
        const { data: remoteMemories, error: memError } = await supabase.from('memories').select('*');
        if (remoteMemories && !memError) {
            await db.memories.bulkPut(remoteMemories.map(m => ({ ...m, synced: 1 })));
        }

        // Growth
        const { data: remoteGrowth, error: growthError } = await supabase.from('growth_data').select('*');
        if (remoteGrowth && !growthError) {
             await db.growth.bulkPut(remoteGrowth.map(g => ({ ...g, synced: 1 })));
        }

        // Profile
        const { data: remoteProfile, error: profileError } = await supabase.from('child_profile').select('*');
        if (remoteProfile && !profileError) {
             await db.profile.bulkPut(remoteProfile.map(p => ({ ...p, synced: 1 })));
        }

        console.log("Sync Complete");
    } catch (err) {
        console.error("Sync Process Failed:", err);
    }
};

// --- CRUD Wrappers ---

export const DataService = {
    // Memories
    getMemories: async () => {
        return await db.memories.orderBy('date').reverse().toArray();
    },
    addMemory: async (memory: Memory) => {
        await db.memories.put({ ...memory, synced: 0 });
        syncData(); // Try to sync immediately
    },
    deleteMemory: async (id: string) => {
        await db.memories.delete(id);
        if (isSupabaseConfigured()) {
            try {
                await supabase.from('memories').delete().eq('id', id);
            } catch (e) { console.warn("Offline delete ignored for now"); }
        }
    },

    // Growth
    getGrowth: async () => {
        return await db.growth.orderBy('month').toArray();
    },
    saveGrowth: async (data: GrowthData) => {
        if (!data.id) data.id = Date.now().toString();
        await db.growth.put({ ...data, synced: 0 });
        syncData();
    },
    deleteGrowth: async (id: string) => {
        if (!id) return;
        await db.growth.delete(id); 
         if (isSupabaseConfigured()) {
            try {
                await supabase.from('growth_data').delete().eq('id', id);
            } catch (e) { console.warn("Offline delete ignored for now"); }
        }
    },
    
    // Profile
    getProfile: async () => {
        const p = await db.profile.get('main');
        return p || { name: '', dob: '', gender: 'boy' } as ChildProfile;
    },
    saveProfile: async (profile: ChildProfile) => {
        await db.profile.put({ ...profile, id: 'main', synced: 0 });
        syncData();
    }
};