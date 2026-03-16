import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWorkoutNotes(sessionId) {
  const { user } = useAuth()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const loadNote = useCallback(async (id) => {
    if (!id) return
    const { data } = await supabase
      .from('workout_sessions')
      .select('notes')
      .eq('id', id)
      .single()
    if (data?.notes) setNote(data.notes)
  }, [])

  const saveNote = useCallback(async (text) => {
    if (!sessionId) return
    setSaving(true)
    await supabase
      .from('workout_sessions')
      .update({ notes: text })
      .eq('id', sessionId)
    setSaving(false)
  }, [sessionId])

  return { note, setNote, saveNote, saving, loadNote }
}
