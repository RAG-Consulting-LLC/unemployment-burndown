export default function SectionCard({ title, id, children, className = '' }) {
  return (
    <div id={id} className={`theme-card rounded-xl border p-5 ${className}`}>
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
