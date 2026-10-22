import { fmtDateTime, fmtDuration } from '../domain/dates'
import type { DeadlineItem } from '../domain/urgency'
import { LEVEL_CLASS } from './ui'

export default function DeadlineList({
  items,
  onOpen,
}: {
  items: DeadlineItem[]
  onOpen: (id: string) => void
}) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.po.id + i.kind}>
          <button
            onClick={() => onOpen(i.po.id)}
            className={`flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left ${LEVEL_CLASS[i.level]}`}
          >
            <span>
              <span className="font-semibold">{i.label}</span> · {i.po.poNumber}
              <span className="block text-xs opacity-80">
                {i.po.platform} · {i.po.city || 'no city'} · {fmtDateTime(i.dueAt.toISOString())}
              </span>
            </span>
            <span className="whitespace-nowrap text-sm font-semibold">
              {i.overdue ? `overdue ${fmtDuration(i.msLeft)}` : `in ${fmtDuration(i.msLeft)}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
