#!/usr/bin/env python3
"""
Session 3 — Partner screen enhancements:
  1. Store partner dates array for weekly breakdown
  2. Add "THIS WEEK" section showing sessions this week for both users
  3. Add weekly volume bars (SVG) side by side
  4. Add motivational nudge based on who's ahead this week
  5. Show partner's last workout date

Run from: ppl-app/
"""

import re

path = 'app/(tabs)/partner.tsx'
with open(path) as f:
    content = f.read()

# ── 1. Add Svg import
if 'react-native-svg' not in content:
    content = content.replace(
        "import { useState, useEffect } from 'react'",
        "import { useState, useEffect } from 'react'\nimport Svg, { Rect, Text as SvgText } from 'react-native-svg'"
    )
    print("  ✓ Added Svg import")

# ── 2. Store partnerDates in state
old_state = "  const [partnerStats, setPartnerStats]     = useState<any>(null)"
new_state = "  const [partnerStats, setPartnerStats]     = useState<any>(null)\n  const [partnerDates, setPartnerDates]     = useState<string[]>([])\n  const [myDates, setMyDates]               = useState<string[]>([])"
content = content.replace(old_state, new_state)
print("  ✓ Added partnerDates and myDates state")

# ── 3. Store myDates when loading my stats
old_load_my = "    // Load my own stats\n    const stats = await loadUserStats(user!.id)\n    setMyStats(stats)"
new_load_my = """    // Load my own stats
    const stats = await loadUserStats(user!.id)
    setMyStats(stats)

    // Store my session dates for weekly comparison
    const { data: mySessionData } = await supabase
      .from('workout_sessions')
      .select('date')
      .eq('user_id', user!.id)
      .not('completed_at', 'is', null)
      .neq('day_key', 'cardio')
      .order('date', { ascending: false })
      .limit(90)
    setMyDates((mySessionData || []).map((s: any) => s.date))"""
content = content.replace(old_load_my, new_load_my)
print("  ✓ Added myDates fetch")

# ── 4. Store partnerDates from RPC response
old_partner_dates = "    setPartnerStats({\n      sessions:  rpcData.sessions  || 0,"
new_partner_dates = "    setPartnerDates(dates)\n    setPartnerStats({\n      sessions:  rpcData.sessions  || 0,"
content = content.replace(old_partner_dates, new_partner_dates)
print("  ✓ partnerDates stored from RPC")

# ── 5. Add helper functions before the component
# Find a good insertion point — before 'export default function PartnerScreen'
helper_code = '''
// Get sessions in the current ISO week (Mon–Sun)
function getThisWeekDates(dates: string[]): string[] {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  const mondayStr = monday.toISOString().split('T')[0]
  const sundayStr = new Date(monday.getTime() + 6 * 86400000).toISOString().split('T')[0]
  return dates.filter(d => d >= mondayStr && d <= sundayStr)
}

function getMotivation(myWeek: number, partnerWeek: number, partnerName: string): string | null {
  if (!partnerName) return null
  const diff = myWeek - partnerWeek
  if (diff > 1) return `You're ${diff} sessions ahead this week 🔥`
  if (diff === 1) return `One session ahead of ${partnerName} this week 💪`
  if (diff === 0 && myWeek > 0) return `Neck and neck with ${partnerName} this week ⚡`
  if (diff === -1) return `${partnerName} is one ahead — time to catch up 👊`
  if (diff < -1) return `${partnerName} is ${Math.abs(diff)} sessions ahead this week 😤`
  return null
}

'''

content = content.replace(
    'export default function PartnerScreen() {',
    helper_code + 'export default function PartnerScreen() {'
)
print("  ✓ Added helper functions")

# ── 6. Add weekly comparison section after the head-to-head table
old_head2head_end = """                    {myStats && (
                      <View style={{ marginTop: 16, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                        <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                          <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>HEAD TO HEAD</Text>
                        </View>"""

new_head2head_start = """                    {myStats && (() => {
                      const myWeek      = getThisWeekDates(myDates).length
                      const partnerWeek = getThisWeekDates(partnerDates).length
                      const motivation  = getMotivation(myWeek, partnerWeek, partnerName)
                      const maxWeek     = Math.max(myWeek, partnerWeek, 1)
                      return (
                        <>
                          {/* This week */}
                          <View style={{ marginTop: 16, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
                            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 12 }}>THIS WEEK</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20, justifyContent: 'center', marginBottom: 8 }}>
                              {/* My bar */}
                              <View style={{ alignItems: 'center', gap: 4 }}>
                                <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.push, letterSpacing: 1 }}>{myWeek}</Text>
                                <View style={{ width: 40, borderRadius: 4, backgroundColor: colors.push, height: Math.max(8, (myWeek / maxWeek) * 60) }} />
                                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }}>YOU</Text>
                              </View>
                              {/* Partner bar */}
                              <View style={{ alignItems: 'center', gap: 4 }}>
                                <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.pull, letterSpacing: 1 }}>{partnerWeek}</Text>
                                <View style={{ width: 40, borderRadius: 4, backgroundColor: colors.pull, height: Math.max(8, (partnerWeek / maxWeek) * 60) }} />
                                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted }} numberOfLines={1}>{partnerName.split(' ')[0].toUpperCase()}</Text>
                              </View>
                            </View>
                            {motivation && (
                              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.text, textAlign: 'center', marginTop: 4 }}>
                                {motivation}
                              </Text>
                            )}
                          </View>

                          {/* Head to head */}
                          <View style={{ marginTop: 12, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                              <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, letterSpacing: 1.5 }}>HEAD TO HEAD</Text>
                            </View>"""

# Also need to close the IIFE at the end of the head-to-head block
old_head2head_close = """                      </View>
                    )}"""
new_head2head_close = """                          </View>
                        </>
                      )
                    })()}"""

if old_head2head_end in content:
    content = content.replace(old_head2head_end, new_head2head_start)
    # Replace the first occurrence of the close pattern after our change
    content = content.replace(old_head2head_close, new_head2head_close, 1)
    print("  ✓ Added THIS WEEK section with bars")
else:
    print("  ⚠️  Could not find head-to-head section")

# ── 7. Show partner's last workout date near their name
old_partner_header = """                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
                      {partnerName ? partnerName.toUpperCase() : 'PARTNER'}
                    </Text>"""
new_partner_header = """                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1, marginTop: 2 }}>
                      {partnerName ? partnerName.toUpperCase() : 'PARTNER'}
                    </Text>
                    {partnerDates[0] && (
                      <Text style={{ fontFamily: 'DMMono', fontSize: 10, color: colors.muted, marginTop: 2 }}>
                        Last workout: {new Date(partnerDates[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    )}"""
content = content.replace(old_partner_header, new_partner_header)
print("  ✓ Added partner last workout date")

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
