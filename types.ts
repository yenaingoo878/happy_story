
export type Language = 'en' | 'mm';
export type Theme = 'light' | 'dark';

export interface Memory {
  id: string;
  childId: string; // Added to link memory to specific child
  title: string;
  date: string;
  description: string;
  imageUrl: string;
  tags: string[];
  synced?: number; 
}

export interface GrowthData {
  id?: string;
  childId: string; // Added to link growth data to specific child
  month: number;
  height: number; // cm
  weight: number; // kg
  synced?: number;
}

export interface ChildProfile {
  id?: string; // Singleton ID
  name: string;
  profileImage?: string; // Added profile image
  dob: string;
  birthTime?: string;
  hospitalName?: string;
  birthLocation?: string; // Maps to City
  country?: string; // Added Country
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
