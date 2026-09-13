import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme-preference'

function readStoredTheme(): Theme | null {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  // null = no explicit choice yet, following the OS preference.
  const [theme, setTheme] = useState<Theme | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = readStoredTheme()
    setTheme(stored)
    setIsDark(stored ? stored === 'dark' : systemPrefersDark())
  }, [])

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
      window.localStorage.setItem(STORAGE_KEY, theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const effectiveCurrent = current ?? (systemPrefersDark() ? 'dark' : 'light')
      const next: Theme = effectiveCurrent === 'dark' ? 'light' : 'dark'
      setIsDark(next === 'dark')
      return next
    })
  }, [])

  return { isDark, toggleTheme }
}
