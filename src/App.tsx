import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import Dashboard from './components/Dashboard'
import PoTable from './components/PoTable'
import PoDetail from './components/PoDetail'
import QuickAddForm from './components/QuickAddForm'
import PasteImport from './components/PasteImport'
import DataPanel from './components/DataPanel'

type Tab = 'dashboard' | 'pos' | 'paste' | 'add' | 'data'
const TABS: [Tab, string][] = [
  ['dashboard', 'Dashboard'],
  ['pos', 'All POs'],
  ['paste', 'Paste PO email'],
  ['add', 'Quick add'],
  ['data', 'Backup'],
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [openId, setOpenId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const pos = useLiveQuery(() => db.pos.toArray(), [])

  // Re-evaluate countdowns every minute.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  if (!pos) return <p className="p-6 text-slate-500">Loading…</p>
  const open = openId ? pos.find((p) => p.id === openId) : null
  const go = (id: string) => setOpenId(id)

  return (
    <div className="mx-auto max-w-4xl p-4">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">PoSaathi</h1>
        <nav className="flex flex-wrap gap-1">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => {
                setTab(k)
                setOpenId(null)
              }}
              className={`rounded px-3 py-1.5 text-sm ${tab === k && !open ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {open ? (
          <PoDetail po={open} now={now} onBack={() => setOpenId(null)} />
        ) : tab === 'dashboard' ? (
          <Dashboard pos={pos} now={now} onOpen={go} />
        ) : tab === 'pos' ? (
          <PoTable pos={pos} now={now} onOpen={go} />
        ) : tab === 'paste' ? (
          <PasteImport onSaved={go} />
        ) : tab === 'add' ? (
          <QuickAddForm onSaved={go} />
        ) : (
          <DataPanel count={pos.length} />
        )}
      </main>
      <footer className="mt-8 text-center text-xs text-slate-400">
        Times shown in IST. Data is stored only in this browser.
      </footer>
    </div>
  )
}
