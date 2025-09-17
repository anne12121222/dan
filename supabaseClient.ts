import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// IMPORTANT: Replace with your actual Supabase project URL and anon key
// FIX: Added explicit string type to prevent TypeScript from inferring a literal type, which caused a comparison error.
const supabaseUrl: string = 'https://iatbotuvchoykaeiafas.supabase.co';
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdGJvdHV2Y2hveWthZWlhZmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTI4MjUsImV4cCI6MjA3MzY4ODgyNX0.sbNmmmovQnBXvUcA_DcQCzhiorbRV8I5KoyxHolcuys';

let supabase: SupabaseClient<Database> | null = null;
let isSupabaseConfigured = false;

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.error("--- SUPABASE CONFIGURATION NEEDED ---");
    console.error("Please update the `supabaseClient.ts` file with your project URL and anon key from supabase.com.");
    console.error("-------------------------------------");
    isSupabaseConfigured = false;
} else {
    try {
        supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
        isSupabaseConfigured = true;
    } catch (error: any) {
        console.error(`Failed to initialize Supabase client: ${error.message}. Please check if the URL is correct.`);
        isSupabaseConfigured = false;
        supabase = null;
    }
}

export { supabase, isSupabaseConfigured };