import { writeDataJson } from '../lib/s3.mjs'
import { ok, err } from '../lib/response.mjs'

/**
 * PUT /data
 * Writes data.json to S3.
 */
export async function handler(event) {
  try {
    const data = JSON.parse(event.body || '{}')
    if (!data || Object.keys(data).length === 0) {
      return err(400, 'Request body is empty')
    }
    await writeDataJson(data)
    return ok({ saved: true, savedAt: new Date().toISOString() })
  } catch (error) {
    console.error('putData error:', error.message)
    return err(500, error.message)
  }
}
