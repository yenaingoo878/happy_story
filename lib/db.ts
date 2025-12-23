import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Memory, GrowthData, ChildProfile, Reminder, Story, AppSetting } from '../types';
import { uploadManager } from './uploadManager';
import { syncManager } from './syncManager';

// --- DB Connection Holder ---
let db: SQLiteDBConnection | null = null;
const DB_NAME = 'little_moments_db';
const DB_VERSION = 2; // Incremented DB Version for migration

// --- Helper to convert base64 to Blob for uploading ---
const b64toBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

const getActiveUserId = async (): Promise<string> => {
    const isGuest = localStorage.getItem('guest_mode') === 'true';
    if (isGuest) return 'GUEST_USER';
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
        return session.user.id;
    }
    
    console.warn("No active session found, falling back to guest user ID.");
    return 'GUEST_USER';
};


// --- Schema Definition ---
const SCHEMA = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY NOT NULL, childId TEXT NOT NULL, userId TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL,
  description TEXT, imageUrls TEXT, tags TEXT, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY NOT NULL, childId TEXT NOT NULL, userId TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  date TEXT NOT NULL, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS growth (
  id TEXT PRIMARY KEY NOT NULL, childId TEXT NOT NULL, userId TEXT NOT NULL, month INTEGER NOT NULL, height REAL NOT NULL,
  weight REAL NOT NULL, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL, userId TEXT NOT NULL, name TEXT NOT NULL, profileImage TEXT, dob TEXT NOT NULL,
  birthTime TEXT, hospitalName TEXT, birthLocation TEXT, country TEXT, nationality TEXT,
  fatherName TEXT, motherName TEXT, bloodType TEXT, gender TEXT NOT NULL, birthWeight REAL,
  birthHeight REAL, eyeColor TEXT, hairColor TEXT, notes TEXT, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL, userId TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL,
  type TEXT NOT NULL, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL, value TEXT
);
`;

const getDb = (): SQLiteDBConnection => {
    if (!db) throw new Error("Database not initialized. Call initDB first.");
    return db;
};

const runMigrations = async (db: SQLiteDBConnection) => {
    try {
        const { user_version } = (await db.query('PRAGMA user_version;')).values![0];
        
        if (user_version >= DB_VERSION) {
            console.log("Database is up to date.");
            return;
        }

        console.log(`Current DB version: ${user_version}. Migrating to version: ${DB_VERSION}...`);
        await db.beginTransaction();

        // Migration from v1 to v2: Add userId columns
        if (user_version < 2) {
            console.log("Applying migration for v2: Adding userId columns...");
            await db.run(`ALTER TABLE memories ADD COLUMN userId TEXT NOT NULL DEFAULT 'GUEST_USER';`);
            await db.run(`ALTER TABLE stories ADD COLUMN userId TEXT NOT NULL DEFAULT 'GUEST_USER';`);
            await db.run(`ALTER TABLE growth ADD COLUMN userId TEXT NOT NULL DEFAULT 'GUEST_USER';`);
            await db.run(`ALTER TABLE profiles ADD COLUMN userId TEXT NOT NULL DEFAULT 'GUEST_USER';`);
            await db.run(`ALTER TABLE reminders ADD COLUMN userId TEXT NOT NULL DEFAULT 'GUEST_USER';`);
            console.log("userId columns added successfully.");
        }
        
        // --- Add future migrations below using `if (user_version < 3) { ... }` ---
        
        await db.run(`PRAGMA user_version = ${DB_VERSION};`);
        await db.commitTransaction();
        console.log("Database migration completed.");
    } catch (err) {
        await db.rollbackTransaction();
        console.error("Database migration failed:", err);
        throw err;
    }
};

export const initDB = async () => {
    try {
        if (db) return { success: true };
        const platform = Capacitor.getPlatform();
        const sqlite = new SQLiteConnection(CapacitorSQLite);

        if (platform === 'web') {
            const jeepSqlite = document.createElement('jeep-sqlite');
            document.body.appendChild(jeepSqlite);
            await customElements.whenDefined('jeep-sqlite');
            await sqlite.initWebStore();
        }

        const ret = await sqlite.checkConnectionsConsistency();
        db = ret.result
            ? await sqlite.retrieveConnection(DB_NAME, false)
            : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false); // Always create with version 1 to check migrations

        await db.open();
        // Run schema creation first for new users, ensuring it doesn't start its own transaction
        await db.execute(SCHEMA, false); 
        // Run migrations for existing users
        await runMigrations(db);
        
        try {
            await Filesystem.mkdir({ path: 'images', directory: Directory.Data, recursive: true });
        } catch (e) { console.log("Images directory already exists."); }

        return { success: true };
    } catch (err: any) {
        console.error("Failed to initialize Capacitor SQLite DB:", err);
        return { success: false, error: err.message || 'Unknown DB Error' };
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

const uploadFileToSupabase = async (file: File, userId: string, childId: string, tag: string): Promise<string> => {
    uploadManager.start(file.name);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${childId}/${tag}/${fileName}`;
    const { error } = await supabase.storage.from('images').upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (error) { uploadManager.error(); throw error; }
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    if (!data.publicUrl) { uploadManager.error(); throw new Error("Failed to get public URL."); }
    uploadManager.progress(100, file.name);
    uploadManager.finish();
    return data.publicUrl;
};

