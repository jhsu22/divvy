interface Props {
  step: number
  total: number
  onBack?: () => void
}

const STEPS = ['Key', 'Receipt', 'People', 'Assign', 'Summary']

export default function Header({ step, total, onBack }: Props) {
  return (
    <header className="px-4 pt-5 pb-3">
      <div className="rule-double mb-1" />
      {onBack && (
        <div className="mb-1">
          <button
            onClick={onBack}
            className="font-mono text-xs text-ink/40 active:text-ink"
          >
            ← Back
          </button>
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Divvy</h1>
        {total > 0 && (
          <span className="font-mono text-sm">${total.toFixed(2)} total</span>
        )}
      </div>
      <p className="font-body italic text-xs text-ink/60 mt-0.5">Bill splitting, simplified.</p>
      <div className="rule-thick mt-2 mb-1" />
      <div className="flex gap-1 mt-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div
              className={`h-1 rounded-sm mb-1 ${
                i < step ? 'bg-ink' : i === step ? 'bg-ink/40' : 'bg-ink/10'
              }`}
            />
            <span
              className={`font-mono text-[9px] uppercase tracking-widest ${
                i === step ? 'text-ink' : 'text-ink/30'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="rule-thin mt-3" />
    </header>
  )
}
