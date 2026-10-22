import { useState } from 'react'
import { db, newId } from '../db/db'
import { addDays, defaultAsnDeadline, istDateOf } from '../domain/dates'
import type { ParsedPO } from '../domain/parseEmail'
import type { PO, POLine, Platform } from '../domain/types'
import { Field, btnCls, btn2Cls, inputCls } from './ui'

/** datetime-local value (IST wall clock) <-> ISO with offset */
const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : '')
const fromLocal = (v: string) => (v ? `${v}:00+05:30` : null)

export default function QuickAddForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Partial<ParsedPO>
  onSaved: (id: string) => void
  onCancel?: () => void
}) {
  const today = istDateOf(new Date())
  const [poNumber, setPoNumber] = useState(initial?.poNumber ?? '')
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? 'zepto')
  const [city, setCity] = useState(initial?.city ?? '')
  const [warehouse, setWarehouse] = useState(initial?.warehouse ?? '')
  const [poDate, setPoDate] = useState(initial?.poDate || today)
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate || addDays(today, 1))
  const [asn, setAsn] = useState(
    toLocal(
      initial?.deliveryDate
        ? defaultAsnDeadline(initial.deliveryDate)
        : defaultAsnDeadline(addDays(today, 1)),
    ),
  )
  const [expiry, setExpiry] = useState(initial?.expiryDate ?? '')
  const [lines, setLines] = useState<POLine[]>(
    initial?.lines?.length ? initial.lines : [{ sku: '', qty: 0, rate: 0 }],
  )
  const [total, setTotal] = useState<string>(
    initial?.totalValue != null ? String(initial.totalValue) : '',
  )
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const miss = (k: string) =>
    initial?.missing?.includes(k) ? 'Not found in the pasted text - please fill in' : undefined

  const computed = lines.reduce((s, l) => s + l.qty * l.rate, 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!poNumber.trim()) return setErr('PO number is required')
    const dup = await db.pos.where('poNumber').equals(poNumber.trim()).count()
    if (dup && !confirm(`A PO ${poNumber.trim()} already exists. Save another copy?`)) return
    const at = new Date().toISOString()
    const clean = lines.filter((l) => l.sku.trim() && l.qty > 0)
    const po: PO = {
      id: newId(),
      poNumber: poNumber.trim(),
      platform,
      city: city.trim(),
      warehouse: warehouse.trim(),
      poDate,
      deliveryDate,
      asnDeadline: fromLocal(asn),
      expiryDate: expiry || null,
      lines: clean,
      totalValue: total === '' ? computed : Number(total),
      status: 'new',
      statusHistory: [{ status: 'new', at }],
      notes,
      createdAt: at,
      updatedAt: at,
    }
    await db.pos.add(po)
    onSaved(po.id)
  }

  const setLine = (i: number, patch: Partial<POLine>) =>
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  return (
    <form onSubmit={save} className="space-y-4 rounded border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="PO number" hint={miss('poNumber')}>
          <input
            className={inputCls}
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
          />
        </Field>
        <Field label="Platform">
          <select
            className={inputCls}
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
          >
            <option value="zepto">Zepto</option>
            <option value="instamart">Instamart</option>
            <option value="blinkit">Blinkit</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="City" hint={miss('city')}>
          <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Warehouse">
          <input
            className={inputCls}
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
          />
        </Field>
        <Field label="PO date" hint={miss('poDate')}>
          <input
            type="date"
            className={inputCls}
            value={poDate}
            onChange={(e) => setPoDate(e.target.value)}
          />
        </Field>
        <Field label="Delivery date" hint={miss('deliveryDate')}>
          <input
            type="date"
            className={inputCls}
            value={deliveryDate}
            onChange={(e) => {
              setDeliveryDate(e.target.value)
              if (e.target.value) setAsn(toLocal(defaultAsnDeadline(e.target.value)))
            }}
          />
        </Field>
        <Field label="Invoice/ASN deadline (IST)">
          <input
            type="datetime-local"
            className={inputCls}
            value={asn}
            onChange={(e) => setAsn(e.target.value)}
          />
        </Field>
        <Field label="PO expiry date" hint={miss('expiryDate')}>
          <input
            type="date"
            className={inputCls}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </Field>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          SKU lines{' '}
          {miss('lines') && <span className="text-amber-700">- none found, please add</span>}
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_6rem_2rem] gap-2">
              <input
                className={inputCls}
                placeholder="SKU name"
                value={l.sku}
                onChange={(e) => setLine(i, { sku: e.target.value })}
              />
              <input
                type="number"
                min={0}
                className={inputCls}
                placeholder="Qty"
                value={l.qty || ''}
                onChange={(e) => setLine(i, { qty: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                placeholder="Rate"
                value={l.rate || ''}
                onChange={(e) => setLine(i, { rate: Number(e.target.value) })}
              />
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                aria-label="Remove line"
                onClick={() => setLines(lines.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={btn2Cls + ' mt-2'}
          onClick={() => setLines([...lines, { sku: '', qty: 0, rate: 0 }])}
        >
          + Add line
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Total value (lines add up to ${computed})`} hint={miss('totalValue')}>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={total}
            placeholder={String(computed)}
            onChange={(e) => setTotal(e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div className="flex gap-2">
        <button className={btnCls}>Save PO</button>
        {onCancel && (
          <button type="button" className={btn2Cls} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
