import { STATUS_FLOW, type PO, type Status } from './types'

export function nextStatus(po: PO): Status | null {
  const i = STATUS_FLOW.indexOf(po.status as (typeof STATUS_FLOW)[number])
  if (i < 0 || i === STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[i + 1]
}

/** Why a PO cannot advance right now, or null if it can. */
export function advanceBlocker(po: PO): string | null {
  const next = nextStatus(po)
  if (!next) return 'No further status'
  if (next === 'closed') {
    if (!po.grn) return 'Record the GRN first'
    if (!po.grn.reconciled) return 'Mark the GRN reconciled before closing'
  }
  if (next === 'grn_received' && !po.grn) return 'Record the GRN quantities first'
  return null
}

export function withStatus(po: PO, status: Status, now: Date): PO {
  const at = now.toISOString()
  return {
    ...po,
    status,
    statusHistory: [...po.statusHistory, { status, at }],
    updatedAt: at,
  }
}
