import { useState, useCallback } from 'react'

const SESSION_KEY = 'burndown_auth'
const VALID_USER = import.meta.env.VITE_APP_USERNAME
const VALID_PASS = import.meta.env.VITE_APP_PASSWORD

export function useAuth() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [error, setError] = useState(null)

  const login = useCallback((username, password) => {
    if (username === VALID_USER && password === VALID_PASS) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthed(true)
      setError(null)
      return true
    }
    setError('Invalid username or password.')
    return false
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
  }, [])

  return { authed, error, login, logout }
}
