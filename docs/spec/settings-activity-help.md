# TransformPro Spec — Settings, Activity Log, Help & Demo Data (spec §10.17–10.19, §14)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.17 Settings

- **Gym profile**: name, logo, address, phone, email, GSTIN, invoice terms.
- **Preferences**: currency, country code, date format, week start, language, theme.
- **Membership rules**: expiring-soon days, grace days, block expired check-in, block dues
  check-in, multiple check-ins per day, auto check-out hours, freeze defaults,
  auto-purge trash.
- **Numbering**: member code prefix & next number, receipt prefix & next number.
- **Tax**: enable GST, %, inclusive/exclusive.
- **Security**: change PIN, Face ID toggle, auto-lock minutes, staff management link.
- **Notifications**: toggles and times (§10.8).
- **Card design** picker with live preview.
- **Message templates** (link).
- **Data**: backup & restore, import, export, trash, activity log.
- **Danger zone** (owner only): "Erase all data" — requires backup first prompt,
  typing `ERASE`, and PIN.
- **About**: app version, schema version, database size, "Your data is stored only on
  this device", open-source licenses.

### 10.18 Activity Log

- Chronological list from `audit_log` with filters (staff, action type, date).
- Owner/manager only.

### 10.19 Help

- In-app help screens (simple markdown-like text) covering: adding members, renewals,
  QR check-in, sending reminders, **backups (very prominent)**, **re-signing every 7 days
  with Sideloadly (never delete the app!)**, and what happens if the phone is lost.

## 14. Seed / Demo Data

- Provide a **"Load demo data"** button in Settings → About (developer section), only
  visible when `__DEV__` is true: creates 150 members with realistic Indian names,
  plans, payments, attendance over 90 days, enquiries, expenses — for testing UI &
  performance. And "Clear demo data".
