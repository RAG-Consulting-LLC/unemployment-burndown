import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'node:crypto'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from project root (or parent repo root if in a worktree)
dotenv.config({ path: resolve(__dirname, '..', '.env') })
if (!process.env.PLAID_CLIENT_ID) {
  // Try parent repo path (for git worktree setups)
  const parentEnv = resolve(__dirname, '..', '..', '..', '..', '.env')
  if (existsSync(parentEnv)) dotenv.config({ path: parentEnv })
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ── S3 client for data proxy ──
const S3_BUCKET = process.env.S3_BUCKET || 'rag-consulting-burndown'
const S3_REGION = process.env.AWS_REGION || 'us-west-1'
const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// ── Auth (in-memory stores for local dev) ──
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'
const users = new Map()  // userId -> { userId, email, passwordHash, mfaEnabled, mfaSecret, orgId, orgRole }
const orgs = new Map()   // orgId -> { orgId, name, joinCode, ownerId, createdAt }
const orgMembers = new Map() // orgId -> [{ userId, role, joinedAt }]

function signJwt(userId, { mfaVerified = false, orgId = null, orgRole = null } = {}) {
  return jwt.sign({ sub: userId, mfaVerified, orgId, orgRole }, JWT_SECRET, { expiresIn: '24h' })
}

function verifyJwt(token) {
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  const payload = verifyJwt(token)
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = payload
  next()
}

function orgMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (!req.user.orgId) return res.status(403).json({ error: 'Organization membership required' })
    next()
  })
}

function generateOrgId() { return `org_${crypto.randomBytes(8).toString('hex')}` }
function generateJoinCode() { return crypto.randomBytes(4).toString('hex').toUpperCase() }

// ── S3 helpers (org-scoped) ──
function dataKey(orgId) { return orgId ? `orgs/${orgId}/data.json` : 'data.json' }
function statementsIndexKey(orgId) { return orgId ? `orgs/${orgId}/statements/index.json` : 'statements/index.json' }
function statementKey(orgId, id) { return orgId ? `orgs/${orgId}/statements/${id}.json` : `statements/${id}.json` }

async function s3Get(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  return JSON.parse(await res.Body.transformToString('utf-8'))
}

async function s3Put(key, data) {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }))
}

// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    const userId = email.toLowerCase()
    if (users.has(userId)) return res.status(409).json({ error: 'An account with this email already exists' })
    const passwordHash = await bcrypt.hash(password, 12)
    users.set(userId, { userId, email: userId, passwordHash, mfaEnabled: false, mfaSecret: null, orgId: null, orgRole: null })
    const token = signJwt(userId, { mfaVerified: false, orgId: null, orgRole: null })
    res.json({ token, user: { userId, email: userId, mfaEnabled: false, orgId: null, orgRole: null } })
  } catch (err) {
    console.error('register error:', err.message)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const userId = email.toLowerCase()
    const user = users.get(userId)
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    const orgOpts = { orgId: user.orgId || null, orgRole: user.orgRole || null }

    if (user.mfaEnabled) {
      const tempToken = signJwt(userId, { mfaVerified: false, ...orgOpts })
      return res.json({ mfaRequired: true, tempToken })
    }
    const token = signJwt(userId, { mfaVerified: true, ...orgOpts })
    res.json({ token, user: { userId, email: user.email, mfaEnabled: user.mfaEnabled, ...orgOpts } })
  } catch (err) {
    console.error('login error:', err.message)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/verify-mfa
app.post('/api/auth/verify-mfa', authMiddleware, (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'MFA code is required' })
  const user = users.get(req.user.sub)
  if (!user || !user.mfaEnabled || !user.mfaSecret) return res.status(400).json({ error: 'MFA is not enabled' })
  const isValid = authenticator.verify({ token: code, secret: user.mfaSecret })
  if (!isValid) return res.status(401).json({ error: 'Invalid MFA code' })
  const token = signJwt(user.userId, { mfaVerified: true, orgId: user.orgId, orgRole: user.orgRole })
  res.json({ token, user: { userId: user.userId, email: user.email, mfaEnabled: true, orgId: user.orgId, orgRole: user.orgRole } })
})

// POST /api/auth/setup-mfa
app.post('/api/auth/setup-mfa', authMiddleware, async (req, res) => {
  const user = users.get(req.user.sub)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const secret = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(user.email, 'BurndownTracker', secret)
  const qrCode = await QRCode.toDataURL(otpauth)
  res.json({ secret, qrCode, otpauth })
})

