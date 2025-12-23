import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor/sqlite';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Memory, GrowthData, ChildProfile, Reminder, Story, AppSetting } from '../types';
import { uploadManager } from './uploadManager';
import { syncManager } from './syncManager';

// --- DB Connection Holder ---
let db: SQLiteDBConnection | null = null;
const DB_NAME = 'little_moments_db';
const DB_VERSION = 1;

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


// --- Schema Definition ---
const SCHEMA = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY NOT NULL, childId TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL,
  description TEXT, imageUrls TEXT, tags TEXT, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY NOT NULL, childId TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  date TEXT NOT NULL, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS growth (
  id TEXT PRIMARY KEY NOT NULL, childId TEXT NOT NULL, month INTEGER NOT NULL, height REAL NOT NULL,
  weight REAL NOT NULL, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, profileImage TEXT, dob TEXT NOT NULL,
  birthTime TEXT, hospitalName TEXT, birthLocation TEXT, country TEXT, nationality TEXT,
  fatherName TEXT, motherName TEXT, bloodType TEXT, gender TEXT NOT NULL, birthWeight REAL,
  birthHeight REAL, eyeColor TEXT, hairColor TEXT, notes TEXT, synced INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL,
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
            : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);

        await db.open();
        await db.execute(SCHEMA);
        
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

