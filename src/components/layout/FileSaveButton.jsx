import { useState, useEffect } from 'react'

function SaveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 13H3a1 1 0 01-1-1V3a1 1 0 011-1h8l2 2v9a1 1 0 01-1 1z" />
      <rect x="5" y="9" width="6" height="4" rx="0.5" />
      <rect x="5" y="2" width="4" height="3" rx="0.5" />
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

/**
 * Props:
 *   storage    – object returned by useFileStorage()
 *   onLoad     – (parsedData) => void   called after a file is opened/reconnected
 *   buildState – () => object           called to get current app state for writing
 */
export default function FileSaveButton({ storage, onLoad, buildState }) {
  const { isSupported, fileName, status, lastSaved, errorMsg } = storage
  const [menuOpen, setMenuOpen] = useState(false)

  // Refresh relative-time display every 10 s
  const [, tick] = useState(0)
  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => tick(n => n + 1), 10_000)
    return () => clearInterval(id)
  }, [status])

  if (!isSupported) {
    return (
      <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}
        title="File System Access API requires Chrome or Edge">
        localStorage only
      </span>
    )
  }

  async function handleOpen() {
    setMenuOpen(false)
    const data = await storage.openFile()
    if (data) onLoad(data)
  }

  async function handleCreate() {
    setMenuOpen(false)
    await storage.createFile(buildState())
  }

  async function handleReconnect() {
    const data = await storage.reconnect()
    if (data) onLoad(data)
  }

  async function handleDisconnect() {
    setMenuOpen(false)
    await storage.disconnect()
  }

  // ── needs-permission ─────────────────────────────────────────────────────
  if (status === 'needs-permission') {
    return (
      <button
        onClick={handleReconnect}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
        style={{ borderColor: 'var(--accent-amber, #d97706)', background: 'rgba(217,119,6,0.1)', color: '#fbbf24' }}
        title={`Re-grant read/write access to ${fileName}`}
      >
        <WarnIcon />
        <span className="hidden sm:inline">Reconnect {fileName}</span>
      </button>
    )
  }

  // ── connected / saving ───────────────────────────────────────────────────
  if (status === 'connected' || status === 'saving') {
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)', color: '#34d399' }}
          title={`Synced to ${fileName}`}
        >
          {status === 'saving' ? <SpinnerIcon /> : <CheckIcon />}
          <span className="hidden sm:inline max-w-[110px] truncate">{fileName}</span>
          {lastSaved && (
            <span className="hidden lg:inline text-xs opacity-60">· {relativeTime(lastSaved)}</span>
          )}
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-44 rounded-xl border shadow-2xl z-50 p-1.5 space-y-0.5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={handleOpen}
              className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Open different file…
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors"
              style={{ color: '#f87171' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Disconnect file
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
        style={{ borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
        title={errorMsg || 'Save failed — click to retry with a different file'}
      >
        <WarnIcon />
        <span className="hidden sm:inline">Save error</span>
      </button>
    )
  }

  // ── idle ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
        title="Save config to a JSON file on disk"
      >
        <SaveIcon />
        <span className="hidden sm:inline">Save to file</span>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-2xl z-50 p-1.5 space-y-0.5"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-1 pb-0.5" style={{ color: 'var(--text-muted)' }}>
            File Storage
          </p>
          <p className="text-[10px] px-3 pb-2 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
            Link a .json file to auto-save all your data on every change.
          </p>
          <button
            onClick={handleCreate}
            className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors font-medium"
            style={{ color: 'var(--accent-emerald, #34d399)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Create new file…
          </button>
          <button
            onClick={handleOpen}
            className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Open existing file…
          </button>
        </div>
      )}
    </div>
  )
}
