export default function Header({ rightSlot }) {
  return (
    <header className="flex items-center justify-between py-3 px-6 bg-gray-900 border-b border-gray-700">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Financial Burndown Tracker
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Furlough started Feb 21, 2026</p>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
      </div>
    </header>
  )
}
