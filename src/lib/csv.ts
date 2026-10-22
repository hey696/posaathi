import type { PO, POLine, Platform } from '../domain/types'
import { newId } from '../db/db'

export const CSV_HEADERS = [
  'poNumber',
  'platform',
  'city',
  'warehouse',
  'poDate',
  'deliveryDate',
  'asnDeadline',
  'expiryDate',
  'lines',
  'totalValue',
  'status',
  'notes',
] as const

const esc = (v: string | number | null) => {
  const s = v === null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Lines are packed as "sku:qty:rate" joined by "|". */
export function packLines(lines: POLine[]): string {
  return lines.map((l) => `${l.sku.replace(/[|:]/g, ' ')}:${l.qty}:${l.rate}`).join('|')
}
export function unpackLines(s: string): POLine[] {
  return s
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [sku, qty, rate] = p.split(':')
      return { sku: sku?.trim() ?? '', qty: Number(qty) || 0, rate: Number(rate) || 0 }
    })
}

export function posToCsv(pos: PO[]): string {
  const rows = pos.map((p) =>
    [
      p.poNumber,
      p.platform,
      p.city,
      p.warehouse,
      p.poDate,
      p.deliveryDate,
      p.asnDeadline,
      p.expiryDate,
      packLines(p.lines),
      p.totalValue,
      p.status,
      p.notes,
    ]
      .map(esc)
      .join(','),
  )
  return [CSV_HEADERS.join(','), ...rows].join('\n')
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

const PLATFORMS: Platform[] = ['zepto', 'instamart', 'blinkit', 'other']

/** Returns POs plus per-row errors. Rows need poNumber and deliveryDate. */
export function csvToPos(text: string, now = new Date()): { pos: PO[]; errors: string[] } {
  const rows = parseCsv(text)
  const errors: string[] = []
  if (!rows.length) return { pos: [], errors: ['Empty file'] }
  const head = rows[0].map((h) => h.trim())
  const idx = (k: string) => head.indexOf(k)
  if (idx('poNumber') < 0) return { pos: [], errors: ['Missing poNumber column'] }
  const pos: PO[] = []
  rows.slice(1).forEach((r, i) => {
    const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? '').trim() : '')
    const poNumber = get('poNumber')
    const deliveryDate = get('deliveryDate')
    if (!poNumber || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      errors.push(`Row ${i + 2}: needs poNumber and deliveryDate (YYYY-MM-DD)`)
      return
    }
    const lines = unpackLines(get('lines'))
    const at = now.toISOString()
    const platform = PLATFORMS.includes(get('platform') as Platform)
      ? (get('platform') as Platform)
      : 'other'
    const status = (get('status') || 'new') as PO['status']
    pos.push({
      id: newId(),
      poNumber,
      platform,
      city: get('city'),
      warehouse: get('warehouse'),
      poDate: get('poDate') || deliveryDate,
      deliveryDate,
      asnDeadline: get('asnDeadline') || null,
      expiryDate: get('expiryDate') || null,
      lines,
      totalValue: Number(get('totalValue')) || lines.reduce((s, l) => s + l.qty * l.rate, 0),
      status,
      statusHistory: [{ status, at }],
      notes: get('notes'),
      createdAt: at,
      updatedAt: at,
    })
  })
  return { pos, errors }
}
