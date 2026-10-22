import { useState } from 'react'
import { db } from '../db/db'
import { fmtDateTime, fmtDuration } from '../domain/dates'
import { withStatus } from '../domain/status'
import { dispatchedQty, grnState } from '../domain/urgency'
import type { PO } from '../domain/types'
import { Field, btnCls, btn2Cls, inputCls } from './ui'

export default function GrnPanel({ po, now }: { po: PO; now: Date }) {
  const g = grnState(po, now)
  const [received, setReceived] = useState(String(po.grn?.receivedQty ?? ''))
  const [dispatched, setDispatched] = useState(String(dispatchedQty(po)))
  const [notes, setNotes] = useState(po.grn?.notes ?? '')
  const canRecord = ['delivered', 'grn_received'].includes(po.status)

  async function save() {
    if (received === '') return
    const at = new Date()
    let next: PO = {
      ...po,
      grn: {
        dispatchedQty: Number(dispatched),
        receivedQty: Number(received),
        receivedAt: po.grn?.receivedAt ?? at.toISOString(),
        notes,
        reconciled:
          po.grn?.reconciled && Number(received) === po.grn.receivedQty ? po.grn.reconciled : false,
      },
      updatedAt: at.toISOString(),
    }
    if (po.status === 'delivered') next = withStatus(next, 'grn_received', at)
    await db.pos.put(next)
  }
  async function setReconciled(v: boolean) {
    if (!po.grn) return
    await db.pos.put({
      ...po,
      grn: { ...po.grn, reconciled: v },
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <section className="space-y-3 rounded border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">GRN reconciliation</h3>
      {!canRecord && !po.grn && (
        <p className="text-sm text-slate-500">Available once the PO is Delivered.</p>
      )}
      {(canRecord || po.grn) && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dispatched qty">
              <input
                type="number"
                className={inputCls}
                value={dispatched}
                onChange={(e) => setDispatched(e.target.value)}
              />
            </Field>
            <Field label="GRN received qty">
              <input
                type="number"
                className={inputCls}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes (short-shipped, damaged, rejected, debit note expected)">
            <textarea
              className={inputCls}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnCls} disabled={received === '' || !canRecord} onClick={save}>
              {po.grn ? 'Update GRN' : 'Record GRN'}
            </button>
            {po.grn && !po.grn.reconciled && (
              <button className={btn2Cls} onClick={() => setReconciled(true)}>
                Mark reconciled
              </button>
            )}
            {po.grn?.reconciled && (
              <button className={btn2Cls} onClick={() => setReconciled(false)}>
                Reopen
              </button>
            )}
          </div>
        </>
      )}
      {po.grn && (
        <p className={`text-sm ${g.discrepancy ? 'text-red-700' : 'text-green-700'}`}>
          {g.discrepancy
            ? `Discrepancy: ${g.shortBy > 0 ? 'short' : 'excess'} by ${Math.abs(g.shortBy)} units. `
            : 'Quantities match. '}
          GRN logged {fmtDateTime(po.grn.receivedAt)}.{' '}
          {g.windowOpen
            ? `24h discrepancy window closes in ${fmtDuration(g.msLeftInWindow!)}.`
            : 'Discrepancy window closed.'}{' '}
          {po.grn.reconciled ? 'Reconciled.' : 'Not reconciled.'}
        </p>
      )}
    </section>
  )
}
