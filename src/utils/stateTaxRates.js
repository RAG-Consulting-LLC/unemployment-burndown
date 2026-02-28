// Approximate combined effective tax rates (federal income + state income + FICA)
// for a single filer earning ~$100k. These are rough starting suggestions, not precise calculations.
// Users can edit the rate per scenario.

export const US_STATES = [
  { code: 'AL', name: 'Alabama',              suggestedEffectiveRate: 28.5 },
  { code: 'AK', name: 'Alaska',               suggestedEffectiveRate: 22.0 },
  { code: 'AZ', name: 'Arizona',              suggestedEffectiveRate: 25.5 },
  { code: 'AR', name: 'Arkansas',             suggestedEffectiveRate: 27.5 },
  { code: 'CA', name: 'California',           suggestedEffectiveRate: 32.0 },
  { code: 'CO', name: 'Colorado',             suggestedEffectiveRate: 26.5 },
  { code: 'CT', name: 'Connecticut',          suggestedEffectiveRate: 28.0 },
  { code: 'DE', name: 'Delaware',             suggestedEffectiveRate: 27.5 },
  { code: 'DC', name: 'District of Columbia', suggestedEffectiveRate: 29.0 },
  { code: 'FL', name: 'Florida',              suggestedEffectiveRate: 22.0 },
  { code: 'GA', name: 'Georgia',              suggestedEffectiveRate: 27.5 },
  { code: 'HI', name: 'Hawaii',               suggestedEffectiveRate: 30.0 },
  { code: 'ID', name: 'Idaho',                suggestedEffectiveRate: 27.0 },
  { code: 'IL', name: 'Illinois',             suggestedEffectiveRate: 27.0 },
  { code: 'IN', name: 'Indiana',              suggestedEffectiveRate: 25.5 },
  { code: 'IA', name: 'Iowa',                 suggestedEffectiveRate: 27.5 },
  { code: 'KS', name: 'Kansas',               suggestedEffectiveRate: 27.0 },
  { code: 'KY', name: 'Kentucky',             suggestedEffectiveRate: 27.0 },
  { code: 'LA', name: 'Louisiana',            suggestedEffectiveRate: 26.0 },
  { code: 'ME', name: 'Maine',                suggestedEffectiveRate: 28.0 },
  { code: 'MD', name: 'Maryland',             suggestedEffectiveRate: 28.5 },
  { code: 'MA', name: 'Massachusetts',        suggestedEffectiveRate: 28.0 },
  { code: 'MI', name: 'Michigan',             suggestedEffectiveRate: 26.5 },
  { code: 'MN', name: 'Minnesota',            suggestedEffectiveRate: 29.0 },
  { code: 'MS', name: 'Mississippi',          suggestedEffectiveRate: 27.0 },
  { code: 'MO', name: 'Missouri',             suggestedEffectiveRate: 27.0 },
  { code: 'MT', name: 'Montana',              suggestedEffectiveRate: 27.5 },
  { code: 'NE', name: 'Nebraska',             suggestedEffectiveRate: 27.5 },
  { code: 'NV', name: 'Nevada',               suggestedEffectiveRate: 22.0 },
  { code: 'NH', name: 'New Hampshire',        suggestedEffectiveRate: 22.0 },
  { code: 'NJ', name: 'New Jersey',           suggestedEffectiveRate: 28.5 },
  { code: 'NM', name: 'New Mexico',           suggestedEffectiveRate: 27.0 },
  { code: 'NY', name: 'New York',             suggestedEffectiveRate: 30.5 },
  { code: 'NC', name: 'North Carolina',       suggestedEffectiveRate: 27.0 },
  { code: 'ND', name: 'North Dakota',         suggestedEffectiveRate: 24.0 },
  { code: 'OH', name: 'Ohio',                 suggestedEffectiveRate: 26.0 },
  { code: 'OK', name: 'Oklahoma',             suggestedEffectiveRate: 27.0 },
  { code: 'OR', name: 'Oregon',               suggestedEffectiveRate: 31.0 },
  { code: 'PA', name: 'Pennsylvania',         suggestedEffectiveRate: 25.5 },
  { code: 'RI', name: 'Rhode Island',         suggestedEffectiveRate: 27.5 },
  { code: 'SC', name: 'South Carolina',       suggestedEffectiveRate: 27.0 },
  { code: 'SD', name: 'South Dakota',         suggestedEffectiveRate: 22.0 },
  { code: 'TN', name: 'Tennessee',            suggestedEffectiveRate: 22.0 },
  { code: 'TX', name: 'Texas',                suggestedEffectiveRate: 22.0 },
  { code: 'UT', name: 'Utah',                 suggestedEffectiveRate: 27.0 },
  { code: 'VT', name: 'Vermont',              suggestedEffectiveRate: 28.5 },
  { code: 'VA', name: 'Virginia',             suggestedEffectiveRate: 27.5 },
  { code: 'WA', name: 'Washington',           suggestedEffectiveRate: 22.0 },
  { code: 'WV', name: 'West Virginia',        suggestedEffectiveRate: 27.0 },
  { code: 'WI', name: 'Wisconsin',            suggestedEffectiveRate: 28.0 },
  { code: 'WY', name: 'Wyoming',              suggestedEffectiveRate: 22.0 },
]

export function getStateTaxRate(stateCode) {
  const state = US_STATES.find(s => s.code === stateCode)
  return state ? state.suggestedEffectiveRate : 0
}

export function computeMonthlyTakeHome(grossAnnualSalary, taxRatePct) {
  const gross = Number(grossAnnualSalary) || 0
  const tax = Number(taxRatePct) || 0
  return Math.round((gross / 12) * (1 - tax / 100))
}

export function computeAllocationAmount(value, type, monthlyTakeHome) {
  const v = Number(value) || 0
  if (type === 'percent') return Math.round(monthlyTakeHome * v / 100)
  return v
}

/**
 * Compute the minimum gross annual salary needed to cover monthly expenses.
 * Formula: (monthlyExpenses * 12) / (1 - taxRate/100)
 */
export function computeMinimumGrossSalary(monthlyExpenses, taxRatePct) {
  const tax = Math.min(99, Math.max(0, Number(taxRatePct) || 0))
  const factor = 1 - tax / 100
  if (factor <= 0) return 0
  return Math.round((monthlyExpenses * 12) / factor)
}
