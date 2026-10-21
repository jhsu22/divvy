import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/lib/calculations.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { calculate, normalizeReceipt, cents } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const people = ['Alex', 'Jamie', 'Sam']
const bill = (items, tax = 0, tip = 0) => normalizeReceipt({ items: items.map((price, i) => ({ id: String(i), name: `Item ${i}`, price, assignees: people })), subtotal: 999, total: 999, tax, tip })
test('item edits, additions and deletions recalculate the total', () => {
  const receipt = bill([10, 20], 2, 6)
  assert.equal(receipt.subtotal, 30)
  assert.equal(receipt.total, 38)
  assert.equal(normalizeReceipt({ ...receipt, items: receipt.items.slice(1) }).total, 28)
})
test('shared item, tax and tip preserve every cent', () => {
  const receipt = bill([10, 4.01], 1.03, 2.55)
  const totals = calculate(receipt, people)
  assert.equal(totals.reduce((s, p) => s + cents(p.total), 0), cents(receipt.total))
  for (const p of totals) assert.equal(cents(p.total), cents(p.subtotal) + cents(p.taxShare) + cents(p.tipShare))
})
test('tax and tip follow assigned item proportions', () => {
  const receipt = bill([10, 20], 3, 6)
  receipt.items[0].assignees = ['Alex']; receipt.items[1].assignees = ['Jamie']
  assert.deepEqual(calculate(receipt, people).map(p => p.total), [13, 26, 0])
})
test('equal splitting stays equal across many indivisible items', () => {
  const receipt = { ...bill(Array(50).fill(0.01), 0.07, 0.08), splitMode: 'equal' }
  const totals = calculate(receipt, people).map(p => cents(p.total))
  assert.equal(totals.reduce((a, b) => a + b), 65)
  assert.ok(Math.max(...totals) - Math.min(...totals) <= 1)
})
test('zero-price items still split tax and tip', () => {
  const receipt = bill([0], 0.01, 0.02)
  assert.equal(calculate(receipt, people).reduce((s, p) => s + cents(p.total), 0), 3)
})
