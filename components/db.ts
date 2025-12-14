
// import Dexie, { Table } from 'dexie';
// import { Memory, GrowthData, ChildProfile } from './types';
// import { supabase, isSupabaseConfigured } from './supabaseClient';

// // Use instance-based declaration to avoid TS class extension issues
// const db = new Dexie('LittleMomentsDB') as Dexie & {
//   memories: Table<Memory>;
//   growth: Table<GrowthData>;
//   profile: Table<ChildProfile>;
// };

// // Bumped to version 3 to support childId indexing
// db.version(3).stores({
//   memories: 'id, childId, date, synced',
//   growth: 'id, childId, month, synced',
//   profile: 'id, synced'
// });

// export { db };

// // Helper for ID generation
// export const generateId = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return Date.now().toString() + Math.random().toString(36).substring(2);
// };

// // --- Initialization Logic ---
// export const initDB = async () => {
//   const profileCount = await db.profile.count();
//   if (profileCount === 0) {
//       // Create a default profile if none exist
//       const defaultId = generateId(); // Use generated ID instead of hardcoded 'main'
//       await db.profile.add({
//           id: defaultId,
//           name: '',
//           dob: '',
//           gender: 'boy',
//           synced: 0
//       });
//   }
// };

// // --- Sync Logic (Bi-directional: IndexedDB <-> Supabase) ---
// export const syncData = async () => {
//     if (!navigator.onLine) {
//         console.log("Offline, skipping sync");
//         return;
//     }
    
//     if (!isSupabaseConfigured()) {
//         console.warn("Supabase not configured (using placeholders?), skipping sync");
//         return;
//     }

//     console.log("Starting Sync...");

//     try {
//         // --- 1. PUSH (Local -> Cloud) ---
//         // Upload local changes that haven't been synced yet
        
//         // Memories
//         const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
//         if (unsyncedMemories.length > 0) {
//             console.log(`Pushing ${unsyncedMemories.length} memories...`);
//             const { error } = await supabase.from('memories').upsert(
//                 unsyncedMemories.map(m => {
//                     const { synced, ...rest } = m;
//                     return rest;
//                 })
//             );
//             if (error) console.error("Error pushing memories:", error);
//             else {
//                 await db.memories.bulkPut(unsyncedMemories.map(m => ({ ...m, synced: 1 })));
//             }
//         }

//         // Growth
//         const unsyncedGrowth = await db.growth.where('synced').equals(0).toArray();
//         if (unsyncedGrowth.length > 0) {
//             console.log(`Pushing ${unsyncedGrowth.length} growth records...`);
//             const { error } = await supabase.from('growth_data').upsert(
//                 unsyncedGrowth.map(g => {
//                     const { synced, ...rest } = g;
//                     return rest;
//                 })
//             );
//             if (error) console.error("Error pushing growth:", error);
//             else {
//                 await db.growth.bulkPut(unsyncedGrowth.map(g => ({ ...g, synced: 1 })));
//             }
//         }

//         // Profile
//         const unsyncedProfile = await db.profile.where('synced').equals(0).toArray();
//         // Only push profiles that actually have a name (ignore the default empty one created by initDB)
//         const validProfilesToPush = unsyncedProfile.filter(p => p.name && p.name.trim() !== '');
        
//         if (validProfilesToPush.length > 0) {
//             console.log(`Pushing ${validProfilesToPush.length} profiles...`);
//             const { error } = await supabase.from('child_profile').upsert(
//                 validProfilesToPush.map(p => {
//                     const { synced, ...rest } = p;
//                     return rest;
//                 })
//             );
//             if (error) console.error("Error pushing profiles:", error);
//             else {
//                 await db.profile.bulkPut(validProfilesToPush.map(p => ({ ...p, synced: 1 })));
//             }
//         }

//         // --- 2. PULL (Cloud -> Local) ---
//         // Download data from Supabase to ensure we have the latest from other devices
        
