
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    const val = process.env[key];
    return val && val.trim().length > 0 ? val : undefined;
  }
  return undefined;
};

// Only use env variables, no hardcoded strings that might be invalid/expired
const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = () => {
    return !!SUPABASE_URL && 
           !!SUPABASE_ANON_KEY && 
           SUPABASE_URL !== 'https://your-project.supabase.co' &&
           SUPABASE_URL.includes('supabase.co');
};

// Initialize with placeholders if missing to prevent crash, 
// but isSupabaseConfigured() will be checked before any call.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key'
);
