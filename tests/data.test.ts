import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import { buildBackup, restoreBackup, validateBackup } from '../src/lib/backup'
import { csvToPos, posToCsv } from '../src/lib/csv'
import type { PO } from '../src/domain/types'

const sample = (over: Partial<PO> = {}): PO => ({
  id: 'id1',
  poNumber: 'P1',
  platform: 'zepto',
  city: 'Mumbai',
  warehouse: 'W, "quoted"',
  poDate: '2026-10-21',
  deliveryDate: '2026-10-22',
  asnDeadline: '2026-10-21T23:59:00+05:30',
  expiryDate: '2026-11-12',
  lines: [
    { sku: 'A 30g', qty: 36, rate: 650 },
    { sku: 'B', qty: 2, rate: 1.5 },
  ],
  totalValue: 23403,
  status: 'new',
  statusHistory: [{ status: 'new', at: 'x' }],
  notes: 'line1\nline2',
  createdAt: 'x',
  updatedAt: 'x',
  ...over,
})

describe('csv', () => {
  it('round-trips awkward fields', () => {
    const { pos, errors } = csvToPos(posToCsv([sample()]))
    expect(errors).toEqual([])
    expect(pos[0].warehouse).toBe('W, "quoted"')
    expect(pos[0].notes).toBe('line1\nline2')
    expect(pos[0].lines).toEqual(sample().lines)
    expect(pos[0].totalValue).toBe(23403)
  })
  it('reports bad rows', () => {
    const { pos, errors } = csvToPos('poNumber,deliveryDate\nP1,bad\nP2,2026-10-22')
    expect(pos).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })
})

describe('backup', () => {
  beforeEach(async () => {
    await db.pos.clear()
  })
  it('exports and restores, replacing existing data', async () => {
    await db.pos.add(sample())
    const b = await buildBackup()
    await db.pos.clear()
    await db.pos.add(sample({ id: 'other', poNumber: 'P9' }))
    expect(await restoreBackup(JSON.parse(JSON.stringify(b)))).toBe(1)
    expect((await db.pos.toArray()).map((p) => p.poNumber)).toEqual(['P1'])
  })
  it('rejects foreign files', () => {
    expect(() => validateBackup({ foo: 1 })).toThrow()
    expect(() => validateBackup({ app: 'posaathi', version: 1, pos: [{}] })).toThrow()
  })
})
