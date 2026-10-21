import { useRef, useState } from 'react'
import type { ScanModel } from '../lib/claude'
import { scanPhoto } from '../lib/scanning'
import { writeStored } from '../lib/storage'
import ScanAccess from './ScanAccess'
import type { Receipt } from '../types'

interface Props {
  onDone: (receipt: Receipt) => void
}

export default function ReceiptUpload({ onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Use a JPG, PNG, or WebP receipt image under 5 MB.'); return
    }
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setError(null)
  }

  async function scan(model: ScanModel = 'lite') {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const receipt = await scanPhoto(preview, model)
      writeStored('divvy-photo', preview)
      onDone(receipt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="font-serif text-xl font-semibold">Scan Receipt</h2>
        <p className="font-body italic text-sm text-ink/60 mt-1">
          Photograph or upload your receipt.
        </p>
      </div>

      <button disabled={loading} className="secondary w-full" onClick={() => { writeStored('divvy-photo', null); onDone({ items: [{ id: crypto.randomUUID(), name: '', price: 0, assignees: [] }], subtotal: 0, tax: 0, tip: 0, total: 0 }) }}>Enter receipt manually</button>
      <ScanAccess disabled={loading} />
      <p className="text-xs text-ink/60">Receipt photos are sent to Google for scanning. You can review the result and retry a difficult receipt.</p>
      <div className="rule-thin" />

      <input
        ref={fileRef}
        disabled={loading}
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
            disabled={loading}
            onClick={() => { setPreview(null); setError(null) }}
            className="w-full border border-ink/30 py-2 font-mono text-xs uppercase tracking-widest text-ink/50"
          >
            Retake
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="font-mono text-xs text-red-700 border border-red-300 px-3 py-2">
          {error}
        </p>
      )}

      {error && preview && <button disabled={loading} className="secondary w-full" onClick={() => scan('flash')}>Retry difficult receipt</button>}

        <button
          onClick={() => scan()}
          disabled={!preview || loading}
          className="w-full border border-ink py-2.5 font-mono text-sm uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper transition-colors"
        >
          {loading ? 'Scanning…' : 'Scan & Review →'}
        </button>

    </div>
  )
}