//         // Fetch Profiles
//         const { data: remoteProfiles, error: profileError } = await supabase.from('child_profile').select('*');
//         if (profileError) console.error("Error fetching profiles:", profileError);
//         else if (remoteProfiles) {
//             await db.transaction('rw', db.profile, async () => {
//                 const localUnsynced = await db.profile.where('synced').equals(0).toArray();
                
//                 // IMPORTANT FIX: 
//                 // Don't consider the default empty profile (name='') as a "local change" that needs protection.
//                 // This allows the cloud profile to overwrite the empty default one upon re-login.
//                 const realUnsyncedIds = new Set(
//                     localUnsynced
//                         .filter(p => p.name && p.name.trim().length > 0)
//                         .map(p => p.id)
//                 );
                
//                 const toSave = remoteProfiles
//                     .filter(p => !realUnsyncedIds.has(p.id))
//                     .map(p => ({ ...p, synced: 1 }));
                
//                 if (toSave.length > 0) {
//                     await db.profile.bulkPut(toSave);
//                 }
//             });
//         }

//         // Fetch Memories
//         const { data: remoteMemories, error: memoryError } = await supabase.from('memories').select('*');
//         if (memoryError) console.error("Error fetching memories:", memoryError);
//         else if (remoteMemories) {
//             await db.transaction('rw', db.memories, async () => {
//                 const localUnsynced = await db.memories.where('synced').equals(0).toArray();
//                 const unsyncedIds = new Set(localUnsynced.map(m => m.id));
                
//                 const toSave = remoteMemories
//                     .filter(m => !unsyncedIds.has(m.id))
//                     .map(m => ({ ...m, synced: 1 }));
                
//                 if (toSave.length > 0) {
//                     await db.memories.bulkPut(toSave);
//                 }
//             });
//         }

//         // Fetch Growth Data
//         const { data: remoteGrowth, error: growthError } = await supabase.from('growth_data').select('*');
//         if (growthError) console.error("Error fetching growth:", growthError);
//         else if (remoteGrowth) {
//              await db.transaction('rw', db.growth, async () => {
//                 const localUnsynced = await db.growth.where('synced').equals(0).toArray();
//                 const unsyncedIds = new Set(localUnsynced.map(g => g.id));
                
//                 const toSave = remoteGrowth
//                     .filter(g => !unsyncedIds.has(g.id))
//                     .map(g => ({ ...g, synced: 1 }));
                
//                 if (toSave.length > 0) {
//                     await db.growth.bulkPut(toSave);
//                 }
//             });
//         }

//         console.log("Sync Complete");
//     } catch (err) {
//         console.error("Sync Process Failed Unexpectedly:", err);
//     }
// };

// // --- CRUD Wrappers ---

// export const DataService = {
//     // Memories (Now filtered by childId)
//     getMemories: async (childId?: string) => {
//         if (!childId) return [];
//         return await db.memories.where('childId').equals(childId).reverse().sortBy('date');
//     },
//     addMemory: async (memory: Memory) => {
//         const memoryToSave = { ...memory };
//         if (!memoryToSave.id) memoryToSave.id = generateId();
//         await db.memories.put({ ...memoryToSave, synced: 0 });
//         syncData(); 
//     },
//     deleteMemory: async (id: string) => {
//         await db.memories.delete(id);
//         if (isSupabaseConfigured() && navigator.onLine) {
//             try { await supabase.from('memories').delete().eq('id', id); } catch (e) {}
//         }
//     },

//     // Growth (Now filtered by childId)
//     getGrowth: async (childId?: string) => {
//         if (!childId) return [];
//         return await db.growth.where('childId').equals(childId).sortBy('month');
//     },
//     saveGrowth: async (data: GrowthData) => {
//         const dataToSave = { ...data };
//         if (!dataToSave.id) dataToSave.id = generateId();
//         await db.growth.put({ ...dataToSave, synced: 0 });
//         syncData();
//     },
//     deleteGrowth: async (id: string) => {
//         if (!id) return;
//         await db.growth.delete(id); 
//         if (isSupabaseConfigured() && navigator.onLine) {
//              try { await supabase.from('growth_data').delete().eq('id', id); } catch (e) {}
//         }
//     },
    
