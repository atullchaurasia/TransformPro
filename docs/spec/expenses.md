# TransformPro Spec — Expenses (spec §10.11)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.11 Expenses

- List with month selector, total, category breakdown (pie), filter by category/mode.
- Add expense: category, amount, date, mode, paid to, note, receipt photo.
- Manage categories (add/rename/deactivate, pick icon).
- **Recurring expenses** (e.g. rent monthly): on app open, if a recurring expense's next
  month has no entry, show a prompt "Add this month's Rent ₹25,000?" (one tap). Never
  auto-insert silently.
- Staff salary shortcut: pick staff → amount prefilled from `salary_paise`.
