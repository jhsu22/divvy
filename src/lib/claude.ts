import type { Receipt } from '../types'

export const PROMPT = `You are a receipt parser. Given an image of a receipt, extract all line items, totals, and metadata.
Rules:
- prices are numbers (e.g. 12.50, not "$12.50")
- if tip or tax are not found, use 0
- if subtotal is not found, sum the items
- include every distinct line item; exclude totals/subtotals/tax/tip rows from items[]
- item names should be concise and readable
- restaurant: the name of the restaurant or establishment (empty string if not found)
- date: the date on the receipt in YYYY-MM-DD format (empty string if not found)`

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    restaurant: { type: 'string' },
    date: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
    subtotal: { type: 'number' },
    tax: { type: 'number' },
    tip: { type: 'number' },
    total: { type: 'number' },
  },
  required: ['restaurant', 'date', 'items', 'subtotal', 'tax', 'tip', 'total'],
}

export type ScanModel = 'lite' | 'flash'
export const SCAN_MODELS: Record<ScanModel, string> = {
  lite: 'gemini-3.5-flash-lite',
  flash: 'gemini-3.8-flash',
}

export function receiptRequest(imageBase64: string, mediaType: string) {
  return {
    contents: [{ parts: [{ inlineData: { mimeType: mediaType, data: imageBase64 } }, { text: PROMPT }] }],
    generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
  }
}

export async function parseReceipt(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
  model: ScanModel = 'lite',
  scanCode = '',
): Promise<Receipt> {
  const personal = !!apiKey
  const url = personal
    ? `https://generativelanguage.googleapis.com/v1beta/models/${SCAN_MODELS[model]}:generateContent`
    : '/api/scan'
  const response = await fetch(url, {
    method: 'POST',
    headers: personal
      ? { 'content-type': 'application/json', 'x-goog-api-key': apiKey }
      : { 'content-type': 'application/json', 'x-divvy-code': scanCode },
    body: JSON.stringify(personal ? receiptRequest(imageBase64, mediaType) : { imageBase64, mediaType, model }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const message = err.error?.message
    throw new Error(message ?? (response.status === 429 ? 'Scanning limit reached. Please try again later or enter the receipt manually.' : 'Scanning failed. Please try again.'))
  }
  return decodeReceiptResponse(await response.json())
}

export function decodeReceiptResponse(data: unknown): Receipt {
  const response = (data ?? {}) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[] }
  const candidate = response.candidates?.[0]
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('Response was cut off. Try scanning again or use a clearer photo.')
  }
  const text = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text ?? '').join('')
  if (!text) throw new Error('No receipt was found. Try a clearer photo.')
  const parsed = JSON.parse(text)
  const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items) || !parsed.items.length || !parsed.items.every((item: { name?: unknown; price?: unknown }) =>
    item && typeof item.name === 'string' && item.name.trim() && money(item.price)) ||
    ![parsed.subtotal, parsed.tax, parsed.tip, parsed.total].every(money)) {
    throw new Error('The scan returned incomplete receipt data. Please retry or enter it manually.')
  }
  return {
    restaurant: typeof parsed.restaurant === 'string' ? parsed.restaurant : undefined,
    date: typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : undefined,
    items: parsed.items.map((item: { name: string; price: number }, i: number) => ({ id: `item-${i}`, name: item.name, price: item.price, assignees: [] })),
    subtotal: parsed.subtotal, tax: parsed.tax, tip: parsed.tip, total: parsed.total,
  }
}
