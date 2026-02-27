/**
 * Check if an item matches the active person filter.
 * @param {number|null} assignedTo - The item's assignedTo value
 * @param {number|string|null} filterPersonId - null = all, 'unassigned' = unassigned, number = person ID
 * @returns {boolean}
 */
export function matchesPersonFilter(assignedTo, filterPersonId) {
  if (filterPersonId === null) return true // no filter = show all
  if (filterPersonId === 'unassigned') return assignedTo === null || assignedTo === undefined
  return assignedTo === filterPersonId
}
