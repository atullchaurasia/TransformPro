# TransformPro Spec — Backup, Restore & Export (spec §10.15–10.16)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.15 Backup & Restore (MOST IMPORTANT — build carefully and test)

**Backup file format:** `TransformPro-Backup-<gymname>-YYYY-MM-DD-HHmm.transformpro` (a ZIP via jszip):
- `manifest.json` — app version, schema `user_version`, created_at, gym name, counts per
  table, SHA-256 checksum of `db.sqlite`.
- `db.sqlite` — a consistent copy of the database. Before copying run
  `PRAGMA wal_checkpoint(TRUNCATE)` (or use `VACUUM INTO` a temp file) so the copy is complete.
- `photos/…` — all member photos, progress photos, receipt photos, gym logo.

**Backup now** flow:
1. Create the zip in the cache dir → show size.
2. Open the **share sheet** so the owner can: save to **Files** (On My iPhone / USB
   drive / any folder), AirDrop to a Mac, send to themselves on WhatsApp/Email, or
   transfer to Windows PC (README explains: connect iPhone → iTunes/Apple Devices app →
   File Sharing → TransformPro, or via WhatsApp Web/email).
3. Also keep a copy in the app's `Documents/backups/` folder (visible in the Files app
   because of `UIFileSharingEnabled`). Keep the latest 5; delete older ones.
4. Update `last_backup_at`.

**Automatic local backups:** once per day on first app open, write a backup into
`Documents/auto-backups/` (keep last 7). Clearly explain these live on the same phone and
**do not protect against losing the phone** — the owner must still export regularly.

**Restore** flow:
1. Pick a `.transformpro` file (document picker) or choose from local backups list.
2. Validate: is a zip, has manifest, checksum matches, schema version ≤ app's version.
3. Show summary: "Backup from 12 Oct 2026, 1,240 members, 3,980 payments. Restoring will
   REPLACE all current data." Require typing `RESTORE` + owner PIN.
4. Make a safety backup of the current DB first.
5. Close DB → replace DB file and photos folder → reopen → run migrations (if older schema)
   → reload app (`expo-updates` is not used; re-mount the root provider / navigate to lock).
6. Audit log the restore.

**Backup screen also shows:** last backup date, number of members/payments, database size,
list of local backups (share / restore / delete), "How to keep your data safe" help text.

### 10.16 Export Data

- Export individual datasets (members, payments, attendance, expenses, enquiries,
  measurements) as XLSX/CSV for any date range.
- "Export everything" → one XLSX workbook with one sheet per table.

**Clarifications (M11, see CLAUDE.md Decisions Log 2026-11-01)**
- The consistent copy uses SQLite's online backup API (includes WAL pages).
- A safety copy is taken before every restore (`TransformPro-PreRestore-…`, last 3 kept in auto-backups).
- On a fresh install (no owner yet) restore asks only for RESTORE; otherwise RESTORE + owner PIN.
- CSV export holds one dataset; several datasets go in one XLSX workbook.
