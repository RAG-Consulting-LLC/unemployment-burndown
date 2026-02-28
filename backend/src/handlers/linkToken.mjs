import { CountryCode, Products } from 'plaid'
import { getPlaidClient } from '../lib/plaid.mjs'
import { ok, err } from '../lib/response.mjs'

/**
 * POST /plaid/link-token
 *
 * Creates a short-lived link_token that the React frontend uses to open
 * Plaid Link. The user authenticates with their bank inside the Link UI,
 * which returns a public_token to be exchanged via /plaid/exchange.
 */
export async function handler(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const userId = body.userId || 'default'

    const client = getPlaidClient()

    const response = await client.linkTokenCreate({
      user:           { client_user_id: userId },
      client_name:    'Burndown Tracker',
      products:       [Products.Transactions],
      country_codes:  [CountryCode.Us],
      language:       'en',
    })

    return ok({ link_token: response.data.link_token })
  } catch (error) {
    console.error('linkToken error:', error.response?.data || error.message)
    return err(500, error.response?.data?.error_message || error.message)
  }
}
