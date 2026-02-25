import { useComments } from '../../context/CommentsContext'

export default function CommentButton({ itemId, label }) {
  const { openComments, commentCount } = useComments()
  const count = commentCount(itemId)

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); openComments(itemId, label) }}
      title={count > 0 ? `${count} comment${count !== 1 ? 's' : ''} — click to view` : 'Add a comment'}
      className="relative flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 transition-colors"
      style={{
        color: count > 0 ? 'var(--accent-blue)' : 'var(--text-muted)',
        background: count > 0 ? 'color-mix(in srgb, var(--accent-blue) 12%, transparent)' : 'transparent',
        border: count > 0 ? '1px solid color-mix(in srgb, var(--accent-blue) 30%, transparent)' : '1px solid transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--accent-blue)'
        e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-blue) 15%, transparent)'
        e.currentTarget.style.border = '1px solid color-mix(in srgb, var(--accent-blue) 35%, transparent)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = count > 0 ? 'var(--accent-blue)' : 'var(--text-muted)'
        e.currentTarget.style.background = count > 0 ? 'color-mix(in srgb, var(--accent-blue) 12%, transparent)' : 'transparent'
        e.currentTarget.style.border = count > 0 ? '1px solid color-mix(in srgb, var(--accent-blue) 30%, transparent)' : '1px solid transparent'
      }}
    >
      {/* Chat bubble icon */}
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z" />
      </svg>

      {/* Count badge */}
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 text-white font-bold rounded-full flex items-center justify-center tabular-nums"
          style={{
            fontSize: 9,
            lineHeight: 1,
            minWidth: 14,
            height: 14,
            padding: '0 3px',
            background: 'var(--accent-blue)',
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
