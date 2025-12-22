
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
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHhmdG9rYWJwY2ljbmhwa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzE3ODYsImV4cCI6MjA4MDk0Nzc4Nn0.v5RdELw5yhDPBq2FNxeJrtrfnYS_re-SFY_9Puw1Js8';

export const isSupabaseConfigured = () => {
    return !!SUPABASE_URL && 
           !!SUPABASE_ANON_KEY && 
           SUPABASE_URL !== 'https://your-project.supabase.co' &&
           SUPABASE_URL.includes('supabase.co');
};

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);