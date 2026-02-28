import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const PLAID_ENV_MAP = {
  sandbox:     PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production:  PlaidEnvironments.production,
}

let _client = null

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

  _client = new PlaidApi(config)
  return _client
}
