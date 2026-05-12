import type { Receipt } from '../types'

const PROMPT = `You are a receipt parser. Given an image of a receipt, extract all line items, totals, and metadata.
Rules:
- prices are numbers (e.g. 12.50, not "$12.50")
- if tip or tax are not found, use 0
- if subtotal is not found, sum the items
- include every distinct line item; exclude totals/subtotals/tax/tip rows from items[]
- item names should be concise and readable
- restaurant: the name of the restaurant or establishment (empty string if not found)
- date: the date on the receipt in YYYY-MM-DD format (empty string if not found)`

const RESPONSE_SCHEMA = {
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

export async function parseReceipt(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
): Promise<Receipt> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mediaType, data: imageBase64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message
    throw new Error(msg ?? `API error ${response.status}`)
  }

  const data = await response.json() as {
    candidates: { content: { parts: { text: string }[] }; finishReason: string }[]
  }

  const candidate = data.candidates[0]
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('Response was cut off — receipt may have too many items. Try a clearer photo.')
  }

  const text = candidate?.content.parts[0]?.text ?? ''
  if (!text) throw new Error('Empty response from API')

  const parsed = JSON.parse(text) as {
    restaurant: string
    date: string
    items: { name: string; price: number }[]
    subtotal: number
    tax: number
    tip: number
    total: number
  }

  return {
    restaurant: parsed.restaurant || undefined,
    date: parsed.date || undefined,
    items: parsed.items.map((item, i) => ({
      id: `item-${i}`,
      name: item.name,
      price: item.price,
      assignees: [],
    })),
    subtotal: parsed.subtotal,
    tax: parsed.tax,
    tip: parsed.tip,
    total: parsed.total,
  }
}