// POST /api/auth/enable-mfa
app.post('/api/auth/enable-mfa', authMiddleware, (req, res) => {
  const { secret, code } = req.body
  if (!secret || !code) return res.status(400).json({ error: 'Secret and code are required' })
  const isValid = authenticator.verify({ token: code, secret })
  if (!isValid) return res.status(400).json({ error: 'Invalid code. Please try again.' })
  const user = users.get(req.user.sub)
  user.mfaEnabled = true
  user.mfaSecret = secret
  res.json({ mfaEnabled: true })
})

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.get(req.user.sub)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ userId: user.userId, email: user.email, mfaEnabled: user.mfaEnabled, orgId: user.orgId || null, orgRole: user.orgRole || null })
})

// ═══════════════════════════════════════════════════════════════
// ORG ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/org/create
app.post('/api/org/create', authMiddleware, async (req, res) => {
  try {
    const user = users.get(req.user.sub)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.orgId) return res.status(409).json({ error: 'You already belong to an organization' })

    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Organization name is required' })

    const orgId = generateOrgId()
    const joinCode = generateJoinCode()
    const now = new Date().toISOString()

    orgs.set(orgId, { orgId, name: name.trim(), joinCode, ownerId: user.userId, createdAt: now })
    orgMembers.set(orgId, [{ userId: user.userId, role: 'owner', joinedAt: now }])

    user.orgId = orgId
    user.orgRole = 'owner'

    // Initialize data.json for this org in S3
    const initialData = {
      state: {
        people: [
          { id: 1, name: user.email.split('@')[0], color: '#3b82f6', linkedUserId: user.userId, email: user.email },
        ],
        monthlyIncome: 0,
        savingsAccounts: [],
        creditCards: [],
        bills: [],
        expenses: [],
      },
      savedAt: now,
    }
    await s3Put(dataKey(orgId), initialData)

    const token = signJwt(user.userId, { mfaVerified: req.user.mfaVerified, orgId, orgRole: 'owner' })
    res.json({
      token,
      org: { orgId, name: name.trim(), joinCode },
      user: { userId: user.userId, email: user.email, mfaEnabled: user.mfaEnabled, orgId, orgRole: 'owner' },
    })
  } catch (err) {
    console.error('orgCreate error:', err.message)
    res.status(500).json({ error: 'Failed to create organization' })
  }
})

// POST /api/org/join
app.post('/api/org/join', authMiddleware, async (req, res) => {
  try {
    const user = users.get(req.user.sub)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.orgId) return res.status(409).json({ error: 'You already belong to an organization' })

    const { joinCode } = req.body
    if (!joinCode || !joinCode.trim()) return res.status(400).json({ error: 'Join code is required' })

    // Find org by join code
    let org = null
    for (const o of orgs.values()) {
      if (o.joinCode === joinCode.trim().toUpperCase()) { org = o; break }
    }
    if (!org) return res.status(404).json({ error: 'Invalid join code' })

    const members = orgMembers.get(org.orgId) || []
    if (members.find(m => m.userId === user.userId)) {
      return res.status(409).json({ error: 'You are already a member of this organization' })
    }

    members.push({ userId: user.userId, role: 'member', joinedAt: new Date().toISOString() })
    orgMembers.set(org.orgId, members)

    user.orgId = org.orgId
    user.orgRole = 'member'

    // Add as person in data.json
    try {
      const data = await s3Get(dataKey(org.orgId))
      if (data && data.state) {
        const maxId = (data.state.people || []).reduce((max, p) => Math.max(max, p.id || 0), 0)
        data.state.people = data.state.people || []
        data.state.people.push({
          id: maxId + 1,
          name: user.email.split('@')[0],
          color: '#8b5cf6',
          linkedUserId: user.userId,
          email: user.email,
        })
        data.savedAt = new Date().toISOString()
        await s3Put(dataKey(org.orgId), data)
      }
    } catch (e) {
      console.warn('Could not update data.json for join:', e.message)
    }

    const token = signJwt(user.userId, { mfaVerified: req.user.mfaVerified, orgId: org.orgId, orgRole: 'member' })
    res.json({
      token,
      org: { orgId: org.orgId, name: org.name },
      user: { userId: user.userId, email: user.email, mfaEnabled: user.mfaEnabled, orgId: org.orgId, orgRole: 'member' },
    })
  } catch (err) {
    console.error('orgJoin error:', err.message)
    res.status(500).json({ error: 'Failed to join organization' })
  }
})

