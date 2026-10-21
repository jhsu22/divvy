import type { Receipt, PersonTotal } from '../types'

export const cents = (n: number) => Math.round(n * 100)
export function normalizeReceipt(receipt: Receipt): Receipt {
  const subtotal = receipt.items.reduce((sum, item) => sum + cents(item.price), 0)
  return { ...receipt, subtotal: subtotal / 100, total: (subtotal + cents(receipt.tax) + cents(receipt.tip)) / 100 }
}

// Largest remainders distribute every cent deterministically.
function allocate(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum) return weights.map(() => 0)
  const raw = weights.map(w => amount * w / sum)
  const result = raw.map(Math.floor)
  const order = raw.map((v, i) => ({ i, remainder: v - result[i] })).sort((a, b) => b.remainder - a.remainder)
  for (let n = amount - result.reduce((a, b) => a + b, 0), i = 0; i < n; i++) result[order[i].i]++
  return result
}

export function calculate(receipt: Receipt, people: string[]): PersonTotal[] {
  const rows = people.map(name => ({ name, subtotal: 0, taxShare: 0, tipShare: 0, total: 0, items: [] as { name: string; share: number }[] }))
  const balances = people.map(() => 0)
  let cumulative = 0
  let previous = people.map(() => 0)
  function equalNext(amount: number) {
    cumulative += amount
    const next = allocate(cumulative, people.map(() => 1))
    const shares = next.map((value, i) => value - previous[i])
    previous = next
    return shares
  }
  receipt.items.forEach(item => {
    const weights = people.map(p => item.assignees.includes(p) ? 1 : 0)
    const shares = receipt.splitMode === 'equal' ? equalNext(cents(item.price)) : allocate(cents(item.price), weights)
    shares.forEach((share, i) => {
      balances[i] += share
      if (weights[i]) rows[i].items.push({ name: item.name, share: share / 100 })
    })
  })
  const weights = balances.some(Boolean) ? balances : people.map(() => 1)
  const taxes = receipt.splitMode === 'equal' ? equalNext(cents(receipt.tax)) : allocate(cents(receipt.tax), weights)
  const tips = receipt.splitMode === 'equal' ? equalNext(cents(receipt.tip)) : allocate(cents(receipt.tip), weights)
  rows.forEach((row, i) => Object.assign(row, { subtotal: balances[i] / 100, taxShare: taxes[i] / 100, tipShare: tips[i] / 100, total: (balances[i] + taxes[i] + tips[i]) / 100 }))
  return rows
}
export function fmt(n: number): string { return n.toFixed(2) }
