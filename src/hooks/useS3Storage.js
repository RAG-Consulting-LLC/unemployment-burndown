import { useState, useEffect, useCallback } from 'react'

const BUCKET_URL = 'https://rag-consulting-burndown.s3.us-west-1.amazonaws.com'
const DATA_KEY   = 'data.json'
const DATA_URL   = `${BUCKET_URL}/${DATA_KEY}`

/**
 * Cloud storage backed by a public S3 bucket.
 *
 * status values:
 *   'loading'   – initial fetch in progress
 *   'connected' – ready; last save succeeded (or no data yet)
 *   'saving'    – PUT in progress
 *   'error'     – last operation failed
 *
 * restoreData: parsed JSON loaded on mount. Consumed and cleared by caller.
 */
export function useS3Storage() {
  const [status, setStatus]           = useState('loading')
  const [lastSaved, setLastSaved]     = useState(null)
  const [restoreData, setRestoreData] = useState(null)
  const [errorMsg, setErrorMsg]       = useState(null)

  // Load existing data on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(DATA_URL, { cache: 'no-cache' })
        if (res.status === 404 || res.status === 403) {
          // Bucket empty — first run, no data yet
          setStatus('connected')
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setRestoreData(data)
        setStatus('connected')
      } catch (e) {
        // Network errors still let the app work — just won't cloud-save
        setStatus('error')
        setErrorMsg(e.message)
      }
    }
    load()
  }, [])

  const clearRestoreData = useCallback(() => setRestoreData(null), [])

  const save = useCallback(async (data) => {
    try {
      setStatus('saving')
      const res = await fetch(DATA_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('connected')
      setLastSaved(new Date())
      setErrorMsg(null)
    } catch (e) {
      setStatus('error')
      setErrorMsg(e.message)
    }
  }, [])

  return { status, lastSaved, restoreData, clearRestoreData, errorMsg, save }
}
