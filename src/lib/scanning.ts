import { parseReceipt, type ScanModel } from './claude'
import { readStored } from './storage'

export async function scanPhoto(photo: string, model: ScanModel = 'lite') {
  const personal = readStored('divvy-personal-scanning', false)
  const apiKey = personal ? localStorage.getItem('divvy-api-key') ?? '' : ''
  let code = ''
  try { code = sessionStorage.getItem('divvy-scan-code') ?? '' } catch { /* Missing code is handled below. */ }
  if (personal && !apiKey) throw new Error('Add your API key above before scanning.')
  if (!personal && !code) throw new Error('Enter the friends’ scan code before scanning, or use your own API key.')
  const [header, data] = photo.split(',')
  const mediaType = header.match(/^data:(image\/(?:jpeg|png|webp));base64$/)?.[1]
  if (!mediaType || !data) throw new Error('Use a JPG, PNG, or WebP receipt image.')
  return parseReceipt(apiKey, data, mediaType, model, code)
}
