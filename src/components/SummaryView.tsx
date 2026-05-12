import { useState } from 'react'
import type { Receipt } from '../types'
import { calculate, fmt } from '../lib/calculations'

interface Props {
  receipt: Receipt
  people: string[]
  onReset: () => void
}

function buildMarkdown(receipt: Receipt, people: string[]): string {
  const totals = calculate(receipt, people)
  const lines: string[] = []

  lines.push('## Divvy — Bill Split')
  lines.push('')

  totals.forEach((p) => {
    lines.push(`**${p.name}** owes **$${fmt(p.total)}**`)
  })

  lines.push('')
  lines.push(`> Total: $${fmt(receipt.total)}`)
  lines.push('')
  lines.push('---')

  totals.forEach((p) => {
    lines.push('')
    lines.push(`### ${p.name}`)
    p.items.forEach((item) => {
      lines.push(`- ${item.name}: $${fmt(item.share)}`)
    })
    if (p.taxShare > 0) lines.push(`- Tax: $${fmt(p.taxShare)}`)
    if (p.tipShare > 0) lines.push(`- Tip: $${fmt(p.tipShare)}`)
    lines.push(`**Total: $${fmt(p.total)}**`)
  })

  return lines.join('\n')
}

export default function SummaryView({ receipt, people, onReset }: Props) {
  const totals = calculate(receipt, people)
  const [copied, setCopied] = useState(false)

  async function copyMarkdown() {
    const md = buildMarkdown(receipt, people)
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-5">
        <h2 className="font-serif text-xl font-semibold">Final Ledger</h2>
        <p className="font-body italic text-sm text-ink/60 mt-1">
          Each person's share, to the cent.
        </p>
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
          onClick={copyMarkdown}
          className="flex-1 border border-ink py-2.5 font-mono text-xs uppercase tracking-widest active:bg-ink active:text-paper transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy as Markdown'}
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
