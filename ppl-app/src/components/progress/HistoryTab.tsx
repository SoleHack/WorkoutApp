import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import { supabase } from '@/lib/supabase'
import { prettifyDayKey } from '@/lib/dayKey'
import type { SharedProgressProps } from './types'

export function HistoryTab(props: SharedProgressProps) {
  const { colors, completed, PROGRAM, formatDate, router, refetch } = props
  const [historySearch, setHistorySearch] = useState('')
  const [historyFilter, setHistoryFilter] = useState<string | null>(null)
  const [editingSessionNote, setEditingSessionNote] = useState<string | null>(null)
  const [sessionNoteVal, setSessionNoteVal] = useState('')

  if (completed.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
        <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>NO HISTORY YET</Text>
      </View>
    )
  }

  return (
    <>
      <TextInput
        style={{ borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'DMSans', fontSize: 14, color: colors.text, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 }}
        placeholder="Search workouts..."
        placeholderTextColor={colors.muted}
        value={historySearch}
        onChangeText={setHistorySearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[null, 'push', 'pull', 'legs', 'cardio'].map(f => {
            const label = f === null ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)
            const active = historyFilter === f
            const col = f === 'push' ? colors.push : f === 'pull' ? colors.pull : f === 'legs' ? colors.legs : colors.muted
            return (
              <TouchableOpacity key={String(f)} onPress={() => setHistoryFilter(f)}
                style={{ borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8,
                  backgroundColor: active ? (f ? col : colors.push) : 'transparent',
                  borderWidth: 1, borderColor: active ? (f ? col : colors.push) : colors.border }}>
                <Text style={{ fontFamily: active ? 'DMMono_500' : 'DMMono', fontSize: 10, letterSpacing: 2,
                  color: active ? colors.bg : colors.muted }}>
                  {label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
      {completed.filter(s => {
        if (historyFilter) {
          const workout = PROGRAM[s.day_key]
          if (historyFilter === 'cardio' && s.day_key !== 'cardio') return false
          if (historyFilter !== 'cardio' && workout?.dayType?.toLowerCase() !== historyFilter) return false
        }
        if (!historySearch.trim()) return true
        const q = historySearch.toLowerCase()
        const label = PROGRAM[s.day_key]?.label || prettifyDayKey(s.day_key)
        return label.toLowerCase().includes(q) || s.date.includes(q) || s.notes?.toLowerCase().includes(q)
      }).map(s => {
      const isCardio = s.day_key === 'cardio'
      const workout  = isCardio ? null : PROGRAM[s.day_key]
      const dayColor = workout?.color || (isCardio ? colors.pull : colors.muted)
      const label    = isCardio ? '🏃 Cardio' : (workout?.label || prettifyDayKey(s.day_key))
      const sets     = (s.session_sets || []).filter(x => x.completed && !x.is_warmup)
      const vol      = sets.filter(x => x.weight && x.reps).reduce((a, x) => a + (x.weight! * x.reps!), 0)
      const dur      = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null
      return (
        <TouchableOpacity key={s.id} onPress={() => router.push(('/session/' + s.id) as any)}
          style={{ flexDirection: 'row', borderRadius: 6, marginBottom: 8, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ width: 4, backgroundColor: dayColor }} />
          <View style={{ flex: 1, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: dayColor }}>{label}</Text>
              <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>
                {formatDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: colors.muted, marginTop: 3 }}>
              {[
                sets.length > 0 ? String(sets.length) + ' sets' : null,
                vol > 0 ? String(Math.round(vol / 1000 * 10) / 10) + 'k lbs' : null,
                dur ? String(dur) + 'm' : null,
              ].filter(Boolean).join(' · ')}
            </Text>
            {editingSessionNote === s.id ? (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <TextInput
                  style={{ flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontFamily: 'DMSans', fontSize: 12, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.pull }}
                  value={sessionNoteVal}
                  onChangeText={setSessionNoteVal}
                  placeholder="Session notes..."
                  placeholderTextColor={colors.muted}
                  autoFocus
                  multiline
                />
                <TouchableOpacity
                  onPress={async () => {
                    await supabase.from('workout_sessions').update({ notes: sessionNoteVal.trim() || null }).eq('id', s.id)
                    setEditingSessionNote(null)
                    refetch()
                  }}
                  style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.pull, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.bg }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingSessionNote(null)}
                  style={{ borderRadius: 8, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : s.notes ? (
              <TouchableOpacity onPress={() => { setEditingSessionNote(s.id); setSessionNoteVal(s.notes || '') }} style={{ marginTop: 6 }}>
                <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted, fontStyle: 'italic' }} numberOfLines={2}>
                  📝 {s.notes}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { setEditingSessionNote(s.id); setSessionNoteVal('') }} style={{ marginTop: 6 }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.border }}>+ Add note</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ justifyContent: 'center', paddingRight: 14 }}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>→</Text>
          </View>
        </TouchableOpacity>
      )
    })}
    </>
  )
}
