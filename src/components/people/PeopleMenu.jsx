import { useState, useRef, useEffect } from 'react'
import PeopleManager from './PeopleManager'

export default function PeopleMenu({ people, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        style={{ color: open ? 'var(--accent-blue, #3b82f6)' : 'var(--text-muted)' }}
        title="Manage household members"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {people.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}
          >
            {people.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-2xl z-50 p-4"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Household Members
          </p>
          <PeopleManager people={people} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
