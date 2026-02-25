import { useState, useEffect, useRef } from 'react'

function relTime(date) {
  if (!date) return null
  const sec = Math.floor((Date.now() - date) / 1000)
  if (sec < 5)  return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Header({ rightSlot, lastSaved, savedBy }) {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Refresh relative-time display every 15s
  const [, tick] = useState(0)
  useEffect(() => {
    if (!lastSaved) return
    const id = setInterval(() => tick(n => n + 1), 15_000)
    return () => clearInterval(id)
  }, [lastSaved])

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const currentY = window.scrollY
        if (currentY < 10 || currentY < lastScrollY.current) {
          setVisible(true)
        } else if (currentY > lastScrollY.current) {
          setVisible(false)
        }
        lastScrollY.current = currentY
        ticking.current = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 flex items-center justify-between py-3 px-3 sm:px-6
        backdrop-blur-xl backdrop-saturate-150
        transition-transform duration-300 ease-in-out
        ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 0 0 var(--shadow-header)',
      }}
    >
      <div className="min-w-0 mr-2">
        <h1 className="text-base sm:text-xl font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
          Financial Burndown Tracker
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            Furlough started Feb 21, 2026
          </p>
          {lastSaved && (
            <>
              <span className="text-xs hidden sm:block" style={{ color: 'var(--border-default, #374151)' }}>·</span>
              <p className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                Saved by <span style={{ color: 'var(--text-secondary)' }}>{savedBy || 'You'}</span>
                {' '}&middot; {relTime(lastSaved)}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {rightSlot}
      </div>
    </header>
  )
}