const saveImageToFile = async (base64String: string): Promise<string> => {
    const base64Data = base64String.startsWith('data:') ? base64String.split(',')[1] : base64String;
    const fileName = `images/${crypto.randomUUID()}.jpeg`;
    const result = await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Data });
    return result.uri;
};

const deleteFileByUri = async (uri: string) => {
    if (uri && !uri.startsWith('http')) {
        try { 
            const path = Capacitor.isNativePlatform() ? uri : uri.split('/Data/')[1];
            if (path) {
                await Filesystem.deleteFile({ path: path, directory: Directory.Data }); 
            }
        } catch(e) { 
            console.error(`Failed to delete file at ${uri}`, e); 
        }
    }
};

const syncDeletions = async () => {
    const tables = {
        memories: 'memories', stories: 'stories', growth: 'growth_data',
        profiles: 'child_profile', reminders: 'reminders'
    };
    for (const [localTable, remoteTable] of Object.entries(tables)) {
        const res = await getDb().query(`SELECT * FROM ${localTable} WHERE is_deleted = 1 AND synced = 0;`);
        for (const item of res.values || []) {
            if (localTable === 'memories' && item.imageUrls) {
                try {
                    const urls = JSON.parse(item.imageUrls);
                    for (const url of urls) await deleteFileByUri(url);
                } catch (e) { console.error("Could not parse image URLs for deletion: ", item.imageUrls); }
            }
            if (localTable === 'profiles' && item.profileImage) {
                await deleteFileByUri(item.profileImage);
            }
            const { error } = await supabase.from(remoteTable).delete().eq('id', item.id);
            if (!error) {
                await getDb().run(`DELETE FROM ${localTable} WHERE id = ?;`, [item.id]);
            }
        }
    }
};

