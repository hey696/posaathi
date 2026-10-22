import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectCity, parseDate, parseLines, parsePOEmail } from '../src/domain/parseEmail'

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8')

describe('parseDate', () => {
  it('handles common formats', () => {
    expect(parseDate('2026-09-22')).toBe('2026-09-22')
    expect(parseDate('22-09-2026')).toBe('2026-09-22')
    expect(parseDate('5/11/2026')).toBe('2026-11-05')
    expect(parseDate('05 Nov 2026')).toBe('2026-11-05')
    expect(parseDate('Nov 5, 2026')).toBe('2026-11-05')
    expect(parseDate('nope')).toBe('')
  })
})

describe('detectCity', () => {
  it('maps warehouse localities to cities', () => {
    expect(detectCity('Hoskote, Bangalore ( Rural )')).toBe('Bengaluru')
    expect(detectCity('Khalikpur, Jhajjar Gurugram')).toBe('Gurugram')
    expect(detectCity('THIRUVALLUR, CHENNAI')).toBe('Chennai')
    expect(detectCity('Sohna, Haryana')).toBe('Gurugram')
    expect(detectCity('Nowhere')).toBe('')
  })
})

describe('parseLines', () => {
  it('parses pipe, spaced and "qty x name @ rate" forms', () => {
    expect(parseLines('Foo 30g | 12 | 1,250.50')).toEqual([
      { sku: 'Foo 30g', qty: 12, rate: 1250.5 },
    ])
    expect(parseLines('Bar 50g    36    700')).toEqual([{ sku: 'Bar 50g', qty: 36, rate: 700 }])
    expect(parseLines('36 x Baz 30g @ Rs 650')).toEqual([{ sku: 'Baz 30g', qty: 36, rate: 650 }])
  })
  it('ignores headers and non-SKU lines', () => {
    expect(parseLines('Item | Qty | Unit Cost\nOrder Number: P5620587\nTotal | 5 | 6')).toEqual([])
  })
})

describe('parsePOEmail - Zepto', () => {
  const p = parsePOEmail(fx('zepto-po-email.txt'))
  it('extracts header fields', () => {
    expect(p.platform).toBe('zepto')
    expect(p.poNumber).toBe('P5620587')
    expect(p.city).toBe('Mumbai')
    expect(p.warehouse).toBe('R2')
    expect(p.poDate).toBe('2026-09-21')
    expect(p.deliveryDate).toBe('2026-09-22')
    expect(p.expiryDate).toBe('2026-10-12')
  })
  it('extracts lines and total', () => {
    expect(p.lines).toHaveLength(2)
    expect(p.lines[0]).toEqual({ sku: 'Signature Matcha 30g', qty: 36, rate: 650 })
    expect(p.totalValue).toBe(51480)
    expect(p.missing).toEqual([])
  })
  it('defaults delivery to next day for Zepto when absent', () => {
    const t = fx('zepto-po-email.txt').replace(/Expected Delivery Date.*\n/, '')
    expect(parsePOEmail(t).deliveryDate).toBe('2026-09-22')
  })
})

describe('parsePOEmail - Instamart', () => {
  const p = parsePOEmail(fx('instamart-po-email.txt'))
  it('extracts PO number, city from subject prefix, dates', () => {
    expect(p.platform).toBe('instamart')
    expect(p.poNumber).toBe('MBIPO446182')
    expect(p.city).toBe('Bengaluru')
    expect(p.poDate).toBe('2026-10-20')
    expect(p.deliveryDate).toBe('2026-11-03')
    expect(p.expiryDate).toBe('2026-11-05')
  })
  it('extracts lines and the grand total', () => {
    expect(p.lines.map((l) => l.qty)).toEqual([36, 24])
    expect(p.totalValue).toBe(46800)
  })
})

describe('parsePOEmail - garbage', () => {
  it('reports missing fields instead of throwing', () => {
    const p = parsePOEmail('hello there')
    expect(p.platform).toBeNull()
    expect(p.missing).toContain('poNumber')
    expect(p.missing).toContain('lines')
  })
  it('falls back to summing lines when no total is present', () => {
    const p = parsePOEmail('Order Number: P1234567\nFoo | 2 | 100')
    expect(p.totalValue).toBe(200)
  })
})
