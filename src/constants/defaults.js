export const DEFAULTS = {
  // savingsAccounts replaces the single currentSavings number
  savingsAccounts: [
    { id: 1, name: 'Checking Account', amount: 5000 },
    { id: 2, name: 'Savings Account',  amount: 10000 },
  ],
  furloughDate: '2026-02-21',
  unemployment: {
    startDate: '2026-03-07',
    weeklyAmount: 450,
    durationWeeks: 26,
  },
  expenses: [
    { id: 1, category: 'Rent / Mortgage',    monthlyAmount: 1500, essential: true },
    { id: 2, category: 'Food & Groceries',   monthlyAmount: 400,  essential: true },
    { id: 3, category: 'Utilities',          monthlyAmount: 150,  essential: true },
    { id: 4, category: 'Health / Insurance', monthlyAmount: 250,  essential: true },
    { id: 5, category: 'Transportation',     monthlyAmount: 200,  essential: false },
    { id: 6, category: 'Subscriptions',      monthlyAmount: 80,   essential: false },
    { id: 7, category: 'Misc / Personal',    monthlyAmount: 120,  essential: false },
  ],
  whatIf: {
    expenseReductionPct: 0,
    sideIncomeMonthly: 0,
  },
  oneTimeExpenses: [],
  assets: [],
  investments: [],
}
