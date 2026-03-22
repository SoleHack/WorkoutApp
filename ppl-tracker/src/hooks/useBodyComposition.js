import { getLocalDate } from '../lib/date.js'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Convert HEIC/HEIF to JPEG using Canvas API
// Works in Safari/iOS where HEIC is readable but not uploadable as-is
async function convertHeicToJpeg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (blob) resolve(new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' }))
        else reject(new Error('Canvas toBlob failed'))
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

export function useBodyMeasurements() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('body_measurements')
      .select('id, date, waist, hips, chest, neck, left_arm, right_arm, left_thigh, right_thigh')
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
      .select('id, date, waist, hips, chest, neck, left_arm, right_arm, left_thigh, right_thigh')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(52)
    setPhotos(data || [])
    setLoading(false)
  }

  const uploadPhoto = useCallback(async (file, notes = '') => {
    setUploading(true)
    const date = getLocalDate()

    // Convert HEIC/HEIF to JPEG using Canvas — required for library picks on iPhone
    let uploadFile = file
    let mimeType = file.type || 'image/jpeg'

    const isHeic = mimeType.includes('heic') || mimeType.includes('heif')
      || file.name?.toLowerCase().endsWith('.heic')
      || file.name?.toLowerCase().endsWith('.heif')

    if (isHeic) {
      try {
        uploadFile = await convertHeicToJpeg(file)
        mimeType = 'image/jpeg'
      } catch (e) {
        console.error('HEIC conversion failed, uploading original:', e)
        // Fall through — try uploading original, may fail
      }
    }

    const ext = mimeType.includes('png') ? 'png'
      : mimeType.includes('webp') ? 'webp'
      : 'jpg'
    const path = `${user.id}/${date}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, uploadFile, { contentType: mimeType, upsert: false })

    if (uploadError) {
      setUploading(false)
      console.error('Photo upload error:', uploadError)
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
