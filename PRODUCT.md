# PoSaathi - Product Spec (MVP)

## Problem

Indian D2C brands selling on quick-commerce platforms (Zepto, Swiggy Instamart, Blinkit) live and die by purchase-order deadlines, and the tooling is email plus memory.

A typical week for one brand:

- Zepto raises per-city POs (Mumbai, Gurugram, Bengaluru, Chennai) that need **next-day delivery** with an **Invoice/ASN filed the same day the PO arrives** - often due that night.
- POs get **cancelled without reason** hours before dispatch, so stock picked against them has to be caught in time.
- POs **expire unbooked** if the first appointment request isn't raised in the vendor portal in time; a brand can wake up to 9 POs "NOT SCHEDULED" worth lakhs.
- After delivery, the **GRN** (goods received note) confirms quantities, with a 24-hour discrepancy window that's easy to miss.
- Swiggy Instamart runs on longer windows and different PO formats, and the invoicing entity can change (e.g. the 2026 switch to Swiggy Retail Limited needing a new customer master).

Today all of this is tracked in WhatsApp messages, inbox searches and spreadsheets that nobody updates. Missed ASN deadlines, expired POs and unreconciled GRNs are direct revenue loss.

## Target users

- **Primary:** founders and ops people at small Indian D2C brands (1-20 people) selling on 1-3 quick-commerce platforms. They manage POs themselves, on a laptop, between everything else.
- **Secondary:** ops executives at slightly larger brands who want a single pane before a daily stand-up.

Not for: enterprises with ERPs, or sellers on only one marketplace with a handful of POs a month.

## MVP feature set

Keep v1 small enough to build in days. Everything runs locally in the browser; data never leaves the device.

### 1. PO entry and import
- **Quick-add form**: PO number, platform (Zepto / Instamart / Blinkit / other), city + warehouse, PO date, delivery date, Invoice/ASN deadline, PO expiry date, SKU lines (name, qty, rate), total value.
- **Paste-to-parse**: paste a Zepto or Instamart PO email, the app extracts PO number, city, SKUs, quantities, value and dates into a prefilled form for review. Parsing is best-effort; the user always confirms.
- **CSV import/export** for bulk entry and backup.

### 2. Status lifecycle
Each PO moves through a simple pipeline:

`New -> ASN filed -> Appointment scheduled -> Dispatched -> Delivered -> GRN received -> Closed`

Plus two terminal states: `Cancelled` and `Expired`. One click advances status; every transition is timestamped so the history is auditable.

### 3. Deadline dashboard (the core screen)
- **Due now / due tonight**: Invoice/ASN deadlines within 24h, appointment deadlines, and delivery dates today - sorted by urgency, color-coded red/amber/green.
- **Overdue**: missed ASN or delivery dates, unbooked POs approaching expiry (countdown per PO).
- Quiet when nothing is due. No notification infra in v1 - the dashboard *is* the alert.

### 4. GRN reconciliation
- Record GRN received qty vs dispatched qty per PO.
- Flag the 24-hour discrepancy window after a GRN lands, with a notes field (short-shipped, damaged, rejected units, debit note expected).
- "Unreconciled GRNs" filter so nothing closes silently.

### 5. Local-first data
- All data in the browser (IndexedDB). No account, no server.
- One-click JSON export/import for backup and moving machines.

## Explicitly out of scope for v1

- Accounts, login, multi-user, sync across devices
- Email integration / auto-fetching POs from Gmail
- Push, WhatsApp or email notifications
- Vendor-portal automation (filing the ASN, booking appointments)
- Payments, debit-note accounting, margin analytics
- Inventory/stock management
- Mobile-native app (the web app should be usable on mobile browsers, that's all)
- Anything that sends data off the device

## Success criteria for v1

A seller can enter a week's POs in under 10 minutes and, from one screen, answer: what ASN is due tonight, what delivers tomorrow, which POs are about to expire unbooked, and which GRNs still need checking.
