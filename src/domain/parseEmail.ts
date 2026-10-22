import { addDays } from './dates'
import type { Platform, POLine } from './types'

export interface ParsedPO {
  platform: Platform | null
  poNumber: string
  city: string
  warehouse: string
  poDate: string
  deliveryDate: string
  expiryDate: string
  lines: POLine[]
  totalValue: number | null
  /** Fields the parser could not find; the UI highlights these. */
  missing: string[]
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}
const pad = (n: number) => String(n).padStart(2, '0')

/** Parse YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, "22 Sep 2026", "Sep 22, 2026" to YYYY-MM-DD. */
export function parseDate(s: string): string {
  const t = s.trim()
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`
  m = t.match(/(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3})[a-z]*,?[\s-]+(\d{4})/)
  if (m && MONTHS[m[2].toLowerCase()])
    return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(+m[1])}`
  m = t.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (m && MONTHS[m[1].toLowerCase()])
    return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(+m[2])}`
  return ''
}

const DATE_RE = String.raw`(\d{4}-\d{2}-\d{2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{1,2}(?:st|nd|rd|th)?[\s-]+[A-Za-z]{3,9},?[\s-]+\d{4}|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})`

function dateAfter(text: string, labels: string): string {
  const re = new RegExp(`(?:${labels})\\s*[:-]?\\s*${DATE_RE}`, 'i')
  const m = text.match(re)
  return m ? parseDate(m[1]) : ''
}

const CITY_KEYWORDS: [RegExp, string][] = [
  [/\b(mumbai|bhiwandi|thane|padgha|navi mumbai|panvel)\b/i, 'Mumbai'],
  [/\b(gurugram|gurgaon|jhajjar|sohna|farukhnagar|manesar)\b/i, 'Gurugram'],
  [/\b(bengaluru|bangalore|hoskote|nelamangala)\b/i, 'Bengaluru'],
  [/\b(chennai|thiruvallur|tiruvallur)\b/i, 'Chennai'],
  [/\b(delhi|noida|ghaziabad)\b/i, 'Delhi NCR'],
  [/\b(hyderabad)\b/i, 'Hyderabad'],
  [/\b(kolkata)\b/i, 'Kolkata'],
  [/\b(pune)\b/i, 'Pune'],
]
const INSTAMART_PREFIX: Record<string, string> = {
  BLR: 'Bengaluru',
  MUM: 'Mumbai',
  DEL: 'Delhi NCR',
  GGN: 'Gurugram',
  CHE: 'Chennai',
  CHN: 'Chennai',
  HYD: 'Hyderabad',
  KOL: 'Kolkata',
  PUN: 'Pune',
}

export function detectCity(text: string): string {
  for (const [re, city] of CITY_KEYWORDS) if (re.test(text)) return city
  return ''
}

export function detectPlatform(text: string): Platform | null {
  if (/zepto/i.test(text) || /\bP\d{7}\b/.test(text)) return 'zepto'
  if (/scootsy|instamart|swiggy|MBIPO\d+/i.test(text)) return 'instamart'
  if (/blinkit/i.test(text)) return 'blinkit'
  return null
}

const num = (s: string) => Number(s.replace(/,/g, ''))

/**
 * SKU lines. Accepts (best effort):
 *   "Name | 36 | 650.00"      (pipe, tab or comma separated: name, qty, rate)
 *   "Name    36    650.00"    (two numbers at the end of the line: qty, rate)
 *   "36 x Name @ 650"         (qty x name @ rate)
 */
export function parseLines(text: string): POLine[] {
  const lines: POLine[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || /^(sku|item|description|product)\b.*\b(qty|quantity)\b/i.test(line)) continue
    let m = line.match(/^(\d+)\s*[x×]\s*(.+?)\s*@\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d+)?)\s*$/i)
    if (m) {
      lines.push({ sku: m[2].trim(), qty: +m[1], rate: num(m[3]) })
      continue
    }
    m = line.match(
      /^(.*?[A-Za-z].*?)\s*[|\t,]\s*(\d+)\s*[|\t,]\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d+)?)\s*(?:[|\t,].*)?$/,
    )
    if (m && !/^(order|total|shipping|billing)/i.test(m[1])) {
      lines.push({ sku: m[1].trim(), qty: +m[2], rate: num(m[3]) })
      continue
    }
    m = line.match(/^(.*?[A-Za-z].*?)\s{2,}(\d+)\s{2,}(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d+)?)$/)
    if (m && !/^(order|total|shipping|billing)/i.test(m[1])) {
      lines.push({ sku: m[1].trim(), qty: +m[2], rate: num(m[3]) })
    }
  }
  return lines
}

export function parsePOEmail(text: string): ParsedPO {
  const platform = detectPlatform(text)

  let poNumber = ''
  let m = text.match(/Order Number\s*[:-]\s*([A-Z]*\d{5,})/i)
  if (m) poNumber = m[1]
  if (!poNumber) {
    m = text.match(/\b(MBIPO\d+)\b/i) ?? text.match(/Purchase order No\.?\s*:?\s*([A-Z0-9-]+)/i)
    if (m) poNumber = m[1].toUpperCase()
  }
  if (!poNumber) {
    m = text.match(/\[.*?\band\s+(P\d{6,})\]/) ?? text.match(/\b(P\d{7})\b/)
    if (m) poNumber = m[1]
  }

  // City + warehouse from the shipping address (Zepto) or the subject prefix (Instamart).
  let city = ''
  let warehouse = ''
  const ship = text.match(/Shipping Address\s*:\s*(.+)/i)
  if (ship) {
    city = detectCity(ship[1])
    warehouse = ship[1].split(',')[0].trim().slice(0, 80)
  }
  if (!city) {
    const prefix = text.match(/^\s*(?:Subject:\s*)?([A-Z]{3})\s+[A-Z]{2,4}\d?-MBIPO/m)
    if (prefix && INSTAMART_PREFIX[prefix[1]]) city = INSTAMART_PREFIX[prefix[1]]
  }
  if (!city) city = detectCity(text)
  const wh = text.match(/(?:Warehouse|Delivery Location|Ship to)\s*[:-]\s*(.+)/i)
  if (wh && !warehouse) warehouse = wh[1].trim().slice(0, 80)

  const poDate = dateAfter(text, 'Order Date|PO Date|Date of PO|Purchase Order Date')
  const deliveryDate =
    dateAfter(text, 'Expected Delivery Date|Delivery Date|Deliver By|Expected Delivery') ||
    (poDate && platform === 'zepto' ? addDays(poDate, 1) : '')
  const expiryDate = dateAfter(text, 'Expiry Date|PO Expiry|Expires On|Valid Till|Valid Until')

  const lines = parseLines(text)

  let totalValue: number | null = null
  const totals = [
    ...text.matchAll(
      /(?:grand\s+)?total(?:\s+(?:value|amount|cost))?[^\d\n]{0,20}([\d,]+(?:\.\d+)?)/gi,
    ),
  ]
  if (totals.length) totalValue = num(totals[totals.length - 1][1])
  else if (lines.length)
    totalValue = Math.round(lines.reduce((s, l) => s + l.qty * l.rate, 0) * 100) / 100

  const missing: string[] = []
  if (!poNumber) missing.push('poNumber')
  if (!city) missing.push('city')
  if (!poDate) missing.push('poDate')
  if (!deliveryDate) missing.push('deliveryDate')
  if (!expiryDate) missing.push('expiryDate')
  if (!lines.length) missing.push('lines')
  if (totalValue === null) missing.push('totalValue')

  return {
    platform,
    poNumber,
    city,
    warehouse,
    poDate,
    deliveryDate,
    expiryDate,
    lines,
    totalValue,
    missing,
  }
}
