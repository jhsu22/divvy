import { useState, useEffect } from 'react'
import type { Receipt, LineItem, Step } from './types'
import { decodeShare } from './lib/share'
import { normalizeReceipt } from './lib/calculations'
import { readStored, writeStored } from './lib/storage'
import Header from './components/Header'
import ReceiptUpload from './components/ReceiptUpload'
import ReceiptReview from './components/ReceiptReview'
import PeopleSetup from './components/PeopleSetup'
import ItemAssign from './components/ItemAssign'
import SummaryView from './components/SummaryView'

type Draft = { receipt: Receipt | null; people: string[]; step: Step; mode: 'items' | 'equal'; payer: string }
const empty: Draft = { receipt: null, people: [], step: 'upload', mode: 'items', payer: '' }
const indices: Record<Step, number> = { setup: 0, upload: 0, review: 1, people: 2, assign: 2, summary: 3 }
export default function App() {
  const [shared, setShared] = useState(!!window.location.hash.slice(1))
  const [draft, setDraft] = useState<Draft>(() => shared ? empty : readStored('divvy-draft', empty))
  const [shareError, setShareError] = useState('')
  const { receipt, people, step, mode, payer } = draft
  const update = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }))
  useEffect(() => { if (!shared) writeStored('divvy-draft', draft) }, [draft, shared])
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    decodeShare(hash).then(data => {
      const d = data as { receipt: Receipt; people: string[]; payer?: string }
      if (!d.receipt || !Array.isArray(d.receipt.items) || !Array.isArray(d.people) || !d.people.length) throw new Error('Invalid bill')
      setDraft({ receipt: normalizeReceipt(d.receipt), people: d.people, payer: d.payer ?? '', mode: 'items', step: 'summary' })
    }).catch(() => { setShareError('This bill link could not be opened. You can start a new bill.'); setShared(false) })
  }, [])
  function reset() {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    writeStored('divvy-photo', null)
    setShareError(''); setShared(false); setDraft(empty)
  }
  function changePeople(next: string[]) {
    update({ people: next, payer: next.includes(payer) ? payer : '', receipt: receipt ? { ...receipt, items: receipt.items.map(i => ({ ...i, assignees: i.assignees.filter(p => next.includes(p)) })) } : null })
  }
  function continueSplit() {
    if (!receipt) return
    if (mode === 'equal') update({ receipt: { ...receipt, splitMode: 'equal', items: receipt.items.map(i => ({ ...i, assignees: [...people] })) }, step: 'summary' })
    else update({ receipt: { ...receipt, splitMode: 'items' }, step: 'assign' })
  }
  function back() {
    const previous: Partial<Record<Step, Step>> = { review: 'upload', people: 'review', assign: 'people', summary: mode === 'equal' ? 'people' : 'assign' }
    if (previous[step]) update({ step: previous[step]! })
  }
  return <div className="min-h-screen bg-paper"><div className="max-w-md mx-auto">
    <Header step={indices[step]} total={receipt?.total ?? 0} onBack={!shared && step !== 'upload' ? back : undefined} />
    <main>
      {shareError && <p role="alert" className="px-4 py-3 text-red-700">{shareError}</p>}
      {shared && !receipt ? <p className="p-6">Loading bill…</p> : <>
      {(step === 'upload' || step === 'setup') && <ReceiptUpload onDone={r => update({ receipt: r, step: 'review' })} />}
      {step === 'review' && receipt && <ReceiptReview receipt={receipt} onChange={r => update({ receipt: r })} onDone={() => update({ step: 'people' })} />}
      {step === 'people' && <PeopleSetup people={people} onChange={changePeople} mode={mode} onModeChange={mode => update({ mode })} payer={payer} onPayerChange={payer => update({ payer })} onDone={continueSplit} />}
      {step === 'assign' && receipt && <ItemAssign receipt={receipt} people={people} onUpdate={(items: LineItem[]) => update({ receipt: normalizeReceipt({ ...receipt, items }) })} onTipChange={tip => update({ receipt: normalizeReceipt({ ...receipt, tip }) })} onDone={() => update({ step: 'summary' })} />}
      {step === 'summary' && receipt && <SummaryView receipt={receipt} people={people} payer={payer} onReset={reset} />}
      </>}
    </main>
    {!shared && receipt && <p className="text-center font-mono text-[10px] text-ink/40 py-4">Draft saved on this device · <button onClick={reset} className="underline">Start over</button></p>}
  </div></div>
}
