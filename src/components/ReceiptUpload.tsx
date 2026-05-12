import { useRef, useState } from 'react'
import { parseReceipt } from '../lib/claude'
import type { Receipt } from '../types'

interface Props {
  apiKey: string
  onDone: (receipt: Receipt) => void
}

export default function ReceiptUpload({ apiKey, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState<Receipt | null>(null)
  const [restaurant, setRestaurant] = useState('')
  const [date, setDate] = useState('')

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setScanned(null)
    setRestaurant('')
    setDate('')
  }

  async function scan() {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const [header, b64] = preview.split(',')
      const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      const receipt = await parseReceipt(apiKey, b64, mediaType)
      setScanned(receipt)
      setRestaurant(receipt.restaurant ?? '')
      setDate(receipt.date ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function confirm() {
    if (!scanned) return
    onDone({
      ...scanned,
      restaurant: restaurant.trim() || undefined,
      date: date.trim() || undefined,
    })
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="font-serif text-xl font-semibold">Scan Receipt</h2>
        <p className="font-body italic text-sm text-ink/60 mt-1">
          Photograph or upload your receipt.
        </p>
      </div>

      <div className="rule-thin" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border border-dashed border-ink/40 py-12 flex flex-col items-center gap-2 active:bg-ink/5"
        >
          <span className="text-3xl">📷</span>
          <span className="font-mono text-xs uppercase tracking-widest text-ink/50">
            Tap to capture or upload
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Receipt preview"
            className="w-full max-h-64 object-contain border border-ink/20"
          />
          <button
            onClick={() => { setPreview(null); setScanned(null); setError(null) }}
            className="w-full border border-ink/30 py-2 font-mono text-xs uppercase tracking-widest text-ink/50"
          >
            Retake
          </button>
        </div>
      )}

      {scanned && (
        <div className="space-y-3">
          <div className="rule-thin" />
          <div className="space-y-2">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-ink/50 block mb-1">
                Restaurant
              </label>
              <input
                type="text"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                placeholder="e.g. Nobu"
                className="w-full border border-ink/30 px-3 py-2 font-body text-sm bg-paper focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-ink/50 block mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-ink/30 px-3 py-2 font-body text-sm bg-paper focus:outline-none focus:border-ink"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="font-mono text-xs text-red-700 border border-red-300 px-3 py-2">
          {error}
        </p>
      )}

      {!scanned ? (
        <button
          onClick={scan}
          disabled={!preview || loading}
          className="w-full border border-ink py-2.5 font-mono text-sm uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper transition-colors"
        >
          {loading ? 'Scanning…' : 'Scan Receipt →'}
        </button>
      ) : (
        <button
          onClick={confirm}
          className="w-full border border-ink py-2.5 font-mono text-sm uppercase tracking-widest active:bg-ink active:text-paper transition-colors"
        >
          Continue →
        </button>
      )}
    </div>
  )
}
