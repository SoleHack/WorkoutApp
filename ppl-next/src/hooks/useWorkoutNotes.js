'use client'
import { useState, useCallback, useEffect } from 'react'
import { getSupabase } from '../lib/supabase-client'

export function useWorkoutNotes(sessionId) {
  const supabase = getSupabase()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(null) // tracks which sessionId we've loaded for

  // Auto-load whenever sessionId changes — handles re-open correctly
  useEffect(() => {
    if (!sessionId || sessionId === loaded) return
    const load = async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('notes')
        .eq('id', sessionId)
        .single()
      setNote(data?.notes || '')
      setLoaded(sessionId)
    }
    load()
  }, [sessionId, loaded])

  const saveNote = useCallback(async (text) => {
    if (!sessionId) return
    setSaving(true)
    await supabase
      .from('workout_sessions')
      .update({ notes: text })
      .eq('id', sessionId)
    setSaving(false)
  }, [sessionId])

  // Keep loadNote for explicit calls (backward compat) but it now just triggers the effect
  const loadNote = useCallback(() => {
    setLoaded(null) // forces the effect to re-run
  }, [])

  return { note, setNote, saveNote, saving, loadNote }
}