//     // Profile
//     getProfiles: async () => {
//         return await db.profile.toArray();
//     },
//     saveProfile: async (profile: ChildProfile) => {
//         const id = profile.id || generateId();
//         await db.profile.put({ ...profile, id, synced: 0 });
//         syncData();
//         return id;
//     },
//     deleteProfile: async (id: string) => {
//         // 1. Delete Profile
//         await db.profile.delete(id);
//         // 2. Delete associated memories
//         await db.memories.where('childId').equals(id).delete();
//         // 3. Delete associated growth data
//         await db.growth.where('childId').equals(id).delete();

//         if (isSupabaseConfigured() && navigator.onLine) {
//             try { 
//                 await supabase.from('child_profile').delete().eq('id', id);
//                 await supabase.from('memories').delete().eq('childId', id);
//                 await supabase.from('growth_data').delete().eq('childId', id);
//             } catch (e) {}
//         }
//     },
//     clearLocalData: async () => {
//         await db.memories.clear();
//         await db.growth.clear();
//         await db.profile.clear();
//     }
// };

// import Dexie, { Table } from 'dexie';
// import { Memory, GrowthData, ChildProfile } from './types';
// import { supabase, isSupabaseConfigured } from './supabaseClient';

// /* =========================================================
//    Dexie DB Setup
//    ========================================================= */

// const db = new Dexie('LittleMomentsDB') as Dexie & {
//   memories: Table<Memory>;
//   growth: Table<GrowthData>;
//   profile: Table<ChildProfile>;
// };

// // v3 schema (with childId indexes)
// db.version(3).stores({
//   memories: 'id, childId, date, synced',
//   growth: 'id, childId, month, synced',
//   profile: 'id, synced'
// });

// export { db };

// /* =========================================================
//    Helpers
//    ========================================================= */

// export const generateId = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return Date.now().toString() + Math.random().toString(36).substring(2);
// };

// // Initialize default profile (offline-first)
// export const initDB = async () => {
//   const profileCount = await db.profile.count();
//   if (profileCount === 0) {
//     await db.profile.add({
//       id: generateId(),
//       name: '',
//       dob: '',
//       gender: 'boy',
//       synced: 0
//     });
//   }
// };

// // Ensure Supabase Auth (anonymous) exists
// export const initAuth = async () => {
//   const { data } = await supabase.auth.getSession();
//   if (!data.session) {
//     await supabase.auth.signInAnonymously();
//     console.log('✅ Supabase anonymous auth ready');
//   }
// };

// /* =========================================================
//    Sync Logic (Bi-directional)
//    ========================================================= */

// let syncing = false;

// export const syncData = async () => {
//   if (syncing) return;
//   if (!navigator.onLine) return;
//   if (!isSupabaseConfigured()) return;

//   syncing = true;
//   console.log('🔄 Sync start');

//   try {
//     /* ---------------- PUSH: Local -> Cloud ---------------- */

//     // Memories
//     const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
//     if (unsyncedMemories.length) {
//       const { error } = await supabase.from('memories').upsert(
//         unsyncedMemories.map(m => {
//           const { synced, ...rest } = m;
//           return rest;
//         })
//       );
//       if (!error) {
//         await db.memories.bulkPut(unsyncedMemories.map(m => ({ ...m, synced: 1 })));
//       } else {
//         console.error('❌ Push memories:', error);
//       }
//     }

//     // Growth (conflict-safe)
//     const unsyncedGrowth = await db.growth.where('synced').equals(0).toArray();
//     if (unsyncedGrowth.length) {
//       const { error } = await supabase
//         .from('growth_data')
//         .upsert(
//           unsyncedGrowth.map(g => {
//             const { synced, ...rest } = g;
//             return rest; // user_id auto from auth.uid()
//           }),
//           { onConflict: '"childId",month' }
//         );

//       if (!error) {
//         await db.growth.bulkPut(unsyncedGrowth.map(g => ({ ...g, synced: 1 })));
//       } else {
//         console.error('❌ Push growth:', error);
//       }
//     }

