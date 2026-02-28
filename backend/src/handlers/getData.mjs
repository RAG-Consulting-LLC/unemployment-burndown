import { readDataJson } from '../lib/s3.mjs'
import { ok, err } from '../lib/response.mjs'

/**
 * GET /data
 * Reads data.json from S3 and returns it.
 */
export async function handler(event) {
  try {
    const data = await readDataJson()
    if (!data) {
      return ok(null)
    }
    return ok(data)
  } catch (error) {
    console.error('getData error:', error.message)
    return err(500, error.message)
  }
}
