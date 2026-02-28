/**
 * diffSection.js
 * Produces granular before/after change rows for each tracker section.
 * Each row: { type: 'added'|'removed'|'changed', name, field?, from?, to? }
 */

const CURRENCY = new Set([
  'monthlyAmount', 'amount', 'weeklyAmount', 'minimumPayment',
  'balance', 'estimatedValue', 'sideIncomeMonthly', 'partnerIncomeMonthly',
  'jobOfferSalary', 'emergencyFloor', 'monthlySalary',
])
const PERCENT = new Set(['expenseReductionPct', 'apr'])
const WEEKS   = new Set(['durationWeeks', 'benefitDelayWeeks', 'benefitCutWeeks'])

const FIELD_LABEL = {
  monthlyAmount:        'Monthly amount',
  amount:               'Amount',
  weeklyAmount:         'Weekly amount',
  minimumPayment:       'Min. payment',
  balance:              'Balance',
  estimatedValue:       'Est. value',
  active:               'Active',
  essential:            'Essential',
  includedInWhatIf:     'In What-if',
  startDate:            'Start date',
  endDate:              'End date',
  date:                 'Date',
  durationWeeks:        'Duration',
  expenseReductionPct:  'Expense reduction',
  sideIncomeMonthly:    'Side income/mo',
  partnerIncomeMonthly: 'Partner income/mo',
  jobOfferSalary:       'Job salary/mo',
  jobOfferStartDate:    'Job start',
  partnerStartDate:     'Partner start',
  emergencyFloor:       'Emergency floor',
  benefitDelayWeeks:    'Benefit delay',
  benefitCutWeeks:      'Benefit cut',
  freezeDate:           'Freeze date',
  apr:                  'APR',
  bank:                 'Bank',
  accountType:          'Account type',
  category:             'Category',
  name:                 'Name',
  description:          'Description',
  title:                'Title',
  employer:             'Employer',
  monthlySalary:        'Monthly salary',
  status:               'Status',
  statusDate:           'Status date',
}

const SKIP_KEYS = new Set(['id', 'freelanceRamp'])

function fmtVal(key, val) {
  if (val === null || val === undefined || val === '') return 'none'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (CURRENCY.has(key)) return '$' + Number(val).toLocaleString()
  if (PERCENT.has(key))  return `${val}%`
  if (WEEKS.has(key))    return `${val} wks`
  return String(val)
}

function itemName(item) {
  return item.category || item.name || item.title || item.bank || item.description || String(item.id || '?')
}

function itemMainVal(item) {
  const v = item.monthlyAmount ?? item.amount ?? item.weeklyAmount
    ?? item.estimatedValue ?? item.minimumPayment ?? item.balance
    ?? item.monthlySalary
  return v !== undefined ? '$' + Number(v).toLocaleString() : null
}

/** Diff two arrays of objects that each have an `id` field. */
export function diffArray(oldArr, newArr) {
  const changes = []
  const oldMap = new Map((oldArr || []).map(i => [i.id, i]))
  const newMap = new Map((newArr || []).map(i => [i.id, i]))

  // Added
  for (const [id, item] of newMap) {
    if (!oldMap.has(id)) {
      changes.push({ type: 'added', name: itemName(item), to: itemMainVal(item) || '' })
    }
  }

  // Removed
  for (const [id, item] of oldMap) {
    if (!newMap.has(id)) {
      changes.push({ type: 'removed', name: itemName(item), from: itemMainVal(item) || '' })
    }
  }

  // Modified — compare every primitive field
  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id)
    if (!oldItem) continue
    const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)])
    for (const key of allKeys) {
      if (SKIP_KEYS.has(key)) continue
      const ov = oldItem[key], nv = newItem[key]
      if (typeof ov === 'object' || typeof nv === 'object') continue
      if (Array.isArray(ov) || Array.isArray(nv)) continue
      if (ov !== nv) {
        changes.push({
          type: 'changed',
          name: itemName(newItem),
          field: FIELD_LABEL[key] || key,
          from: fmtVal(key, ov),
          to: fmtVal(key, nv),
        })
      }
    }
  }

  return changes
}

/** Diff two plain objects (e.g. unemployment, whatIf). */
export function diffObject(oldObj, newObj) {
  const changes = []
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
  for (const key of allKeys) {
    if (SKIP_KEYS.has(key)) continue
    const ov = oldObj?.[key], nv = newObj?.[key]
    if (typeof ov === 'object' || typeof nv === 'object') continue
    if (Array.isArray(ov) || Array.isArray(nv)) continue
    if (ov !== nv) {
      changes.push({
        type: 'changed',
        name: FIELD_LABEL[key] || key,
        from: fmtVal(key, ov),
        to: fmtVal(key, nv),
      })
    }
  }
  return changes
}

/** Diff a primitive value (e.g. furloughDate string). */
export function diffPrimitive(oldVal, newVal) {
  if (oldVal === newVal) return []
  return [{ type: 'changed', name: 'Value', from: String(oldVal || ''), to: String(newVal || '') }]
}
