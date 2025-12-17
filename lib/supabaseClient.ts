
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    const val = process.env[key];
    return val && val.trim().length > 0 ? val : undefined;
  }
  return undefined;
};

// Use environment variables if available, otherwise fallback to the provided keys
const SUPABASE_URL = getEnv('SUPABASE_URL') || 'https://lixxftokabpcicnhpkuk.supabase.co';
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHhmdG9rYWJwY2ljbmhwa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzE3ODYsImV4cCI6MjA4MDk0Nzc4Nn0.v5RdELw5yhDPBq2FNxeJrtrfnYS_re-SFY_9Puw1Js8';

// Simple validation to avoid the "No API key found" error if the key is empty or placeholder
const isKeyValid = !!SUPABASE_ANON_KEY && 
                   SUPABASE_ANON_KEY !== 'your-anon-key' && 
                   SUPABASE_ANON_KEY.length > 20;

const isUrlValid = !!SUPABASE_URL && 
                   SUPABASE_URL !== 'https://your-project.supabase.co';

// Initialize the client. We use a placeholder if the key is missing to avoid crashing on init,
// but we will check `isSupabaseConfigured()` before making actual requests.
export const supabase = createClient(
  isUrlValid ? SUPABASE_URL : 'https://invalid-placeholder.supabase.co', 
  isKeyValid ? SUPABASE_ANON_KEY : 'invalid-key-placeholder'
);

export const isSupabaseConfigured = () => {
    return isKeyValid && isUrlValid;
};
