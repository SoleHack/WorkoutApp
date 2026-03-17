import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useBodyMeasurements() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(52)
    setEntries(data || [])
    setLoading(false)
  }

  const saveMeasurement = useCallback(async (measurements) => {
    const date = measurements.date || getLocalDate()
    const { data, error } = await supabase
      .from('body_measurements')
      .upsert({ user_id: user.id, ...measurements, date }, { onConflict: 'user_id,date' })
      .select().single()
    if (!error && data) {
      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== date)
        return [data, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
      })
    }
    return { error }
  }, [user])

  const latest = entries[0] || null
  const previous = entries[1] || null

  return { entries, loading, saveMeasurement, latest, previous }
}

export function useProgressPhotos() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(52)
    setPhotos(data || [])
    setLoading(false)
  }

  const uploadPhoto = useCallback(async (file, notes = '') => {
    setUploading(true)
    const date = getLocalDate()
    const path = `${user.id}/${date}-${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, file, { contentType: 'image/jpeg', upsert: false })

    if (uploadError) {
      setUploading(false)
      return { error: uploadError }
    }

    const { data: urlData } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(path)

    const { data, error } = await supabase
      .from('progress_photos')
      .insert({
        user_id: user.id,
        date,
        storage_path: path,
        public_url: urlData.publicUrl,
        notes,
      })
      .select().single()

    if (!error && data) {
      setPhotos(prev => [data, ...prev])
    }

    setUploading(false)
    return { error, data }
  }, [user])

  const deletePhoto = useCallback(async (photo) => {
    await supabase.storage.from('progress-photos').remove([photo.storage_path])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }, [])

  return { photos, loading, uploading, uploadPhoto, deletePhoto }
}
