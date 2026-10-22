import { useState } from 'react'
import { parsePOEmail, type ParsedPO } from '../domain/parseEmail'
import QuickAddForm from './QuickAddForm'
import { btnCls, inputCls } from './ui'

export default function PasteImport({ onSaved }: { onSaved: (id: string) => void }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedPO | null>(null)
  const [key, setKey] = useState(0)

  if (parsed) {
    return (
      <div className="space-y-3">
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Parsed {parsed.platform ?? 'unknown platform'} PO. Parsing is best-effort - check every
          field before saving.
          {parsed.missing.length > 0 && ` Not found: ${parsed.missing.join(', ')}.`}
        </p>
        <QuickAddForm
          key={key}
          initial={parsed}
          onSaved={onSaved}
          onCancel={() => setParsed(null)}
        />
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Paste a Zepto or Instamart PO email (subject and body). Nothing leaves your browser.
      </p>
      <textarea
        className={inputCls + ' h-64 font-mono'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the PO email here"
      />
      <button
        className={btnCls}
        disabled={!text.trim()}
        onClick={() => {
          setParsed(parsePOEmail(text))
          setKey((k) => k + 1)
        }}
      >
        Parse
      </button>
    </div>
  )
}
