
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    const val = process.env[key];
    return val && val.trim().length > 0 ? val : undefined;
  }
  return undefined;
};

// Use environment variables if present, otherwise fallback to the keys provided by the user
export const SUPABASE_URL = getEnv('SUPABASE_URL') || 'https://lixxftokabpcicnhpkuk.supabase.co';
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHhmdG9rYWJwY2ljbmhwa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzI1MzEyMDAsImV4cCI6MTk4ODA4MzIwMH0.s_qPsg3L3aI41a3TQAl_2J1gqV_2l3Aave6Bv_25gQI';

export const isSupabaseConfigured = () => {
    return !!SUPABASE_URL && 
           !!SUPABASE_ANON_KEY && 
           SUPABASE_URL !== 'https://your-project.supabase.co' &&
           SUPABASE_URL.includes('supabase.co');
};

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);