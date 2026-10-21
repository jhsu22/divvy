import { useState } from 'react'
import { scanPhoto } from '../lib/scanning'
import { readStored } from '../lib/storage'
import type { Receipt } from '../types'
import { fmt, normalizeReceipt, cents } from '../lib/calculations'
interface Props { receipt: Receipt; onChange: (r: Receipt) => void; onDone: () => void }
export default function ReceiptReview({ receipt, onChange, onDone }: Props) {
  const [retrying, setRetrying] = useState(false)
  const [scanError, setScanError] = useState('')
  async function retry() {
    if (!photo) return
    setRetrying(true); setScanError('')
    try { onChange(await scanPhoto(photo, 'flash')) }
    catch (error) { setScanError(error instanceof Error ? error.message : 'Could not rescan this receipt.') }
    finally { setRetrying(false) }
  }
  const photo = readStored<string | null>('divvy-photo', null)
  const change = (patch: Partial<Receipt>) => onChange(normalizeReceipt({ ...receipt, ...patch }))
  const valid = receipt.items.length > 0 && receipt.items.every(i => i.name.trim() && Number.isFinite(i.price) && i.price >= 0) && Number.isFinite(receipt.tax) && receipt.tax >= 0 && Number.isFinite(receipt.tip) && receipt.tip >= 0
  return <form onSubmit={e => { e.preventDefault(); if (valid && !retrying) { onChange(normalizeReceipt(receipt)); onDone() } }} className="px-4 py-6 space-y-4">
    <div><h2 className="font-serif text-xl font-semibold">Review Receipt</h2><p className="text-sm text-ink/60 mt-1">Check the items and totals before splitting.</p></div>
    {photo && <details><summary className="cursor-pointer text-sm underline">Compare with original photo</summary><img src={photo} alt="Original receipt" className="w-full mt-3" /></details>}
    {photo && <div className="space-y-2"><button type="button" disabled={retrying} className="secondary w-full" onClick={retry}>{retrying ? 'Rescanning…' : 'Retry difficult receipt'}</button><p className="text-xs text-ink/60">Uses a stronger scanner and replaces the current items and totals. Counts as another scan.</p></div>}
    {scanError && <p role="alert" className="text-sm text-red-700">{scanError}</p>}
    <fieldset disabled={retrying} className="space-y-4">
    {Math.abs(receipt.subtotal - receipt.items.reduce((sum, i) => sum + i.price, 0)) > 0.01 && <p role="alert" className="text-sm text-red-700">The scanned subtotal differs from the items. Check for missing items or discounts. Totals will use the item prices.</p>}
    <label className="block text-sm">Restaurant<input className="field" value={receipt.restaurant ?? ''} onChange={e => change({ restaurant: e.target.value })} placeholder="Restaurant (optional)" /></label>
    <label className="block text-sm">Date<input className="field" type="date" value={receipt.date ?? ''} onChange={e => change({ date: e.target.value })} /></label>
    <div className="rule-thick" />
    {receipt.items.map((item, index) => <div key={item.id} className="flex gap-2 items-center">
      <input aria-label={`Item ${index + 1} name`} required className="field min-w-0 flex-1" value={item.name} onChange={e => change({ items: receipt.items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i) })} />
      <input aria-label={`Item ${index + 1} price`} required className="field w-24" type="number" min="0" step="0.01" inputMode="decimal" value={Number.isFinite(item.price) ? item.price : ''} onChange={e => change({ items: receipt.items.map(i => i.id === item.id ? { ...i, price: e.target.value === '' ? NaN : Number(e.target.value) } : i) })} />
      <button type="button" aria-label={`Remove ${item.name}`} onClick={() => change({ items: receipt.items.filter(i => i.id !== item.id) })}>×</button>
    </div>)}
    <button type="button" className="secondary w-full" onClick={() => change({ items: [...receipt.items, { id: crypto.randomUUID(), name: '', price: 0, assignees: [] }] })}>+ Add item</button>
    <p className="flex justify-between">Subtotal <span>${fmt(receipt.subtotal)}</span></p>
    {(['tax', 'tip'] as const).map(key => <label key={key} className="flex items-center justify-between capitalize">{key}<input className="field w-28" aria-label={key} required type="number" min="0" step="0.01" inputMode="decimal" value={Number.isFinite(receipt[key]) ? receipt[key] : ''} onChange={e => change({ [key]: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>)}
    <div><p className="text-xs text-ink/60 mb-2">Tip on the pre-tax subtotal</p><div className="flex gap-2">{[0, 15, 18, 20, 25].map(p => <button type="button" className="secondary flex-1" key={p} onClick={() => change({ tip: Math.round(cents(receipt.subtotal) * p / 100) / 100 })}>{p}%</button>)}</div></div>
    <div className="rule-double" /><p className="flex justify-between font-bold">Total <span>${fmt(receipt.total)}</span></p>
    <button disabled={!valid || retrying} className="primary w-full">Continue to group →</button>
    </fieldset>
  </form>
}
