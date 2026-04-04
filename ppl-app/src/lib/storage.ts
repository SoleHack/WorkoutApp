import { createMMKV } from 'react-native-mmkv'

// Single MMKV instance for the entire app.
// react-native-mmkv v4 uses createMMKV() factory instead of new MMKV()
// Synchronous reads/writes — no await, no promises.
export const storage = createMMKV()