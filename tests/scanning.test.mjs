import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  }).outputText
}
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const clientUrl = moduleUrl(compile('../src/lib/claude.ts'))
const { parseReceipt, decodeReceiptResponse } = await import(clientUrl)
const { onRequest } = await import(moduleUrl(compile('../functions/api/scan.ts').replace('../../src/lib/claude', clientUrl)))
const receipt = { restaurant: 'Cafe', date: '2026-10-20', items: [{ name: 'Coffee', price: 3.25 }], subtotal: 3.25, tax: 0.25, tip: 1, total: 4.5 }
const responseData = { candidates: [{ content: { parts: [{ text: JSON.stringify(receipt) }] }, finishReason: 'STOP' }] }
const originalFetch = globalThis.fetch
async function mockFetch(handler, action) {
  globalThis.fetch = handler
  try { await action() } finally { globalThis.fetch = originalFetch }
}
function environment(limit = 30) {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('../functions/schema.sql', import.meta.url), 'utf8'))
  return {
    GEMINI_API_KEY: 'server-only-secret', DIVVY_SCAN_CODE: 'friends-code', DAILY_SCAN_LIMIT: String(limit),
    SCAN_QUOTA: { prepare: sql => ({ bind: (...args) => ({ first: async () => db.prepare(sql).get(...args) ?? null }) }) },
  }
}
function request(patch = {}, headers = {}) {
  return new Request('https://divvy.example/api/scan', {
    method: 'POST', headers: { Origin: 'https://divvy.example', 'content-type': 'application/json', 'x-divvy-code': 'friends-code', ...headers },
    body: JSON.stringify({ imageBase64: 'YWJj', mediaType: 'image/jpeg', model: 'lite', ...patch }),
  })
}
test('personal scans default to Flash-Lite, use key header, and never auto-retry', async () => {
  let calls = 0
  await mockFetch(async (url, options) => {
    calls++
    assert.match(url, /gemini-3\.5-flash-lite:generateContent$/)
    assert.equal(options.headers['x-goog-api-key'], 'personal-secret')
    assert.ok(!url.includes('personal-secret'))
    return Response.json(responseData)
  }, async () => assert.equal((await parseReceipt('personal-secret', 'YWJj', 'image/jpeg')).total, 4.5))
  assert.equal(calls, 1)
})
test('shared scans send only image, model and friend code to the local API', async () => {
  await mockFetch(async (url, options) => {
    assert.equal(url, '/api/scan')
    assert.equal(options.headers['x-divvy-code'], 'friends-code')
    assert.equal(JSON.parse(options.body).model, 'flash')
    assert.equal(options.headers['x-goog-api-key'], undefined)
    return Response.json(responseData)
  }, async () => { await parseReceipt('', 'YWJj', 'image/jpeg', 'flash', 'friends-code') })
})
test('Pages function selects the stronger model only on explicit request and keeps key server-side', async () => {
  await mockFetch(async (url, options) => {
    assert.match(url, /gemini-3\.8-flash:generateContent$/)
    assert.equal(options.headers['x-goog-api-key'], 'server-only-secret')
    const body = JSON.parse(options.body)
    assert.equal(body.generationConfig.responseMimeType, 'application/json')
    return Response.json(responseData)
  }, async () => {
    const result = await onRequest({ request: request({ model: 'flash' }), env: environment() })
    assert.equal(result.status, 200)
    assert.equal(result.headers.get('Cache-Control'), 'no-store')
    assert.ok(!(await result.text()).includes('server-only-secret'))
  })
})
test('missing setup, incorrect code, cross-origin requests, and unsupported inputs never call Google', async () => {
  await mockFetch(() => { assert.fail('Unexpected Google request') }, async () => {
    assert.equal((await onRequest({ request: request(), env: {} })).status, 503)
    const env = environment()
    assert.equal((await onRequest({ request: request({}, { 'x-divvy-code': 'wrong' }), env })).status, 401)
    assert.equal((await onRequest({ request: request({}, { Origin: 'https://other.example' }), env })).status, 403)
    for (const patch of [{ model: 'unrestricted-model' }, { mediaType: 'text/plain' }, { imageBase64: '' }]) {
      assert.equal((await onRequest({ request: request(patch), env })).status, 400)
    }
  })
})
test('D1 enforces the aggregate daily cap, including stronger retries', async () => {
  let calls = 0
  const env = environment(2)
  await mockFetch(async () => { calls++; return Response.json(responseData) }, async () => {
    const responses = await Promise.all(['lite', 'flash', 'lite', 'lite'].map(model => onRequest({ request: request({ model }), env })))
    assert.equal(responses.filter(r => r.status === 200).length, 2)
    assert.equal(responses.filter(r => r.status === 429).length, 2)
  })
  assert.equal(calls, 2)
})
test('upstream failures are sanitized, counted, and never retried automatically', async () => {
  const env = environment(1)
  let calls = 0
  await mockFetch(async () => { calls++; return Response.json({ error: { message: 'server-only-secret' } }, { status: 429 }) }, async () => {
    const first = await onRequest({ request: request(), env })
    assert.equal(first.status, 429)
    assert.ok(!(await first.text()).includes('server-only-secret'))
    assert.equal((await onRequest({ request: request(), env })).status, 429)
  })
  assert.equal(calls, 1)
})
test('incomplete or truncated scans cannot become valid receipts', () => {
  for (const value of [null, {}, { candidates: [{ finishReason: 'MAX_TOKENS' }] },
    { candidates: [{ content: { parts: [{ text: JSON.stringify({ ...receipt, items: [{ name: 'Coffee', price: -3 }] }) }] } }] }]) {
    assert.throws(() => decodeReceiptResponse(value))
  }
})

test('a missing database table explains how to finish setup without exposing internal errors', async () => {
  const env = environment()
  env.SCAN_QUOTA.prepare = () => { throw new Error('D1_ERROR: no such table: scan_quota: server-only-secret') }
  await mockFetch(() => assert.fail('Google must not be called when database setup fails'), async () => {
    const result = await onRequest({ request: request(), env })
    assert.equal(result.status, 503)
    const text = await result.text()
    assert.match(text, /scan_quota table is missing/)
    assert.ok(!text.includes('server-only-secret'))
  })
})
test('Google key, permission, model and request errors produce distinct safe messages', async () => {
  for (const [status, details, expected] of [
    [400, [{ reason: 'API_KEY_INVALID' }], /Google rejected the API key/],
    [403, [], /permissions and restrictions/],
    [404, [], /gemini-3.5-flash-lite.*HTTP 404/],
    [400, [], /receipt request.*HTTP 400/],
    [503, [], /HTTP 503/],
  ]) {
    await mockFetch(async () => Response.json({ error: { message: 'server-only-secret', details } }, { status }), async () => {
      const result = await onRequest({ request: request(), env: environment() })
      const text = await result.text()
      assert.equal(result.status, 502)
      assert.match(text, expected)
      assert.ok(!text.includes('server-only-secret'))
    })
  }
})
