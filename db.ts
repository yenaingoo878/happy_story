import { Memory, GrowthData, ChildProfile } from './types';
import { MOCK_MEMORIES, MOCK_GROWTH_DATA } from './constants';

// MOCK DATA for Profiles (since it's not in constants.ts)
const MOCK_PROFILES: ChildProfile[] = [
    {
        id: 'main',
        name: 'မောင်မောင်',
        dob: '2023-01-01',
        gender: 'boy',
        profileImage: '',
        birthTime: '09:00',
        hospitalName: 'Yangon Children Hospital',
        birthLocation: 'Yangon'
    }
];

// MOCK DB Object
export const db = {} as any;

// Disable Init
export const initDB = async () => {
  console.log("Mock DB Initialized (Preview Mode)");
};

// Disable Sync
export const syncData = async () => {
  console.log("Mock Sync Skipped (Preview Mode)");
};

// MOCK DataService
export const DataService = {
    // Memories
    getMemories: async (childId?: string) => {
        // Return mock memories with a slight delay to simulate load
        return new Promise<Memory[]>((resolve) => {
             setTimeout(() => resolve(MOCK_MEMORIES), 300);
        });
    },
    addMemory: async (memory: Memory) => {
        console.log("Mock Add Memory:", memory);
        MOCK_MEMORIES.unshift(memory); // Simple in-memory add
        return Promise.resolve();
    },
    deleteMemory: async (id: string) => {
        console.log("Mock Delete Memory:", id);
        return Promise.resolve();
    },

    // Growth
    getGrowth: async (childId?: string) => {
        return new Promise<GrowthData[]>((resolve) => {
            setTimeout(() => resolve(MOCK_GROWTH_DATA), 300);
       });
    },
    saveGrowth: async (data: GrowthData) => {
        console.log("Mock Save Growth:", data);
        MOCK_GROWTH_DATA.push(data);
        return Promise.resolve();
    },
    deleteGrowth: async (id: string) => {
        console.log("Mock Delete Growth:", id);
        return Promise.resolve();
    },
    
    // Profile
    getProfiles: async () => {
        return new Promise<ChildProfile[]>((resolve) => {
            setTimeout(() => resolve(MOCK_PROFILES), 300);
       });
    },
    saveProfile: async (profile: ChildProfile) => {
        console.log("Mock Save Profile:", profile);
        // If updating existing mock profile
        const index = MOCK_PROFILES.findIndex(p => p.id === profile.id);
        if (index >= 0) {
            MOCK_PROFILES[index] = { ...MOCK_PROFILES[index], ...profile };
        } else {
             MOCK_PROFILES.push(profile);
        }
        return Promise.resolve();
    },
    deleteProfile: async (id: string) => {
        console.log("Mock Delete Profile:", id);
        return Promise.resolve();
    }
};