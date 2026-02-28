import { checkBudget } from '../lib/plaidBudget.mjs'
import { ok, err } from '../lib/response.mjs'

/**
 * GET /plaid/budget
 *
 * Returns current Plaid API usage and budget status for the month.
 * Useful for the frontend to display usage warnings or disable sync buttons.
 */
export async function handler() {
  try {
    const budget = await checkBudget()
    return ok(budget)
  } catch (error) {
    console.error('budget check error:', error.message)
    return err(500, error.message)
  }
}
