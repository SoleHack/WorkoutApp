#!/usr/bin/env python3
"""
Targeted fix for Session 1 UI issues:
  1. Remove the top quick-start button (keep card tappable as before)  
  2. Add START WORKOUT as a proper button at the bottom of card actions
  3. Move Log Cardio inside the actions area, remove floating one

Run from: ppl-app/
"""

path = 'app/(tabs)/index.tsx'
with open(path) as f:
    content = f.read()

# ── Remove the quick-start button added at the top of exercise tags
content = content.replace(
    '''              {/* Quick start button */}
              {!todayDone && (
                <TouchableOpacity
                  onPress={() => router.push('/workout/' + todayDayKey as any)}
                  style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 14, backgroundColor: todayWorkout.color }}>
                  <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 2 }}>START WORKOUT →</Text>
                </TouchableOpacity>
              )}

              ''',
    '              '
)
print("  ✓ Removed top duplicate START WORKOUT button")

# ── Replace the bottom actions to include START WORKOUT + Log Cardio
old_actions = '''            {/* Take a rest day */}
              {!todayDone && (
                <TouchableOpacity onPress={handleRestDay}
                  style={{ borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted }}>😴  Take a rest day instead</Text>
                </TouchableOpacity>
              )}'''

new_actions = '''            {/* Action buttons */}
              {!todayDone && (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => router.push('/workout/' + todayDayKey as any)}
                    style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: todayWorkout.color }}>
                    <Text style={{ fontFamily: 'BebasNeue', fontSize: 18, color: colors.bg, letterSpacing: 2 }}>START WORKOUT →</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={handleRestDay}
                      style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.muted }}>😴 Rest day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowCardioModal(true)}
                      style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.pull + '15', borderWidth: 1, borderColor: colors.pull + '40' }}>
                      <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.pull }}>🏃 Log Cardio</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}'''

if old_actions in content:
    content = content.replace(old_actions, new_actions)
    print("  ✓ Replaced action buttons with START WORKOUT + Rest + Log Cardio row")
else:
    print("  ⚠️  Could not find action buttons — check manually")

# ── Remove the floating Log Cardio from rest day card (it's now in workout card)
# Keep the rest day card one since that's a different context
# Just make sure there's no duplicate outside of cards

with open(path, 'w') as f:
    f.write(content)

print("\n✅ Done. Run: npx tsc --noEmit")
