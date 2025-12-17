
import Dexie, { Table } from 'dexie';
import { supabase } from './supabaseClient';
import { Memory, GrowthData, ChildProfile, EventReminder } from '../types';

// Define the interface for the database to ensure type safety
export type LittleMomentsDB = Dexie & {
  memories: Table<Memory>;
  growth: Table<GrowthData>;
  profiles: Table<ChildProfile>;
  events: Table<EventReminder>;
};

// Create Dexie instance directly
const db = new Dexie('LittleMomentsDB') as LittleMomentsDB;

// Define schema
db.version(2).stores({
  memories: 'id, childId, date, synced',
  growth: 'id, childId, month, synced',
  profiles: 'id, name, synced',
  events: 'id, childId, date, synced' // New table for reminders
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

    // IMPORTANT: Check if user is logged in before syncing
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.log("No active session, skipping sync.");
        return;
    }

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
            const { error } = await supabase.from('child_profile').upsert(payload);
            if (!error) {
                await db.profiles.update(p.id!, { synced: 1 });
            } else {
                console.error("Sync error profiles:", error);
            }
        }
        
        // --- EVENTS ---
        // Note: You need to create an 'events' table in Supabase if you want these synced remotely.
        // For now, we'll keep them local-first or assume table exists if errors occur.
        /* 
        const unsyncedEvents = await db.events.where('synced').equals(0).toArray();
        for (const e of unsyncedEvents) {
            const payload = cleanForSync(e);
            const { error } = await supabase.from('events').upsert(payload);
            if (!error) {
                await db.events.update(e.id, { synced: 1 });
            }
        }
        */

        // 2. PULL Remote Changes from Supabase
        
        // Profiles - SMART MERGE
        const { data: profiles, error: profileError } = await supabase.from('child_profile').select('*');
        if (profiles && !profileError) {
             for (const remote of profiles) {
                 const local = await db.profiles.get(remote.id);
                 const merged = local ? { ...local, ...remote } : remote;
                 await db.profiles.put({ ...merged, synced: 1 } as ChildProfile);
             }
        }

        // Growth
        const { data: growth, error: growthError } = await supabase.from('growth_data').select('*');
        if (growth && !growthError) {
            await db.growth.bulkPut(growth.map(g => ({ ...g, synced: 1 } as GrowthData)));
        }

        // Memories
        const { data: memories, error: memError } = await supabase.from('memories').select('*');
        if (memories && !memError) {
            await db.memories.bulkPut(memories.map(m => ({ ...m, synced: 1 } as Memory)));
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
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${childId}/${tag}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images') 
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error("Upload failed:", error);
             if (!navigator.onLine) {
                 return URL.createObjectURL(file);
             }
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
        syncData();
    },
    
    deleteMemory: async (id: string) => {
        await db.memories.delete(id);
        if (navigator.onLine) {
             const { data: { session } } = await supabase.auth.getSession();
             if (session) {
                await supabase.from('memories').delete().eq('id', id);
             }
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
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('growth_data').delete().eq('id', id);
            }
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
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('child_profile').delete().eq('id', id);
            }
        }
    },

    // --- EVENTS (New) ---
    getEvents: async (childId?: string) => {
        if (childId) {
            return await db.events.where('childId').equals(childId).sortBy('date');
        }
        return await db.events.orderBy('date').toArray();
    },

    addEvent: async (event: EventReminder) => {
        await db.events.put({ ...event, synced: 0 });
        // syncData(); // Enable if remote sync is ready
    },

    deleteEvent: async (id: string) => {
        await db.events.delete(id);
    }
};
