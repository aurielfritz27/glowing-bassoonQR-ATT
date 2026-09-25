import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Project ref parsed from the Supabase URL, e.g. "quekgupgyzjdyjqvqtlx". */
export const supabaseProjectRef =
  /^https?:\/\/([a-z0-9-]+)\.supabase\.(?:co|in)\b/i.exec(supabaseUrl)?.[1] ?? '';

let SecureStore: typeof import('expo-secure-store') | undefined;

try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = undefined;
}

const secureStoreAdapter =
  Platform.OS === 'web' || !SecureStore
    ? undefined
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
