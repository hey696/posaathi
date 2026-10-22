import { describe, expect, it } from 'vitest'
import { addDays, defaultAsnDeadline, istDateOf } from '../src/domain/dates'
import { advanceBlocker, nextStatus, withStatus } from '../src/domain/status'
import { bucketDeadlines, deadlinesFor, grnState, levelFor } from '../src/domain/urgency'
import type { PO } from '../src/domain/types'

const now = new Date('2026-10-22T12:00:00+05:30')

function po(over: Partial<PO> = {}): PO {
  return {
    id: 'x',
    poNumber: 'P1',
    platform: 'zepto',
    city: 'Mumbai',
    warehouse: 'W',
    poDate: '2026-10-22',
    deliveryDate: '2026-10-23',
    asnDeadline: '2026-10-22T23:59:00+05:30',
    expiryDate: '2026-11-12',
    lines: [{ sku: 'A', qty: 36, rate: 100 }],
    totalValue: 3600,
    status: 'new',
    statusHistory: [],
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

describe('dates', () => {
  it('computes IST days across the UTC boundary', () => {
    expect(istDateOf(new Date('2026-10-22T19:00:00Z'))).toBe('2026-10-23') // 00:30 IST
    expect(istDateOf(new Date('2026-10-22T18:00:00Z'))).toBe('2026-10-22') // 23:30 IST
  })
  it('adds days and handles month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('default ASN deadline is end of the day before delivery', () => {
    expect(defaultAsnDeadline('2026-10-23')).toBe('2026-10-22T23:59:00+05:30')
  })
})

describe('levelFor', () => {
  it('thresholds', () => {
    const h = 3600_000
    expect(levelFor(-1)).toBe('red')
    expect(levelFor(6 * h)).toBe('red')
    expect(levelFor(6 * h + 1)).toBe('amber')
    expect(levelFor(24 * h)).toBe('amber')
    expect(levelFor(24 * h + 1)).toBe('green')
  })
})

describe('deadlinesFor', () => {
  it('new PO has ASN, appointment, delivery and expiry deadlines', () => {
    const kinds = deadlinesFor(po(), now).map((d) => d.kind)
    expect(kinds).toEqual(['asn', 'appointment', 'delivery', 'expiry'])
  })
  it('ASN tonight is amber (11h59m away) and not overdue', () => {
    const asn = deadlinesFor(po(), now).find((d) => d.kind === 'asn')!
    expect(asn.level).toBe('amber')
    expect(asn.overdue).toBe(false)
  })
  it('ASN is red within 6h', () => {
    const late = new Date('2026-10-22T19:00:00+05:30')
    expect(deadlinesFor(po(), late).find((d) => d.kind === 'asn')!.level).toBe('red')
  })
  it('missed ASN is overdue red', () => {
    const after = new Date('2026-10-23T01:00:00+05:30')
    const asn = deadlinesFor(po(), after).find((d) => d.kind === 'asn')!
    expect(asn.overdue).toBe(true)
    expect(asn.level).toBe('red')
  })
  it('ASN filed removes the ASN deadline', () => {
    expect(deadlinesFor(po({ status: 'asn_filed' }), now).some((d) => d.kind === 'asn')).toBe(false)
  })
  it('appointment scheduled removes appointment and expiry countdowns', () => {
    const kinds = deadlinesFor(po({ status: 'appointment_scheduled' }), now).map((d) => d.kind)
    expect(kinds).toEqual(['delivery'])
  })
  it('delivery is due through the end of the delivery day', () => {
    const d = deadlinesFor(po({ status: 'dispatched', deliveryDate: '2026-10-22' }), now)
    expect(d).toHaveLength(1)
    expect(d[0].overdue).toBe(false)
    const next = new Date('2026-10-23T00:30:00+05:30')
    expect(
      deadlinesFor(po({ status: 'dispatched', deliveryDate: '2026-10-22' }), next)[0].overdue,
    ).toBe(true)
  })
  it('delivered, cancelled and expired POs have no deadlines', () => {
    for (const status of ['delivered', 'grn_received', 'closed', 'cancelled', 'expired'] as const) {
      expect(deadlinesFor(po({ status }), now)).toEqual([])
    }
  })
  it('POs without ASN deadline or expiry skip those items', () => {
    const kinds = deadlinesFor(po({ asnDeadline: null, expiryDate: null }), now).map((d) => d.kind)
    expect(kinds).toEqual(['appointment', 'delivery'])
  })
})

describe('bucketDeadlines', () => {
  it('splits into overdue / due within 24h / upcoming and sorts by urgency', () => {
    const a = po({ id: 'a', asnDeadline: '2026-10-22T20:00:00+05:30' })
    const b = po({ id: 'b', asnDeadline: '2026-10-21T20:00:00+05:30', deliveryDate: '2026-10-21' })
    const r = bucketDeadlines([a, b], now)
    expect(r.overdue.length).toBeGreaterThan(0)
    expect(r.overdue.every((i) => i.overdue)).toBe(true)
    expect(r.dueSoon[0].po.id).toBe('a')
    expect(r.dueSoon.every((i) => i.msLeft >= 0 && i.msLeft <= 24 * 3600_000)).toBe(true)
  })
  it('is quiet when nothing is within 72h', () => {
    const far = po({
      asnDeadline: '2026-11-10T10:00:00+05:30',
      deliveryDate: '2026-11-12',
      expiryDate: '2026-12-01',
    })
    const r = bucketDeadlines([far], now)
    expect(r.overdue.length + r.dueSoon.length + r.upcoming.length).toBe(0)
  })
  it('expiring unbooked PO shows up as red countdown', () => {
    const p = po({
      expiryDate: '2026-10-22',
      asnDeadline: null,
      deliveryDate: '2026-11-30',
      status: 'asn_filed',
    })
    const r = bucketDeadlines([p], now)
    const e = [...r.overdue, ...r.dueSoon].find((i) => i.kind === 'expiry')!
    expect(e.level).toBe('amber') // ends 23:59 IST = ~12h away
  })
  it('suppresses overdue appointment when a delivery row exists', () => {
    const p = po({ deliveryDate: '2026-10-21', asnDeadline: null, expiryDate: null })
    const r = bucketDeadlines([p], now)
    expect(r.overdue.map((i) => i.kind)).toEqual(['delivery'])
  })
})

describe('GRN state', () => {
  const grnAt = '2026-10-22T10:00:00+05:30'
  it('no GRN: nothing flagged', () => {
    expect(grnState(po(), now).unreconciled).toBe(false)
  })
  it('detects short shipment and open 24h window', () => {
    const p = po({ status: 'grn_received', grn: { receivedQty: 30, receivedAt: grnAt, notes: '' } })
    const g = grnState(p, now)
    expect(g.discrepancy).toBe(true)
    expect(g.shortBy).toBe(6)
    expect(g.windowOpen).toBe(true)
    expect(g.msLeftInWindow).toBe(22 * 3600_000)
    expect(g.unreconciled).toBe(true)
  })
  it('window closes after 24h', () => {
    const p = po({ status: 'grn_received', grn: { receivedQty: 36, receivedAt: grnAt, notes: '' } })
    const g = grnState(p, new Date('2026-10-23T10:00:01+05:30'))
    expect(g.windowOpen).toBe(false)
    expect(g.discrepancy).toBe(false)
  })
  it('uses explicit dispatchedQty when set', () => {
    const p = po({
      status: 'grn_received',
      grn: { dispatchedQty: 30, receivedQty: 30, receivedAt: grnAt, notes: '' },
    })
    expect(grnState(p, now).discrepancy).toBe(false)
  })
  it('reconciled GRN is no longer unreconciled', () => {
    const p = po({
      status: 'grn_received',
      grn: { receivedQty: 30, receivedAt: grnAt, notes: 'debit note', reconciled: true },
    })
    expect(grnState(p, now).unreconciled).toBe(false)
  })
})

describe('status pipeline', () => {
  it('advances in order and stops at closed', () => {
    expect(nextStatus(po())).toBe('asn_filed')
    expect(nextStatus(po({ status: 'closed' }))).toBeNull()
    expect(nextStatus(po({ status: 'cancelled' }))).toBeNull()
  })
  it('cannot close or record GRN without GRN data / reconciliation', () => {
    expect(advanceBlocker(po({ status: 'delivered' }))).toMatch(/GRN/)
    const g = { receivedQty: 36, receivedAt: '2026-10-22T10:00:00+05:30', notes: '' }
    expect(advanceBlocker(po({ status: 'grn_received', grn: g }))).toMatch(/reconciled/)
    expect(
      advanceBlocker(po({ status: 'grn_received', grn: { ...g, reconciled: true } })),
    ).toBeNull()
  })
  it('timestamps each transition', () => {
    const p = withStatus(po(), 'asn_filed', now)
    expect(p.status).toBe('asn_filed')
    expect(p.statusHistory.at(-1)).toEqual({ status: 'asn_filed', at: now.toISOString() })
  })
})
