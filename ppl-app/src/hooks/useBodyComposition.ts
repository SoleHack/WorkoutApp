import { useState, useEffect, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getLocalDate } from '@/lib/date'

export interface Measurement {
  id: string
  date: string
  waist: number | null
  hips: number | null
  chest: number | null
  neck: number | null
  left_arm: number | null
  right_arm: number | null
  left_thigh: number | null
  right_thigh: number | null
  body_fat: number | null
}

export interface ProgressPhoto {
  id: string
  date: string
  storage_path: string
  public_url: string
  notes: string | null
  created_at: string
}

// ─── Measurements ────────────────────────────────────────────
export function useBodyMeasurements() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('body_measurements')
      .select('id, date, waist, hips, chest, neck, left_arm, right_arm, left_thigh, right_thigh, body_fat')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(52)
    setEntries(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const saveMeasurement = useCallback(async (measurements: Partial<Measurement>) => {
    if (!user) return { error: new Error('Not logged in') }
    const date = getLocalDate()
    const { data, error } = await supabase
      .from('body_measurements')
      .upsert({ user_id: user.id, ...measurements, date }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (!error && data) {
      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== date)
        return [data, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
      })
    }
    return { error }
  }, [user])

  const latest   = entries[0]  || null
  const previous = entries[1]  || null

  return { entries, loading, saveMeasurement, latest, previous, refresh: load }
}

// ─── Progress Photos ─────────────────────────────────────────
export function useProgressPhotos() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('progress_photos')
      .select('id, date, storage_path, public_url, notes, created_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(52)
    setPhotos(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const uploadPhoto = useCallback(async (notes = '') => {
    if (!user) return { error: new Error('Not logged in') }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return { error: new Error('Permission denied') }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    })
    if (result.canceled || !result.assets[0]) return { error: null }

    setUploading(true)
    const asset = result.assets[0]
    const ext   = (asset.uri.split('.').pop() || 'jpg').toLowerCase()
    const date  = getLocalDate()
    const path  = `${user.id}/${date}-${Date.now()}.${ext}`

    // Fetch as blob and upload
    const response = await fetch(asset.uri)
    const blob     = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` })

    if (uploadError) {
      setUploading(false)
      return { error: uploadError }
    }

    const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(path)

    const { data, error } = await supabase
      .from('progress_photos')
      .insert({ user_id: user.id, date, storage_path: path, public_url: publicUrl, notes })
      .select()
      .single()

    if (!error && data) setPhotos(prev => [data, ...prev])
    setUploading(false)
    return { error }
  }, [user])

  const takePhoto = useCallback(async (notes = '') => {
    if (!user) return { error: new Error('Not logged in') }

    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return { error: new Error('Permission denied') }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return { error: null }

    setUploading(true)
    const asset = result.assets[0]
    const date  = getLocalDate()
    const path  = `${user.id}/${date}-${Date.now()}.jpg`

    const response = await fetch(asset.uri)
    const blob     = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, blob, { contentType: 'image/jpeg' })

    if (uploadError) { setUploading(false); return { error: uploadError } }

    const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(path)

    const { data, error } = await supabase
      .from('progress_photos')
      .insert({ user_id: user.id, date, storage_path: path, public_url: publicUrl, notes })
      .select()
      .single()

    if (!error && data) setPhotos(prev => [data, ...prev])
    setUploading(false)
    return { error }
  }, [user])

  const deletePhoto = useCallback(async (photo: ProgressPhoto) => {
    await supabase.storage.from('progress-photos').remove([photo.storage_path])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }, [])

  return { photos, loading, uploading, uploadPhoto, takePhoto, deletePhoto, refresh: load }
}