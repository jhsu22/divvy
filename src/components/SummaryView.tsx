import { useState } from 'react'
import type { Receipt } from '../types'
import { calculate, fmt } from '../lib/calculations'
import { encodeShare } from '../lib/share'

interface Props {
  receipt: Receipt
  people: string[]
  onReset: () => void
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function buildShareText(receipt: Receipt, people: string[], shareUrl: string): string {
  const totals = calculate(receipt, people)
  const lines: string[] = []

  const header = [receipt.restaurant, receipt.date ? formatDate(receipt.date) : '']
    .filter(Boolean).join(' · ')
  if (header) lines.push(header, '')

  totals.forEach((p) => {
    lines.push(`${p.name} owes $${fmt(p.total)}`)
  })

  lines.push('')
  lines.push(`Total: $${fmt(receipt.total)}`)
  lines.push(`Full breakdown: ${shareUrl}`)

  return lines.join('\n')
}

async function buildShareUrl(receipt: Receipt, people: string[]): Promise<string> {
  const hash = await encodeShare({ receipt, people })
  return `${window.location.origin}${window.location.pathname}#${hash}`
}

export default function SummaryView({ receipt, people, onReset }: Props) {
  const totals = calculate(receipt, people)
  const [copied, setCopied] = useState(false)

  async function copySummary() {
    const url = await buildShareUrl(receipt, people)
    const text = buildShareText(receipt, people, url)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-5">
        <h2 className="font-serif text-xl font-semibold">Final Ledger</h2>
        {(receipt.restaurant || receipt.date) && (
          <p className="font-body text-sm text-ink/70 mt-1">
            {[receipt.restaurant, receipt.date ? formatDate(receipt.date) : ''].filter(Boolean).join(' · ')}
          </p>
        )}
        {!receipt.restaurant && !receipt.date && (
          <p className="font-body italic text-sm text-ink/60 mt-1">
            Each person's share, to the cent.
          </p>
        )}
      </div>

      <div className="rule-double mb-4" />

      <div className="space-y-6">
        {totals.map((person, pi) => (
          <div key={person.name}>
            <div className="flex items-baseline justify-between">
              <h3 className="font-serif text-lg font-semibold">{person.name}</h3>
              <span className="font-mono text-lg font-bold">${fmt(person.total)}</span>
            </div>

            <div className="rule-thin mt-1" />

            <div className="py-1 space-y-0">
              {person.items.map((item) => (
                <div key={item.name} className="flex justify-between py-1.5">
                  <span className="font-body text-sm text-ink/70 flex-1 pr-2">{item.name}</span>
                  <span className="font-mono text-sm">${fmt(item.share)}</span>
                </div>
              ))}

              {person.taxShare > 0 && (
                <div className="flex justify-between py-1.5 text-ink/50">
                  <span className="font-body italic text-sm">Tax</span>
                  <span className="font-mono text-sm">${fmt(person.taxShare)}</span>
                </div>
              )}

              {person.tipShare > 0 && (
                <div className="flex justify-between py-1.5 text-ink/50">
                  <span className="font-body italic text-sm">Tip</span>
                  <span className="font-mono text-sm">${fmt(person.tipShare)}</span>
                </div>
              )}
            </div>

            <div className="rule-thick" />
            <div className="flex justify-between py-2">
              <span className="font-mono text-xs uppercase tracking-widest">Subtotal</span>
              <span className="font-mono text-sm font-bold">${fmt(person.total)}</span>
            </div>
            {pi < totals.length - 1 && <div className="rule-double mt-2" />}
          </div>
        ))}
      </div>

      <div className="rule-double mt-6" />
      <div className="flex justify-between py-3">
        <span className="font-serif font-bold">Grand Total</span>
        <span className="font-mono font-bold">${fmt(receipt.total)}</span>
      </div>
      <div className="rule-double" />

      <div className="flex gap-2 mt-6">
        <button
          onClick={copySummary}
          className="flex-1 border border-ink py-2.5 font-mono text-xs uppercase tracking-widest active:bg-ink active:text-paper transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy Summary'}
        </button>
        <button
          onClick={onReset}
          className="flex-1 border border-ink/30 py-2.5 font-mono text-xs uppercase tracking-widest text-ink/50 active:bg-ink/5"
        >
          New Bill
        </button>
      </div>
    </div>
  )
}