// GET /api/org
app.get('/api/org', orgMiddleware, (req, res) => {
  const org = orgs.get(req.user.orgId)
  if (!org) return res.status(404).json({ error: 'Organization not found' })

  const members = (orgMembers.get(req.user.orgId) || []).map(m => {
    const u = users.get(m.userId)
    return { userId: m.userId, email: u?.email || m.userId, role: m.role, joinedAt: m.joinedAt }
  })

  const response = { orgId: org.orgId, name: org.name, createdAt: org.createdAt, members }
  if (req.user.orgRole === 'owner') response.joinCode = org.joinCode

  res.json(response)
})

// POST /api/org/regenerate-code
app.post('/api/org/regenerate-code', orgMiddleware, (req, res) => {
  if (req.user.orgRole !== 'owner') return res.status(403).json({ error: 'Only the owner can regenerate the join code' })
  const org = orgs.get(req.user.orgId)
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  org.joinCode = generateJoinCode()
  res.json({ joinCode: org.joinCode })
})

// ═══════════════════════════════════════════════════════════════
// PLAID ROUTES
// ═══════════════════════════════════════════════════════════════

const config = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SANDBOX_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(config)

// ── Safety: max pagination pages (matches backend PLAID_MAX_SYNC_PAGES) ──
const MAX_SYNC_PAGES = parseInt(process.env.PLAID_MAX_SYNC_PAGES || '10', 10)

// ── Safety: in-memory per-item sync cooldown for dev server ──
const SYNC_COOLDOWN_MS = parseInt(process.env.PLAID_SYNC_COOLDOWN_SECONDS || '300', 10) * 1000
const lastSyncTimes = new Map()

// ── Safety: in-memory monthly call counter for dev server ──
const MONTHLY_BUDGET = parseFloat(process.env.PLAID_MONTHLY_BUDGET || '10')
const EST_COST_PER_CALL = parseFloat(process.env.PLAID_EST_COST_PER_CALL || '0.10')
const MAX_MONTHLY_CALLS = Math.floor(MONTHLY_BUDGET / EST_COST_PER_CALL)
let callCounter = { month: new Date().toISOString().slice(0, 7), count: 0 }

function checkDevBudget() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  if (callCounter.month !== currentMonth) {
    callCounter = { month: currentMonth, count: 0 }
  }
  return {
    allowed: callCounter.count < MAX_MONTHLY_CALLS,
    used: callCounter.count,
    limit: MAX_MONTHLY_CALLS,
    remaining: Math.max(0, MAX_MONTHLY_CALLS - callCounter.count),
  }
}

function recordDevCall() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  if (callCounter.month !== currentMonth) {
    callCounter = { month: currentMonth, count: 0 }
  }
  callCounter.count++
}

