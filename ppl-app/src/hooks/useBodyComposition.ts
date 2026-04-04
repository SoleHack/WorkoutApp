import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// ─── Measurements ─────────────────────────────────────────────

const MEASUREMENT_SELECT = 'id, date, waist, hips, chest, neck, left_arm, right_arm, left_thigh, right_thigh, body_fat'

async function fetchMeasurements(userId: string): Promise<Measurement[]> {
  const { data } = await supabase
    .from('body_measurements')
    .select(MEASUREMENT_SELECT)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(52)
  return (data || []) as Measurement[]
}

export function useBodyMeasurements() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['bodyMeasurements', user?.id],
    queryFn: () => fetchMeasurements(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })

  const saveMeasurementMutation = useMutation({
    mutationFn: async (measurements: Partial<Measurement>) => {
      const date = getLocalDate()
      const { data, error } = await supabase
        .from('body_measurements')
        .upsert({ user_id: user!.id, ...measurements, date }, { onConflict: 'user_id,date' })
        .select(MEASUREMENT_SELECT)
        .single()
      if (error) throw error
      return data as Measurement
    },
    onSuccess: (newEntry) => {
      qc.setQueryData(['bodyMeasurements', user?.id], (old: Measurement[] = []) => {
        const filtered = old.filter(e => e.date !== newEntry.date)
        return [newEntry, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
      })
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['bodyMeasurements', user?.id] })
    },
  })

  const latest   = entries[0] || null
  const previous = entries[1] || null

  return {
    entries,
    loading: isLoading,
    saveMeasurement: saveMeasurementMutation.mutateAsync,
    latest,
    previous,
    refresh: () => qc.invalidateQueries({ queryKey: ['bodyMeasurements', user?.id] }),
  }
}

// ─── Progress Photos ──────────────────────────────────────────
// Photos involve Supabase Storage (blob upload) so mutations stay
// as callbacks — but we use TanStack Query for the read + cache invalidation.

async function fetchPhotos(userId: string): Promise<ProgressPhoto[]> {
  const { data } = await supabase
    .from('progress_photos')
    .select('id, date, storage_path, public_url, notes, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(52)
  return (data || []) as ProgressPhoto[]
}

export function useProgressPhotos() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['progressPhotos', user?.id],
    queryFn: () => fetchPhotos(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['progressPhotos', user?.id] })

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

    const response = await fetch(asset.uri)
    const blob     = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` })

    if (uploadError) { setUploading(false); return { error: uploadError } }

    const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(path)

    const { error } = await supabase
      .from('progress_photos')
      .insert({ user_id: user.id, date, storage_path: path, public_url: publicUrl, notes })

    setUploading(false)
    if (!error) invalidate()
    return { error }
  }, [user])

  const takePhoto = useCallback(async (notes = '') => {
    if (!user) return { error: new Error('Not logged in') }
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return { error: new Error('Permission denied') }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
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

    const { error } = await supabase
      .from('progress_photos')
      .insert({ user_id: user.id, date, storage_path: path, public_url: publicUrl, notes })

    setUploading(false)
    if (!error) invalidate()
    return { error }
  }, [user])

  const deletePhoto = useCallback(async (photo: ProgressPhoto) => {
    await supabase.storage.from('progress-photos').remove([photo.storage_path])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    // Optimistic removal from cache
    qc.setQueryData(['progressPhotos', user?.id], (old: ProgressPhoto[] = []) =>
      old.filter(p => p.id !== photo.id)
    )
  }, [user])

  return {
    photos,
    loading: isLoading,
    uploading,
    uploadPhoto,
    takePhoto,
    deletePhoto,
    refresh: invalidate,
  }
}