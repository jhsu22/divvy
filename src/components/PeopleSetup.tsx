import { useState } from 'react'

interface Props {
  people: string[]
  onChange: (people: string[]) => void
  onDone: () => void
}

export default function PeopleSetup({ people, onChange, onDone }: Props) {
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

      <button
        onClick={onDone}
        disabled={people.length < 1}
        className="w-full border border-ink py-2.5 font-mono text-sm uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper transition-colors"
      >
        Assign Items →
      </button>
    </div>
  )
}
