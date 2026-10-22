import { istDayEnd, istDayStart, istDateOf } from './dates'
import type { PO, Status } from './types'

export type Level = 'red' | 'amber' | 'green'
export type DeadlineKind = 'asn' | 'appointment' | 'delivery' | 'expiry'

export interface DeadlineItem {
  po: PO
  kind: DeadlineKind
  label: string
  /** The instant the deadline falls due. */
  dueAt: Date
  /** ms until due; negative when overdue. */
  msLeft: number
  overdue: boolean
  level: Level
}

const H = 3600_000
/** Red when due within this window (or overdue). */
export const RED_WITHIN_H = 6
/** Amber when due within this window. */
export const AMBER_WITHIN_H = 24
/** Items further out than this are not shown on the dashboard. */
export const HORIZON_H = 72

const BEFORE_ASN: Status[] = ['new']
const BEFORE_APPOINTMENT: Status[] = ['new', 'asn_filed']
const BEFORE_DISPATCH: Status[] = ['new', 'asn_filed', 'appointment_scheduled']
const BEFORE_DELIVERED: Status[] = [...BEFORE_DISPATCH, 'dispatched']

export function levelFor(msLeft: number): Level {
  if (msLeft <= RED_WITHIN_H * H) return 'red'
  if (msLeft <= AMBER_WITHIN_H * H) return 'amber'
  return 'green'
}

function make(po: PO, kind: DeadlineKind, label: string, dueAt: Date, now: Date): DeadlineItem {
  const msLeft = dueAt.getTime() - now.getTime()
  return { po, kind, label, dueAt, msLeft, overdue: msLeft < 0, level: levelFor(msLeft) }
}

/** All open deadlines for one PO. Terminal and post-delivery POs have none. */
export function deadlinesFor(po: PO, now: Date): DeadlineItem[] {
  const out: DeadlineItem[] = []
  if (po.status === 'cancelled' || po.status === 'expired') return out

  if (BEFORE_ASN.includes(po.status) && po.asnDeadline) {
    out.push(make(po, 'asn', 'Invoice/ASN due', new Date(po.asnDeadline), now))
  }
  // Appointment: must be booked before the PO expires; the vendor portal has no
  // separate deadline in v1, so an unbooked PO is tracked against delivery day start.
  if (BEFORE_APPOINTMENT.includes(po.status) && po.deliveryDate) {
    out.push(make(po, 'appointment', 'Appointment to book', istDayStart(po.deliveryDate), now))
  }
  if (BEFORE_DELIVERED.includes(po.status) && po.deliveryDate) {
    const tomorrowStart = istDayEnd(po.deliveryDate)
    // Delivery is "due" through the end of its day; it is overdue after that.
    out.push(make(po, 'delivery', 'Delivery due', tomorrowStart, now))
  }
  // Unbooked POs approaching expiry (not yet appointment scheduled).
  if (BEFORE_APPOINTMENT.includes(po.status) && po.expiryDate) {
    out.push(make(po, 'expiry', 'PO expires unbooked', istDayEnd(po.expiryDate), now))
  }
  return out
}

export interface DashboardBuckets {
  overdue: DeadlineItem[]
  dueSoon: DeadlineItem[] // within 24h
  upcoming: DeadlineItem[] // 24h-72h
}

const byUrgency = (a: DeadlineItem, b: DeadlineItem) => a.msLeft - b.msLeft

/**
 * Buckets deadlines for the dashboard. Per PO, only the single most urgent item
 * is shown per kind; an expiry countdown more than 72h away is hidden.
 * An overdue appointment is suppressed once the delivery item exists for the
 * same PO, to avoid two red rows for one problem.
 */
export function bucketDeadlines(pos: PO[], now: Date): DashboardBuckets {
  const all: DeadlineItem[] = []
  for (const po of pos) {
    const items = deadlinesFor(po, now)
    const hasDelivery = items.some((i) => i.kind === 'delivery')
    for (const i of items) {
      if (i.kind === 'appointment' && hasDelivery && i.overdue) continue
      all.push(i)
    }
  }
  const visible = all.filter((i) => i.msLeft <= HORIZON_H * H)
  return {
    overdue: visible.filter((i) => i.overdue).sort(byUrgency),
    dueSoon: visible.filter((i) => !i.overdue && i.msLeft <= AMBER_WITHIN_H * H).sort(byUrgency),
    upcoming: visible.filter((i) => i.msLeft > AMBER_WITHIN_H * H).sort(byUrgency),
  }
}

// ---- GRN ----

export const GRN_WINDOW_MS = 24 * H

export function dispatchedQty(po: PO): number {
  return po.grn?.dispatchedQty ?? po.lines.reduce((s, l) => s + l.qty, 0)
}

export interface GrnState {
  discrepancy: boolean
  shortBy: number
  windowOpen: boolean
  windowEndsAt: Date | null
  msLeftInWindow: number | null
  /** GRN landed, has a discrepancy or is unreviewed, and has not been reconciled. */
  unreconciled: boolean
}

export function grnState(po: PO, now: Date): GrnState {
  if (!po.grn) {
    return {
      discrepancy: false,
      shortBy: 0,
      windowOpen: false,
      windowEndsAt: null,
      msLeftInWindow: null,
      unreconciled: false,
    }
  }
  const shortBy = dispatchedQty(po) - po.grn.receivedQty
  const windowEndsAt = new Date(new Date(po.grn.receivedAt).getTime() + GRN_WINDOW_MS)
  const msLeft = windowEndsAt.getTime() - now.getTime()
  return {
    discrepancy: shortBy !== 0,
    shortBy,
    windowOpen: msLeft > 0,
    windowEndsAt,
    msLeftInWindow: msLeft,
    unreconciled: po.status === 'grn_received' && !po.grn.reconciled,
  }
}

export function isUnreconciled(po: PO, now: Date): boolean {
  return grnState(po, now).unreconciled
}

/** For tests and display: which IST day is "today". */
export function todayIST(now: Date) {
  return istDateOf(now)
}
