import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@khepri/supabase-client';
import Constants from 'expo-constants';

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Only create client when configuration is present
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createSupabaseClient({
        url: supabaseUrl,
        key: supabaseAnonKey,
        options: {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        },
      })
    : undefined;

export function isSupabaseConfigured(): boolean {
  return supabase !== undefined;
}
