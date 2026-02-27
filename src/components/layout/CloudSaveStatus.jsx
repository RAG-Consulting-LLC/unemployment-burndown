import { useState, useEffect } from 'react'

function CloudIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12.5 6.5a3.5 3.5 0 00-6.9-.8A2.5 2.5 0 104.5 11h8a2.5 2.5 0 000-5 2.5 2.5 0 00-.5.05" />
      <path d="M8 11V7m-2 2l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 010 20" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 2L1.5 14h13L8 2z" strokeLinejoin="round" />
      <line x1="8" y1="7" x2="8" y2="10" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" />
    </svg>
  )
}

function relativeTime(date) {
  if (!date) return null
  const sec = Math.floor((Date.now() - date) / 1000)
  if (sec < 5)  return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}

export default function CloudSaveStatus({ storage }) {
  const { status, lastSaved, errorMsg } = storage

  // Refresh relative-time display every 10 s
  const [, tick] = useState(0)
  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => tick(n => n + 1), 10_000)
    return () => clearInterval(id)
  }, [status])

  const iconColor = status === 'error' ? '#f87171'
    : (status === 'saving' || status === 'connected') ? '#34d399'
    : 'var(--text-muted)'

  const title = status === 'loading' ? 'Loading…'
    : status === 'saving' ? 'Saving…'
    : status === 'error' ? (errorMsg || 'Cloud save failed')
    : lastSaved ? `Saved ${relativeTime(lastSaved)}` : 'Connected to cloud'

  const icon = status === 'loading' || status === 'saving' ? <SpinnerIcon />
    : status === 'error' ? <WarnIcon />
    : lastSaved ? <CheckIcon /> : <CloudIcon />

  return (
    <span
      className="w-8 h-8 flex items-center justify-center rounded-lg"
      title={title}
      style={{ color: iconColor }}
    >
      {icon}
    </span>
  )
}
