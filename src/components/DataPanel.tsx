import { useState } from 'react'
import { db } from '../db/db'
import { seedDemo } from '../db/seed'
import { download, buildBackup, restoreBackup } from '../lib/backup'
import { csvToPos, posToCsv } from '../lib/csv'
import { btn2Cls } from './ui'

export default function DataPanel({ count }: { count: number }) {
  const [msg, setMsg] = useState('')
  const stamp = new Date().toISOString().slice(0, 10)

  async function onJson(f: File) {
    try {
      if (!confirm('Restoring replaces ALL current data with the backup. Continue?')) return
      const n = await restoreBackup(JSON.parse(await f.text()))
      setMsg(`Restored ${n} POs.`)
    } catch (e) {
      setMsg(`Restore failed: ${(e as Error).message}`)
    }
  }
  async function onCsv(f: File) {
    const { pos, errors } = csvToPos(await f.text())
    if (pos.length) await db.pos.bulkAdd(pos)
    setMsg(`Imported ${pos.length} POs.${errors.length ? ' Skipped: ' + errors.join('; ') : ''}`)
  }

  return (
    <div className="space-y-4 rounded border border-slate-200 bg-white p-4 text-sm">
      <p>
        {count} POs stored in this browser. Data never leaves your device - back it up regularly.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className={btn2Cls}
          onClick={async () =>
            download(
              `posaathi-backup-${stamp}.json`,
              JSON.stringify(await buildBackup(), null, 2),
              'application/json',
            )
          }
        >
          Export JSON backup
        </button>
        <label className={btn2Cls + ' cursor-pointer'}>
          Restore JSON backup
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && onJson(e.target.files[0])}
          />
        </label>
        <button
          className={btn2Cls}
          onClick={async () =>
            download(`posaathi-pos-${stamp}.csv`, posToCsv(await db.pos.toArray()), 'text/csv')
          }
        >
          Export CSV
        </button>
        <label className={btn2Cls + ' cursor-pointer'}>
          Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
          />
        </label>
      </div>
      {count === 0 && (
        <button className={btn2Cls} onClick={() => seedDemo()}>
          Load demo data
        </button>
      )}
      {msg && <p className="text-slate-700">{msg}</p>}
    </div>
  )
}