// Create a link token for Plaid Link (org-scoped)
app.post('/api/plaid/create-link-token', orgMiddleware, async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.user.orgId },
      client_name: 'Burndown Tracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })
    res.json({ link_token: response.data.link_token })
  } catch (err) {
    console.error('create-link-token error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// Exchange public_token for access_token and get accounts
app.post('/api/plaid/exchange-token', orgMiddleware, async (req, res) => {
  try {
    const { public_token } = req.body

    // Exchange for access token
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeRes.data

    // Get account details
    const accountsRes = await plaidClient.accountsGet({ access_token })
    const accounts = accountsRes.data.accounts

    // Get institution name
    let institutionName = 'Unknown Bank'
    const institutionId = accountsRes.data.item?.institution_id
    if (institutionId) {
      try {
        const instRes = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        })
        institutionName = instRes.data.institution.name
      } catch {
        // Keep default name if institution lookup fails
      }
    }

    res.json({
      access_token,
      item_id,
      institution_name: institutionName,
      accounts: accounts.map(a => ({
        account_id: a.account_id,
        name: a.name,
        official_name: a.official_name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        balances: {
          current: a.balances.current,
          available: a.balances.available,
          limit: a.balances.limit,
        },
      })),
    })
  } catch (err) {
    console.error('exchange-token error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// Fetch current balances for a linked institution
app.post('/api/plaid/balances', orgMiddleware, async (req, res) => {
  try {
    const { access_token } = req.body
    const response = await plaidClient.accountsBalanceGet({ access_token })
    res.json({
      accounts: response.data.accounts.map(a => ({
        account_id: a.account_id,
        balances: {
          current: a.balances.current,
          available: a.balances.available,
          limit: a.balances.limit,
        },
      })),
    })
  } catch (err) {
    console.error('balances error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// Fetch transactions using /transactions/sync for incremental sync
app.post('/api/plaid/transactions', orgMiddleware, async (req, res) => {
  try {
    // Budget check
    const budget = checkDevBudget()
    if (!budget.allowed) {
      return res.status(429).json({ error: `Monthly API budget exhausted (${budget.used}/${budget.limit} calls).` })
    }

    const { access_token, cursor } = req.body

    let allAdded = []
    let allModified = []
    let allRemoved = []
    let nextCursor = cursor || ''
    let hasMore = true
    let pageCount = 0

    while (hasMore && pageCount < MAX_SYNC_PAGES) {
      pageCount++
      recordDevCall()
      const response = await plaidClient.transactionsSync({
        access_token,
        cursor: nextCursor || undefined,
      })
      const data = response.data

      allAdded = allAdded.concat(data.added)
      allModified = allModified.concat(data.modified)
      allRemoved = allRemoved.concat(data.removed)
      nextCursor = data.next_cursor
      hasMore = data.has_more
    }

    if (hasMore) {
      console.warn(`Transactions sync hit page limit (${MAX_SYNC_PAGES}). Remaining data will sync on next call.`)
    }

    res.json({
      added: allAdded.map(t => ({
        transaction_id: t.transaction_id,
        account_id: t.account_id,
        date: t.date,
        name: t.name,
        merchant_name: t.merchant_name,
        amount: t.amount,
        category: t.personal_finance_category
          ? [t.personal_finance_category.primary, t.personal_finance_category.detailed]
          : t.category || [],
        pending: t.pending,
      })),
      modified: allModified.map(t => ({
        transaction_id: t.transaction_id,
        account_id: t.account_id,
        date: t.date,
        name: t.name,
        merchant_name: t.merchant_name,
        amount: t.amount,
        category: t.personal_finance_category
          ? [t.personal_finance_category.primary, t.personal_finance_category.detailed]
          : t.category || [],
        pending: t.pending,
      })),
      removed: allRemoved.map(t => ({ transaction_id: t.transaction_id })),
      next_cursor: nextCursor,
    })
  } catch (err) {
    console.error('transactions error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// Budget status endpoint (dev server)
app.get('/api/plaid/budget', authMiddleware, (req, res) => {
  const budget = checkDevBudget()
  res.json({
    ...budget,
    budgetDollars: MONTHLY_BUDGET,
    estCostPerCall: EST_COST_PER_CALL,
    month: new Date().toISOString().slice(0, 7),
  })
})

// ═══════════════════════════════════════════════════════════════
// DATA API (S3 proxy — org-scoped)
// ═══════════════════════════════════════════════════════════════

// GET /api/data — read data.json
app.get('/api/data', orgMiddleware, async (req, res) => {
  try {
    const data = await s3Get(dataKey(req.user.orgId))
    res.json(data)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.json(null)
    }
    console.error('GET /api/data error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/data — write data.json
app.put('/api/data', orgMiddleware, async (req, res) => {
  try {
    await s3Put(dataKey(req.user.orgId), req.body)
    res.json({ saved: true, savedAt: new Date().toISOString() })
  } catch (err) {
    console.error('PUT /api/data error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/statements — statements index
app.get('/api/statements', orgMiddleware, async (req, res) => {
  try {
    const data = await s3Get(statementsIndexKey(req.user.orgId))
    res.json(data)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.json({ version: 1, lastUpdated: null, statements: [] })
    }
    console.error('GET /api/statements error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/statements/:id — single statement
app.get('/api/statements/:id', orgMiddleware, async (req, res) => {
  try {
    const data = await s3Get(statementKey(req.user.orgId, req.params.id))
    res.json(data)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Statement not found' })
    }
    console.error('GET /api/statements/:id error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PLAID_SERVER_PORT || 3001
app.listen(PORT, () => {
  console.log(`Plaid API server running on http://localhost:${PORT}`)
})
