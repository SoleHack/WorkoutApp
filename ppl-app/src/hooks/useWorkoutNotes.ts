import { useCallback } from 'react'
import { storage } from '@/lib/storage'

const KEY = (exerciseId: string) => `ex_note:${exerciseId}`

// Per-exercise notes persisted to MMKV.
// Notes survive across sessions and show up next time you do the exercise.
export function useExerciseNotes() {
  const getNote = useCallback((exerciseId: string): string => {
    return storage.getString(KEY(exerciseId)) || ''
  }, [])

  const setNote = useCallback((exerciseId: string, note: string) => {
    if (note.trim()) {
      storage.set(KEY(exerciseId), note.trim())
    } else {
      storage.remove(KEY(exerciseId))
    }
  }, [])

  return { getNote, setNote }
}

// Session-level workout notes (for the whole session)
const SESSION_KEY = (sessionId: string) => `session_note:${sessionId}`

export function useWorkoutNotes(sessionId: string | null) {
  const note = sessionId ? (storage.getString(SESSION_KEY(sessionId)) || '') : ''

  const setNote = useCallback((text: string) => {
    if (!sessionId) return
    if (text.trim()) {
      storage.set(SESSION_KEY(sessionId), text.trim())
    } else {
      storage.remove(SESSION_KEY(sessionId))
    }
  }, [sessionId])

  const saveNote = useCallback((text: string) => {
    setNote(text)
  }, [setNote])

  return { note, setNote, saveNote }
}