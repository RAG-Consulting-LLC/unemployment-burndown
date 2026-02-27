import { useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'

export default function PlaidLinkButton({ linkToken, onSuccess, onExit, disabled, className }) {
  const onSuccessHandler = useCallback((publicToken, metadata) => {
    onSuccess?.(publicToken, metadata)
  }, [onSuccess])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onSuccessHandler,
    onExit: (err, metadata) => onExit?.(err, metadata),
  })

  return (
    <button
      onClick={open}
      disabled={!ready || disabled || !linkToken}
      className={className || `flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors`}
      style={{
        borderColor: 'var(--accent-blue)',
        background: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)',
        color: 'var(--accent-blue)',
        opacity: (!ready || disabled || !linkToken) ? 0.5 : 1,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
      <span>Link Bank Account</span>
    </button>
  )
}
