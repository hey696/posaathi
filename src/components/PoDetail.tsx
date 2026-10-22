import { useState } from 'react'
import { db } from '../db/db'
import { fmtDate, fmtDateTime } from '../domain/dates'
import { advanceBlocker, nextStatus, withStatus } from '../domain/status'
import { STATUS_LABEL, type PO } from '../domain/types'
import GrnPanel from './GrnPanel'
import { btnCls, btn2Cls, inr, inputCls } from './ui'

export default function PoDetail({ po, now, onBack }: { po: PO; now: Date; onBack: () => void }) {
  const [notes, setNotes] = useState(po.notes)
  const next = nextStatus(po)
  const blocker = advanceBlocker(po)
  const terminal = po.status === 'cancelled' || po.status === 'expired' || po.status === 'closed'

  const advance = () => next && db.pos.put(withStatus(po, next, new Date()))
  const terminate = (s: 'cancelled' | 'expired') => {
    if (confirm(`Mark ${po.poNumber} as ${STATUS_LABEL[s]}?`))
      db.pos.put(withStatus(po, s, new Date()))
  }
  const remove = async () => {
    if (confirm(`Delete ${po.poNumber} permanently?`)) {
      await db.pos.delete(po.id)
      onBack()
    }
  }

  return (
    <div className="space-y-4">
      <button className="text-sm text-slate-600 underline" onClick={onBack}>
        ← Back
      </button>
      <div className="rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">{po.poNumber}</h2>
          <span className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white">
            {STATUS_LABEL[po.status]}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          {po.platform} · {po.city} · {po.warehouse}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">PO date</dt>
            <dd>{fmtDate(po.poDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Delivery</dt>
            <dd>{fmtDate(po.deliveryDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">ASN deadline</dt>
            <dd>{po.asnDeadline ? fmtDateTime(po.asnDeadline) : '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Expiry</dt>
            <dd>{po.expiryDate ? fmtDate(po.expiryDate) : '-'}</dd>
          </div>
        </dl>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th>SKU</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.sku}</td>
                <td className="text-right">{l.qty}</td>
                <td className="text-right">{inr(l.rate)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td>Total</td>
              <td className="text-right">{po.lines.reduce((s, l) => s + l.qty, 0)}</td>
              <td className="text-right">{inr(po.totalValue)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {next && (
            <button className={btnCls} disabled={!!blocker} onClick={advance}>
              Mark {STATUS_LABEL[next]}
            </button>
          )}
          {blocker && next && <span className="text-xs text-amber-700">{blocker}</span>}
          {!terminal && (
            <button className={btn2Cls} onClick={() => terminate('cancelled')}>
              Cancelled by platform
            </button>
          )}
          {!terminal && (
            <button className={btn2Cls} onClick={() => terminate('expired')}>
              Expired
            </button>
          )}
          <button className="ml-auto text-xs text-red-700 underline" onClick={remove}>
            Delete
          </button>
        </div>
      </div>

      <GrnPanel po={po} now={now} />

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-1 font-semibold">Notes</h3>
        <textarea
          className={inputCls}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          className={btn2Cls + ' mt-2'}
          disabled={notes === po.notes}
          onClick={() => db.pos.put({ ...po, notes, updatedAt: new Date().toISOString() })}
        >
          Save notes
        </button>
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-1 font-semibold">History</h3>
        <ol className="space-y-1 text-sm">
          {po.statusHistory.map((h, i) => (
            <li key={i}>
              {fmtDateTime(h.at)} - {STATUS_LABEL[h.status]}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
