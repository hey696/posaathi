# PoSaathi

**Your purchase-order companion for Indian quick commerce.**

Selling on Zepto, Swiggy Instamart or Blinkit? PoSaathi tracks every PO's Invoice/ASN deadline, delivery date, appointment status and GRN in one screen - so a missed deadline or an expired PO never costs you a lakh again.

Saathi = companion. It sits next to you and watches the deadlines so you don't have to.

## Why

Quick-commerce POs are brutal: Zepto POs need next-day delivery with an Invoice/ASN filed the same day, POs get cancelled hours before dispatch, appointment windows expire unbooked, and GRNs come with a 24-hour discrepancy window. Brands track this in WhatsApp and spreadsheets. PoSaathi replaces that with one deadline dashboard that runs entirely in your browser.

## Features

- **Quick PO entry** - add a PO in seconds, or paste a Zepto/Instamart PO email and let the parser prefill it
- **Deadline dashboard** - ASN due tonight, deliveries tomorrow, POs about to expire unbooked, color-coded by urgency
- **Status pipeline** - New -> ASN filed -> Appointment scheduled -> Dispatched -> Delivered -> GRN received -> Closed, with a timestamped history
- **GRN reconciliation** - received vs dispatched quantities, discrepancy-window flags, notes
- **CSV import/export + JSON backup**
- **100% local** - no account, no server, your data never leaves your device

## Quickstart

```bash
git clone https://github.com/hey696/posaathi.git
cd posaathi
npm install
npm run dev
```

Open http://localhost:5173 and add your first PO.

## Scripts

```bash
npm run dev      # dev server
npm run test     # Vitest (parser, deadline logic, CSV/backup)
npm run lint     # ESLint
npm run build    # type-check + production bundle in dist/
```

## How deadlines work

All dates are IST. Red = overdue or due within 6h, amber = within 24h, green = within 72h (the dashboard hides anything further out). The default Invoice/ASN deadline is 23:59 IST the day before delivery; edit it per PO. Appointment-to-book is tracked against the start of delivery day, and an unbooked PO (New / ASN filed) shows an expiry countdown. A GRN opens a 24h discrepancy window, and a PO cannot be closed until its GRN is marked reconciled.

## Paste-to-parse

Parsing is best-effort and always lands in a review form. Zepto emails carry header fields only (PO number, dates, shipping address) with SKUs in an attachment, so paste the SKU table text too or add lines by hand. Fixtures in `tests/fixtures` are sanitised/synthetic; real samples welcome.

## Tech

Vite + React + TypeScript, Dexie (IndexedDB), Tailwind, Vitest. See [TECH.md](TECH.md) for the architecture and [PRODUCT.md](PRODUCT.md) for the MVP scope.

## Contributing

Issues and PRs welcome - especially parsers for more platforms and PO email formats. This project is built by and for Indian D2C sellers; real PO examples (sanitised) are the most valuable contribution.

## License

MIT - see [LICENSE](LICENSE).
