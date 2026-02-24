import { useState, useEffect, useRef } from 'react'

export default function Header({ rightSlot }) {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const currentY = window.scrollY
        // Show when scrolling up or near top; hide when scrolling down
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
      className={`sticky top-0 z-50 flex items-center justify-between py-3 px-6
        backdrop-blur-xl backdrop-saturate-150
        transition-transform duration-300 ease-in-out
        ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 0 0 var(--shadow-header)',
      }}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Financial Burndown Tracker
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Furlough started Feb 21, 2026</p>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
      </div>
    </header>
  )
}
