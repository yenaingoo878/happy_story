
import { createClient } from '@supabase/supabase-js';

// Helper to safely get env vars in Vite environment
const getEnv = (key: string) => {
  // Fix: Cast import.meta to any to resolve TS error 'Property env does not exist on type ImportMeta'
  const meta = import.meta as any;
  if (meta.env && meta.env[key]) {
      return meta.env[key];
  }
  // Fallback for some non-Vite environments or older setups
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  return undefined;
};

// Use fallbacks if env vars are missing
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://lixxftokabpcicnhpkuk.supabase.co';
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHhmdG9rYWJwY2ljbmhwa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzE3ODYsImV4cCI6MjA4MDk0Nzc4Nn0.v5RdELw5yhDPBq2FNxeJrtrfnYS_re-SFY_9Puw1Js8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = () => {
    // Check if we are using placeholder values (assuming user might change the hardcoded fallback eventually)
    return SUPABASE_URL !== 'https://your-project.supabase.co' && SUPABASE_ANON_KEY !== 'your-anon-key';
};
