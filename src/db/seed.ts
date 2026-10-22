import { db, newId } from './db'
import { addDays, defaultAsnDeadline, istDateOf } from '../domain/dates'
import type { PO } from '../domain/types'

/** Demo data relative to today, so the dashboard shows red/amber/green rows. */
export async function seedDemo(now = new Date()) {
  const today = istDateOf(now)
  const mk = (
    poNumber: string,
    platform: PO['platform'],
    city: string,
    warehouse: string,
    deliveryOffset: number,
    expiryOffset: number,
    lines: PO['lines'],
    status: PO['status'] = 'new',
  ): PO => {
    const deliveryDate = addDays(today, deliveryOffset)
    const at = now.toISOString()
    return {
      id: newId(),
      poNumber,
      platform,
      city,
      warehouse,
      poDate: addDays(deliveryDate, -1),
      deliveryDate,
      asnDeadline: defaultAsnDeadline(deliveryDate),
      expiryDate: addDays(today, expiryOffset),
      lines,
      totalValue: lines.reduce((s, l) => s + l.qty * l.rate, 0),
      status,
      statusHistory: [{ status: 'new', at }],
      notes: 'Demo data',
      createdAt: at,
      updatedAt: at,
    }
  }
  await db.pos.bulkAdd([
    mk('DEMO-Z1', 'zepto', 'Mumbai', 'Demo warehouse A', 1, 20, [
      { sku: 'Signature Matcha 30g', qty: 36, rate: 650 },
    ]),
    mk(
      'DEMO-Z2',
      'zepto',
      'Bengaluru',
      'Demo warehouse B',
      0,
      18,
      [{ sku: 'Ceremonial Matcha 30g', qty: 36, rate: 900 }],
      'asn_filed',
    ),
    mk('DEMO-Z3', 'zepto', 'Chennai', 'Demo warehouse C', -1, 2, [
      { sku: 'Everyday Matcha 30g', qty: 72, rate: 390 },
    ]),
    mk('DEMO-I1', 'instamart', 'Bengaluru', 'Demo DC', 9, 14, [
      { sku: 'Strawberry Matcha 50g', qty: 36, rate: 700 },
    ]),
  ])
}