export const syncData = async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) return { success: false, reason: 'Offline or Unconfigured' };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, reason: 'No Active Session' };
    const userId = session.user.id;

    const errors: string[] = [];
    let unsyncedItems: any[] = [];

    try {
        // PUSH PHASE 1: Local Deletions to Remote
        await syncDeletions();

        // PUSH PHASE 2: Local Creates/Updates to Remote
        const tables = ['stories', 'memories', 'growth', 'profiles', 'reminders'];
        const remoteTables = ['stories', 'memories', 'growth_data', 'child_profile', 'reminders'];
        for (const table of tables) {
            const res = await getDb().query(`SELECT * FROM ${table} WHERE synced = 0 AND is_deleted = 0 AND userId = ?;`, [userId]);
            unsyncedItems = unsyncedItems.concat(res.values?.map(v => ({...v, _table: table})) || []);
        }

        if (unsyncedItems.length > 0) syncManager.start(unsyncedItems.length);

        for (const item of unsyncedItems) {
            try {
                const { _table, ...payload } = item;
                const remoteTable = remoteTables[tables.indexOf(_table)];
                let uploadPayload = { ...payload };

                if (_table === 'memories' && payload.imageUrls) {
                    const localUrls = JSON.parse(payload.imageUrls);
                    const remoteUrls = await Promise.all(localUrls.map(async (uri: string) => {
                        if (uri && !uri.startsWith('http')) {
                            const path = Capacitor.isNativePlatform() ? uri : uri.split('/Data/')[1];
                            const fileData = await Filesystem.readFile({ path, directory: Directory.Data });
                            const blob = typeof fileData.data === 'string' ? b64toBlob(fileData.data, 'image/jpeg') : fileData.data;
                            const file = new File([blob], "upload.jpeg", { type: 'image/jpeg' });
                            const remoteUrl = await uploadFileToSupabase(file, userId, payload.childId, 'memories');
                            await deleteFileByUri(uri);
                            return remoteUrl;
                        }
                        return uri;
                    }));
                    uploadPayload.imageUrls = JSON.stringify(remoteUrls);
                    await getDb().run('UPDATE memories SET imageUrls = ? WHERE id = ?;', [uploadPayload.imageUrls, payload.id]);
                }
                
                if (_table === 'profiles' && payload.profileImage && !payload.profileImage.startsWith('http')) {
                    const path = Capacitor.isNativePlatform() ? payload.profileImage : payload.profileImage.split('/Data/')[1];
                    const fileData = await Filesystem.readFile({ path, directory: Directory.Data });
                    const blob = typeof fileData.data === 'string' ? b64toBlob(fileData.data, 'image/jpeg') : fileData.data;
                    const file = new File([blob], "profile.jpeg", { type: 'image/jpeg' });
                    const remoteUrl = await uploadFileToSupabase(file, userId, payload.id, 'profile');
                    await deleteFileByUri(payload.profileImage);
                    uploadPayload.profileImage = remoteUrl;
                    await getDb().run('UPDATE profiles SET profileImage = ? WHERE id = ?;', [remoteUrl, payload.id]);
                }
                
                const cleanPayload = {...uploadPayload, userId };
                delete cleanPayload.is_deleted;
                delete cleanPayload.synced;
                
                const { error } = await supabase.from(remoteTable).upsert(cleanPayload);
                if (error) throw error;
                await getDb().run(`UPDATE ${_table} SET synced = 1 WHERE id = ?;`, [payload.id]);
                syncManager.itemCompleted();
            } catch (error: any) { errors.push(error.message); }
        }

        if (unsyncedItems.length > 0) {
            if (errors.length > 0) syncManager.error(); else syncManager.finish();
        }
        
        // PULL PHASE: Non-destructive merge from Remote to Local
        for (let i = 0; i < tables.length; i++) {
            const localTable = tables[i];
            const remoteTable = remoteTables[i];
            const { data: remoteItems, error: fetchError } = await supabase.from(remoteTable).select('*').eq('userId', userId);

            if (fetchError) {
                console.error(`Error fetching from ${remoteTable}:`, fetchError);
                errors.push(`Failed to fetch ${remoteTable}`);
                continue;
            }

            if (remoteItems) {
                const remoteIds = new Set(remoteItems.map(item => item.id));

                // 1. Merge remote items down to local
                for (const remoteItem of remoteItems) {
                    const res = await getDb().query(`SELECT synced FROM ${localTable} WHERE id = ?;`, [remoteItem.id]);
                    const localItem = res.values?.[0];

                    if (localItem && localItem.synced === 0) {
                        continue; // Prioritize local unsynced changes
                    }

                    const mappedItem = {...remoteItem, synced: 1, is_deleted: 0};
                    const { keys, values, placeholders } = Object.entries(mappedItem).reduce(
                      (acc, [k, v]) => ({ keys: [...acc.keys, k], values: [...acc.values, typeof v === 'object' ? JSON.stringify(v) : v], placeholders: [...acc.placeholders, '?'] }),
                      { keys: [] as string[], values: [] as any[], placeholders: [] as string[] }
                    );
                    const query = `INSERT OR REPLACE INTO ${localTable} (${keys.join(',')}) VALUES (${placeholders.join(',')});`;
                    await getDb().run(query, values);
                }

                // 2. Handle deletions that happened on remote
                const { values: localItemsForDeletionCheck } = await getDb().query(`SELECT id, synced FROM ${localTable} WHERE userId = ?;`, [userId]);
                if (localItemsForDeletionCheck) {
                    for (const localItem of localItemsForDeletionCheck) {
                        if (!remoteIds.has(localItem.id) && localItem.synced === 1) {
                            await getDb().run(`DELETE FROM ${localTable} WHERE id = ?;`, [localItem.id]);
                        }
                    }
                }
            }
        }

        return { success: errors.length === 0 };

    } catch (err: any) {
        if (unsyncedItems.length > 0) syncManager.error();
        console.error("Data sync failed:", err);
        return { success: false, error: err.message };
    }
};


