import { useState, useEffect, useCallback } from 'react'

const BUCKET_URL = 'https://rag-consulting-burndown.s3.us-west-1.amazonaws.com'
const INDEX_URL  = `${BUCKET_URL}/statements/index.json`

/**
 * Fetches parsed credit card statement data from S3.
 * Loads a lightweight index on mount, then lazy-loads individual statements.
 */
export function useStatementStorage() {
  const [index, setIndex]         = useState(null)
  const [statements, setStatements] = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Load index on mount
  useEffect(() => {
    async function loadIndex() {
      try {
        const res = await fetch(INDEX_URL, { cache: 'no-cache' })
        if (res.status === 404 || res.status === 403) {
          setIndex({ version: 1, lastUpdated: null, statements: [] })
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setIndex(data)
        setLoading(false)
      } catch (e) {
        setError(e.message)
        setIndex({ version: 1, lastUpdated: null, statements: [] })
        setLoading(false)
      }
    }
    loadIndex()
  }, [])

  // Lazy-load a full statement by ID
  const loadStatement = useCallback(async (statementId) => {
    if (statements[statementId]) return statements[statementId]
    try {
      const url = `${BUCKET_URL}/statements/${statementId}.json`
      const res = await fetch(url, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`Failed to load statement ${statementId}`)
      const data = await res.json()
      setStatements(prev => ({ ...prev, [statementId]: data }))
      return data
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [statements])

  // Re-fetch the index (after a new statement is parsed)
  const refreshIndex = useCallback(async () => {
    try {
      const res = await fetch(INDEX_URL, { cache: 'no-cache' })
      if (res.ok) {
        const data = await res.json()
        setIndex(data)
      }
    } catch { /* silent */ }
  }, [])

  return { index, statements, loading, error, loadStatement, refreshIndex }
}
