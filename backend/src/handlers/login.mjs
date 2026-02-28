import bcrypt from 'bcryptjs'
import { getUserByEmail } from '../lib/users.mjs'
import { signToken } from '../lib/auth.mjs'
import { ok, err } from '../lib/response.mjs'

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Returns:
 *   - If MFA disabled: { token, user }
 *   - If MFA enabled:  { mfaRequired: true, tempToken } (tempToken is used for /verify-mfa)
 */
export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}')
    const { email, password } = body

    if (!email || !password) {
      return err(400, 'Email and password are required')
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return err(401, 'Invalid email or password')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return err(401, 'Invalid email or password')
    }

    // If MFA is enabled, return a temporary token that requires MFA verification
    if (user.mfaEnabled) {
      const tempToken = signToken(user.userId, { mfaVerified: false })
      return ok({
        mfaRequired: true,
        tempToken,
      })
    }

    // No MFA — return full access token
    const token = signToken(user.userId, { mfaVerified: true })
    return ok({
      token,
      user: {
        userId: user.userId,
        email: user.email,
        mfaEnabled: user.mfaEnabled,
      },
    })
  } catch (error) {
    console.error('login error:', error.message)
    return err(500, 'Login failed')
  }
}
