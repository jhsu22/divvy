import type { Receipt, PersonTotal } from '../types'

export function calculate(receipt: Receipt, people: string[]): PersonTotal[] {
  const { items, subtotal, tax, tip } = receipt

  return people.map((name) => {
    const myItems = items
      .filter((item) => item.assignees.includes(name))
      .map((item) => ({
        name: item.name,
        share: item.price / item.assignees.length,
      }))

    const mySubtotal = myItems.reduce((sum, i) => sum + i.share, 0)
    const ratio = subtotal > 0 ? mySubtotal / subtotal : 0
    const taxShare = tax * ratio
    const tipShare = tip * ratio

    return {
      name,
      subtotal: mySubtotal,
      taxShare,
      tipShare,
      total: mySubtotal + taxShare + tipShare,
      items: myItems,
    }
  })
}

export function fmt(n: number): string {
  return n.toFixed(2)
}