//     // Profiles (ignore empty default profile)
//     const unsyncedProfiles = (await db.profile.where('synced').equals(0).toArray())
//       .filter(p => p.name && p.name.trim() !== '');

//     if (unsyncedProfiles.length) {
//       const { error } = await supabase.from('child_profile').upsert(
//         unsyncedProfiles.map(p => {
//           const { synced, ...rest } = p;
//           return rest;
//         })
//       );
//       if (!error) {
//         await db.profile.bulkPut(unsyncedProfiles.map(p => ({ ...p, synced: 1 })));
//       } else {
//         console.error('❌ Push profiles:', error);
//       }
//     }

//     /* ---------------- PULL: Cloud -> Local ---------------- */

//     const userId = (await supabase.auth.getUser()).data.user?.id;

//     // Profiles
//     const { data: remoteProfiles, error: profileErr } = await supabase
//       .from('child_profile')
//       .select('*');

//     if (!profileErr && remoteProfiles) {
//       await db.transaction('rw', db.profile, async () => {
//         const localUnsynced = await db.profile.where('synced').equals(0).toArray();
//         const protectedIds = new Set(
//           localUnsynced.filter(p => p.name && p.name.trim()).map(p => p.id)
//         );

//         const toSave = remoteProfiles
//           .filter(p => !protectedIds.has(p.id))
//           .map(p => ({ ...p, synced: 1 }));

//         if (toSave.length) await db.profile.bulkPut(toSave);
//       });
//     }

//     // Memories
//     const { data: remoteMemories, error: memErr } = await supabase
//       .from('memories')
//       .select('*');

//     if (!memErr && remoteMemories) {
//       await db.transaction('rw', db.memories, async () => {
//         const localUnsynced = await db.memories.where('synced').equals(0).toArray();
//         const unsyncedIds = new Set(localUnsynced.map(m => m.id));

//         const toSave = remoteMemories
//           .filter(m => !unsyncedIds.has(m.id))
//           .map(m => ({ ...m, synced: 1 }));

//         if (toSave.length) await db.memories.bulkPut(toSave);
//       });
//     }

//     // Growth (RLS compatible + explicit select)
//     const { data: remoteGrowth, error: growthErr } = await supabase
//       .from('growth_data')
//       .select('id, "childId", month, height, weight')
//       .eq('user_id', userId);

//     if (!growthErr && remoteGrowth) {
//       await db.transaction('rw', db.growth, async () => {
//         const localUnsynced = await db.growth.where('synced').equals(0).toArray();
//         const unsyncedIds = new Set(localUnsynced.map(g => g.id));

//         const toSave = remoteGrowth
//           .filter(g => !unsyncedIds.has(g.id))
//           .map(g => ({
//             id: g.id,
//             childId: g.childId,
//             month: g.month,
//             height: g.height,
//             weight: g.weight,
//             synced: 1
//           }));

//         if (toSave.length) await db.growth.bulkPut(toSave);
//       });
//     }

//     console.log('✅ Sync complete');
//   } catch (err) {
//     console.error('❌ Sync failed:', err);
//   } finally {
//     syncing = false;
//   }
// };

// /* =========================================================
//    CRUD Service
//    ========================================================= */

// export const DataService = {
//   /* -------- Memories -------- */
//   getMemories: async (childId?: string) => {
//     if (!childId) return [];
//     return await db.memories
//       .where('childId')
//       .equals(childId)
//       .orderBy('date')
//       .reverse()
//       .toArray();
//   },

//   addMemory: async (memory: Memory) => {
//     const id = memory.id || generateId();
//     await db.memories.put({ ...memory, id, synced: 0 });
//     syncData();
//   },

//   deleteMemory: async (id: string) => {
//     await db.memories.delete(id);
//     if (navigator.onLine) {
//       try { await supabase.from('memories').delete().eq('id', id); } catch {}
//     }
//   },

