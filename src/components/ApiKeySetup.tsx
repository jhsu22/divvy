import { useState } from 'react'

interface Props {
  onDone: (key: string) => void
}

export default function ApiKeySetup({ onDone }: Props) {
  const [key, setKey] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = key.trim()
    if (trimmed.startsWith('AIza')) {
      localStorage.setItem('divvy-api-key', trimmed)
      onDone(trimmed)
    }
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="font-serif text-xl font-semibold">API Key</h2>
        <p className="font-body text-sm italic text-ink/60 mt-1 leading-snug">
          Your key is saved on this device and sent to Google with receipt images to parse them.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="rule-thin" />
        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-ink/50">
            Google AI Studio Key
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
            className="w-full bg-transparent border border-ink/30 rounded-none px-3 py-2 font-mono text-sm focus:outline-none focus:border-ink placeholder:text-ink/20"
          />
        </div>

        <button
          type="submit"
          disabled={!key.trim().startsWith('AIza')}
          className="w-full border border-ink py-2.5 font-mono text-sm uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper transition-colors"
        >
          Continue →
        </button>
      </form>

      <div className="rule-thin" />
      <p className="font-mono text-[10px] text-ink/40 text-center">
        Get a free key at aistudio.google.com
      </p>
    </div>
  )
}
