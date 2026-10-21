import { useState } from 'react'
import type { Receipt } from '../types'
import { calculate, fmt } from '../lib/calculations'
import { encodeShare } from '../lib/share'
interface Props { receipt: Receipt; people: string[]; payer: string; onReset: () => void }
export default function SummaryView({ receipt, people, payer, onReset }: Props) {
  const totals = calculate(receipt, people)
  const [status, setStatus] = useState('')
  const [fallback, setFallback] = useState('')
  const [busy, setBusy] = useState(false)
  async function share(copy = false) {
    setBusy(true); setStatus('')
    try {
      const hash = await encodeShare({ receipt, people, payer })
      const url = `${window.location.origin}${window.location.pathname}#${hash}`
      const lines = totals.map(p => payer ? p.name === payer ? `${p.name}'s own share: $${fmt(p.total)}` : `${p.name} pays ${payer} $${fmt(p.total)}` : `${p.name}: $${fmt(p.total)}`)
      const text = [receipt.restaurant || 'Divvy bill', ...lines, `Total: $${fmt(receipt.total)}`, `[Full breakdown](${url})`].join('\n')
      if (!copy && navigator.share) {
        try { await navigator.share({ title: receipt.restaurant || 'Divvy bill', text }); setStatus('Shared'); return } catch (error) { if (error instanceof Error && error.name === 'AbortError') return }
      }
      try { await navigator.clipboard.writeText(text); setStatus('Summary copied') } catch { setFallback(text); setStatus('Select and copy the summary below.') }
    } catch { setStatus('Could not prepare this bill for sharing. Please try again.') } finally { setBusy(false) }
  }
  return <div className="px-4 py-6 space-y-5">
    <div><h2 className="font-serif text-xl font-semibold">Ready to Settle</h2><p className="text-sm text-ink/60 mt-1">{[receipt.restaurant, receipt.date].filter(Boolean).join(' · ') || 'Everyone’s share, including tax and tip.'}</p>{payer && <p className="text-sm mt-2">{payer} paid the bill.</p>}</div>
    <div className="rule-double" />
    <div>{totals.map(person => <details key={person.name} className="border-b border-ink/30 py-3">
      <summary className="cursor-pointer"><span className="inline-flex w-[92%] justify-between gap-3"><span>{person.name}</span><strong className="font-mono">${fmt(person.total)}</strong></span></summary>
      {payer && <p className="text-sm mt-2 text-ink/60">{person.name === payer ? 'Your own share' : `Pays ${payer} $${fmt(person.total)}`}</p>}
      <div className="mt-3 space-y-2">{person.items.map((item, i) => <div className="flex justify-between text-sm gap-3" key={i}><span>{item.name}</span><span className="font-mono">${fmt(item.share)}</span></div>)}
      <div className="flex justify-between text-sm"><span>Items subtotal</span><span>${fmt(person.subtotal)}</span></div>
      <div className="flex justify-between text-sm text-ink/60"><span>Tax</span><span>${fmt(person.taxShare)}</span></div>
      <div className="flex justify-between text-sm text-ink/60"><span>Tip</span><span>${fmt(person.tipShare)}</span></div></div>
    </details>)}</div>
    <p className="flex justify-between font-bold"><span>Grand total</span><span className="font-mono">${fmt(receipt.total)}</span></p>
    <p className="text-xs text-ink/50">{receipt.splitMode === 'equal' ? 'The whole bill is split equally.' : 'Tax and tip follow each person’s item share.'} Any extra cents are distributed so the shares add up exactly.</p>
    <button className="primary w-full" disabled={busy} onClick={() => share()}>{busy ? 'Preparing…' : 'Share bill'}</button>
    <div className="flex gap-2"><button className="secondary flex-1" disabled={busy} onClick={() => share(true)}>Copy summary</button><button className="secondary flex-1" onClick={onReset}>New bill</button></div>
    <p role="status" className="text-sm">{status}</p>
    {fallback && <textarea aria-label="Bill summary to copy" className="field w-full h-48" readOnly value={fallback} onFocus={e => e.target.select()} />}
  </div>
}
