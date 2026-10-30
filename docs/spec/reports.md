# TransformPro Spec — Reports (spec §10.12)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.12 Reports (all with date range picker, branch filter, and Export: PDF / XLSX / CSV)

1. **Collection report** — payments in range; totals by mode, by plan category,
   by staff; daily totals table.
2. **Dues report** — members with outstanding balance, aging (0–30, 31–60, 60+ days).
3. **Sales / Subscriptions report** — new subscriptions & renewals in range by plan,
   revenue by plan, discount given total.
4. **Admission report** — new members joined in range; by source; by gender.
5. **Renewal report** — memberships expiring in range vs renewed vs not renewed;
   renewal rate %.
6. **Expiry report** — upcoming expiries list (next 7/15/30 days / custom).
7. **Attendance report** — daily counts, per member visit counts, peak hours,
   average daily attendance, most regular members, inactive members.
8. **Trend report** — month-by-month (last 12 months) collections, expenses, profit,
   active members, admissions (line/bar charts).
9. **Expense report** — by category, by month.
10. **Profit & Loss** — collections − refunds − expenses per month.
11. **PT report** — PT clients per trainer, PT revenue per trainer, sessions used.
12. **Enquiry report** — enquiries by status/source, conversion rate.
13. **Staff report** — payments collected per staff, members added per staff,
    staff attendance.
14. **Birthday list** — by month.
15. **Member master list** — all members with all fields (export).

Reports render as on-screen tables + charts. PDF export uses a clean printable HTML
template with gym header. XLSX uses SheetJS with one sheet per section and proper
column widths; CSV as fallback. Exports are shared via the share sheet.
