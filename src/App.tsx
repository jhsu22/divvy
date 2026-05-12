import { useState } from 'react'
import type { Receipt, LineItem, Step } from './types'
import Header from './components/Header'
import ApiKeySetup from './components/ApiKeySetup'
import ReceiptUpload from './components/ReceiptUpload'
import PeopleSetup from './components/PeopleSetup'
import ItemAssign from './components/ItemAssign'
import SummaryView from './components/SummaryView'

const STEP_INDEX: Record<Step, number> = {
  setup: 0,
  upload: 1,
  people: 2,
  assign: 3,
  summary: 4,
}

const PREV_STEP: Partial<Record<Step, Step>> = {
  upload: 'setup',
  people: 'upload',
  assign: 'people',
  summary: 'assign',
}

function loadSharedData(): { receipt: Receipt; people: string[] } | null {
  try {
    const hash = window.location.hash.slice(1)
    if (!hash) return null
    return JSON.parse(atob(hash)) as { receipt: Receipt; people: string[] }
  } catch {
    return null
  }
}

export default function App() {
  const shared = loadSharedData()

  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem('divvy-api-key') ?? '',
  )
  const [step, setStep] = useState<Step>(() => {
    if (shared) return 'summary'
    return localStorage.getItem('divvy-api-key') ? 'upload' : 'setup'
  })
  const [receipt, setReceipt] = useState<Receipt | null>(shared?.receipt ?? null)
  const [people, setPeople] = useState<string[]>(shared?.people ?? [])

  function handleApiKey(key: string) {
    setApiKey(key)
    setStep('upload')
  }

  function handleReceipt(r: Receipt) {
    setReceipt(r)
    setStep('people')
  }

  function handleItemsUpdate(items: LineItem[]) {
    setReceipt((r) => (r ? { ...r, items } : r))
  }

  function handleTipChange(tip: number) {
    setReceipt((r) => r ? { ...r, tip, total: r.subtotal + r.tax + tip } : r)
  }

  function goBack() {
    const prev = PREV_STEP[step]
    if (prev) setStep(prev)
  }

  function reset() {
    setReceipt(null)
    setPeople([])
    setStep('upload')
  }

  const canGoBack = step in PREV_STEP

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-md mx-auto">
        <Header
          step={STEP_INDEX[step]}
          total={receipt?.total ?? 0}
          onBack={canGoBack ? goBack : undefined}
        />

        <main>
          {step === 'setup' && <ApiKeySetup onDone={handleApiKey} />}

          {step === 'upload' && (
            <ReceiptUpload apiKey={apiKey} onDone={handleReceipt} />
          )}

          {step === 'people' && (
            <PeopleSetup
              people={people}
              onChange={setPeople}
              onDone={() => setStep('assign')}
            />
          )}

          {step === 'assign' && receipt && (
            <ItemAssign
              receipt={receipt}
              people={people}
              onUpdate={handleItemsUpdate}
              onTipChange={handleTipChange}
              onDone={() => setStep('summary')}
            />
          )}

          {step === 'summary' && receipt && (
            <SummaryView receipt={receipt} people={people} onReset={reset} />
          )}
        </main>
      </div>
    </div>
  )
}
