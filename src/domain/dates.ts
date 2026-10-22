import type { ISODate } from './types'

export const IST = '+05:30'
const MS_HOUR = 3600_000

/** Start of an IST calendar day. */
export function istDayStart(d: ISODate): Date {
  return new Date(`${d}T00:00:00${IST}`)
}

/** Last millisecond of an IST calendar day. */
export function istDayEnd(d: ISODate): Date {
  return new Date(istDayStart(d).getTime() + 24 * MS_HOUR - 1)
}

/** IST calendar date for an instant. */
export function istDateOf(t: Date): ISODate {
  return new Date(t.getTime() + 5.5 * MS_HOUR).toISOString().slice(0, 10)
}

export function addDays(d: ISODate, n: number): ISODate {
  return istDateOf(new Date(istDayStart(d).getTime() + n * 24 * MS_HOUR + 12 * MS_HOUR))
}

/** Default Invoice/ASN deadline: end of the day before delivery (Zepto: file ASN a day prior). */
export function defaultAsnDeadline(deliveryDate: ISODate): string {
  return `${addDays(deliveryDate, -1)}T23:59:00${IST}`
}

export function fmtDateTime(iso: string): string {
  const t = new Date(iso)
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(t)
}

export function fmtDate(d: ISODate): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(istDayStart(d))
}

export function fmtDuration(ms: number): string {
  const abs = Math.abs(ms)
  const h = Math.floor(abs / MS_HOUR)
  const m = Math.floor((abs % MS_HOUR) / 60_000)
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h >= 1) return `${h}h ${m}m`
  return `${m}m`
}