//   /* -------- Growth -------- */
//   getGrowth: async (childId?: string) => {
//     if (!childId) return [];
//     return await db.growth.where('childId').equals(childId).sortBy('month');
//   },

//   saveGrowth: async (data: GrowthData) => {
//     const id = data.id || generateId();
//     await db.growth.put({ ...data, id, synced: 0 });
//     syncData();
//   },

//   deleteGrowth: async (id: string) => {
//     await db.growth.delete(id);
//     if (navigator.onLine) {
//       try { await supabase.from('growth_data').delete().eq('id', id); } catch {}
//     }
//   },

//   /* -------- Profiles -------- */
//   getProfiles: async () => db.profile.toArray(),

//   saveProfile: async (profile: ChildProfile) => {
//     const id = profile.id || generateId();
//     await db.profile.put({ ...profile, id, synced: 0 });
//     syncData();
//     return id;
//   },

//   deleteProfile: async (id: string) => {
//     await db.profile.delete(id);
//     await db.memories.where('childId').equals(id).delete();
//     await db.growth.where('childId').equals(id).delete();

//     if (navigator.onLine) {
//       try {
//         await supabase.from('child_profile').delete().eq('id', id);
//         await supabase.from('memories').delete().eq('childId', id);
//         await supabase.from('growth_data').delete().eq('childId', id);
//       } catch {}
//     }
//   },

//   clearLocalData: async () => {
//     await db.memories.clear();
//     await db.growth.clear();
//     await db.profile.clear();
//     await initDB();
//   }
// };



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

// Helper for ID generation (Ensures valid UUID format for Postgres)
export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for UUID v4 compliance (Postgres strict uuid type requires this format)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- Initialization Logic ---
export const initDB = async () => {
  const profileCount = await db.profile.count();
  if (profileCount === 0) {
      // Create a default profile if none exist
      const defaultId = generateId(); 
      await db.profile.add({
          id: defaultId,
          name: '',
          dob: '',
          gender: 'boy',
          synced: 0
      });
  }
};

