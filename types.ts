export type Language = 'en' | 'mm';
export type Theme = 'light' | 'dark';

export interface Memory {
  id: string;
  title: string;
  date: string;
  description: string;
  imageUrl: string;
  tags: string[];
}

export interface GrowthData {
  month: number;
  height: number; // cm
  weight: number; // kg
}

export interface ChildProfile {
  name: string;
  dob: string;
  birthTime?: string;
  hospitalName?: string;
  birthLocation?: string;
  gender: 'boy' | 'girl';
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