export const DataService = {
    getSetting: async (key: string): Promise<{ key: string, value: any } | undefined> => {
        const res = await getDb().query('SELECT value FROM app_settings WHERE key = ?;', [key]);
        if (res.values && res.values.length > 0) {
            try { return { key, value: JSON.parse(res.values[0].value) }; }
            catch { return { key, value: res.values[0].value }; }
        }
        return undefined;
    },
    saveSetting: async (key: string, value: any) => {
        const valueStr = JSON.stringify(value);
        await getDb().run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', [key, valueStr]);
    },
    removeSetting: async (key: string) => await getDb().run('DELETE FROM app_settings WHERE key = ?;', [key]),
    clearAllUserData: async () => {
        for (const table of ['memories', 'stories', 'growth', 'profiles', 'reminders']) {
            await getDb().run(`DELETE FROM ${table};`);
        }
        try {
            const result = await Filesystem.readdir({ path: 'images', directory: Directory.Data });
            for (const file of result.files) {
                await Filesystem.deleteFile({ path: `images/${file.name}`, directory: Directory.Data });
            }
        } catch (e) { console.log("Could not clear images directory."); }
    },
    uploadImage: async (file: File) => fileToBase64(file),
    getMemories: async (childId?: string): Promise<Memory[]> => {
        const userId = await getActiveUserId();
        const q = childId ? `SELECT * FROM memories WHERE childId = ? AND userId = ? AND is_deleted = 0 ORDER BY date DESC;` : `SELECT * FROM memories WHERE userId = ? AND is_deleted = 0 ORDER BY date DESC;`;
        const p = childId ? [childId, userId] : [userId];
        const res = await getDb().query(q, p);
        const memories = res.values || [];

        return Promise.all(memories.map(async m => {
            const imageUrls = m.imageUrls ? JSON.parse(m.imageUrls) : [];
            const tags = m.tags ? JSON.parse(m.tags) : [];
            const displayUrls = await Promise.all(imageUrls.map(async (uri: string) => {
                if (!uri || uri.startsWith('http')) return uri;
                if (Capacitor.isNativePlatform()) return Capacitor.convertFileSrc(uri);
                try {
                    const path = uri.split('/Data/')[1];
                    if (!path) return '';
                    const file = await Filesystem.readFile({ path, directory: Directory.Data });
                    return `data:image/jpeg;base64,${file.data}`;
                } catch (e) {
                    console.error(`Failed to read web file: ${uri}`, e);
                    return '';
                }
            }));
            return { ...m, imageUrls: displayUrls.filter(Boolean), tags: tags };
        }));
    },
    addMemory: async (memory: Memory) => {
        const userId = await getActiveUserId();
        const newImageUrls = await Promise.all(memory.imageUrls.map(url => url.startsWith('data:image') ? saveImageToFile(url) : Promise.resolve(url)));
        await getDb().run('INSERT OR REPLACE INTO memories (id, childId, userId, title, date, description, imageUrls, tags, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [memory.id, memory.childId, userId, memory.title, memory.date, memory.description, JSON.stringify(newImageUrls), JSON.stringify(memory.tags), memory.synced ?? 0, 0]);
    },
    deleteMemory: async (id: string) => await getDb().run('UPDATE memories SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getStories: async (childId?: string) => {
        const userId = await getActiveUserId();
        const q = childId ? `SELECT * FROM stories WHERE childId = ? AND userId = ? AND is_deleted = 0 ORDER BY date DESC;` : `SELECT * FROM stories WHERE userId = ? AND is_deleted = 0 ORDER BY date DESC;`;
        const p = childId ? [childId, userId] : [userId];
        return (await getDb().query(q, p)).values || [];
    },
    addStory: async (story: Story) => {
        const userId = await getActiveUserId();
        await getDb().run('INSERT OR REPLACE INTO stories (id, childId, userId, title, content, date, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [story.id, story.childId, userId, story.title, story.content, story.date, story.synced ?? 0, 0]);
    },
    deleteStory: async (id: string) => await getDb().run('UPDATE stories SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getGrowth: async (childId?: string) => {
        const userId = await getActiveUserId();
        const q = childId ? `SELECT * FROM growth WHERE childId = ? AND userId = ? AND is_deleted = 0 ORDER BY month ASC;` : `SELECT * FROM growth WHERE userId = ? AND is_deleted = 0 ORDER BY month ASC;`;
        const p = childId ? [childId, userId] : [userId];
        return (await getDb().query(q, p)).values || [];
    },
    saveGrowth: async (data: GrowthData) => {
        const userId = await getActiveUserId();
        await getDb().run('INSERT OR REPLACE INTO growth (id, childId, userId, month, height, weight, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [data.id || crypto.randomUUID(), data.childId, userId, data.month, data.height, data.weight, data.synced ?? 0, 0]);
    },
    deleteGrowth: async (id: string) => await getDb().run('UPDATE growth SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getProfiles: async (): Promise<ChildProfile[]> => {
        const userId = await getActiveUserId();
        const res = await getDb().query('SELECT * FROM profiles WHERE userId = ? AND is_deleted = 0;', [userId]);
        const profiles = res.values || [];

        return Promise.all(profiles.map(async p => {
            let displayUrl = p.profileImage;
            if (p.profileImage && !p.profileImage.startsWith('http')) {
                if (Capacitor.isNativePlatform()) {
                    displayUrl = Capacitor.convertFileSrc(p.profileImage);
                } else {
                    try {
                        const path = p.profileImage.split('/Data/')[1];
                        if (!path) {
                            displayUrl = undefined;
                        } else {
                            const file = await Filesystem.readFile({ path, directory: Directory.Data });
                            displayUrl = `data:image/jpeg;base64,${file.data}`;
                        }
                    } catch (e) {
                        console.error(`Failed to read web profile image: ${p.profileImage}`, e);
                        displayUrl = undefined;
                    }
                }
            }
            return { ...p, profileImage: displayUrl };
        }));
    },
    saveProfile: async (profile: ChildProfile) => {
        const userId = await getActiveUserId();
        let newProfileImage = profile.profileImage;
        if (profile.profileImage && profile.profileImage.startsWith('data:image')) {
            newProfileImage = await saveImageToFile(profile.profileImage);
        }
        await getDb().run('INSERT OR REPLACE INTO profiles (id, userId, name, profileImage, dob, gender, birthTime, hospitalName, birthLocation, country, nationality, fatherName, motherName, bloodType, birthWeight, birthHeight, eyeColor, hairColor, notes, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [profile.id || crypto.randomUUID(), userId, profile.name, newProfileImage, profile.dob, profile.gender, profile.birthTime, profile.hospitalName, profile.birthLocation, profile.country, profile.nationality, profile.fatherName, profile.motherName, profile.bloodType, profile.birthWeight, profile.birthHeight, profile.eyeColor, profile.hairColor, profile.notes, profile.synced ?? 0, 0]);
    },
    deleteProfile: async (id: string) => await getDb().run('UPDATE profiles SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getReminders: async () => {
        const userId = await getActiveUserId();
        return (await getDb().query('SELECT * FROM reminders WHERE userId = ? AND is_deleted = 0 ORDER BY date ASC;', [userId])).values || [];
    },
    saveReminder: async (reminder: Reminder) => {
        const userId = await getActiveUserId();
        await getDb().run('INSERT OR REPLACE INTO reminders (id, userId, title, date, type, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [reminder.id, userId, reminder.title, reminder.date, reminder.type, reminder.synced ?? 0, 0]);
    },
    deleteReminder: async (id: string) => await getDb().run('UPDATE reminders SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getCloudPhotos: async (childId: string): Promise<string[]> => {
        if (!navigator.onLine || !isSupabaseConfigured()) return [];
        const userId = await getActiveUserId();
        if (userId === 'GUEST_USER') return [];
        try {
            const { data: memoriesList } = await supabase.storage.from('images').list(`${userId}/${childId}/memories`);
            const { data: profileList } = await supabase.storage.from('images').list(`${userId}/${childId}/profile`);
            const urls: string[] = [];
            if (memoriesList) {
                for (const file of memoriesList) {
                    if (file.name !== '.emptyFolderPlaceholder') {
                        const { data } = supabase.storage.from('images').getPublicUrl(`${userId}/${childId}/memories/${file.name}`);
                        if (data.publicUrl) urls.push(data.publicUrl);
                    }
                }
            }
            if (profileList) {
                for (const file of profileList) {
                    if (file.name !== '.emptyFolderPlaceholder') {
                        const { data } = supabase.storage.from('images').getPublicUrl(`${userId}/${childId}/profile/${file.name}`);
                        if (data.publicUrl) urls.push(data.publicUrl);
                    }
                }
            }
            return urls;
        } catch (error) {
            console.error("Failed to fetch cloud photos:", error);
            return [];
        }
    }
};