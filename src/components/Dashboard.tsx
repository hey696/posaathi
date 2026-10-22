import { bucketDeadlines, grnState } from '../domain/urgency'
import type { PO } from '../domain/types'
import { fmtDuration } from '../domain/dates'
import DeadlineList from './DeadlineList'

export default function Dashboard({
  pos,
  now,
  onOpen,
}: {
  pos: PO[]
  now: Date
  onOpen: (id: string) => void
}) {
  const b = bucketDeadlines(pos, now)
  const grns = pos.map((p) => ({ p, g: grnState(p, now) })).filter((x) => x.g.unreconciled)
  const nothing = !b.overdue.length && !b.dueSoon.length && !b.upcoming.length && !grns.length

  return (
    <div className="space-y-6">
      {nothing && (
        <p className="rounded border border-green-300 bg-green-50 p-4 text-green-800">
          Nothing due in the next 72 hours.{' '}
          {pos.length === 0 && 'Add your first PO to get started.'}
        </p>
      )}
      {b.overdue.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-red-700">
            Overdue ({b.overdue.length})
          </h2>
          <DeadlineList items={b.overdue} onOpen={onOpen} />
        </section>
      )}
      {b.dueSoon.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
            Due in the next 24h ({b.dueSoon.length})
          </h2>
          <DeadlineList items={b.dueSoon} onOpen={onOpen} />
        </section>
      )}
      {grns.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
            GRNs to check ({grns.length})
          </h2>
          <ul className="space-y-2">
            {grns.map(({ p, g }) => (
              <li key={p.id}>
                <button
                  onClick={() => onOpen(p.id)}
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${
                    g.discrepancy && g.windowOpen
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : g.discrepancy
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-slate-300 bg-white'
                  }`}
                >
                  <b>{p.poNumber}</b> ·{' '}
                  {g.discrepancy ? `short by ${g.shortBy}` : 'quantities match'} ·{' '}
                  {g.windowOpen
                    ? `discrepancy window closes in ${fmtDuration(g.msLeftInWindow!)}`
                    : 'window closed'}{' '}
                  · not yet reconciled
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {b.upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
            Next 3 days ({b.upcoming.length})
          </h2>
          <DeadlineList items={b.upcoming} onOpen={onOpen} />
        </section>
      )}
    </div>
  )
}
