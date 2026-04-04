import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { storage } from './storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Supabase auth storage adapter using MMKV.
// Synchronous reads mean the session is available instantly on startup —
// no async delay before AuthGate can check whether the user is logged in.
const mmkvStorage = {
  getItem:    (key: string) => storage.getString(key) ?? null,
  setItem:    (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => { storage.remove(key) },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})