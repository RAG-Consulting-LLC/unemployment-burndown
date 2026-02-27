import { useState, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_PLAID_API_URL || ''

/**
 * Hook that manages the Plaid integration lifecycle:
 *   - Creating link tokens (to open Plaid Link)
 *   - Exchanging public tokens for access tokens
 *   - Fetching connected accounts
 *   - Syncing transactions + balances
 *   - Disconnecting items
 *
 * All server calls go through the SAM-deployed Lambda backend.
 */
export function usePlaid({ userId = 'default', onSyncComplete } = {}) {
  const [linkedItems, setLinkedItems]   = useState([])     // connected institutions
  const [syncing, setSyncing]           = useState(false)
  const [lastSync, setLastSync]         = useState(null)
  const [error, setError]               = useState(null)
  const [loading, setLoading]           = useState(false)
  const fetchedRef = useRef(false)

  // ── Helpers ──

  async function apiCall(path, options = {}) {
    const url = `${API_BASE}${path}`
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  }

  // ── Create link token ──

  const createLinkToken = useCallback(async () => {
    setError(null)
    try {
      const data = await apiCall('/plaid/link-token', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      })
      return data.link_token
    } catch (e) {
      setError(e.message)
      throw e
    }
  }, [userId])

  // ── Exchange public token ──

  const exchangeToken = useCallback(async (publicToken, metadata = {}) => {
    setError(null)
    setLoading(true)
    try {
      const data = await apiCall('/plaid/exchange', {
        method: 'POST',
        body: JSON.stringify({ public_token: publicToken, userId, metadata }),
      })

      // Add to linked items
      setLinkedItems(prev => [
        ...prev.filter(i => i.itemId !== data.itemId),
        {
          itemId:          data.itemId,
          institutionName: data.institutionName,
          institutionId:   data.institutionId,
          accounts:        data.accounts,
          lastSync:        new Date().toISOString(),
        },
      ])

      setLoading(false)
      return data
    } catch (e) {
      setError(e.message)
      setLoading(false)
      throw e
    }
  }, [userId])

  // ── Fetch connected accounts ──

  const fetchAccounts = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await apiCall(`/plaid/accounts?userId=${encodeURIComponent(userId)}`)
      setLinkedItems(data.items || [])
      setLoading(false)
      fetchedRef.current = true
      return data.items
    } catch (e) {
      setError(e.message)
      setLoading(false)
      // Don't throw — no linked accounts is fine
      return []
    }
  }, [userId])

  // ── Sync transactions + balances ──

  const syncAll = useCallback(async (itemId = null) => {
    setError(null)
    setSyncing(true)
    try {
      const body = { userId }
      if (itemId) body.itemId = itemId

      const data = await apiCall('/plaid/sync', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (data.updated && data.data) {
        setLastSync(new Date().toISOString())

        // Notify parent to apply the updated data
        if (onSyncComplete) {
          onSyncComplete(data.data)
        }
      }

      // Refresh account list
      await fetchAccounts()

      setSyncing(false)
      return data
    } catch (e) {
      setError(e.message)
      setSyncing(false)
      throw e
    }
  }, [userId, onSyncComplete, fetchAccounts])

  // ── Disconnect an item ──

  const disconnect = useCallback(async (itemId) => {
    setError(null)
    try {
      await apiCall('/plaid/disconnect', {
        method: 'POST',
        body: JSON.stringify({ userId, itemId }),
      })
      setLinkedItems(prev => prev.filter(i => i.itemId !== itemId))
    } catch (e) {
      setError(e.message)
      throw e
    }
  }, [userId])

  return {
    // State
    linkedItems,
    syncing,
    lastSync,
    error,
    loading,
    hasFetched: fetchedRef.current,

    // Actions
    createLinkToken,
    exchangeToken,
    fetchAccounts,
    syncAll,
    disconnect,
    clearError: () => setError(null),
  }
}
