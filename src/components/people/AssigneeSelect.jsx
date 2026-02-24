const COLOR_CLASSES = {
  blue:    'bg-blue-500',
  purple:  'bg-purple-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-400',
  rose:    'bg-rose-500',
  cyan:    'bg-cyan-500',
}

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Cycles: null → people[0] → people[1] → ... → null
export default function AssigneeSelect({ people, value, onChange }) {
  function cycle() {
    if (!people.length) return
    if (value === null) {
      onChange(people[0].id)
      return
    }
    const idx = people.findIndex(p => p.id === value)
    if (idx === -1 || idx === people.length - 1) {
      onChange(null)
    } else {
      onChange(people[idx + 1].id)
    }
  }

  const person = people.find(p => p.id === value) ?? null
  const bgClass = person ? (COLOR_CLASSES[person.color] ?? 'bg-gray-500') : null

  return (
    <button
      type="button"
      onClick={cycle}
      title={person ? `Assigned to ${person.name} — click to change` : 'Unassigned — click to assign'}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors flex-shrink-0 ${
        person ? bgClass : 'bg-gray-700 border border-dashed border-gray-500 text-gray-500'
      }`}
    >
      {person ? getInitials(person.name) : <span className="text-gray-500 text-base leading-none">+</span>}
    </button>
  )
}
