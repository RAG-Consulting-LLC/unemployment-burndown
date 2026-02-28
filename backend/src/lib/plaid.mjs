import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { checkBudget, incrementCallCount, PlaidBudgetExceededError } from './plaidBudget.mjs'

const PLAID_ENV_MAP = {
  sandbox:     PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production:  PlaidEnvironments.production,
}

let _client = null

/**
 * Returns a budget-guarded Plaid client.
 *
 * Every async method call on the client is intercepted by a Proxy that:
 *   1. Checks the monthly API call budget BEFORE the call
 *   2. Increments the counter AFTER a successful call
 *   3. Throws PlaidBudgetExceededError if the budget is exhausted
 *
 * This ensures no handler can accidentally run up the bill, even in loops.
 */
export function getPlaidClient() {
  if (_client) return _client

  const config = new Configuration({
    basePath: PLAID_ENV_MAP[process.env.PLAID_ENV] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET':    process.env.PLAID_SECRET,
      },
    },
  })

  const rawClient = new PlaidApi(config)
  _client = createGuardedClient(rawClient)
  return _client
}

/**
 * Wraps a PlaidApi instance in a Proxy that enforces budget limits.
 */
function createGuardedClient(client) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      // Only wrap functions (the API methods)
      if (typeof value !== 'function') return value

      // Return a wrapper that checks budget before calling
      return async function guardedCall(...args) {
        const budget = await checkBudget()
        if (!budget.allowed) {
          throw new PlaidBudgetExceededError(budget)
        }

        const result = await value.apply(target, args)

        // Count the call after success
        await incrementCallCount()

        return result
      }
    },
  })
}
