import { useState } from 'react'
import ApiKeySetup from './ApiKeySetup'
import { readStored, writeStored } from '../lib/storage'

export default function ScanAccess({ disabled = false }: { disabled?: boolean }) {
  const [personal, setPersonal] = useState(() => readStored('divvy-personal-scanning', false))
  const [code, setCode] = useState(() => { try { return sessionStorage.getItem('divvy-scan-code') ?? '' } catch { return '' } })
  const [showKey, setShowKey] = useState(false)
  const [hasKey, setHasKey] = useState(() => !!localStorage.getItem('divvy-api-key'))
  return <fieldset disabled={disabled} className="space-y-3">
    {!personal && <label className="block text-sm">Friends’ scan code
      <input className="field w-full" type="password" autoComplete="off" value={code} placeholder="Enter the code shared with you" onChange={e => {
        setCode(e.target.value)
        try { sessionStorage.setItem('divvy-scan-code', e.target.value) } catch { /* Keep manual entry available. */ }
      }} />
      <span className="block text-xs text-ink/60 mt-1">Ask the bill organizer for the code. Saved for this browser session.</span>
    </label>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={personal} onChange={e => { setPersonal(e.target.checked); writeStored('divvy-personal-scanning', e.target.checked) }} />Use my own Google API key instead</label>
    {personal && <>
      <button type="button" className="secondary" onClick={() => setShowKey(v => !v)}>{hasKey ? 'Change API key' : 'Add API key'}</button>
      {showKey && <ApiKeySetup onDone={() => { setHasKey(true); setShowKey(false) }} />}
      {!hasKey && <p className="text-xs text-ink/60">Add your key before scanning.</p>}
    </>}
  </fieldset>
}
