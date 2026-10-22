import { useState } from 'react'
import { STATUS_LABEL, type PO, type Status } from '../domain/types'
import { fmtDate } from '../domain/dates'
import { isUnreconciled } from '../domain/urgency'
import { inr, inputCls } from './ui'

export default function PoTable({
  pos,
  now,
  onOpen,
}: {
  pos: PO[]
  now: Date
  onOpen: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'unreconciled' | Status>('active')
  const rows = pos
    .filter((p) => {
      if (status === 'active') return !['closed', 'cancelled', 'expired'].includes(p.status)
      if (status === 'unreconciled') return isUnreconciled(p, now)
      if (status !== 'all') return p.status === status
      return true
    })
    .filter(
      (p) => !q || `${p.poNumber} ${p.city} ${p.warehouse}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          className={inputCls + ' max-w-xs'}
          placeholder="Search PO, city, warehouse"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={inputCls + ' max-w-xs'}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="unreconciled">Unreconciled GRNs</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-2">PO</th>
              <th className="p-2">Platform</th>
              <th className="p-2">City</th>
              <th className="p-2">Delivery</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpen(p.id)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="p-2 font-medium">{p.poNumber}</td>
                <td className="p-2">{p.platform}</td>
                <td className="p-2">{p.city}</td>
                <td className="p-2">{fmtDate(p.deliveryDate)}</td>
                <td className="p-2">{STATUS_LABEL[p.status]}</td>
                <td className="p-2 text-right">{inr(p.totalValue)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  No POs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
