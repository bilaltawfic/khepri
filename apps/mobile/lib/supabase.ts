import { createSupabaseClient } from '@khepri/supabase-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  Constants.expoConfig?.extra?.supabasePublishableKey ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Only create client when configuration is present
export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createSupabaseClient({
        url: supabaseUrl,
        key: supabasePublishableKey,
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
