# PoSaathi - Technical Spec (MVP)

## Constraints

- Solo-maintainable by one developer, evenings-and-weekends pace.
- Fully local: no backend, no database server, no auth, no hosting cost. A seller opens a URL (or a local dev server) and their data stays on their device.
- Buildable in days.

## Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Vite + React + TypeScript** | Largest contributor pool for an open-source project; TypeScript catches data-shape bugs in a deadline tool where a wrong date is costly |
| Storage | **Dexie.js** (IndexedDB wrapper) | Mature, tiny, promise-based; handles schema migrations cleanly as the PO model evolves |
| Styling | **Tailwind CSS** | Fast to build a clean dashboard without a design system |
| Dates | **date-fns** | Tree-shakeable; deadline countdowns and IST-aware formatting (no moment.js) |
| Tests | **Vitest** | Same toolchain as Vite; focus tests on the email parser and date/deadline logic - the two places bugs hurt |
| Lint/format | ESLint + Prettier | Defaults, one config file each |
| CI | GitHub Actions | `npm run lint && npm run test && npm run build` on PR |

No router needed at v1 scale - two views (dashboard, PO detail) with simple state, or `react-router` if a third view appears. No state library: Dexie live queries (`useLiveQuery` from `dexie-react-hooks`) cover it.

## Data model (v1)

```
PO {
  id: string            // uuid
  poNumber: string      // e.g. P5620587, MBIPO435337
  platform: 'zepto' | 'instamart' | 'blinkit' | 'other'
  city: string
  warehouse: string     // free text, e.g. "Farukhnagar GUR044M"
  poDate: ISODate
  deliveryDate: ISODate
  asnDeadline: ISODateTime | null
  expiryDate: ISODate | null
  lines: { sku: string; qty: number; rate: number }[]
  totalValue: number
  status: 'new' | 'asn_filed' | 'appointment_scheduled' | 'dispatched'
        | 'delivered' | 'grn_received' | 'closed' | 'cancelled' | 'expired'
  statusHistory: { status: string; at: ISODateTime }[]
  grn?: { receivedQty: number; receivedAt: ISODateTime; notes: string }
  notes: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

Derived at render time, never stored: urgency bucket (due tonight / overdue / expiring soon / ok), days-to-expiry, GRN discrepancy flag.

## Repo structure

```
posaathi/
  README.md
  LICENSE                 # MIT
  PRODUCT.md
  TECH.md
  package.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    db/
      db.ts               # Dexie schema + migrations
      seed.ts             # optional demo data toggle
    domain/
      types.ts            # PO model
      urgency.ts          # deadline bucketing (pure, tested)
      parseEmail.ts       # Zepto/Instamart PO text parser (pure, tested)
    components/
      Dashboard.tsx
      DeadlineList.tsx
      PoTable.tsx
      PoDetail.tsx
      QuickAddForm.tsx
      PasteImport.tsx
      GrnPanel.tsx
    lib/
      csv.ts              # import/export
      backup.ts           # JSON export/import
  tests/
    urgency.test.ts
    parseEmail.test.ts
    fixtures/
      zepto-po-email.txt
      instamart-po-email.txt
```

## License

**MIT.** Maximises adoption and contribution for a small utility, no patent or copyleft concerns, and it's what the Vite/React ecosystem expects. Add the `LICENSE` file at repo creation so GitHub detects it.

## Hosting / distribution

- v1: users run `npm run dev`, or maintainer deploys a static build to **GitHub Pages** (`npm run build` produces a static bundle - no server needed).
- Optional later: wrap as a PWA so it installs to the home screen and works offline. Do not make this a v1 requirement.

## Deliberate non-goals

- No backend-as-a-service (Firebase/Supabase): it adds auth, cost and a privacy story the product doesn't need.
- No Electron/Tauri desktop build in v1.
- No monorepo, no design-system package, no storybook. Keep the repo boring.
