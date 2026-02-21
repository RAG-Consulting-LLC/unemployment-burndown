export default function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 p-5 ${className}`}>
      {title && (
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
