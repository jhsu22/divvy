import { useState } from 'react'
import type { Receipt, LineItem } from '../types'
import { fmt } from '../lib/calculations'

interface Props {
  receipt: Receipt
  people: string[]
  onUpdate: (items: LineItem[]) => void
  onTipChange: (tip: number) => void
  onDone: () => void
}

// ── Assign sheet ──────────────────────────────────────────────────────────────

interface AssignSheetProps {
  item: LineItem
  people: string[]
  onSave: (assignees: string[]) => void
  onClose: () => void
}

function AssignSheet({ item, people, onSave, onClose }: AssignSheetProps) {
  const [selected, setSelected] = useState<string[]>(item.assignees)

  function toggle(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div className="relative bg-paper border-t-2 border-ink px-4 pt-4 pb-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="font-serif font-semibold leading-tight">{item.name}</p>
            <p className="font-mono text-sm text-ink/60">${fmt(item.price)}</p>
          </div>
          <button onClick={onClose} className="font-mono text-ink/40 text-lg px-1">×</button>
        </div>

        <div className="rule-thin mb-3" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-3">
          Who ordered this?
        </p>

        <div className="space-y-0 mb-4">
          {people.map((p, i) => {
            const checked = selected.includes(p)
            return (
              <div key={p}>
                {i === 0 && <div className="rule-thin" />}
                <button
                  onClick={() => toggle(p)}
                  className="w-full flex items-center gap-3 py-3 active:bg-ink/5"
                >
                  <span
                    className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                      checked ? 'border-ink bg-ink' : 'border-ink/30'
                    }`}
                  >
                    {checked && <span className="text-paper text-[10px] leading-none">✓</span>}
                  </span>
                  <span className="font-body text-sm">{p}</span>
                  {checked && selected.length > 1 && (
                    <span className="font-mono text-xs text-ink/40 ml-auto">
                      ${fmt(item.price / selected.length)} ea.
                    </span>
                  )}
                </button>
                <div className="rule-thin" />
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelected(people)}
            className="flex-1 border border-ink/30 py-2 font-mono text-xs uppercase tracking-widest text-ink/50 active:bg-ink/5"
          >
            Split All
          </button>
          <button
            onClick={() => { onSave(selected); onClose() }}
            disabled={selected.length === 0}
            className="flex-1 border border-ink py-2 font-mono text-xs uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit sheet ────────────────────────────────────────────────────────────────

interface EditSheetProps {
  item: LineItem | null // null = new item
  onSave: (name: string, price: number) => void
  onDelete?: () => void
  onClose: () => void
}

function EditSheet({ item, onSave, onDelete, onClose }: EditSheetProps) {
  const [name, setName] = useState(item?.name ?? '')
  const [priceStr, setPriceStr] = useState(item ? fmt(item.price) : '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(priceStr)
    if (name.trim() && !isNaN(price) && price >= 0) {
      onSave(name.trim(), price)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div className="relative bg-paper border-t-2 border-ink px-4 pt-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="font-serif font-semibold">
            {item ? 'Edit Item' : 'Add Item'}
          </p>
          <button onClick={onClose} className="font-mono text-ink/40 text-lg px-1">×</button>
        </div>

        <div className="rule-thin mb-4" />

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
              Item name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Margherita Pizza"
              autoFocus
              className="w-full bg-transparent border border-ink/30 px-3 py-2 font-body text-sm focus:outline-none focus:border-ink placeholder:text-ink/20"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
              Price
            </label>
            <input
              type="number"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="w-full bg-transparent border border-ink/30 px-3 py-2 font-mono text-sm focus:outline-none focus:border-ink placeholder:text-ink/20"
            />
          </div>

          <div className="flex gap-2 pt-1">
            {onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(); onClose() }}
                className="flex-1 border border-ink/30 py-2 font-mono text-xs uppercase tracking-widest text-ink/40 active:bg-red-50 active:border-red-300 active:text-red-600"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim() || isNaN(parseFloat(priceStr))}
              className="flex-1 border border-ink py-2 font-mono text-xs uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ItemAssign({ receipt, people, onUpdate, onTipChange, onDone }: Props) {
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<LineItem | null | 'new'>(null)
  const [editMode, setEditMode] = useState(false)
  const [tipStr, setTipStr] = useState(receipt.tip.toFixed(2))

  const assigningItem = receipt.items.find((i) => i.id === assigningId) ?? null
  const unassigned = receipt.items.filter((i) => i.assignees.length === 0).length
  const allAssigned = receipt.items.length > 0 && unassigned === 0

  function saveAssignees(itemId: string, assignees: string[]) {
    onUpdate(receipt.items.map((item) => item.id === itemId ? { ...item, assignees } : item))
  }

  function saveItem(id: string | null, name: string, price: number) {
    if (id === null) {
      onUpdate([...receipt.items, { id: crypto.randomUUID(), name, price, assignees: [] }])
    } else {
      onUpdate(receipt.items.map((item) => item.id === id ? { ...item, name, price } : item))
    }
  }

  function deleteItem(id: string) {
    onUpdate(receipt.items.filter((item) => item.id !== id))
  }

  function handleTipBlur() {
    const val = parseFloat(tipStr)
    if (!isNaN(val) && val >= 0) {
      onTipChange(val)
    } else {
      setTipStr(receipt.tip.toFixed(2))
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-serif text-xl font-semibold">Assign Items</h2>
          <p className="font-body italic text-sm text-ink/60 mt-1">
            {editMode ? 'Edit, remove, or add items.' : 'Tap each item to assign it.'}
          </p>
        </div>
        <button
          onClick={() => setEditMode((m) => !m)}
          className={`font-mono text-xs uppercase tracking-widest border px-3 py-1.5 mt-0.5 transition-colors ${
            editMode
              ? 'border-ink bg-ink text-paper'
              : 'border-ink/30 text-ink/50 active:bg-ink/5'
          }`}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="rule-thin" />

      <div className="flex font-mono text-[10px] uppercase tracking-widest text-ink/40 py-2 gap-2">
        <span className="flex-1">Item</span>
        <span className="w-16 text-right">Price</span>
        {!editMode && <span className="w-20 text-right">Who</span>}
      </div>

      <div className="rule-thick" />

      {receipt.items.map((item) => {
        const assigned = item.assignees.length > 0
        return (
          <div key={item.id}>
            {editMode ? (
              <button
                onClick={() => setEditingItem(item)}
                className="w-full flex items-center gap-2 py-3 text-left active:bg-ink/5"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-body text-sm leading-tight">{item.name}</span>
                </div>
                <span className="font-mono text-sm w-16 text-right flex-shrink-0">
                  ${fmt(item.price)}
                </span>
                <span className="font-mono text-[10px] text-ink/30 w-8 text-right flex-shrink-0">
                  edit
                </span>
              </button>
            ) : (
              <button
                onClick={() => setAssigningId(item.id)}
                className="w-full flex items-center gap-2 py-3 text-left active:bg-ink/5"
              >
                <div className="flex-1 min-w-0">
                  <span className={`font-body text-sm leading-tight ${assigned ? '' : 'text-ink/40'}`}>
                    {item.name}
                  </span>
                </div>
                <span className="font-mono text-sm w-16 text-right flex-shrink-0">
                  ${fmt(item.price)}
                </span>
                <span className="font-mono text-xs w-20 text-right flex-shrink-0 text-ink/50 truncate">
                  {item.assignees.length === 0
                    ? '—'
                    : item.assignees.length === people.length
                    ? 'All'
                    : item.assignees.join(', ')}
                </span>
              </button>
            )}
            <div className="rule-thin" />
          </div>
        )
      })}

      {editMode && (
        <button
          onClick={() => setEditingItem('new')}
          className="w-full py-3 font-mono text-xs uppercase tracking-widest text-ink/40 border border-dashed border-ink/20 mt-2 active:bg-ink/5"
        >
          + Add Item
        </button>
      )}

      <div className="mt-2 pb-2">
        <div className="flex justify-between items-center py-2 text-ink/50">
          <span className="font-body italic text-sm">Tax</span>
          <span className="font-mono text-sm">${fmt(receipt.tax)}</span>
        </div>

        <div className="flex justify-between items-center py-2 text-ink/60">
          <span className="font-body italic text-sm">Tip</span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-sm">$</span>
            <input
              type="number"
              value={tipStr}
              onChange={(e) => setTipStr(e.target.value)}
              onBlur={handleTipBlur}
              min="0"
              step="0.01"
              inputMode="decimal"
              className="w-20 text-right bg-transparent border-b border-ink/30 font-mono text-sm focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        <div className="rule-thick" />
        <div className="flex justify-between py-2">
          <span className="font-serif font-semibold">Total</span>
          <span className="font-mono font-bold">${fmt(receipt.total)}</span>
        </div>
        <div className="rule-double" />
      </div>

      {!allAssigned && !editMode && (
        <p className="font-mono text-[10px] text-ink/40 text-center mt-2">
          {unassigned} item{unassigned !== 1 ? 's' : ''} unassigned
        </p>
      )}

      <button
        onClick={onDone}
        disabled={!allAssigned || editMode}
        className="w-full border border-ink py-2.5 mt-4 font-mono text-sm uppercase tracking-widest disabled:opacity-30 active:bg-ink active:text-paper transition-colors"
      >
        See Summary →
      </button>

      {assigningItem && (
        <AssignSheet
          item={assigningItem}
          people={people}
          onSave={(assignees) => saveAssignees(assigningItem.id, assignees)}
          onClose={() => setAssigningId(null)}
        />
      )}

      {editingItem !== null && (
        <EditSheet
          item={editingItem === 'new' ? null : editingItem}
          onSave={(name, price) =>
            saveItem(editingItem === 'new' ? null : editingItem.id, name, price)
          }
          onDelete={
            editingItem !== 'new'
              ? () => deleteItem(editingItem.id)
              : undefined
          }
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}
