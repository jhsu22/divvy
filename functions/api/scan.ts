import { receiptRequest, SCAN_MODELS } from '../../src/lib/claude'

interface Statement {
  bind(...values: (string | number)[]): Statement
  first<T>(): Promise<T | null>
}
interface Env {
  GEMINI_API_KEY?: string
  DIVVY_SCAN_CODE?: string
  DAILY_SCAN_LIMIT?: string
  SCAN_QUOTA?: { prepare(sql: string): Statement }
}
const MAX_BODY = 8 * 1024 * 1024
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
const error = (message: string, status: number) => json({ error: { message } }, status)

export async function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (request.method !== 'POST') return error('Use POST to scan a receipt.', 405)
  if (!env.GEMINI_API_KEY || !env.DIVVY_SCAN_CODE || !env.SCAN_QUOTA) {
    return error('Shared scanning is not configured yet. Use your own API key or enter the receipt manually.', 503)
  }
  if (request.headers.get('Origin') !== new URL(request.url).origin) return error('Open Divvy to scan a receipt.', 403)
  if (request.headers.get('x-divvy-code') !== env.DIVVY_SCAN_CODE) return error('The scan code is incorrect. Ask the bill organizer for the current code.', 401)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return error('Expected a receipt image.', 415)
  if (Number(request.headers.get('content-length')) > MAX_BODY) return error('Image is too large. Use an image under 5 MB.', 413)
  let body: { imageBase64?: unknown; mediaType?: unknown; model?: unknown }
  try {
    // Bound actual streamed bytes too; Content-Length is not always supplied.
    const reader = request.body?.getReader()
    if (!reader) return error('Receipt image is missing.', 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY) { await reader.cancel(); return error('Image is too large. Use an image under 5 MB.', 413) }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    body = JSON.parse(new TextDecoder().decode(bytes))
    if (!body || typeof body !== 'object') return error('Invalid receipt request.', 400)
  } catch { return error('Invalid receipt request.', 400) }
  const { imageBase64, mediaType, model = 'lite' } = body
  if (model !== 'lite' && model !== 'flash') return error('Unknown scanning option.', 400)
  if (typeof mediaType !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ||
      typeof imageBase64 !== 'string' || !imageBase64.length || imageBase64.length > 7 * 1024 * 1024 ||
      imageBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return error('Use a JPG, PNG, or WebP receipt image under 5 MB.', 400)
  const limit = Number(env.DAILY_SCAN_LIMIT ?? 30)
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) return error('Shared scanning limit needs to be configured.', 503)
  // Reserve quota separately so database setup failures are distinguishable from Google errors.
  try {
    const day = new Date().toISOString().slice(0, 10)
    const quota = await env.SCAN_QUOTA.prepare(`
      INSERT INTO scan_quota (day, requests) VALUES (?, 1)
      ON CONFLICT(day) DO UPDATE SET requests = requests + 1 WHERE requests < ?
      RETURNING requests
    `).bind(day, limit).first<{ requests: number }>()
    if (!quota) return error('Today’s shared scanning limit has been reached. Try tomorrow (UTC), use your own key, or enter the receipt manually.', 429)
  } catch (cause) {
    const missingTable = cause instanceof Error && /no such table/i.test(cause.message)
    console.error('Receipt scan quota failure', { missingTable })
    return error(missingTable
      ? 'The scan database is connected, but its scan_quota table is missing. The organizer needs to run the database setup SQL.'
      : 'The scan quota database could not be accessed. The organizer needs to check the SCAN_QUOTA database binding.', 503)
  }
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${SCAN_MODELS[model]}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(receiptRequest(imageBase64, mediaType)),
      signal: AbortSignal.timeout(55000),
    })
    if (!upstream.ok) {
      const details = await upstream.json().catch(() => null) as { error?: { details?: { reason?: string }[] } } | null
      const invalidKey = details?.error?.details?.some(detail => detail.reason === 'API_KEY_INVALID') ?? false
      console.error('Receipt scan Google rejection', { status: upstream.status, model: SCAN_MODELS[model], invalidKey })
      if (invalidKey || upstream.status === 401) return error('Google rejected the API key. The organizer needs to update the GEMINI_API_KEY secret and redeploy.', 502)
      if (upstream.status === 403) return error('Google denied access to scanning (HTTP 403). The organizer needs to check the API key’s permissions and restrictions.', 502)
      if (upstream.status === 404) return error(`Google could not find or grant access to the scanner model ${SCAN_MODELS[model]} (HTTP 404).`, 502)
      if (upstream.status === 400) return error('Google rejected the receipt request (HTTP 400). Try a different JPG or PNG photo; the organizer may need to check the scanner configuration.', 502)
      if (upstream.status === 429) return error('Google’s scanning quota is temporarily exhausted. Try again later or enter the receipt manually.', 429)
      return error(`Google’s receipt scanner is unavailable (HTTP ${upstream.status}). Please try again later.`, 502)
    }
    return json(await upstream.json())
  } catch (cause) {
    const timedOut = cause instanceof Error && ['TimeoutError', 'AbortError'].includes(cause.name)
    console.error('Receipt scan connection failure', { timedOut })
    return error(timedOut ? 'Google’s receipt scanner took too long. Please try again.' : 'Could not connect to Google’s receipt scanner. Please try again later.', 502)
  }
}
