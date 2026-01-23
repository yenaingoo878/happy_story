
export type Language = 'en' | 'mm';
export type Theme = 'light' | 'dark';

export interface AppSetting {
  key: string; 
  value: any;
}

export interface Memory {
  id: string;
  childId: string;
  title: string;
  date: string;
  description: string;
  imageUrl?: string; 
  imageUrls: string[];
  tags: string[];
  synced?: number; 
  is_deleted?: number; 
}

export interface Story {
  id: string;
  childId: string;
  title: string;
  content: string;
  date: string;
  synced?: number;
  is_deleted?: number;
}

export interface GrowthData {
  id?: string;
  childId: string;
  month: number;
  height: number; 
  weight: number; 
  synced?: number;
  is_deleted?: number;
}

export interface ChildProfile {
  id?: string;
  name: string;
  profileImage?: string;
  dob: string;
  birthTime?: string;
  hospitalName?: string;
  birthLocation?: string;
  city?: string;
  country?: string;
  nationality?: string;
  fatherName?: string;
  motherName?: string;
  bloodType?: string;
  gender: 'boy' | 'girl';
  birthWeight?: number;
  birthHeight?: number;
  eyeColor?: string;
  hairColor?: string;
  notes?: string;
  synced?: number;
  is_deleted?: number;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  type: 'birthday' | 'event' | 'medical';
  synced?: number;
  is_deleted?: number;
}

export enum TabView {
  HOME = 'HOME',
  ADD_MEMORY = 'ADD_MEMORY',
  STORY = 'STORY',
  GROWTH = 'GROWTH',
  GALLERY = 'GALLERY',
  SETTINGS = 'SETTINGS',
  STORIES = 'STORIES'
}
