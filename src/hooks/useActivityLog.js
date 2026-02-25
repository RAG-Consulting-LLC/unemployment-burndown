import { useState, useCallback } from 'react'

const MAX_ENTRIES = 500
const LS_LOG_KEY  = 'burndown-activity-log'
const LS_NAME_KEY = 'burndown-user-name'

function loadLog() {
  try {
    const raw = localStorage.getItem(LS_LOG_KEY)
    if (!raw) return []
    return JSON.parse(raw).map(e => ({ ...e, timestamp: new Date(e.timestamp) }))
  } catch { return [] }
}

export function useActivityLog() {
  const [entries, setEntries]       = useState(loadLog)
  const [userName, setUserNameState] = useState(
    () => localStorage.getItem(LS_NAME_KEY) || 'You'
  )

  const setUserName = useCallback((name) => {
    const trimmed = (name || '').trim() || 'You'
    setUserNameState(trimmed)
    localStorage.setItem(LS_NAME_KEY, trimmed)
  }, [])

  const addEntry = useCallback((type, message) => {
    setEntries(prev => {
      const entry = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2),
        timestamp: new Date(),
        type,    // 'save' | 'load' | 'change'
        message,
      }
      const next = [entry, ...prev].slice(0, MAX_ENTRIES)
      try { localStorage.setItem(LS_LOG_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const clearLog = useCallback(() => {
    setEntries([])
    try { localStorage.removeItem(LS_LOG_KEY) } catch {}
  }, [])

  return { entries, addEntry, clearLog, userName, setUserName }
}
