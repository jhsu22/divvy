import { useState } from 'react'
import { readStored, writeStored } from '../lib/storage'

interface Props {
  people: string[]
  onChange: (people: string[]) => void
  mode: 'items' | 'equal'
  onModeChange: (mode: 'items' | 'equal') => void
  payer: string
  onPayerChange: (payer: string) => void
  onDone: () => void
}

export default function PeopleSetup({ people, onChange, onDone, mode, onModeChange, payer, onPayerChange }: Props) {
  const [groups, setGroups] = useState<Record<string, string[]>>(() => readStored('divvy-groups', {}))
  const [groupName, setGroupName] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed && !people.includes(trimmed)) {
      onChange([...people, trimmed])
      setName('')
    }
  }

  function remove(n: string) {
    onChange(people.filter((p) => p !== n))
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="font-serif text-xl font-semibold">Who's Here?</h2>
        <p className="font-body italic text-sm text-ink/60 mt-1">
          Add each person splitting the bill.
        </p>
      </div>

      <div className="rule-thin" />

      {Object.keys(groups).length > 0 && <div className="space-y-2"><p className="text-sm text-ink/60">Use a saved group</p>{Object.entries(groups).map(([label, members]) => <div className="flex gap-2" key={label}><button className="secondary flex-1 text-left" onClick={() => onChange([...members])}>{label} · {members.length}</button><button aria-label={`Delete group ${label}`} className="secondary" onClick={() => { const next = { ...groups }; delete next[label]; setGroups(next); writeStored('divvy-groups', next) }}>×</button></div>)}</div>}
      <form onSubmit={add} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="flex-1 bg-transparent border border-ink/30 px-3 py-2 font-body text-sm focus:outline-none focus:border-ink placeholder:text-ink/20"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="border border-ink px-4 py-2 font-mono text-sm disabled:opacity-30 active:bg-ink active:text-paper"
        >
          Add
        </button>
      </form>

      {people.length > 0 && (
        <div className="space-y-0">
          {people.map((p, i) => (
            <div key={p}>
              {i === 0 && <div className="rule-thin" />}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink/30">{i + 1}.</span>
                  <span className="font-body">{p}</span>
                </div>
                <button
                  onClick={() => remove(p)}
                  className="font-mono text-xs text-ink/30 active:text-ink px-2"
                >
                  ×
                </button>
              </div>
              <div className="rule-thin" />
            </div>
          ))}
        </div>
      )}

      {people.length > 0 && <div className="space-y-2"><div className="flex gap-2"><input className="field min-w-0 flex-1" aria-label="Group name" placeholder="Save group as…" value={groupName} onChange={e => setGroupName(e.target.value)} /><button className="secondary" disabled={!groupName.trim()} onClick={() => { const next = { ...groups, [groupName.trim()]: [...people] }; setGroups(next); writeStored('divvy-groups', next); setGroupName(''); setNotice('Group saved') }}>Save group</button></div><p role="status" className="text-xs">{notice}</p></div>}
      <fieldset className="space-y-2"><legend className="font-serif text-lg mb-2">How should we split?</legend>{(['items', 'equal'] as const).map(value => <label key={value} className="flex items-center gap-3 border border-ink/30 p-3"><input type="radio" name="split-mode" checked={mode === value} onChange={() => onModeChange(value)} />{value === 'items' ? 'Assign each item' : 'Split the whole bill equally'}</label>)}</fieldset>
      <label className="block text-sm">Who paid? (optional)<select className="field w-full" value={payer} onChange={e => onPayerChange(e.target.value)}><option value="">Show shares only</option>{people.map(p => <option key={p}>{p}</option>)}</select></label>
      <button
        onClick={onDone}
        disabled={people.length < 1}
        className="w-full border border-ink py-2.5 font-mono text-sm uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper transition-colors"
      >
        {mode === 'items' ? 'Assign Items →' : 'See Equal Split →'}
      </button>
    </div>
  )
}
