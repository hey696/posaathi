import type { Level } from '../domain/urgency'

export const LEVEL_CLASS: Record<Level, string> = {
  red: 'bg-red-50 border-red-300 text-red-800',
  amber: 'bg-amber-50 border-amber-300 text-amber-800',
  green: 'bg-green-50 border-green-300 text-green-800',
}

export const inputCls =
  'w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'
export const btnCls =
  'rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40'
export const btn2Cls =
  'rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <div className="mt-1 font-normal">{children}</div>
      {hint && <div className="mt-0.5 text-[11px] text-amber-700">{hint}</div>}
    </label>
  )
}

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
