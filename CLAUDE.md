# CLAUDE.md — TransformPro: Offline Gym Management App for iOS

> Core rules for every session. Follow them exactly. When something is not specified,
> choose the simplest solution that keeps the app 100% offline.
>
> **Before working on a milestone:** read `docs/ROADMAP.md` (what to build next and its
> status) and the `docs/spec/*.md` files that milestone lists. Feature details live there,
> not here.

---

## 0. Project Summary

**TransformPro** is an
**iOS-only, fully offline gym management app** for a single gym owner and their staff.
It replaces paper registers and cloud apps like "GymBook: Gym Management App".

**The non-negotiable rules:**

1. **No cloud. No backend. No server. No login to any online service.**
   All data lives in a SQLite database **on the iPhone itself**.
2. **No paid services.** Everything must be buildable and installable for ₹0:
   - Developed on **Windows** (the developer has no Mac).
   - Tested on a real iPhone using **Expo Go**.
   - The `.ipa` is built **unsigned** on **GitHub Actions' free macOS runner**.
   - Installed on the iPhone with **Sideloadly** using a **free Apple ID**
     (re-signed every 7 days).
3. **No internet required** for any feature. The only "online" things are
   *opening* WhatsApp / SMS / Phone apps via URL links — the user taps send themselves.
4. **Data safety is critical.** Because there is no cloud, the app must have
   excellent local **backup & restore** (export a file the owner saves on their PC).
