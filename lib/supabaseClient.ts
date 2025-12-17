
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

// Use environment variables if available, otherwise fallback to the provided keys
const SUPABASE_URL = getEnv('SUPABASE_URL') || 'https://lixxftokabpcicnhpkuk.supabase.co';
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpeHhmdG9rYWJwY2ljbmhwa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzE3ODYsImV4cCI6MjA4MDk0Nzc4Nn0.v5RdELw5yhDPBq2FNxeJrtrfnYS_re-SFY_9Puw1Js8';

// Simple validation to avoid the "No API key found" error if the key is empty
const isKeyValid = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 10;

export const supabase = createClient(SUPABASE_URL, isKeyValid ? SUPABASE_ANON_KEY : 'invalid-key-placeholder');

export const isSupabaseConfigured = () => {
    return isKeyValid && SUPABASE_URL !== 'https://your-project.supabase.co';
};
