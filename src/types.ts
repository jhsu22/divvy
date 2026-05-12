export interface LineItem {
  id: string
  name: string
  price: number
  assignees: string[]
}

export interface Receipt {
  items: LineItem[]
  subtotal: number
  tax: number
  tip: number
  total: number
}

export type Step = 'setup' | 'upload' | 'people' | 'assign' | 'summary'

export interface PersonTotal {
  name: string
  subtotal: number
  taxShare: number
  tipShare: number
  total: number
  items: { name: string; share: number }[]
}
