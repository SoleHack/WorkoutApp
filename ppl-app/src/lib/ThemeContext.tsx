import React, { createContext, useContext, useState, useCallback } from 'react'
import { storage } from './storage'
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
  // MMKV is synchronous — read the saved theme immediately in useState()
  // so the correct theme is applied on the very first render with no flash.
  const saved = storage.getString(THEME_KEY)
  const [theme, setThemeState] = useState<Theme>(
    saved === 'light' || saved === 'dark' ? saved : 'dark'
  )

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    storage.set(THEME_KEY, t) // synchronous write
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