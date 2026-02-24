import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'burndown-theme'

/** Applies the resolved theme (light or dark) to <html data-theme="..."> */
function applyTheme(resolved) {
  document.documentElement.setAttribute('data-theme', resolved)
}

/** Given a preference ('light' | 'dark' | 'system'), return the resolved theme. */
function resolve(pref) {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'system'
  })

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(resolve(theme))
  }, [theme])

  // Re-apply when the OS preference changes (only matters for 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') applyTheme(resolve('system'))
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(pref) {
    localStorage.setItem(STORAGE_KEY, pref)
    setThemeState(pref)
  }

  const resolved = resolve(theme)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
