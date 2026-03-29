import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useWorkoutNotes(sessionId: string | null) {
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!sessionId) return
    supabase
      .from('workout_sessions')
      .select('notes')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        if (data?.notes) setNote(data.notes)
      })
  }, [sessionId])

  const saveNote = useCallback(async (text: string) => {
    if (!sessionId) return
    await supabase
      .from('workout_sessions')
      .update({ notes: text })
      .eq('id', sessionId)
  }, [sessionId])

  return { note, setNote, saveNote }
}