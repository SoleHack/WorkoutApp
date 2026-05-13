import React, { memo, useMemo, useState } from 'react'
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { useSettings } from '@/hooks/useSettings'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { useUserLiftMaxes, useSetUserLiftMax } from '@/hooks/useProgramedWorkout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'

interface OneRMModalProps {
  visible: boolean
  onClose: () => void
}

interface MainLift {
  exerciseId: string
  exerciseName: string
  slug: string
}

function e1rm(weight: number, reps: number): number {
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30))
}

/**
 * Manage stored 1RMs for the user's main compound lifts.
 *
 * Discovery rules — which exercises show up here:
 *  - All exercises in the active program flagged `is_compound = true`
 *  - Plus any exercise the user has logged at least one set against (so even
 *    non-program lifts can be tracked)
 *
 * For each lift:
 *  - Current stored 1RM (with source: manual / estimated / retest)
 *  - Best estimated e1RM across recent session_sets — if it beats stored,
 *    show as a suggestion the user can accept with one tap.
 */
function OneRMModalImpl({ visible, onClose }: OneRMModalProps) {
  const { colors } = useTheme()
  const { settings } = useSettings()
  const wu = settings.weightUnit || 'lbs'
  const { user } = useAuth()
  const { programData } = useActiveProgram()
  const { data: stored, byExerciseId, isLoading: liftsLoading } = useUserLiftMaxes()
  const setLiftMax = useSetUserLiftMax()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  // Pull best e1RM per exercise from the last 200 completed strength sessions.
  const { data: bestSets } = useQuery<Array<{ exercise_id: string; weight: number; reps: number }>>({
    queryKey: ['bestSets', user?.id],
    enabled: !!user && visible,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('day_key, session_sets(exercise_id, weight, reps, completed, is_warmup)')
        .eq('user_id', user!.id)
        .not('completed_at', 'is', null)
        .neq('day_key', 'cardio')
        .order('date', { ascending: false })
        .limit(200)
      const rows: Array<{ exercise_id: string; weight: number; reps: number }> = []
      for (const s of (data || []) as Array<{ session_sets: Array<{ exercise_id: string; weight: number | null; reps: number | null; completed: boolean; is_warmup: boolean }> }>) {
        for (const x of s.session_sets || []) {
          if (x.completed && !x.is_warmup && x.weight && x.reps && x.reps >= 1 && x.reps <= 12) {
            rows.push({ exercise_id: x.exercise_id, weight: x.weight, reps: x.reps })
          }
        }
      }
      return rows
    },
  })

  const bestE1RMByExercise = useMemo(() => {
    const m: Record<string, { e1rm: number; weight: number; reps: number }> = {}
    for (const r of bestSets || []) {
      const est = e1rm(r.weight, r.reps)
      if (!m[r.exercise_id] || est > m[r.exercise_id].e1rm) {
        m[r.exercise_id] = { e1rm: est, weight: r.weight, reps: r.reps }
      }
    }
    return m
  }, [bestSets])

  // Build the lift list: every compound from the active program + any
  // exercise we've seen sets for (in case the user trains lifts outside FORGE).
  const lifts: MainLift[] = useMemo(() => {
    const seen = new Set<string>()
    const result: MainLift[] = []
    if (programData) {
      // programData.PROGRAM is keyed by workout slug; iterate workouts → exercises
      for (const w of Object.values(programData.PROGRAM)) {
        for (const ex of w.exercises) {
          if (seen.has(ex.exerciseDbId)) continue
          // Surface compounds + anything with a stored 1RM + anything with logged sets.
          const exMeta = programData.EXERCISES[ex.id]
          if (!exMeta) continue
          const isCompound = ex.isCompound
          if (isCompound) {
            seen.add(ex.exerciseDbId)
            result.push({ exerciseId: ex.exerciseDbId, exerciseName: exMeta.name, slug: exMeta.slug })
          }
        }
      }
    }
    // Add lifts with logged sets that aren't already in the list
    for (const exId of Object.keys(bestE1RMByExercise)) {
      if (seen.has(exId)) continue
      const exMeta = programData?.EXERCISES[exId]
      if (!exMeta) continue
      seen.add(exId)
      result.push({ exerciseId: exId, exerciseName: exMeta.name, slug: exMeta.slug })
    }
    // Stored-only lifts (e.g. user added one but never trained it under this program)
    for (const exId of Object.keys(byExerciseId)) {
      if (seen.has(exId)) continue
      const exMeta = programData?.EXERCISES[exId]
      seen.add(exId)
      result.push({ exerciseId: exId, exerciseName: exMeta?.name || exId, slug: exMeta?.slug || exId })
    }
    return result.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))
  }, [programData, bestE1RMByExercise, byExerciseId])

  const displayWeight = (lbs: number) =>
    wu === 'kg' ? (lbs * 0.453592).toFixed(1) : String(lbs)

  const parseInputLbs = (s: string): number | null => {
    const n = parseFloat(s)
    if (!isFinite(n) || n <= 0) return null
    return wu === 'kg' ? Math.round(n / 0.453592) : n
  }

  const handleSave = async (exId: string) => {
    const lbs = parseInputLbs(editVal)
    if (lbs === null) {
      Alert.alert('Invalid weight', 'Enter a positive number.')
      return
    }
    try {
      await setLiftMax.mutateAsync({ exerciseId: exId, oneRM: lbs, source: 'manual' })
      setEditingId(null)
      setEditVal('')
    } catch (e) {
      Alert.alert('Couldn\'t save', (e as Error).message || 'Try again.')
    }
  }

  const handleAcceptEstimate = async (exId: string, lbs: number) => {
    try {
      await setLiftMax.mutateAsync({ exerciseId: exId, oneRM: lbs, source: 'estimated_from_session' })
    } catch (e) {
      Alert.alert('Couldn\'t save', (e as Error).message || 'Try again.')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View style={{ maxHeight: '85%', borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.bg, borderTopWidth: 3, borderTopColor: colors.push }}>
          <View style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.push, letterSpacing: 2.5, marginBottom: 2 }}>BASELINE</Text>
                <Text style={{ fontFamily: 'BebasNeue', fontSize: 30, color: colors.text, letterSpacing: 3, lineHeight: 30 }}>MY 1RMs</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close 1RM editor"
                hitSlop={12}
              >
                <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.muted, letterSpacing: 2 }}>DONE</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, letterSpacing: 1, marginTop: 8, lineHeight: 14 }}>
              One-rep maxes drive suggested weights in periodized programs (e.g. FORGE). Enter what you can hit for one clean rep — or accept the estimate from your recent best set.
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            {liftsLoading ? (
              <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 40 }}>Loading…</Text>
            ) : lifts.length === 0 ? (
              <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 32 }}>
                No main lifts yet. Activate a program with compound lifts, or log a strength session.
              </Text>
            ) : (
              lifts.map(lift => {
                const current = byExerciseId[lift.exerciseId]
                const best = bestE1RMByExercise[lift.exerciseId]
                const showBestSuggestion = best && (!current || best.e1rm > current.oneRM + 2.5)
                const isEditing = editingId === lift.exerciseId

                return (
                  <View key={lift.exerciseId} style={{ borderRadius: 6, padding: 14, marginBottom: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.text }}>{lift.exerciseName}</Text>
                        {current ? (
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                            {current.source === 'manual' ? 'Manual' : current.source === 'retest' ? 'Retest' : 'Estimated'} · {new Date(current.testedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        ) : (
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>Not set</Text>
                        )}
                      </View>
                      {isEditing ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TextInput
                            style={{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, fontFamily: 'DMMono', fontSize: 16, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.push, width: 80, textAlign: 'center' }}
                            value={editVal}
                            onChangeText={setEditVal}
                            keyboardType="decimal-pad"
                            placeholder={current ? displayWeight(current.oneRM) : '0'}
                            placeholderTextColor={colors.muted}
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={() => handleSave(lift.exerciseId)}
                            disabled={setLiftMax.isPending}
                            accessibilityRole="button"
                            accessibilityLabel={`Save 1RM for ${lift.exerciseName}`}
                            hitSlop={8}
                            style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.push }}>
                            <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: '#000', letterSpacing: 1 }}>SAVE</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => { setEditingId(null); setEditVal('') }}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel edit"
                            hitSlop={12}
                            style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
                            <Text style={{ fontFamily: 'DMMono', fontSize: 14, color: colors.muted }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => { setEditingId(lift.exerciseId); setEditVal(current ? displayWeight(current.oneRM) : '') }}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit 1RM for ${lift.exerciseName}`}
                          hitSlop={8}
                          style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <Text style={{ fontFamily: 'BebasNeue', fontSize: 24, color: current ? colors.text : colors.muted, letterSpacing: 1 }}>
                            {current ? displayWeight(current.oneRM) : '—'}
                          </Text>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginLeft: 4 }}>{wu}</Text>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: colors.muted, marginLeft: 8 }}>✎</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {showBestSuggestion && !isEditing && (
                      <TouchableOpacity
                        onPress={() => handleAcceptEstimate(lift.exerciseId, best.e1rm)}
                        accessibilityRole="button"
                        accessibilityLabel={`Use estimated 1RM ${displayWeight(best.e1rm)} ${wu} for ${lift.exerciseName}`}
                        style={{ marginTop: 10, borderRadius: 6, padding: 10, backgroundColor: colors.push + '15', borderWidth: 1, borderColor: colors.push + '40', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.push, letterSpacing: 1 }}>FROM YOUR BEST SET</Text>
                          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.text, marginTop: 2 }}>
                            {displayWeight(best.weight)} {wu} × {best.reps} reps → est. {displayWeight(best.e1rm)} {wu}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'DMMono_500', fontSize: 10, color: colors.push, letterSpacing: 1 }}>USE →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export const OneRMModal = memo(OneRMModalImpl)
