# TransformPro Spec — Payments (spec §10.5)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.5 Payments tab

- Segments: **Collections**, **Dues**, **Refunds**.
- **Collections**: date filter (Today, Yesterday, This week, This month, Last month,
  Custom), totals by mode, list of payments (member, amount, mode, receipt no, staff).
- **Dues**: all members with balance due, sorted by amount/oldest; total due at top;
  per row: Collect, WhatsApp reminder, Call.
- **Record payment** flow: pick member → shows open subscriptions with dues → amount →
  mode → reference → date (default today) → note → save → receipt.
- **Receipt / Invoice PDF** (`expo-print` from HTML):
  - Gym logo, name, address, phone, GSTIN
  - Receipt number, date, staff name
  - Member name, code, phone
  - Plan, period (start–end), base price, admission fee, discount, tax (CGST/SGST), total
  - Amount paid now, mode, reference, **balance due**
  - Terms text from settings, "Thank you" footer
  - A5 and A4 sizes; share via share sheet (WhatsApp, Mail, Files, Print via AirPrint).
