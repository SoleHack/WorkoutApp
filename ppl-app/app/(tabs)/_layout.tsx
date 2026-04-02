import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 8, width: 60 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{
        fontFamily: 'DMMono',
        fontSize: 8,
        letterSpacing: 0.3,
        marginTop: 3,
        color: focused ? colors.text : colors.muted,
      }}>
        {label}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  const { colors } = useTheme()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 82,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="TODAY" focused={focused} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📈" label="STATS" focused={focused} /> }}
      />
      <Tabs.Screen
        name="programs"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💪" label="TRAIN" focused={focused} /> }}
      />
      <Tabs.Screen
        name="partner"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" label="PARTNER" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="MORE" focused={focused} /> }}
      />
    </Tabs>
  )
}