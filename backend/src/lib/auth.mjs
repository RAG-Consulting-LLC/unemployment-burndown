import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const JWT_EXPIRES_IN = '24h'

/**
 * Create a signed JWT for a user.
 */
export function signToken(userId, { mfaVerified = false } = {}) {
  return jwt.sign(
    { sub: userId, mfaVerified },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  )
}

/**
 * Verify and decode a JWT. Returns the payload or null if invalid.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

/**
 * Extract the JWT from an API Gateway event's Authorization header.
 * Supports "Bearer <token>" format.
 */
export function extractToken(event) {
  const header = event.headers?.Authorization || event.headers?.authorization || ''
  if (header.startsWith('Bearer ')) {
    return header.slice(7)
  }
  return header || null
}

/**
 * Auth middleware for Lambda handlers.
 * Returns the decoded user payload or an error response.
 */
export function requireAuth(event, { requireMfa = false } = {}) {
  const token = extractToken(event)
  if (!token) {
    return { error: { statusCode: 401, message: 'Authentication required' } }
  }

  const payload = verifyToken(token)
  if (!payload) {
    return { error: { statusCode: 401, message: 'Invalid or expired token' } }
  }

  if (requireMfa && !payload.mfaVerified) {
    return { error: { statusCode: 403, message: 'MFA verification required' } }
  }

  return { user: payload }
}