5. **iOS only.** Do not spend effort on Android or web. (Expo will still compile
   them, but we don't test or design for them.)

**Primary user:** an Indian gym owner (default currency ₹ INR, default phone code +91,
date format DD/MM/YYYY), plus front-desk staff and trainers using the same iPhone/iPad.

---

## 1. Tech Stack (use exactly this)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **React Native + Expo SDK 58** (RN 0.88, React 19.3, TS 6) | Created with `npx create-expo-app@latest`. **Expo APIs change every SDK — before using any Expo/RN API, check the versioned docs at `https://docs.expo.dev/versions/v58.0.0/` (index: `https://docs.expo.dev/llms.txt`); don't rely on memory.** |
| Language | **TypeScript, `strict: true`** | No `any` unless unavoidable and commented. |
| Navigation | **expo-router** (file-based) | Tabs + stacks + modals. |
| Database | **expo-sqlite** (async API, `SQLiteProvider`) | Single DB file `transformpro.db`. WAL mode. Foreign keys ON. |
| Migrations | Hand-written, versioned via `PRAGMA user_version` | See §5.3. |
| Forms | **react-hook-form** + **zod** | All forms validated. |
| Dates | **date-fns** | Never do manual date math with milliseconds for day counts. |
| Global state | **zustand** | Only for session (logged-in staff, lock state, settings cache). DB is the source of truth. |
| Lists | **@shopify/flash-list** (or FlatList if FlashList causes issues in Expo Go) | Members list can be 2,000+ rows. |
| Charts | **react-native-gifted-charts** (+ react-native-svg, expo-linear-gradient) | Dashboard + reports + measurement progress. |
| QR generate | **react-native-qrcode-svg** | Member QR codes. |
| QR scan | **expo-camera** (`CameraView` with `barcodeScannerSettings`) | Check-in scanner. |
| Photos | **expo-image-picker** + **expo-image-manipulator** | Member photo, expense receipt photo. Resize to max 800px, JPEG 0.7. |
| Images | **expo-image** | Fast cached display. |
| Files | **expo-file-system** | Use the API style that matches the installed SDK (new `File`/`Directory` API, or `expo-file-system/legacy` if needed). Check the installed version's docs. |
| Share | **expo-sharing** | Share PDFs, images, CSV/XLSX, backup files. |
| Pick files | **expo-document-picker** | Restore backup, import members CSV. |
| PDF | **expo-print** (`printToFileAsync` from HTML) | Receipts/invoices, reports. |
| Screenshot to image | **react-native-view-shot** | Digital membership card as PNG. |
| Zip | **jszip** | Backup file packaging. |
| Excel | **SheetJS `xlsx`** installed from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | XLSX export. Also offer CSV. |
| Biometrics | **expo-local-authentication** | Face ID / Touch ID app lock. |
| Secure values | **expo-secure-store** | Owner PIN hash salt, lock settings. |
| Hashing | **expo-crypto** | SHA-256 PIN hashing with salt. |
| Local notifications | **expo-notifications** (LOCAL ONLY, no push) | Daily summary, follow-ups, backup reminder. |
| Links | **expo-linking** | WhatsApp, SMS, phone, email. |
| Haptics | **expo-haptics** | Feedback on check-in success/failure. |
| i18n | **i18next** + **react-i18next** + **expo-localization** | English + Hindi at launch; structure for more. |
| Icons | **@expo/vector-icons** (Ionicons / MaterialCommunityIcons) | |
| Testing | **jest** + **jest-expo** | Unit tests for business logic. |

**Rules for dependencies**

- Install Expo packages with `npx expo install <pkg>` so versions match the SDK.
- **Every dependency must work inside Expo Go** (the developer tests with Expo Go on Windows).
  Do NOT add libraries that need custom native code outside the Expo Go set
  (e.g. no `react-native-mmkv`, no `op-sqlite`, no `realm`, no WatermelonDB).
- **Never add**: Firebase, Supabase, Sentry, analytics, crash reporting, ads, any SDK
  that phones home, any push-notification service, EAS Update.
- Run `npx expo-doctor` after adding dependencies and fix any issues.

---

## 2. Developer Environment & Workflow (Windows, no Mac)

The developer uses **Windows + VS Code + Claude Code**. Assume:

- Node.js LTS (24.x on the dev PC) and Git installed.
- iPhone has **Expo Go** installed from the App Store.
- Dev loop: `npx expo start` → scan QR with iPhone camera → app opens in Expo Go.
  If the phone and PC are on different networks use `npx expo start --tunnel`.

**Expo Go limitations to handle gracefully:**

- Face ID inside Expo Go may fall back to device passcode — that's fine. Code must
  still work in the real build.
- The app must not crash if a capability is unavailable — wrap native calls in try/catch
  and show a friendly message.

**Commands Claude Code should keep working at all times:**

```bash
npx tsc --noEmit        # must pass with 0 errors
npx expo-doctor         # must pass
npm test                # all unit tests pass
npx expo start          # app boots in Expo Go with no red screens
```

---

## 3. App Identity & Config (`app.json` / `app.config.ts`)

- `name`: `"TransformPro"` — **one word, no spaces** (the Xcode scheme name is derived from it and
  the GitHub workflow depends on it).
- `slug`: `"transformpro"`
- `scheme`: `"transformpro"`
- `ios.bundleIdentifier`: `"com.transformpro.app"` — add a comment in the README that the
  developer should change `transformpro` to something unique like `com.<theirname>.transformpro`
  **before the first install** and **never change it afterwards** (changing it = new app =
  data appears lost).
- `ios.supportsTablet`: `true` (front desk may use an iPad).
- `orientation`: `"portrait"` on iPhone (iPad may rotate).
- `userInterfaceStyle`: `"automatic"` (light + dark mode).
- `newArchEnabled`: follow the SDK default.
- `ios.infoPlist`:
  - `NSCameraUsageDescription`: "Camera is used to scan member QR codes for check-in and take member photos."
  - `NSPhotoLibraryUsageDescription`: "Photo library is used to choose member photos and expense receipts."
  - `NSFaceIDUsageDescription`: "Face ID is used to lock the app and protect your gym's data."
  - `LSApplicationQueriesSchemes`: `["whatsapp", "whatsapp-business", "sms", "tel", "mailto"]`
  - `ITSAppUsesNonExemptEncryption`: `false`
  - `UIFileSharingEnabled`: `true` and `LSSupportsOpeningDocumentsInPlace`: `true`
    (so backups placed in the app's Documents folder are visible in the iOS **Files** app
    under "On My iPhone → TransformPro" — an extra backup safety net).
- App icon + splash: generate a simple placeholder (dumbbell glyph on brand color)
  in `assets/`. The owner can replace later.

---

## 4. Project Structure

```
transformpro/
├─ app/                          # expo-router routes
│  ├─ _layout.tsx                # Providers: SQLite, i18n, theme, lock gate
│  ├─ lock.tsx                   # App lock screen (PIN / Face ID)
│  ├─ onboarding/                # First-run setup wizard
│  ├─ (tabs)/
│  │  ├─ _layout.tsx             # Bottom tabs
│  │  ├─ index.tsx               # Dashboard
│  │  ├─ members/                # Members list
│  │  ├─ checkin.tsx             # Attendance / QR scanner
│  │  ├─ payments.tsx            # Collections & dues
│  │  └─ more.tsx                # Menu to everything else
│  ├─ member/[id]/...            # Member profile & sub-screens
│  ├─ plans/...                  # Plans CRUD
│  ├─ enquiries/...
│  ├─ expenses/...
│  ├─ reports/...
│  ├─ messages/...
│  ├─ staff/...
│  ├─ settings/...
│  └─ backup/...
├─ src/
│  ├─ db/
│  │  ├─ client.ts               # open DB, pragmas
│  │  ├─ migrations/             # 001_init.ts, 002_xxx.ts ...
│  │  ├─ migrate.ts              # runs pending migrations
│  │  └─ repositories/           # members.ts, plans.ts, payments.ts ... (ALL SQL lives here)
│  ├─ domain/                    # PURE business logic (no React, no SQL) — unit tested
│  │  ├─ membershipStatus.ts
│  │  ├─ dues.ts
│  │  ├─ dates.ts
│  │  ├─ money.ts
│  │  ├─ templates.ts            # message placeholder rendering
│  │  ├─ permissions.ts
│  │  └─ codes.ts                # member code / receipt number generation
│  ├─ features/                  # feature-specific components & hooks
│  ├─ components/                # shared UI kit (Button, Input, Card, Badge, EmptyState...)
│  ├─ services/
│  │  ├─ backup.ts
│  │  ├─ export.ts               # CSV / XLSX
│  │  ├─ pdf.ts                  # receipt / report HTML templates
│  │  ├─ messaging.ts            # WhatsApp / SMS / call links
│  │  ├─ notifications.ts        # local notifications scheduling
│  │  └─ photos.ts
│  ├─ store/                     # zustand stores
│  ├─ i18n/
│  │  ├─ index.ts
│  │  ├─ en.json
│  │  └─ hi.json
│  ├─ theme/                     # colors, spacing, typography, dark mode
│  └─ utils/
├─ __tests__/                    # jest tests for src/domain
├─ .github/workflows/build-ios.yml
├─ docs/
│  ├─ ROADMAP.md                 # milestones, tasks, status
│  └─ spec/                      # feature specifications (see Spec Index)
├─ README.md                     # Non-technical guide for the owner (see §20)
└─ CLAUDE.md                     # this file
```

**Architecture rules**

- **UI never writes SQL.** Screens call hooks → hooks call repositories → repositories run SQL.
- **Business rules live in `src/domain/`** as pure functions and are unit-tested.
- Every multi-step write (e.g. "create member + subscription + payment") runs inside
  **one SQLite transaction** via `writeTransaction(async (tx) => …)` from `@/db/client`
  (do every statement on `tx`; never nest `writeTransaction`; do NOT use expo-sqlite's
  `withExclusiveTransactionAsync` — its separate connection has foreign keys OFF).
- All money stored as **integer paise** (₹1 = 100). Never store floats for money.
- All dates stored as **ISO strings**: dates as `YYYY-MM-DD`, timestamps as full ISO
  (`2026-10-29T18:30:00.000Z`). Display in local time, formatted per settings.
- IDs: `TEXT` UUIDs generated with `expo-crypto.randomUUID()`.
- Every table has `created_at`, `updated_at`. Soft-delete with `deleted_at` where noted.
- After any write, invalidate/refresh affected screens (simple event emitter or
  a `dataVersion` counter in zustand that list hooks subscribe to).

---

## 13. Data Integrity & Safety Checklist

- Foreign keys ON; use transactions for multi-table writes.
- Never hard-delete members/payments/expenses/enquiries from normal UI — soft delete.
- Payments deletion requires owner permission and is audit logged.
- Validate all inputs with zod (amount > 0, end ≥ start, phone format, etc.).
- Handle storage-full errors gracefully when writing photos/backups.
- On app start: run migrations → auto check-out → auto-purge trash → daily auto-backup →
  reschedule notifications — all wrapped so one failure never blocks app launch.

---

## 16. Explicitly OUT of Scope (do NOT build)

- Any cloud sync, online account, server, API, or web dashboard.
- Member-facing app (members don't get their own app).
- Automatic background WhatsApp/SMS sending (requires paid APIs + server).
- Fingerprint/biometric attendance **hardware** integration (keep `biometric_id` field only).
- Online payments / payment gateway.
- Push notifications (remote).
- Android/web-specific work.

---

## Spec Index (feature details — read only what the current milestone needs)

Section numbers (§) used across the docs map to these files:

| § | Topic | File |
|---|---|---|
| 5 | Database schema, migrations | `docs/spec/database.md` |
| 6 | Business rules (status, dates, renewal, freeze, dues, money, codes, check-in, phones) | `docs/spec/business-rules.md` |
| 7–8 | Onboarding wizard, security, app lock, staff login | `docs/spec/onboarding-security.md` |
| 9 | Navigation (tabs, More menu, search, quick actions) | `docs/spec/navigation.md` |
| 10.1 | Dashboard | `docs/spec/dashboard.md` |
| 10.2 | Members (list, form, profile, trash, CSV import) | `docs/spec/members.md` |
| 10.3 | Plans, PT, services | `docs/spec/plans.md` |
| 10.4 | Check-in / attendance | `docs/spec/checkin.md` |
| 10.5 | Payments, receipts | `docs/spec/payments.md` |
| 10.6 | Membership card | `docs/spec/membership-card.md` |
| 10.7–10.8 | Messages, reminders, local notifications | `docs/spec/messages-notifications.md` |
| 10.9–10.10 | Enquiries, referrals | `docs/spec/enquiries-referrals.md` |
| 10.11 | Expenses | `docs/spec/expenses.md` |
| 10.12 | Reports | `docs/spec/reports.md` |
| 10.13–10.14, 15 | Staff, roles, permission keys, branches | `docs/spec/staff-permissions-branches.md` |
| 10.15–10.16 | Backup, restore, export | `docs/spec/backup-export.md` |
| 10.17–10.19, 14 | Settings, activity log, help, demo data | `docs/spec/settings-activity-help.md` |
| 11–12 | i18n, UI/UX guidelines | `docs/spec/i18n-ui.md` |
| 18 | GitHub Actions unsigned `.ipa` build | `docs/spec/build-ipa.md` |
| 19 | Final acceptance checklist | `docs/spec/acceptance.md` |
| 20 | Owner README contents | `docs/spec/readme-guide.md` |

All features in the spec are in scope (build ALL of them) except §16 below.

---

## 17. Roadmap & Milestone Workflow

The build is split into milestones in **`docs/ROADMAP.md`**. For each milestone:

1. Read its section in the roadmap and the spec files it lists.
2. Build only that milestone's scope. Don't pull in later features (leave a `TODO(Mxx)` if needed).
3. Verify: `npx tsc --noEmit`, `npm test`, `npx expo-doctor`, and the milestone's
   "Done when" checks (manual checks in Expo Go are done by the developer).
4. **Spec walk-through:** re-read every bullet of the milestone's spec sections and confirm
   each is built, or is a stub listed in the roadmap's **Wire-up register** with its owning
   milestone. Never drop a requirement silently. Also tick any register rows this
   milestone owns and apply the roadmap's **cross-cutting checklist**.
5. Tick the tasks in the roadmap, set the milestone status, and commit
   (`Mxx: <summary>`).
6. If a decision changes the spec, update the spec file and add a Decisions Log entry.

---

## 21. Coding Conventions

- Functional components + hooks only. Small components (< 250 lines); split otherwise.
- Named exports. Absolute imports via `@/` alias (`tsconfig` paths).
- No business logic inside components — call domain functions / hooks.
- No `console.log` left in committed code (use a tiny `logger` that no-ops in production).
- Handle every promise (try/catch + user-friendly error toast).
- Accessibility labels on icon-only buttons.
- Comments explaining *why* for non-obvious business rules.
- Keep this CLAUDE.md updated if a decision changes (add a "Decisions log" section at the bottom).

---

## 22. Decisions Log

- 2026-10-29 — Initial spec. iOS-only, offline-only, Expo + expo-sqlite, free sideload
  distribution via GitHub Actions unsigned build + Sideloadly.
- 2026-10-29 — App renamed from the working name GymDesk to **TransformPro**. All identifiers
  follow it: slug/scheme `transformpro`, bundle ID `com.transformpro.app`, DB `transformpro.db`,
  QR payload `TRANSFORMPRO:<member_code>`, backup extension `.transformpro`, Xcode scheme `TransformPro`.
- 2026-10-29 — Spec split: CLAUDE.md keeps only always-on rules; feature specs moved verbatim
  to `docs/spec/`; the original §17 build order is replaced by milestones in `docs/ROADMAP.md`.
  The GitHub Actions `.ipa` build moves earlier (M12, right after backup) so a real
  sideloaded build is proven before the growth features, instead of only at the end.
- 2026-10-30 — M00 setup decisions:
  - Expo **SDK 58** (RN 0.88.1, React 19.3.0, TypeScript 6). Node 24 LTS locally; CI should
    use the same major (update `node-version` in the §18 workflow to 24 in M12).
  - Routes live in root `app/` (per §4), **not** `src/app/` like the Expo template; `@/` → `src/`.
  - `react-dom@19.3.0` is pinned in dependencies only to satisfy expo-router's web peer deps
    (without it npm pulls a newer react-dom that conflicts with React 19.3.0). Not used on iOS.
  - TypeScript 6 defaults `types` to empty, so `tsconfig.json` lists `"types": ["jest"]`.
  - Orientation: `"orientation": "portrait"` locks iPhone; `ios.infoPlist`
    `UISupportedInterfaceOrientations~ipad` allows all four on iPad (§3). Verify in the M12 build.
  - Extra packages beyond §1, required by feature specs: expo-clipboard, expo-keep-awake,
    @react-native-community/datetimepicker.
  - Git: the repo pushes to Atul's GitHub (`atullchaurasia/TransformPro`, branch `main`) and commits
    use Atul's identity (atullchaurasia). Never commit or push under any other account.
- 2026-10-30 — M01 UI foundation decisions:
  - Each tab is a folder with its own native Stack (`app/(tabs)/home|members|checkin|payments|more/`)
    so iOS large titles work (`headerLargeTitleEnabled` — `headerLargeTitle` is deprecated in
    SDK 58). Tab-internal screens (e.g. member profile) go inside the tab folder; full-screen
    flows go on the root Stack. `app/index.tsx` redirects to `/home` (M04 adds the lock gate).
  - UI kit lives in `src/components` (import from `@/components`). Feedback is imperative:
    `toast.success(msg)` and `await confirm({ title, destructive, typedConfirmation: 'DELETE' })`
    from `@/store/feedbackStore`; `<FeedbackHost/>` is mounted once in the root layout.
  - `t()` keys are type-checked against `en.json`; `__tests__/i18n.test.ts` fails if `hi.json`
    is missing a key or a `{{placeholder}}`. Every new string must be added to both files.
  - Stubs for later milestones use `openComingSoon('Mxx', title)` plus a `TODO(Mxx)` comment.
  - Text-input refs are typed `Ref<TextInputInstance>` (RN 0.88); `Tabs` has no `initialRouteName` prop.
- 2026-10-30 — M02 database decisions:
  - **Writes:** `writeTransaction` (src/db/writer.ts) queues write units and runs each as
    `BEGIN…COMMIT` on the main connection, then bumps `dataVersion`. Reason: expo-sqlite's
    `withExclusiveTransactionAsync` opens a second connection where `PRAGMA foreign_keys` is
    OFF (it's per-connection and a no-op inside a transaction) — verified in expo-sqlite source.
  - **Repositories** take a `Db` argument (`src/db/types.ts`) instead of importing expo-sqlite,
    and are tested in jest against real SQLite (`node:sqlite`, `__tests__/helpers/nodeDb.ts`).
    `createRepository` validates keys against `PRAGMA table_info`, so unknown keys throw.
  - **Safety backup before migrating** an existing DB uses SQLite's online backup
    (`backupDatabaseAsync`) into `Documents/auto-backups/pre-migration-vX-to-vY-<ts>.db`.
    If the backup fails, migrations do not run and the user sees an error with Retry.
  - Schema additions beyond §5.2, all needed by the spec elsewhere:
    `message_templates.language` + unique (key, language) (§11 per-language templates);
    `enquiries.next_follow_up_time` 'HH:mm' (§10.9 "date+time"); `updated_at` on every table
    (§4 rule) incl. freezes/audit_log; unique index enforcing a single owner (§5.2);
    extra indexes for trainer, referrals, open check-ins, audit lookups.
  - Member-owned rows CASCADE on permanent member delete; a subscription with payments can't
    be deleted on its own (FK), matching §10.2 "Delete (only if no payments)".
- 2026-10-30 — M03 domain decisions (pure functions in `src/domain/`, all unit-tested):
  - **Month/year end dates:** `addMonths − 1 day`, except when date-fns clamps a short month
    (31 Jan + 1 month) — then the clamped day is the end (28/29 Feb), matching the §6.2 example.
  - **Expiring soon** is measured to the end of back-to-back renewals (`coveredUntil`), so a
    member who renewed early isn't flagged or reminded.
  - **Upcoming / No plan** follow `checkin_block_expired` like Expired; **Frozen** always blocks;
    used-up session plans always block (even with an override).
  - **Freeze limits:** `max_freeze_days` / `max_freeze_times` = **0 means no limit** (all seeded
    plans are 0). Open-ended freezes need ≥ 1 day left; fixed freezes ended early count only days used.
  - **Inclusive GST:** total = base + admission − discount and `tax_paise` is the GST inside it
    (exclusive: + tax on top). % discounts apply to base + admission, before tax. Odd paisa of
    CGST/SGST goes to SGST.
  - **Dues:** cancelled subscriptions owe nothing; unapplied advance is netted off the member due;
    advance payments are linked whole to a new subscription while they fit (`advancesToApply`).
  - **Manager role** also lacks `payments.delete` (§13 owner-only) and `data.erase`.
  - **Auto check-out** time = check-in + `auto_checkout_hours` (not "now").
  - Code widths: member codes 4 digits (GYM0001), receipts 5 (RCPT00001).
- 2026-10-30 — M04 onboarding / lock decisions:
  - **Routing:** root `Stack.Protected` guards — onboarding while `onboarding_complete` is false,
    `lock` while locked, everything else after unlock; `app/index.tsx` is the redirect target.
    `coming-soon` stays unguarded (onboarding links to it).
  - **PIN storage:** each staff row keeps its own random salt + `SHA-256(salt + pin)` (§5.2
    columns, so PINs travel with backups). expo-secure-store (Keychain, this-device-only) holds
    the lock settings and the wrong-PIN lockout — the cooldown survives force-quit, and the
    Keychain copy of the lock settings wins over the DB on hydrate.
  - Lockout cooldown doubles from 30 s and is capped at 1 hour. Face ID unlocks as the
    **owner** (the device's biometrics belong to them); other staff use their PIN.
  - Forgot PIN is a sheet on the lock screen (Face ID → new PIN twice), not a separate route.
  - Settings: typed defaults for every §5.2 key in `src/domain/settings.ts`; invalid stored
    values fall back to defaults; writes go through `useSettingsStore.update` (validated, one
    transaction, audit-logged). `lock_enabled` defaults to true; when off, the owner is signed
    in automatically on start.
  - **Photo paths are stored relative to Documents** (`photos/<kind>/<id>.jpg`) and resolved
    with `resolvePhotoUri` — iOS changes the app container path on updates.
  - Onboarding saves nothing until the final step; the whole setup is one transaction.
    13 system templates × EN/HI are seeded now (wording refined in M14).
- 2026-10-30 — M05 plans decisions:
  - **Session plans:** `duration_unit = 'sessions'`, `session_count` = number of sessions,
    `duration_value` = validity in days (default 90). Use `planDuration(plan)` from
    `@/domain/plans` before `computeEndDate` — never read the columns directly.
  - **One-time service** = category `service` with `days` × 1 (`isOneTime`), shown as "One-time".
  - Plans list lives in the More tab (`app/(tabs)/more/plans.tsx?category=…`); add/edit is a
    root modal `app/plans/edit.tsx`. Reorder = ↑/↓ buttons that renumber the category 0…n−1.
  - "Active members" = distinct non-deleted members with a non-cancelled subscription to the
    plan covering today, or frozen. Deleting a plan is a soft delete; subscriptions keep it.
  - Pickers must use `listActivePlans` (hides inactive + deleted).
- 2026-10-30 — M06 members decisions:
  - **List pipeline:** `loadMemberListData` runs five bulk queries (members matching the
    search via SQL `LIKE`, all non-cancelled subscriptions, open freezes, net paid per
    subscription, last visit); `buildMemberSummaries` → `filterMembers` → `sortMembers` are pure
    (`@/domain/memberList`). Status-based filters therefore run in JS, not SQL.
  - Status chips: **Active includes Expiring soon; Expired includes In grace.**
  - Phone search also matches digits without the country code ("98765" finds 919876543210).
  - **Receipts per subscription:** one payment row (and receipt number) per subscription that
    receives money in a save, plus one for an advance. M08 shows all receipts of a save together.
  - Member codes come from `next_member_number` inside the save transaction and skip numbers
    already used by hand; codes stay unique including Trash. Duplicate-phone check includes Trash
    and alternate phones, and warns (doesn't block).
  - New setting **`trash_auto_purge`** (default true) — §10.2 "setting to disable" auto-purge.
    Purge runs on app open from `AppGate` and deletes photos after the rows.
  - Swipe rows use `ReanimatedSwipeable` (react-native-gesture-handler, part of Expo Go); the
    root layout is wrapped in `GestureHandlerRootView`.
  - Until the profile exists (M07), opening a member opens its edit form.
  - Bulk demo members for the 2,000-row check: More → Developer (dev builds only).
- 2026-10-30 — M07 profile & lifecycle decisions:
  - **Profile route** is `/members/[id]` (inside the Members tab, `app/(tabs)/members/[id]/`), not
    `/member/[id]`, so the tab bar and the list stay underneath (`unstable_settings.initialRouteName`).
    Forms are root modals: `member/[id]/renew` (`mode=renew|add|change`) and `member/[id]/subscription`.
  - **Renew** follows §6.3; the start date stays editable (owner override). Renewals don't charge the
    admission fee again (the toggle is still there). Advances are linked first, then "paid now" is
    split; the payment card shows "Advance already paid".
  - **Change plan:** only a running plan (started before today, not frozen). The old plan ends
    yesterday as `completed`; the new one starts today with `renewed_from_subscription_id` = old.
    Suggested credit = unused share of the old **total** (days, or sessions for session plans),
    pre-filled as a discount the user can switch off. The old plan keeps its own due, so across both
    plans the member pays for the days used plus the new plan.
  - **Freeze:** start date between the plan start and today (no future-dated freezes — the status
    logic treats any open freeze as frozen now). Fixed freezes end by themselves on profile load and
    at app start. Over-limit with `membership.freeze_override`: the first tap shows the problem, the
    second overrides (logged). Unfreezing an open-ended freeze past the limit without override adds
    only the remaining allowed days.
  - **Cancel:** reason required; refund ≤ net paid on that plan, recorded as an `is_refund` payment
    with its own receipt number; open freezes end with it. Needs `payments.refund` to refund.
    **Edit plan** can't take the total below what's paid; GST is recalculated with current settings.
  - Plan actions are hidden unless allowed: renew `membership.renew`; freeze/unfreeze
    `membership.freeze`; extend + edit `membership.edit_dates`; change plan / add plan
    `membership.create`; cancel `membership.cancel`; delete = owner only and no payment rows
    (deleted payments still count). Member swipe actions are permission-gated the same way.
  - **Sheets → dialogs:** iOS can't present a modal while another is on screen, so follow-up dialogs
    open from `BottomSheet.onDismiss` (new `ActionSheet` component). The M05 plan menu and the Trash
    menu were switched to it.
  - Member audit history = audit rows whose `entity_id` is the member, one of their subscriptions or
    payments (lifecycle audits use entity `subscription`). Automatic actions log `staff_id` NULL.
- 2026-11-01 — M08 payments decisions:
  - **Record payment** = `/payment/new?memberId=` (root modal); **refund** = `/payment/refund`. Split is
    oldest-first (`allocatePayment`) or by plan by hand (`validateManualAllocation`); with nothing due,
    the whole amount is an advance. Refunds go against a plan (≤ net paid on it) or the unused advance,
    with a required reason; each refund gets its own receipt number.
  - **Receipt model** (`@/domain/receipt`) is pure; the HTML template (`services/receiptTemplate.ts`) is
    pure and HTML-escapes every value; `services/pdf.ts` does expo-print/expo-sharing. One document can
    list several payments saved together. "Balance due" is what was due right after that payment, so a
    receipt re-shared later still reads as it did. CGST/SGST lines only with a GSTIN set. The logo is
    inlined as a data: URI (WKWebView can't load local files). PDFs are written to the cache folder as
    `<receipt numbers>-<A4|A5>.pdf`. WhatsApp can't take a file through a link, so the WhatsApp button
    sends a text summary; the PDF goes through the share sheet (which includes WhatsApp).
  - **After saving** (add member, record payment, renew, refund) the receipt buttons are shown on the
    screen, not in a sheet, so the iOS share sheet never has to open over another modal. The Add member
    success sheet became `SuccessPanel`; its Done opens the new profile.
  - **Masking:** without `reports.financial`, the Collections/Refunds totals show "••••"; individual
    rows and dues stay visible (the desk needs them to collect and check receipts).
  - **Delete payment** = soft delete (`payments.delete`, owner by default), audit-logged. Trash →
    Payments restores or deletes permanently (typed DELETE); payments in Trash > 30 days are purged on
    app open when `trash_auto_purge` is on. Receipt numbers come from the counter, so they're never reused.
  - `BottomSheet` doesn't pad its content: sheet bodies add `paddingHorizontal: spacing.lg` themselves and
    full-width rows use `marginHorizontal: -spacing.lg` inside that (fixed in several M04/M06 sheets).
    The photo picker and Home "+" menu now use `ActionSheet` (they open after the sheet closes).