const uploadFileToSupabase = async (file: File, childId: string, tag: string): Promise<string> => {
    uploadManager.start(file.name);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${childId}/${tag}/${fileName}`;
    const { error } = await supabase.storage.from('images').upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (error) { uploadManager.error(); throw error; }
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    if (!data.publicUrl) { uploadManager.error(); throw new Error("Failed to get public URL."); }
    uploadManager.progress(100, file.name);
    uploadManager.finish();
    return data.publicUrl;
};

const saveImageToFile = async (base64String: string): Promise<string> => {
    const fileName = `images/${crypto.randomUUID()}.jpeg`;
    const result = await Filesystem.writeFile({ path: fileName, data: base64String, directory: Directory.Data });
    return result.uri;
};

const deleteFileByUri = async (uri: string) => {
    if (uri && !uri.startsWith('http')) {
        try { await Filesystem.deleteFile({ path: uri }); } catch(e) { console.error(`Failed to delete file at ${uri}`, e); }
    }
};

const convertUriToDisplaySrc = (uri: string | undefined): string | undefined => {
    if (!uri) return undefined;
    return Capacitor.isNativePlatform() ? Capacitor.convertFileSrc(uri) : uri;
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
                const urls = JSON.parse(item.imageUrls);
                for (const url of urls) await deleteFileByUri(url);
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

    try {
        await syncDeletions();

        const tables = ['stories', 'memories', 'growth', 'profiles', 'reminders'];
        const remoteTables = ['stories', 'memories', 'growth_data', 'child_profile', 'reminders'];
        let unsyncedItems: any[] = [];
        for (const table of tables) {
            const res = await getDb().query(`SELECT * FROM ${table} WHERE synced = 0 AND is_deleted = 0;`);
            unsyncedItems = unsyncedItems.concat(res.values?.map(v => ({...v, _table: table})) || []);
        }

        if (unsyncedItems.length > 0) syncManager.start(unsyncedItems.length);
        let errors: string[] = [];

        for (const item of unsyncedItems) {
            try {
                const { _table, ...payload } = item;
                const remoteTable = remoteTables[tables.indexOf(_table)];
                let uploadPayload = { ...payload };

                if (_table === 'memories' && payload.imageUrls) {
                    const localUrls = JSON.parse(payload.imageUrls);
                    const remoteUrls = await Promise.all(localUrls.map(async (uri: string) => {
                        if (uri && !uri.startsWith('http')) {
                            const fileData = await Filesystem.readFile({ path: uri });
                            const blob = b64toBlob(fileData.data, 'image/jpeg');
                            const file = new File([blob], "upload.jpeg", { type: 'image/jpeg' });
                            const remoteUrl = await uploadFileToSupabase(file, payload.childId, 'memories');
                            await deleteFileByUri(uri); // Clean up local file after successful upload
                            return remoteUrl;
                        }
                        return uri;
                    }));
                    uploadPayload.imageUrls = JSON.stringify(remoteUrls);
                    await getDb().run('UPDATE memories SET imageUrls = ? WHERE id = ?;', [uploadPayload.imageUrls, payload.id]);
                }
                
                if (_table === 'profiles' && payload.profileImage && !payload.profileImage.startsWith('http')) {
                    const fileData = await Filesystem.readFile({ path: payload.profileImage });
                    const blob = b64toBlob(fileData.data, 'image/jpeg');
                    const file = new File([blob], "profile.jpeg", { type: 'image/jpeg' });
                    const remoteUrl = await uploadFileToSupabase(file, payload.id, 'profile');
                    await deleteFileByUri(payload.profileImage);
                    uploadPayload.profileImage = remoteUrl;
                    await getDb().run('UPDATE profiles SET profileImage = ? WHERE id = ?;', [remoteUrl, payload.id]);
                }

                const { error } = await supabase.from(remoteTable).upsert(uploadPayload);
                if (error) throw error;
                await getDb().run(`UPDATE ${_table} SET synced = 1 WHERE id = ?;`, [payload.id]);
                syncManager.itemCompleted();
            } catch (error: any) { errors.push(error.message); }
        }

        if (unsyncedItems.length > 0) {
            if (errors.length > 0) syncManager.error(); else syncManager.finish();
        }

        // Pull remote changes
        for (let i = 0; i < tables.length; i++) {
            const { data } = await supabase.from(remoteTables[i]).select('*');
            if (data) {
                for (const item of data) {
                    const { keys, values, placeholders } = Object.entries(item).reduce(
                      (acc, [k, v]) => ({ keys: [...acc.keys, k], values: [...acc.values, typeof v === 'object' ? JSON.stringify(v) : v], placeholders: [...acc.placeholders, '?'] }),
                      { keys: [] as string[], values: [] as any[], placeholders: [] as string[] }
                    );
                    const query = `INSERT OR REPLACE INTO ${tables[i]} (${keys.join(',')}, synced) VALUES (${placeholders.join(',')}, 1);`;
                    await getDb().run(query, values);
                }
            }
        }
        return { success: errors.length === 0 };
    } catch (err: any) {
        syncManager.error();
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
    getMemories: async (childId?: string) => {
        const q = childId ? `SELECT * FROM memories WHERE childId = ? AND is_deleted = 0 ORDER BY date DESC;` : `SELECT * FROM memories WHERE is_deleted = 0 ORDER BY date DESC;`;
        const p = childId ? [childId] : [];
        const res = await getDb().query(q, p);
        return res.values?.map(m => ({ ...m, imageUrls: JSON.parse(m.imageUrls || '[]').map(convertUriToDisplaySrc), tags: JSON.parse(m.tags || '[]') })) || [];
    },
    addMemory: async (memory: Memory) => {
        const newImageUrls = await Promise.all(memory.imageUrls.map(url => url.startsWith('data:image') ? saveImageToFile(url) : Promise.resolve(url)));
        await getDb().run('INSERT OR REPLACE INTO memories (id, childId, title, date, description, imageUrls, tags, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [memory.id, memory.childId, memory.title, memory.date, memory.description, JSON.stringify(newImageUrls), JSON.stringify(memory.tags), memory.synced ?? 0, 0]);
    },
    deleteMemory: async (id: string) => await getDb().run('UPDATE memories SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getStories: async (childId?: string) => {
        const q = childId ? `SELECT * FROM stories WHERE childId = ? AND is_deleted = 0 ORDER BY date DESC;` : `SELECT * FROM stories WHERE is_deleted = 0 ORDER BY date DESC;`;
        const p = childId ? [childId] : [];
        return (await getDb().query(q, p)).values || [];
    },
    addStory: async (story: Story) => await getDb().run('INSERT OR REPLACE INTO stories (id, childId, title, content, date, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [story.id, story.childId, story.title, story.content, story.date, story.synced ?? 0, 0]),
    deleteStory: async (id: string) => await getDb().run('UPDATE stories SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getGrowth: async (childId?: string) => {
        const q = childId ? `SELECT * FROM growth WHERE childId = ? AND is_deleted = 0 ORDER BY month ASC;` : `SELECT * FROM growth WHERE is_deleted = 0 ORDER BY month ASC;`;
        const p = childId ? [childId] : [];
        return (await getDb().query(q, p)).values || [];
    },
    saveGrowth: async (data: GrowthData) => await getDb().run('INSERT OR REPLACE INTO growth (id, childId, month, height, weight, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [data.id || crypto.randomUUID(), data.childId, data.month, data.height, data.weight, data.synced ?? 0, 0]),
    deleteGrowth: async (id: string) => await getDb().run('UPDATE growth SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getProfiles: async (): Promise<ChildProfile[]> => {
        const res = await getDb().query('SELECT * FROM profiles WHERE is_deleted = 0;');
        return res.values?.map(p => ({ ...p, profileImage: convertUriToDisplaySrc(p.profileImage) })) || [];
    },
    saveProfile: async (profile: ChildProfile) => {
        let newProfileImage = profile.profileImage;
        if (profile.profileImage && profile.profileImage.startsWith('data:image')) {
            newProfileImage = await saveImageToFile(profile.profileImage);
        }
        await getDb().run('INSERT OR REPLACE INTO profiles (id, name, profileImage, dob, gender, birthTime, hospitalName, birthLocation, country, nationality, fatherName, motherName, bloodType, birthWeight, birthHeight, eyeColor, hairColor, notes, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [profile.id || crypto.randomUUID(), profile.name, newProfileImage, profile.dob, profile.gender, profile.birthTime, profile.hospitalName, profile.birthLocation, profile.country, profile.nationality, profile.fatherName, profile.motherName, profile.bloodType, profile.birthWeight, profile.birthHeight, profile.eyeColor, profile.hairColor, profile.notes, profile.synced ?? 0, 0]);
    },
    deleteProfile: async (id: string) => await getDb().run('UPDATE profiles SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getReminders: async () => (await getDb().query('SELECT * FROM reminders WHERE is_deleted = 0 ORDER BY date ASC;')).values || [],
    saveReminder: async (reminder: Reminder) => await getDb().run('INSERT OR REPLACE INTO reminders (id, title, date, type, synced, is_deleted) VALUES (?, ?, ?, ?, ?, ?);',
        [reminder.id, reminder.title, reminder.date, reminder.type, reminder.synced ?? 0, 0]),
    deleteReminder: async (id: string) => await getDb().run('UPDATE reminders SET is_deleted = 1, synced = 0 WHERE id = ?;', [id]),
    getCloudPhotos: async (childId: string): Promise<string[]> => {
        if (!navigator.onLine || !isSupabaseConfigured()) return [];
        try {
            const { data: memoriesList } = await supabase.storage.from('images').list(`${childId}/memories`);
            const { data: profileList } = await supabase.storage.from('images').list(`${childId}/profile`);
            const urls: string[] = [];
            if (memoriesList) {
                for (const file of memoriesList) {
                    if (file.name !== '.emptyFolderPlaceholder') {
                        const { data } = supabase.storage.from('images').getPublicUrl(`${childId}/memories/${file.name}`);
                        if (data.publicUrl) urls.push(data.publicUrl);
                    }
                }
            }
            if (profileList) {
                for (const file of profileList) {
                    if (file.name !== '.emptyFolderPlaceholder') {
                        const { data } = supabase.storage.from('images').getPublicUrl(`${childId}/profile/${file.name}`);
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
