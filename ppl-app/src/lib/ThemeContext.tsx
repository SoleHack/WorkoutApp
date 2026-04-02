import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getColors, ColorScheme } from './theme'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  colors: ColorScheme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: getColors('dark'),
  setTheme: () => {},
})

const THEME_KEY = 'ppl_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setThemeState(saved)
    })
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    AsyncStorage.setItem(THEME_KEY, t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, colors: getColors(theme), setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}