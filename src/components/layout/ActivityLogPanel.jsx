import { useEffect, useRef, useState } from 'react'

function relTime(date) {
  const sec = Math.floor((Date.now() - date) / 1000)
  if (sec < 5)  return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SaveIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12.5 6.5a3.5 3.5 0 00-6.9-.8A2.5 2.5 0 104.5 11h8a2.5 2.5 0 000-5" />
      <path d="M8 11V7m-2 2l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LoadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12.5 6.5a3.5 3.5 0 00-6.9-.8A2.5 2.5 0 104.5 11h8a2.5 2.5 0 000-5" />
      <path d="M8 7v4m-2-2l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
    </svg>
  )
}

function typeColor(type) {
  if (type === 'save')   return 'var(--accent-emerald)'
  if (type === 'load')   return 'var(--accent-blue)'
  return 'var(--text-muted)'
}

function TypeIcon({ type }) {
  if (type === 'save') return <SaveIcon />
  if (type === 'load') return <LoadIcon />
  return <EditIcon />
}

export default function ActivityLogPanel({ entries, onClose, onClear, userName, onSetUserName }) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState(userName)
  const nameRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus name input when editing
  useEffect(() => {
    if (editingName) nameRef.current?.select()
  }, [editingName])

  function commitName() {
    onSetUserName(nameInput)
    setEditingName(false)
  }

  function handleNameKey(e) {
    if (e.key === 'Enter') commitName()
    if (e.key === 'Escape') { setNameInput(userName); setEditingName(false) }
  }

  // Group entries by calendar day
  const groups = []
  let lastDay = null
  for (const entry of entries) {
    const day = entry.timestamp.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    if (day !== lastDay) { groups.push({ day, items: [] }); lastDay = day }
    groups[groups.length - 1].items.push(entry)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(400px, 100vw)',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Panel header */}
        <div
          className="flex items-start justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Activity Log
            </h2>

            {/* Editable user name */}
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tracker user:</span>
              {editingName ? (
                <input
                  ref={nameRef}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={handleNameKey}
                  className="text-xs px-1 rounded outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--accent-blue)',
                    color: 'var(--text-primary)',
                    width: 120,
                  }}
                />
              ) : (
                <button
                  onClick={() => { setNameInput(userName); setEditingName(true) }}
                  className="text-xs font-medium underline-offset-2 hover:underline"
                  style={{ color: 'var(--accent-blue)' }}
                  title="Click to edit your display name"
                >
                  {userName}
                </button>
              )}
            </div>

            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {entries.length} event{entries.length !== 1 ? 's' : ''} recorded
            </p>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            {entries.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs px-2 py-1 rounded"
                style={{
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded hover:opacity-60 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close log"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full gap-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
              <p className="text-sm">No activity yet</p>
              <p className="text-xs opacity-60">Changes will appear here as you edit the tracker.</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-5">
              {groups.map(({ day, items }) => (
                <div key={day}>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2 pb-1"
                    style={{
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {items.map(entry => (
                      <div key={entry.id} className="flex items-start gap-2.5 py-1.5">
                        <span
                          className="mt-0.5 flex-shrink-0 opacity-80"
                          style={{ color: typeColor(entry.type) }}
                        >
                          <TypeIcon type={entry.type} />
                        </span>
                        <p
                          className="flex-1 min-w-0 text-xs leading-snug"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {entry.message}
                        </p>
                        <span
                          className="text-xs flex-shrink-0 tabular-nums"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {entry.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
