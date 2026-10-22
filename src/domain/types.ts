export type Platform = 'zepto' | 'instamart' | 'blinkit' | 'other'

export const STATUS_FLOW = [
  'new',
  'asn_filed',
  'appointment_scheduled',
  'dispatched',
  'delivered',
  'grn_received',
  'closed',
] as const

export type Status = (typeof STATUS_FLOW)[number] | 'cancelled' | 'expired'

export const STATUS_LABEL: Record<Status, string> = {
  new: 'New',
  asn_filed: 'ASN filed',
  appointment_scheduled: 'Appointment scheduled',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  grn_received: 'GRN received',
  closed: 'Closed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

/** 'YYYY-MM-DD' (calendar date, interpreted in IST) */
export type ISODate = string
/** ISO 8601 timestamp with offset */
export type ISODateTime = string

export interface POLine {
  sku: string
  qty: number
  rate: number
}

export interface GRN {
  /** Defaults to the sum of PO line quantities when not set. */
  dispatchedQty?: number
  receivedQty: number
  receivedAt: ISODateTime
  notes: string
  /** User has reviewed the GRN and any discrepancy is handled. */
  reconciled?: boolean
}

export interface PO {
  id: string
  poNumber: string
  platform: Platform
  city: string
  warehouse: string
  poDate: ISODate
  deliveryDate: ISODate
  asnDeadline: ISODateTime | null
  expiryDate: ISODate | null
  lines: POLine[]
  totalValue: number
  status: Status
  statusHistory: { status: Status; at: ISODateTime }[]
  grn?: GRN
  notes: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
