
export type Language = 'en' | 'mm';
export type Theme = 'light' | 'dark';

export interface Memory {
  id: string;
  childId: string;
  title: string;
  date: string;
  description: string;
  imageUrl: string;
  tags: string[];
  synced?: number; 
}

export interface GrowthData {
  id?: string;
  childId: string;
  month: number;
  height: number; // cm
  weight: number; // kg
  synced?: number;
}

export interface ChildProfile {
  id?: string;
  name: string;
  profileImage?: string;
  dob: string;
  birthTime?: string;
  hospitalName?: string;
  birthLocation?: string;
  country?: string;
  bloodType?: string;
  gender: 'boy' | 'girl';
  birthWeight?: number;
  birthHeight?: number;
  synced?: number;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  type: 'birthday' | 'event' | 'medical';
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
