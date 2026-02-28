import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'

/**
 * "Connect Bank" button that opens the Plaid Link modal.
 *
 * Props:
 *   createLinkToken – async fn that returns a link_token string
 *   exchangeToken   – async fn(publicToken, metadata) called on success
 *   syncAll         – async fn() to trigger a balance sync after linking
 *   linkedCount     – number of already-connected institutions
 *   syncing         – boolean, true while a sync is in progress
 */
export default function PlaidLinkButton({ createLinkToken, exchangeToken, syncAll, linkedCount = 0, syncing = false }) {
  const [linkToken, setLinkToken] = useState(null)
  const [preparing, setPreparing] = useState(false)

  // Fetch a link token when the user clicks
  const handlePrepare = useCallback(async () => {
    setPreparing(true)
    try {
      const token = await createLinkToken()
      setLinkToken(token)
    } catch {
      // Error is surfaced via usePlaid's error state
    }
    setPreparing(false)
  }, [createLinkToken])

  // Plaid Link callbacks
  const onSuccess = useCallback(async (publicToken, metadata) => {
    setLinkToken(null) // close Link
    try {
      await exchangeToken(publicToken, metadata)
      // Auto-sync after linking
      await syncAll()
    } catch {
      // Errors surfaced by usePlaid
    }
  }, [exchangeToken, syncAll])

  const onExit = useCallback(() => {
    setLinkToken(null)
  }, [])

  const config = {
    token: linkToken,
    onSuccess,
    onExit,
  }

  const { open, ready } = usePlaidLink(config)

  // Auto-open Plaid Link once the token is ready
  useEffect(() => {
    if (linkToken && ready) {
      open()
    }
  }, [linkToken, ready, open])

  return (
    <button
      onClick={handlePrepare}
      disabled={preparing || syncing}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
      style={{
        borderColor: linkedCount > 0 ? 'var(--accent-emerald)' : 'var(--accent-blue)',
        background: linkedCount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        color: linkedCount > 0 ? 'var(--accent-emerald)' : 'var(--accent-blue)',
        opacity: (preparing || syncing) ? 0.6 : 1,
        cursor: (preparing || syncing) ? 'wait' : 'pointer',
      }}
      title={linkedCount > 0 ? 'Connect another bank account' : 'Connect your bank via Plaid'}
    >
      {/* Bank icon */}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="22" height="16" rx="2" />
        <path d="M1 10h22" />
        <path d="M7 15h4" />
      </svg>
      <span className="hidden sm:inline">
        {preparing ? 'Connecting...' : syncing ? 'Syncing...' : linkedCount > 0 ? `${linkedCount} Bank${linkedCount > 1 ? 's' : ''}` : 'Connect Bank'}
      </span>
      {linkedCount > 0 && !preparing && !syncing && (
        <span
          className="text-xs font-semibold px-1 rounded-full tabular-nums"
          style={{
            background: 'var(--accent-emerald)',
            color: '#fff',
            fontSize: '10px',
            lineHeight: '16px',
            minWidth: 16,
            textAlign: 'center',
          }}
        >
          {linkedCount}
        </span>
      )}
    </button>
  )
}
