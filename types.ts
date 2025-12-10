export type Language = 'en' | 'mm';
export type Theme = 'light' | 'dark';

export interface Memory {
  id: string;
  title: string;
  date: string;
  description: string;
  imageUrl: string;
  tags: string[];
  synced?: number; // 0 for false, 1 for true (IndexedDB uses numbers for booleans sometimes easier for indexing)
}

export interface GrowthData {
  id?: string; // Added ID for DB tracking
  month: number;
  height: number; // cm
  weight: number; // kg
  synced?: number;
}

export interface ChildProfile {
  id?: string; // Singleton ID
  name: string;
  dob: string;
  birthTime?: string;
  hospitalName?: string;
  birthLocation?: string;
  gender: 'boy' | 'girl';
  synced?: number;
}

export interface StoryState {
  isLoading: boolean;
  content: string;
  error: string | null;
}

export enum TabView {
  HOME = 'HOME',
  ADD_MEMORY = 'ADD_MEMORY',
  STORY = 'STORY',
  GROWTH = 'GROWTH',
  GALLERY = 'GALLERY',
  SETTINGS = 'SETTINGS'
}