// --- Sync Logic (Bi-directional: IndexedDB <-> Supabase) ---
export const syncData = async () => {
    if (!navigator.onLine) {
        console.log("Offline, skipping sync");
        return;
    }
    
    if (!isSupabaseConfigured()) {
        console.warn("Supabase not configured (using placeholders?), skipping sync");
        return;
    }

    console.log("Starting Sync...");

    try {
        // --- 1. PUSH (Local -> Cloud) ---
        // Upload local changes that haven't been synced yet
        
        // PRIORITY 1: Profile (Must be synced FIRST because other tables reference it via Foreign Key)
        const unsyncedProfile = await db.profile.where('synced').equals(0).toArray();
        // Only push profiles that actually have a name (ignore the default empty one created by initDB)
        const validProfilesToPush = unsyncedProfile.filter(p => p.name && p.name.trim() !== '');
        
        if (validProfilesToPush.length > 0) {
            console.log(`Pushing ${validProfilesToPush.length} profiles...`);
            const { error } = await supabase.from('child_profile').upsert(
                validProfilesToPush.map(p => {
                    const { synced, ...rest } = p;
                    return rest;
                })
            );
            if (error) console.error("Error pushing profiles:", error);
            else {
                await db.profile.bulkPut(validProfilesToPush.map(p => ({ ...p, synced: 1 })));
            }
        }
        
        // PRIORITY 2: Memories
        const unsyncedMemories = await db.memories.where('synced').equals(0).toArray();
        if (unsyncedMemories.length > 0) {
            console.log(`Pushing ${unsyncedMemories.length} memories...`);
            const { error } = await supabase.from('memories').upsert(
                unsyncedMemories.map(m => {
                    const { synced, ...rest } = m;
                    return rest;
                })
            );
            if (error) console.error("Error pushing memories:", error);
            else {
                await db.memories.bulkPut(unsyncedMemories.map(m => ({ ...m, synced: 1 })));
            }
        }

        // PRIORITY 3: Growth Data
        const unsyncedGrowth = await db.growth.where('synced').equals(0).toArray();
        if (unsyncedGrowth.length > 0) {
            console.log(`Pushing ${unsyncedGrowth.length} growth records...`);
            const { error } = await supabase.from('growth_data').upsert(
                unsyncedGrowth.map(g => {
                    const { synced, ...rest } = g;
                    return rest;
                })
            );
            if (error) console.error("Error pushing growth:", error);
            else {
                await db.growth.bulkPut(unsyncedGrowth.map(g => ({ ...g, synced: 1 })));
            }
        }

        // --- 2. PULL (Cloud -> Local) ---
        // Download data from Supabase to ensure we have the latest from other devices
        
        // Fetch Profiles
        const { data: remoteProfiles, error: profileError } = await supabase.from('child_profile').select('*');
        if (profileError) console.error("Error fetching profiles:", profileError);
        else if (remoteProfiles) {
            await db.transaction('rw', db.profile, async () => {
                const localUnsynced = await db.profile.where('synced').equals(0).toArray();
                
                // IMPORTANT FIX: 
                // Don't consider the default empty profile (name='') as a "local change" that needs protection.
                // This allows the cloud profile to overwrite the empty default one upon re-login.
                const realUnsyncedIds = new Set(
                    localUnsynced
                        .filter(p => p.name && p.name.trim().length > 0)
                        .map(p => p.id)
                );
                
                const toSave = remoteProfiles
                    .filter(p => !realUnsyncedIds.has(p.id))
                    .map(p => ({ ...p, synced: 1 }));
                
                if (toSave.length > 0) {
                    await db.profile.bulkPut(toSave);
                }
            });
        }

        // Fetch Memories
        const { data: remoteMemories, error: memoryError } = await supabase.from('memories').select('*');
        if (memoryError) console.error("Error fetching memories:", memoryError);
        else if (remoteMemories) {
            await db.transaction('rw', db.memories, async () => {
                const localUnsynced = await db.memories.where('synced').equals(0).toArray();
                const unsyncedIds = new Set(localUnsynced.map(m => m.id));
                
                const toSave = remoteMemories
                    .filter(m => !unsyncedIds.has(m.id))
                    .map(m => ({ ...m, synced: 1 }));
                
                if (toSave.length > 0) {
                    await db.memories.bulkPut(toSave);
                }
            });
        }

        // Fetch Growth Data
        const { data: remoteGrowth, error: growthError } = await supabase.from('growth_data').select('*');
        if (growthError) console.error("Error fetching growth:", growthError);
        else if (remoteGrowth) {
             await db.transaction('rw', db.growth, async () => {
                const localUnsynced = await db.growth.where('synced').equals(0).toArray();
                const unsyncedIds = new Set(localUnsynced.map(g => g.id));
                
                const toSave = remoteGrowth
                    .filter(g => !unsyncedIds.has(g.id))
                    .map(g => ({ ...g, synced: 1 }));
                
                if (toSave.length > 0) {
                    await db.growth.bulkPut(toSave);
                }
            });
        }

        console.log("Sync Complete");
    } catch (err) {
        console.error("Sync Process Failed Unexpectedly:", err);
    }
};

// --- CRUD Wrappers ---

export const DataService = {
    // Memories (Now filtered by childId)
    getMemories: async (childId?: string) => {
        if (!childId) return [];
        return await db.memories.where('childId').equals(childId).reverse().sortBy('date');
    },
    addMemory: async (memory: Memory) => {
        const memoryToSave = { ...memory };
        if (!memoryToSave.id) memoryToSave.id = generateId();
        await db.memories.put({ ...memoryToSave, synced: 0 });
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
        const dataToSave = { ...data };
        if (!dataToSave.id) dataToSave.id = generateId();
        await db.growth.put({ ...dataToSave, synced: 0 });
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
        const id = profile.id || generateId();
        await db.profile.put({ ...profile, id, synced: 0 });
        syncData();
        return id;
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
    },
    clearLocalData: async () => {
        await db.memories.clear();
        await db.growth.clear();
        await db.profile.clear();
    }
};


