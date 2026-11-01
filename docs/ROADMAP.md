# TransformPro — Roadmap

Each milestone is sized to be built and verified in one focused session. Build them **in
order**: each one depends on the ones before it. The workflow for every milestone is in
`CLAUDE.md` §17.

**Status key:** ⬜ not started · 🟡 in progress · ✅ done

| # | Milestone | Phase | Status |
|---|---|---|---|
| M00 | Project setup & tooling | Foundation | ✅ |
| M01 | Theme, UI kit, i18n skeleton, navigation shell | Foundation | ✅ |
| M02 | Database: client, migrations, full schema, repositories | Foundation | ✅ |
| M03 | Domain logic + unit tests | Foundation | ✅ |
| M04 | Onboarding, settings, app lock, staff session | Foundation | ✅ |
| M05 | Plans, PT & services | Core ops | ✅ |
| M06 | Members: list, add/edit with plan & payment, trash | Core ops | ✅ |
| M07 | Member profile + subscription lifecycle | Core ops | ✅ |
| M08 | Payments, dues, refunds, receipt PDF | Core ops | ✅ |
| M09 | Check-in: search, today's list, QR, kiosk, history | Core ops | ✅ |
| M10 | Dashboard | Core ops | ✅ |
| M11 | Backup, restore, export, CSV import | Data safety | ⬜ |
| M12 | iOS build pipeline + first sideload + owner README | Data safety | ⬜ |
| M13 | Membership card | Growth | ⬜ |
| M14 | Messages, templates, reminder centre, send queue | Growth | ⬜ |
| M15 | Local notifications | Growth | ⬜ |
| M16 | Enquiries, follow-ups, conversion, referrals | Growth | ⬜ |
| M17 | Expenses + measurements & progress | Business | ⬜ |
| M18 | Reports with PDF / XLSX / CSV export | Business | ⬜ |
| M19 | Staff, roles & permissions, staff attendance, activity log, branches | Business | ⬜ |
| M20 | Polish: settings, Hindi, help, iPad, demo data & performance | Ship | ⬜ |
| M21 | Final QA against the acceptance checklist | Ship | ⬜ |

> **First usable version = M00 → M12.** After M12 the gym can run day-to-day on a real
> sideloaded build: plans, members, payments and receipts, check-in, the dashboard and
> backups. Everything after that adds features on top.

---

## How nothing gets skipped

1. **Spec walk-through before "done".** Before a milestone is marked ✅, re-read *every
   bullet* of the spec sections listed for it and confirm each one is either built, or
   recorded in the **Wire-up register** below with the milestone that will finish it.
   Nothing is allowed to be dropped silently.
2. **Wire-up register.** When a milestone builds UI that depends on a later feature (for
   example the "Share card" button before the card exists), it adds a visible stub plus a
   `TODO(Mxx)` in the code, and the item is listed below. The later milestone isn't done
   until its register rows are ticked.
3. **Cross-cutting checklist.** It applies to *every* screen and every write in every
   milestone (see below).
4. **Coverage map.** Every section of the spec is assigned to at least one milestone (see the end of this file).
5. **M21** walks through the full acceptance checklist, plus a final search for `TODO(` across the code that must come back empty.
6. **Pending device checks.** No iPhone is available yet. A milestone can be marked
   ✅ once the automated checks pass (tsc, jest, expo-doctor, `npx expo export --platform ios`),
   but every "Done when" item that needs a real device is added to the list below and must be
   cleared on an iPhone (Expo Go or a sideloaded build) before M21 finishes.

### Pending device checks

| From | Check | Done |
|---|---|---|
| M00 | Blank app opens in Expo Go on the iPhone with no red screen | ⬜ |
| M01 | All 5 tabs open; centre Check-in button looks raised and works; every More item opens (Coming-in screen or sheet) | ⬜ |
| M01 | Large titles collapse on scroll; grouped lists and bottom sheets look iOS-native | ⬜ |
| M01 | Dark mode follows the iPhone setting; Theme → Light/Dark overrides it | ⬜ |
| M01 | Language → हिन्दी switches every visible string instantly, no restart | ⬜ |
| M01 | UI kit: date picker sheet, select / multi-select, typed DELETE confirm, toast, PIN keypad all work; keyboard never covers inputs | ⬜ |
| M01 | Larger Dynamic Type (Settings → Accessibility → Larger Text) doesn't break layouts | ⬜ |
| M02 | App boots with no DB error; More → Developer → Database shows schema version 1 and all 18 tables | ⬜ |
| M02 | "Insert one row in every table" succeeds; counts go up by one each; counts survive an app restart | ⬜ |
| M02 | "Test foreign keys" reports **enforced** on the real device | ⬜ |
| M04 | Fresh install → onboarding (all 7 steps, logo pick, PIN twice, EN/HI switch on Welcome) → lands on Home | ⬜ |
| M04 | Kill + reopen → lock screen; PIN unlocks; Face ID unlocks (passcode fallback in Expo Go is OK) | ⬜ |
| M04 | 5 wrong PINs → 30 s cooldown (survives force-quit), next 5 → 60 s | ⬜ |
| M04 | Background > 1 min → relocks; < 1 min → doesn't; Lock now / Switch user from More and the Home lock icon | ⬜ |
| M04 | Forgot PIN: with Face ID → reset works; without → reinstall/restore instructions | ⬜ |
| M04 | Theme / language chosen in More survive an app restart | ⬜ |
| M05 | More → Plans / Personal Training / Services open the right segment; add, edit, reorder (↑↓), deactivate and delete work; counts and prices look right in light + dark | ⬜ |
| M06 | Add member with photo (camera + library), Monthly + PT + a service, partial payment → success sheet; the list shows Active and the right due in red | ⬜ |
| M06 | Search (name / phone / code), status chips, Filters sheet, Sort; swipe Call / WhatsApp opens the apps | ⬜ |
| M06 | Long-press → multi-select → Assign trainer and Move to Trash; Trash → Restore and Delete permanently (type DELETE) | ⬜ |
| M06 | Developer → Insert 2,000 demo members → the list scrolls smoothly and search stays instant | ⬜ |
| M06 | Duplicate phone warning appears; Edit member saves; Home search finds members | ⬜ |
| M06 | Add member success screen (now on-screen, not a sheet): Share receipt, Send welcome, Share card stub, Add another, Done → opens the new profile | ⬜ |
| M07 | Tap a member (list, Home search, duplicate "Open") → profile opens in the Members tab with the list underneath; header, action row and tab chips look right in light + dark | ⬜ |
| M07 | **Done when:** Renew an active plan → new plan starts the day after the old end date; renew an expired one → starts today, "Start from expiry date" backdates | ⬜ |
| M07 | **Done when:** Freeze open-ended a few days back → Unfreeze → end date moves by the frozen days; a fixed freeze ends by itself after its last day | ⬜ |
| M07 | Freeze over the plan limit: without override it's blocked; with `membership.freeze_override` the second tap overrides | ⬜ |
| M07 | Extend (reason), Change plan (credit shown + applied as discount), Edit plan, Cancel with refund, Delete (owner, no payments) all work and show in History | ⬜ |
| M07 | Dialogs after a sheet (Unfreeze / Delete plan / Move to Trash from More, Trash → Delete permanently, Plans → Delete) appear once the sheet has closed | ⬜ |
| M08 | **Done when:** record two partial payments and a refund → Dues and the profile show the right balance | ⬜ |
| M08 | **Done when:** receipt PDF (A5 and A4) opens the share sheet and sends to WhatsApp; logo, GSTIN with CGST/SGST, terms and "Thank you" appear; Print opens AirPrint | ⬜ |
| M08 | Collections: each date chip + Custom range, totals by mode (•••• for staff without `reports.financial`); Dues: sort, Collect / WhatsApp / Call; Refunds list + Record refund | ⬜ |
| M08 | Delete a payment (owner) → it leaves the totals and shows in Trash → Payments; restore and delete permanently work | ⬜ |
| M09 | **Done when:** an expired member scans → red card; Override with a reason checks them in and shows in History; a `TRANSFORMPRO:<code>` QR on another phone checks the member in (green card, "Checked in 6:42 PM") | ⬜ |
| M09 | Expiring / dues → orange card (still checked in); frozen → red; scanning resumes after 2 s; the same QR within 5 s is ignored; haptics fire; sound plays (and stays silent with the mute switch on); Sound chip turns it off | ⬜ |
| M09 | Scanning someone already inside → "Already inside since …" with Check out; session plan → sessions left goes down | ⬜ |
| M09 | Kiosk mode: tabs and header hidden, screen stays awake, front camera works, red cards clear after 6 s, Exit needs your PIN or the owner's (wrong PINs → cooldown) | ⬜ |
| M09 | Search & mark (recent + search), Today's list (All / Inside / Left, Check out, Delete wrong entry), auto check-out after the set hours on app open | ⬜ |
| M09 | Members swipe Check-in, profile Check-in and Home "+" Mark attendance open the Check-in tab for that member; History (date chips + custom) and Absentees (7 / 14 / 30) open from the header; profile Attendance calendar + stats | ⬜ |
| M10 | **Done when:** each Today card, Attention row and donut legend entry opens its list and the count matches the list; Check-ins → Today's list; Collection → Payments | ⬜ |
| M10 | **Done when:** with Developer → "Insert 2,000 demo members" (plus some payments / check-ins) Home opens in under ~0.5 s and pull-to-refresh works | ⬜ |
| M10 | Charts (collections bar, attendance line, peak hours) and the donut look right in light + dark, 7/30 toggle works, labels don't collide; staff without `reports.financial` see •••• and no collections chart | ⬜ |
| M10 | Backup banner shows (never backed up) and opens the M11 placeholder; Birthdays/Anniversaries "Wish" opens WhatsApp | ⬜ |
| M08 | Sheets no longer touch the screen edges (filters, duplicate phone, member picker, add plan, forgot PIN); photo picker and Home "+" actions open after their sheet closes | ⬜ |

### Cross-cutting checklist (every milestone)

- [ ] Every user-facing string uses `t()`, with keys added to **both** `en.json` and `hi.json` (final Hindi wording is reviewed in M20) (§11)
- [ ] The UI never writes SQL: screen → hook → repository (§4)
- [ ] Multi-table writes run in one transaction; every create/update/delete of members, subscriptions, payments, expenses, staff or settings writes to the audit log (§4, §5.2 audit_log)
- [ ] Money is integer paise; dates are `YYYY-MM-DD`; timestamps are ISO; IDs are `expo-crypto.randomUUID()`; `created_at`/`updated_at` set (§4)
- [ ] All forms validated with react-hook-form + zod (amount > 0, end ≥ start, phone format…) (§13)
- [ ] Every list has loading skeleton, empty state with an action, and error state with retry (§12)
- [ ] Destructive actions confirm first; permanent deletes need typed confirmation (§12)
- [ ] Success toasts ("Payment of ₹2,000 recorded") (§12)
- [ ] Keyboard never covers inputs; numeric keypad for phone and amounts; "Next" moves between fields (§12)
- [ ] Tap targets ≥ 44pt; accessibility labels on icon-only buttons; layout survives larger Dynamic Type (§12, §21)
- [ ] Light and dark mode both look right; colours only from theme tokens (§12)
- [ ] Native calls wrapped in try/catch with a friendly message, so a missing capability in Expo Go doesn't crash the app (§2)
- [ ] Every promise handled with a user-friendly error toast; storage-full errors handled when writing photos or files (§13, §21)
- [ ] Permission-gated UI is *hidden*, not disabled, via `<Can>` / `can()` (from M04 on) (§15)
- [ ] Lists bump the `dataVersion` counter after writes (§4)
- [ ] Components < 250 lines, named exports, `@/` imports, no business logic in components, no `console.log` (§21)
- [ ] `npx tsc --noEmit`, `npm test` and `npx expo-doctor` pass, then commit `Mxx: …`

---

## Phase 1 — Foundation

### M00 · Project setup & tooling
**Spec:** CLAUDE.md §1, §2, §3, §4, §21
- [x] `git init`; `.gitignore` covering `node_modules`, `ios/`, `android/`, `.expo/`, build output (§18 notes)
- [x] `npx create-expo-app@latest` (TypeScript template) in the repo root; remove the template's example screens
- [x] `app.json` per §3: name `TransformPro`, slug/scheme `transformpro`, bundle ID `com.transformpro.app`, `supportsTablet`, portrait on iPhone, `userInterfaceStyle: automatic`, newArch per SDK default, and the full `infoPlist` (camera, photo library and Face ID usage strings, `LSApplicationQueriesSchemes`, `ITSAppUsesNonExemptEncryption: false`, `UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace`), version + `ios.buildNumber`
- [x] `tsconfig`: `strict: true`, `@/` path alias
- [x] Install all §1 dependencies with `npx expo install`: expo-router, expo-sqlite, react-hook-form, zod, @hookform/resolvers, date-fns, zustand, @shopify/flash-list, react-native-gifted-charts + react-native-svg + expo-linear-gradient, react-native-qrcode-svg, expo-camera, expo-image-picker, expo-image-manipulator, expo-image, expo-file-system, expo-sharing, expo-document-picker, expo-print, react-native-view-shot, jszip, SheetJS `xlsx` (from the CDN tarball), expo-local-authentication, expo-secure-store, expo-crypto, expo-notifications, expo-linking, expo-haptics, i18next, react-i18next, expo-localization, @expo/vector-icons, jest + jest-expo
- [x] Also install the packages the feature specs need that §1 doesn't list: **expo-clipboard** (§10.7), **expo-keep-awake** (§10.4 kiosk), **@react-native-community/datetimepicker** (§12)
- [x] Check every package works in Expo Go; nothing on the §1 "never add" list; `npx expo-doctor` clean
- [x] Folder structure exactly as in §4 (`app/`, `src/db`, `src/domain`, `src/features`, `src/components`, `src/services`, `src/store`, `src/i18n`, `src/theme`, `src/utils`, `__tests__/`)
- [x] jest + jest-expo configured, plus one sample test
- [x] `src/utils/logger.ts` that no-ops in production (§21)
- [x] Placeholder icon and splash: dumbbell glyph on `#FF6B2C` (§3)

**Done when:** 	sc, 
pm test and expo-doctor pass, and the blank app opens in Expo Go on the iPhone.

> Status: ✅ tsc · ✅ jest (2 tests) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. Expo Go check → Pending device checks. ⏳ First commit waits for Atul's git identity (all work so far goes into it).

### M01 · Theme, UI kit, i18n skeleton, navigation shell
**Spec:** `i18n-ui.md` (§11–12), `navigation.md` (§9)
- [x] Theme tokens: brand `#FF6B2C`, slate `#1E293B`, success `#16A34A`, warning `#F59E0B`, danger `#DC2626`, info `#2563EB`; full dark palette; spacing, typography, radii; status colours (Active green, Expiring amber, In grace orange, Expired red, Frozen blue, Upcoming purple, No plan grey); `useTheme`; theme setting `system | light | dark`
- [x] UI kit: Button, Input, PhoneInput (country-code prefix), AmountInput (₹ → paise), DateField (native datetimepicker), Select/Picker, MultiSelect, Card, Badge, StatusBadge, Avatar (photo or coloured initials), ListRow, SectionHeader, GroupedList, EmptyState, ErrorState, Skeleton, Toast/snackbar, ConfirmDialog, TypedConfirmDialog, BottomSheet, SegmentedControl, Chip, FAB, PinKeypad (large), ProgressBar, KeyboardAware form wrapper
- [x] iOS-native feel: large titles, grouped lists, bottom sheets (§12)
- [x] i18next + react-i18next + expo-localization; `en.json` / `hi.json`; switches instantly without a restart; structured so a new language is just a new JSON file (§11)
- [x] `src/utils/format.ts`: date formatting per the `date_format` setting, locale-aware numbers, money helper hook-up (§11)
- [x] expo-router shell: root `_layout` (providers), 5 tabs (Home, Members, **big centre Check-in**, Payments, More) (§9)
- [x] More menu with all groups and items from §9 (Gym / Growth / Money / Data / App); items whose screen doesn't exist yet show "Coming in Mxx" (register)
- [x] Header slot for global search (Home and Members) and a FAB slot on Home (wired up in M06/M10)
- [x] Dev-only "UI kit" screen showing every component in light and dark mode

**Done when:** every tab and More item opens, dark mode follows iOS, and switching EN/HI updates the strings instantly.

> Status: ✅ tsc · ✅ jest (15 tests, incl. EN/HI key-parity check) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. On-device checks → Pending device checks.

### M02 · Database layer
**Spec:** `database.md` (§5), CLAUDE.md §4
- [x] `db/client.ts`: `transformpro.db`, `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`; `<SQLiteProvider databaseName="transformpro.db" onInit={migrate}>` (§5.1)
- [x] `migrations/NNN_name.ts` exporting `{ version, up }`; `migrate.ts` runs pending migrations in order inside a transaction and sets `user_version` (§5.3)
- [x] Before migrating a DB that has data: copy the DB file to `Documents/auto-backups/` (§5.3)
- [x] `001_init` with **all 18 tables** and every column, type, NOT NULL, default, CHECK, FK and index from §5.2: settings, branches, staff, members, plans, subscriptions, freezes, payments, attendance, staff_attendance, measurements, enquiries, enquiry_followups, expense_categories, expenses, message_templates, message_log, audit_log
- [x] A uniqueness rule that keeps message templates per language (§11: "store `language` in template")
- [x] Repositories (all SQL lives here): typed row ↔ model mappers; create/get/list/update/soft-delete per table
- [x] Audit helper `audit(action, entity, entityId, summary)` using the current staff member
- [x] Transaction helper `writeTransaction` (serialised BEGIN/COMMIT on the main connection — see Decisions Log 2026-10-30 M02)
- [x] `dataVersion` counter in zustand
- [x] Dev screen that inserts and reads a row in each core table

**Done when:** a fresh boot creates the schema with `user_version = 1`; the dev screen round-trips data; foreign keys are enforced (a test insert with a bad FK fails).

> Status: ✅ tsc · ✅ jest (42 tests; schema, migrations and repositories run against real SQLite) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. On-device checks → Pending device checks.

### M03 · Domain logic + unit tests
**Spec:** `business-rules.md` (§6), `staff-permissions-branches.md` (§15)
- [x] `dates.ts`: end dates (§6.2): months → `addMonths − 1 day`, days → `start + n − 1`, years → `addYears − 1 day`, sessions → start + validity (default 90 days); date-only helpers using date-fns only
- [x] `membershipStatus.ts` (§6.1): ignore cancelled subscriptions; Upcoming, Active, Frozen, Expiring soon, In grace, Expired, No plan; `daysLeft`, `daysSinceExpiry`, current plan name, current trainer; separate status for PT and services
- [x] Renewal (§6.3, `renewal.ts`): active/expiring → old end + 1; expired → today, or the "start from expiry date" option; owner override; `renewed_from_subscription_id`
- [x] Freeze (§6.4, `freeze.ts`): fixed N days or open-ended; on unfreeze `end_date += days`, `frozen_days_total += days`; `max_freeze_days` / `max_freeze_times` checks with an override flag
- [x] `dues.ts` (§6.5): subscription due = total − (payments − refunds); member due = subscription dues + unlinked charges; split a payment across subscriptions oldest first; overpayment error unless recorded as an advance; advance applied automatically to the next subscription
- [x] `money.ts` (§6.6): paise ↔ rupees; `Intl.NumberFormat('en-IN')` with Indian grouping, `.00` hidden when whole; GST inclusive/exclusive; CGST/SGST half split when GSTIN set; subscription total = base + admission − discount (₹ or %) + tax
- [x] `codes.ts` (§6.7): prefix + zero-padded number for member codes and receipts (+ QR payload `TRANSFORMPRO:<code>` parse/build)
- [x] Phones (§6.9, `phones.ts`): strip spaces, dashes and leading 0; prepend country digits to 10-digit numbers; Indian mobile regex when +91, other formats allowed otherwise; `samePhone` for the duplicate check
- [x] Check-in evaluator (§6.8, `checkin.ts`): block if expired (setting), frozen, has dues (setting); override allowed; one per day unless the setting allows more; already in → offer check-out; session plans count usage and block at 0 left; grace counts as active
- [x] Auto check-out rule: open check-ins older than `auto_checkout_hours` (§6.8)
- [x] `templates.ts`: render all 15 placeholders from §10.7
- [x] `permissions.ts`: every §15 key, role defaults (owner / manager / receptionist / trainer per §10.13), `can(staff, key)`
- [x] BMI calculation (`bmi.ts`, for M17 measurements)
- [x] Jest tests for **all** of the above, including 31 Jan + 1 month, leap years, grace boundaries, expiring-soon boundary, partial payments + refunds, advance, freeze limits, session exhaustion, phone formats

**Done when:** `npm test` is green and every §6 rule has at least one test.

> Status: ✅ tsc · ✅ jest (129 tests, 14 suites) · pure logic, no device checks needed. The parts of §6 that need the DB or UI are owned by later milestones: atomic code increments (M06, M08), duplicate-phone warning (M06, M16), override reason + audit (M09), auto check-out on app open (M09, M11), freeze auto-end (M07), `<Can>` component (M04).

### M04 · Onboarding, settings, app lock, staff session
**Spec:** `onboarding-security.md` (§7–8), `database.md` (settings keys)
- [x] Settings repository + zustand cache with typed defaults for **every** settings key in §5.2
- [x] Onboarding wizard with progress dots and Back/Next (§7):
  1. Welcome: app name, "Your data stays only on this iPhone", language picker
  2. Gym details: name (required), logo from photos, phone, address, email, GSTIN
  3. Owner: name, phone, 4–6 digit PIN entered twice, Face ID toggle (only if the device supports it); explain clearly that a forgotten PIN can't be recovered online
  4. Preferences: currency, country code, date format, expiring-soon days, grace days
  5. Plans: seeded plans with price fields; add and remove
  6. "Already have a backup? Restore it" (register → M11)
  7. Done: `onboarding_complete = true`, schedule notifications (register → M15), go to Dashboard
- [x] Seeding: default branch; exactly one owner row (can't be deleted or demoted); plans (Monthly, Quarterly, Half-Yearly, Yearly at ₹0, PT Monthly, Locker, Diet Plan, Steam Bath); 12 expense categories (§5.2); system message templates in EN + HI (full wording in M14)
- [x] PIN stored as `SHA-256(salt + pin)` via expo-crypto; per-staff salt + hash on the staff row (travels with backups); lock settings and the wrong-PIN lockout in expo-secure-store (§1, §8 — Decisions Log M04)
- [x] Lock screen: staff avatars → tap → PIN keypad; Face ID / Touch ID when enabled
- [x] 5 wrong PINs → 30 s cooldown, doubling each time
- [x] Forgot PIN (owner): "Unlock with Face ID to reset PIN" if biometrics are on, otherwise the backup/reinstall instructions
- [x] Locks on cold start and after the background time exceeds `lock_after_minutes`
- [x] "Lock now" and "Switch user" in More
- [x] Session store (current staff) used for `created_by`, `received_by`, the audit log and permissions; `<Can permission>` component
- [x] `useMasked()` → shows "••••" for revenue/collection numbers without `reports.financial`
- [x] Audit log for login and logout

**Done when:** a fresh install → onboarding → lock screen; PIN and Face ID unlock; the cooldown works; it relocks after the background timeout; Face ID inside Expo Go may fall back to the passcode, which is acceptable.

> Status: ✅ tsc · ✅ jest (145 tests: settings defaults/validation, lockout, PIN hashing, onboarding seed in real SQLite, form schemas) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. On-device checks → Pending device checks.

---

## Phase 2 — Core gym operations

### M05 · Plans, PT & services
**Spec:** `plans.md` (§10.3), `database.md` (plans)
- [x] Segments: Memberships, Personal Training, Services
- [x] List showing price, duration, colour badge and **active member count** per plan
- [x] Add/edit (zod): name, category, duration value + unit (days/months/years/sessions), session count, price, admission fee, max freeze days and times, colour, description
- [x] Services can have a duration or be one-time
- [x] Plan form explains that max freeze days/times **0 = no limit** (M03 decision); sessions plans take a validity in days (default 90, `DEFAULT_SESSION_VALIDITY_DAYS`) — decide where it's stored (e.g. `duration_value` = validity days when unit is `sessions`, `session_count` = sessions) and pass it to `computeEndDate`
- [x] Reorder (`sort_order`), deactivate (hidden from pickers, history kept), soft delete
- [x] Editing a price never changes existing subscriptions (snapshots)
- [x] Reachable from More → Plans & Pricing / Personal Training / Services

**Done when:** plans can be created, edited, reordered and deactivated, and inactive plans disappear from pickers.

> Status: ✅ tsc · ✅ jest (154 tests; active-member counts, picker filtering and price snapshots tested against real SQLite) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. Pickers use `listActivePlans` (first used in M06). Add/edit/reorder/deactivate/delete need `plans.manage`. On-device checks → Pending device checks.

### M06 · Members: list, add/edit, trash
**Spec:** `members.md` (§10.2 list, form, trash), `business-rules.md` §6.7, §6.9
- [x] **List:** FlashList (FlatList fallback); search by name, phone or code (200 ms debounce, SQL `LIKE`); result count in the header
- [x] **Filter chips:** All, Active, Expiring soon, Expired, Frozen, Upcoming, No plan, Has dues, Birthday this month, PT members, Gender, Plan (multi-select), Trainer, Branch (hidden while there's a single branch), Joined date range
- [x] **Sort:** Name A–Z, Newest, Expiry soonest, Due highest, Last visit
- [x] **Row:** photo or coloured initials, name, code, phone, plan, status badge, "12 days left" / "Expired 5d ago", due in red
- [x] **Swipe:** Call, WhatsApp (plain message now, templates in M14), Check-in (register → M09), Renew (register → M07)
- [x] **Multi-select:** move to trash, assign trainer, send message (register → M14), export selected (register → M11), change branch (register → M19)
- [x] Empty state "Add your first member"
- [x] **Form** (collapsible sections; only name, phone and joining date required): photo (camera or library, square crop, max 800 px JPEG 0.7 via `services/photos.ts`); basic (full name, phone + prefix, alt phone, email, gender, DOB with calculated age, anniversary); address (address, area, city, pincode, occupation); health (blood group, height, medical conditions, fitness goal); emergency contact (name, phone, relation); ID proof (Aadhaar / PAN / Driving Licence / Voter ID / Passport / Other + number; Aadhaar shows only the last 4 digits in lists); gym (member code auto-filled and editable but unique, joining date default today, branch, assigned trainer, source, referred-by member search, notes)
- [x] Duplicate-phone warning with "Open existing"
- [x] **Step 2: Plan & Payment** (add only, can be skipped): plan → start date (today) → auto end date (editable) → price → admission fee toggle → discount ₹ or % + reason → tax line if enabled → total → paid now (defaults to total) → mode → reference → balance due; optional PT plan (with trainer) and services in the same flow; advances apply automatically
- [x] Save in **one transaction**: member + subscription(s) + payment(s) + member code increment + audit entry
- [x] **Success sheet:** Send welcome (WhatsApp; templated in M14), Share receipt (register → M08), Share card (register → M13), Add another, Done
- [x] Edit member (same form, without step 2)
- [x] **Trash:** members tab (payments, expenses and enquiries tabs added by M08, M17 and M16 — register); restore; delete permanently (owner only, type "DELETE"); auto-purge items older than 30 days on app open, with a setting to turn it off
- [x] **Global search** (header on Home and Members): members by name, phone or code (enquiries added in M16 — register)

**Done when:** a member added with a partial payment shows the correct status and due amount; 2,000 demo rows scroll smoothly.

> Status: ✅ tsc · ✅ jest (170 tests; add-member transaction, code/receipt allocation, dues in the list, search, duplicate phones, trash purge + cascade against real SQLite) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. 2,000-row scroll uses More → Developer → "Insert 2,000 demo members". On-device checks → Pending device checks.

### M07 · Member profile + subscription lifecycle
**Spec:** `members.md` (profile), `business-rules.md` §6.1, §6.3, §6.4
- [x] **Header:** large photo, name, code, status badge, days left, due badge, phone
- [x] **Action row:** Call, WhatsApp, SMS, Check-in (register → M09), Renew, Collect payment (register → M08), Card (register → M13), More
- [x] **Overview tab:** current membership (plan, start, end, days-left progress bar), PT plan + trainer + sessions left, services, lifetime paid, total due, last visit, visits this month, member since, referred by / referrals made, notes (+ personal details with Aadhaar masked)
- [x] **Plans tab:** timeline of all subscriptions with status, dates, amounts, paid and due. Actions:
  - Renew: default start date per §6.3, "start from expiry date" option for expired plans, override (start date stays editable); advances auto-apply
  - Freeze (N days or open-ended) / Unfreeze, enforcing plan limits unless `membership.freeze_override` (`checkFreeze`; on unfreeze `frozenDaysOnEnd` + `applyUnfreeze`, re-checking `remainingFreezeDays` for open-ended freezes)
  - Fixed-length freezes whose last day has passed (`isFreezeOver`) are closed automatically — on profile load and at app start (`AppGate`, folded into the M11 pipeline) — extending the end date by the frozen days
  - Extend end date (with a reason)
  - Change plan (upgrade, showing the proration suggestion)
  - Cancel (reason + refund amount)
  - Edit
  - Delete (owner only, only if the subscription has no payments)
- [x] Payments, Attendance, Measurements and Messages tabs scaffolded (registers → M08, M09, M17, M14)
- [x] **More menu:** Edit, Share card (register → M13), Generate QR (register → M13), Move to trash, audit history for this member
- [x] Every lifecycle action writes to the audit log

**Done when:** renewing an active plan starts the day after its end date, and a freeze extends the end date by the frozen days.

> Status: ✅ tsc · ✅ jest (189 tests; renewal start dates, proration, freeze → end date +frozen days, auto-closing fixed freezes, cancel with refund, delete guard, plan actions per state/permission — domain and against real SQLite) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. On-device checks → Pending device checks.

### M08 · Payments
**Spec:** `payments.md` (§10.5), `business-rules.md` §6.5–6.7
- [x] **Record payment:** pick member → open subscriptions with dues → amount → mode (cash, UPI, card, bank transfer, cheque, other) → reference → date (default today) → note → save → receipt; oldest-first split (or split by plan by hand); overpayment blocked unless saved as an advance
- [x] Receipt numbers incremented atomically and never reused after deletion
- [x] **Receipt/invoice PDF** (`services/pdf.ts`, expo-print), A4 and A5: logo, gym name, address, phone, GSTIN; receipt number, date, staff; member name, code, phone; plan, period, base price, admission fee, discount, tax (CGST/SGST), total; paid now, mode, reference, balance due; terms from settings; "Thank you" footer. Shared via the share sheet (WhatsApp, Mail, Files, AirPrint)
- [x] **Payments tab, Collections:** filters Today, Yesterday, This week, This month, Last month, Custom; totals by mode; rows with member, amount, mode, receipt number and staff
- [x] **Dues:** every member with a balance, sorted by amount or oldest, total due at the top; row actions Collect, WhatsApp reminder (templated in M14), Call
- [x] **Refunds:** list; record a refund (`is_refund`), audit-logged
- [x] Delete payment (owner only, soft delete, audit-logged); add a **Payments tab to Trash** (restore, delete permanently, 30-day auto-purge)
- [x] Profile **Payments tab**: list → receipt preview (share PDF / WhatsApp), record, refund, delete
- [x] Wire up registers: success-sheet "Share receipt", profile "Collect payment"
- [x] Amounts masked without `reports.financial`

**Done when:** partial payments plus a refund give the correct dues, and the receipt PDF shares to WhatsApp.

> Status: ✅ tsc · ✅ jest (195 tests; partial payments + refund → dues, receipt numbers never reused, Trash restore/purge, date presets, totals by mode, dues list, receipt model incl. CGST/SGST and balance after each payment, HTML escaping) · ✅ expo-doctor 20/20 (expo, expo-router, expo-sqlite bumped to the latest SDK 58 patches) · ✅ iOS bundle exports. PDF sharing → Pending device checks.

### M09 · Check-in
**Spec:** `checkin.md` (§10.4), `business-rules.md` §6.8
- [x] Segmented control: **Scan QR | Search & mark | Today's list**
- [x] **Scan QR:** full-screen `CameraView` (QR only); payload `TRANSFORMPRO:<member_code>`; result card for 2 s: ✅ green (photo, name, plan, days left, "Checked in 6:42 PM"), ⚠️ orange (expiring or dues, still checked in), ⛔ red (expired or frozen, with **Renew** and **Override**); haptics plus optional sound; scanning resumes automatically; the same code is ignored for 5 s
- [x] **Override** (owner/manager, `attendance.override_block`) with a reason, audit-logged
- [x] Session plans increment `sessions_used`
- [x] Already checked in → offer **Check out**
- [x] **Kiosk mode:** keep the screen awake, front-camera option, tabs hidden, PIN required to exit
- [x] **Search & mark:** search box + recent members → check in / check out
- [x] **Today's list:** in/out times, inside/left filter, manual check-out, delete a wrong entry (manager and up)
- [x] Auto check-out on app open
- [x] **Attendance history:** pick a date or range → list + count; export (register → M11)
- [x] **Absentees:** active members not seen in 7, 14 or 30 days; bulk message (register → M14)
- [x] Profile **Attendance tab:** month calendar with check-in days highlighted, list of in/out times, visits per month, streak, average visit duration
- [x] Wire up registers: swipe Check-in, profile Check-in
- [x] Staff attendance is in M19

**Done when:** an expired member is blocked, an override works and is logged, and a QR shown on another phone checks the member in.

> Status: ✅ tsc · ✅ jest (201 tests; expired → blocked, override checks in and is audit-logged, already inside → check out, session plans use a session and get it back on delete, auto check-out at check-in + hours, streak / monthly counts / average, calendar grid, absentees, 5 s scan debounce) · ✅ expo-doctor 20/20 (added expo-audio + its peer expo-asset) · ✅ iOS bundle exports. Camera, haptics, sound and kiosk → Pending device checks. Until M13 makes member QR cards, test the scanner with any QR generator showing `TRANSFORMPRO:<member code>` on another phone.

### M10 · Dashboard
**Spec:** `dashboard.md` (§10.1), `navigation.md` (FAB, search)
- [x] All numbers come from **indexed SQL aggregates**; target < 500 ms load with 5,000 members, 20,000 payments and 100,000 attendance rows
- [x] **Header:** gym name/logo, greeting with the staff member's name, today's date, search, lock icon
- [x] **Today cards** (each opens a filtered list): check-ins + currently inside; collection with cash/UPI/card split; expenses; new admissions; renewals
- [x] **Attention:** expiring today; expiring within N days; expired in the last 30 days and not renewed (win-back); members with dues (count + total); birthdays today with "Send wishes" (register → M14); anniversaries today; enquiry follow-ups due today or overdue; members absent 7+ days; frozen memberships ending soon
- [x] **Membership stats donut:** total, active, expired, frozen, upcoming, no plan
- [x] **This month:** collections vs last month (₹ and % change), expenses, net profit, new admissions, renewals, renewal rate %
- [x] **Charts:** collections bar (7/30 days), attendance line (7/30 days), peak hours by hour of day (last 30 days)
- [x] **Backup banner** when `last_backup_at` is older than `backup_reminder_days` or missing ("Back up now" → M11 register)
- [x] **Quick-action FAB:** Add member, Record payment, Mark attendance, Add enquiry (register → M16), Add expense (register → M17)
- [x] Pull-to-refresh; every money number respects `reports.financial` masking
- [x] Expense and enquiry cards read from tables that already exist (they show 0 until M16/M17 add data)

**Done when:** every card opens its filtered list, the numbers match those lists, and it loads fast with the demo dataset.

> Status: ✅ tsc · ✅ jest (205 tests; every member bucket, % change, net profit, renewal rate, daily series, peak hours, backup reminder, aggregates against real rows, and the 5,000 members / 20,000 payments / 100,000 check-ins load under the 1.5 s CI guard) · ✅ expo-doctor 20/20 · ✅ iOS bundle exports. Migration 002 adds the dashboard indexes. Device timing (< 500 ms) and chart looks → Pending device checks.

---

## Phase 3 — Data safety

### M11 · Backup, restore, export, import
**Spec:** `backup-export.md` (§10.15–10.16), `members.md` (CSV import), CLAUDE.md §13
- [ ] **Backup file** `TransformPro-Backup-<gymname>-YYYY-MM-DD-HHmm.transformpro` (ZIP via jszip): `manifest.json` (app version, schema `user_version`, created_at, gym name, counts per table, SHA-256 of `db.sqlite`); `db.sqlite` made consistent via `wal_checkpoint(TRUNCATE)` or `VACUUM INTO`; `photos/…` (member, progress and receipt photos, gym logo)
- [ ] **Backup now:** build in the cache dir → show size → share sheet (Files, AirDrop, WhatsApp, Email) → copy to `Documents/backups/` (keep the latest 5) → set `last_backup_at` → audit log
- [ ] **Daily automatic backup** on first open each day to `Documents/auto-backups/` (keep 7), with the warning that it does *not* protect against losing the phone
- [ ] Before replacing the DB file: close the connection and reset the handle/writer in `src/db/client.ts` (add a `closeDatabase()`), so no queued write hits the old file
- [ ] **Restore:** pick a `.transformpro` file or a local backup → validate (it's a ZIP, has a manifest, checksum matches, schema ≤ the app's) → summary ("Backup from 12 Oct 2026, 1,240 members, 3,980 payments… will REPLACE all data") → type `RESTORE` + owner PIN → safety backup of the current DB → close DB → replace DB and photos → reopen → migrate → remount the root/lock screen → audit log
- [ ] **Backup screen:** last backup date, member and payment counts, database size, list of local backups (share, restore, delete), "How to keep your data safe" help
- [ ] Wire up the onboarding "Restore" step and the dashboard "Back up now" banner
- [ ] **Export** (`services/export.ts`): members, payments, attendance, expenses, enquiries and measurements as XLSX or CSV for any date range; "Export everything" = one workbook with a sheet per table; shared via the share sheet
- [ ] Wire up registers: members "export selected", attendance history export
- [ ] **CSV import:** share a sample template; pick CSV → preview first 20 rows → map columns → per-row validation errors → import valid rows in one transaction; optional plan name, start/end and amount-paid columns create subscriptions; option to skip duplicate phones
- [ ] **Start-up pipeline** (§13): migrations → auto check-out → trash auto-purge → daily auto-backup → reschedule notifications (hook for M15), each step isolated so one failure never blocks launch
- [ ] Storage-full handling during backup

**Done when:** back up → save to Files → delete and reinstall the app → restore → every member, payment and photo is back.

### M12 · iOS build pipeline + first sideload
**Spec:** `build-ipa.md` (§18), `readme-guide.md` (§20)
- [ ] `.github/workflows/build-ios.yml` exactly per §18: manual trigger + `v*` tags, macos-15, setup-xcode, Node 22, `npm ci`, `expo prebuild --platform ios --clean --no-install`, remove the `aps-environment` entitlement, `pod install`, unsigned archive, package `TransformPro.ipa`, upload artifact (14 days)
- [ ] After a test prebuild, check the workspace and scheme names and fix them if they differ
- [ ] Confirm the JS bundle is embedded in the Release build; no EAS
- [ ] Workflow uses 
ode-version: 24 (matches the dev PC; see Decisions Log 2026-10-30)
- [ ] Check the built Info.plist: iPhone portrait-only, iPad all four orientations
- [ ] Increment `version` / `ios.buildNumber`
- [ ] `README.md` for the owner, first pass, covering all 10 sections in §20, including the note that a public repo makes the code public (gym data never is), the macOS-minutes note for private repos, and changing the bundle ID before the first install

**Done when:** the Action produces `TransformPro.ipa`, Sideloadly installs it, Face ID works in the real build, and data survives re-signing. *(The developer runs the GitHub and iPhone steps; Claude walks them through it.)*

---

## Phase 4 — Growth & communication

### M13 · Membership card
**Spec:** `membership-card.md` (§10.6)
- [ ] Three designs: **Modern** (gradient), **Classic** (white, bordered), **Bold** (dark)
- [ ] Contents: gym logo + name, member photo, name, code, plan, valid from–to, phone, blood group (optional toggle), QR `TRANSFORMPRO:<member_code>`
- [ ] Capture with view-shot → PNG → share sheet (WhatsApp, email, save to Photos)
- [ ] Bulk: generate cards for selected members one after another and share
- [ ] Card design picker with live preview (setting `card_design`; More → Membership Card Design)
- [ ] Wire up registers: success-sheet "Share card", profile Card action, More → Share card, Generate QR

### M14 · Messages & reminders
**Spec:** `messages-notifications.md` (§10.7)
- [ ] Templates screen: list by category, editor with placeholder chips and **live preview**; system templates editable but not deletable; custom templates CRUD
- [ ] Final wording for the 13 system templates in **English and Hindi**: welcome, expiry reminder, expires today, expired (win-back), dues reminder, payment received, renewal thank-you, birthday, anniversary, absent, enquiry follow-up, festival notice, gym closed / timing change
- [ ] All 15 placeholders supported
- [ ] `services/messaging.ts`: `whatsapp://send?phone=&text=`, falling back to `https://wa.me/`; WhatsApp Business preference (`whatsapp-business://`, with fallback); `sms:<n>&body=`; `tel:`; `mailto:`
- [ ] Attachments: copy the text to the clipboard, show "Message copied — paste in WhatsApp", open the share sheet with the PDF or PNG
- [ ] **Reminder centre** smart lists with counts: expiring in N days, expiring today, expired (last 7/30 days), dues pending, birthdays today, anniversaries today, absent X days, enquiry follow-ups due
- [ ] **Send queue:** one member at a time with the rendered message; Send via WhatsApp / SMS / Skip / Next; advances automatically on return from WhatsApp; logs to `message_log`; progress "12 / 40 sent"; members already messaged today are marked
- [ ] **Broadcast:** all active, all members, by plan, by gender, or custom selection + template → send queue
- [ ] Profile **Messages tab** (message log)
- [ ] Wire up registers: success-sheet welcome (templated), swipe and profile WhatsApp with a template picker, Dues "WhatsApp reminder", dashboard "Send wishes", members bulk "send message", absentees bulk message

### M15 · Local notifications
**Spec:** `messages-notifications.md` (§10.8)
- [ ] Explanation screen shown before the iOS permission prompt
- [ ] **Local only** (no push tokens): daily summary at `daily_summary_time` ("Today: 4 memberships expire, 2 birthdays, 3 follow-ups, ₹12,500 dues pending"), recomputed and rescheduled for the next 7 days on app open and after relevant writes
- [ ] Enquiry follow-up reminders at the chosen date and time; backup reminder every `backup_reminder_days`; freeze-ending reminders
- [ ] Settings toggles and times for each type
- [ ] Wire up registers: onboarding "Done" scheduling, start-up pipeline reschedule

### M16 · Enquiries & referrals
**Spec:** `enquiries-referrals.md` (§10.9–10.10)
- [ ] List with segments Hot 🔴 / Warm 🟠 / Cold 🔵 / Converted 🟢 / Lost ⚫ / Follow-up due
- [ ] Add/edit: name, phone (duplicate check against members **and** enquiries), gender, age, source, interested plan, fitness goal, status, next follow-up date + time, trial date, assigned staff, notes
- [ ] Detail: info, follow-up timeline; add a follow-up (channel, outcome, next date, new status); Call / WhatsApp / SMS (templates)
- [ ] **Convert to member:** pre-filled member form, links `converted_member_id`, status → converted
- [ ] **Mark lost** with a reason
- [ ] Stats: enquiries this month, conversion rate %, by source (pie)
- [ ] **Enquiries tab in Trash**
- [ ] Enquiries added to global search; dashboard FAB "Add enquiry" wired up
- [ ] **Referrals:** leaderboard by successful referrals, who-referred-whom list with dates, reward note field (e.g. "1 month free given")

---

## Phase 5 — Business management

### M17 · Expenses + measurements
**Spec:** `expenses.md` (§10.11), `members.md` (Measurements tab)
- [ ] **Expenses list:** month selector, total, category pie, filter by category and mode
- [ ] Add/edit: category, amount, date, mode, paid to, note, receipt photo (resized), recurring flag (`monthly`)
- [ ] Category management: add, rename, deactivate, pick an icon
- [ ] **Recurring prompt** on app open: "Add this month's Rent ₹25,000?" with one tap; never inserted silently
- [ ] Staff salary shortcut: pick a staff member → amount pre-filled from `salary_paise`
- [ ] **Expenses tab in Trash**; dashboard FAB "Add expense" wired up
- [ ] **Measurements tab:** add/edit/delete every §5.2 field, BMI calculated on save, table + line charts (weight, BMI, body fat, waist…), first-vs-latest progress photo side by side, share a progress report PDF

### M18 · Reports
**Spec:** `reports.md` (§10.12)
- [ ] Shared report frame: date range picker, branch filter, on-screen table + chart, export **PDF** (printable HTML with gym header) / **XLSX** (SheetJS, one sheet per section, proper column widths) / **CSV**, shared via the share sheet
- [ ] All 15 reports as SQL aggregates:
  1. Collections: by mode, by plan category, by staff, daily totals
  2. Dues: with aging 0–30, 31–60 and 60+ days
  3. Sales / subscriptions: new vs renewals by plan, revenue by plan, total discounts
  4. Admissions: by source and by gender
  5. Renewals: expiring vs renewed vs not renewed, renewal rate %
  6. Expiries: next 7, 15 or 30 days, or custom
  7. Attendance: daily counts, per-member visits, peak hours, average daily, most regular members, inactive members
  8. Trend: 12 months of collections, expenses, profit, active members and admissions
  9. Expenses: by category and by month
  10. Profit & loss: collections − refunds − expenses per month
  11. PT: clients, revenue and sessions used per trainer
  12. Enquiries: by status and source, conversion rate
  13. Staff: payments collected, members added, attendance
  14. Birthday list by month
  15. Member master list with all fields
- [ ] Reports hidden or masked without `reports.view` / `reports.financial`
- [ ] Check that dashboard numbers equal report numbers for the same dates

### M19 · Staff, roles, branches, activity log
**Spec:** `staff-permissions-branches.md` (§10.13–10.14, §15), `settings-activity-help.md` (§10.18), `checkin.md` (staff attendance)
- [ ] **Staff list:** name, role, phone, active toggle
- [ ] Add/edit: name, phone, role, PIN (set/reset by the owner), branch, salary, join date, photo, permission checkboxes pre-filled from the role and customisable
- [ ] Staff detail: members added, payments collected, attendance
- [ ] The owner can't be deleted or demoted
- [ ] **Permissions applied everywhere:** go through every screen and action from M04–M18 and gate each with its §15 key; hide, don't disable; members limited to assigned ones without `members.view_all`
- [ ] Trainer filters: "My members", "My PT clients"; PT plan assignment uses a trainer picker
- [ ] **Staff attendance:** manual check-in/out, monthly sheet
- [ ] **Activity log:** chronological, filters by staff, action type and date; owner/manager only
- [ ] **Branches:** CRUD in Settings; all branch UI hidden while there's only one branch; when there are more, a header switcher (owner sees "All branches"), branch fields on members, payments, expenses and attendance, branch filters on lists and reports, and a note that branches don't sync between devices
- [ ] Wire up registers: members bulk "change branch", members Branch filter

**Done when:** a Receptionist can't see revenue, reports, expenses or any delete action; a Trainer sees only assigned members and no payments.

---

## Phase 6 — Polish & ship

### M20 · Polish
**Spec:** `settings-activity-help.md` (§10.17, §10.19, §14), `i18n-ui.md` (§11–12)
- [ ] **Settings, every section:** gym profile (name, logo, address, phone, email, GSTIN, invoice terms); preferences (currency, country code, date format, week start, language, theme); membership rules (expiring-soon days, grace days, block expired, block dues, multiple check-ins per day, auto check-out hours, freeze defaults, auto-purge trash); numbering (member prefix and next number, receipt prefix and next number); tax (GST on/off, %, inclusive/exclusive); security (change PIN, Face ID, auto-lock minutes, staff link); notifications; card design; message templates link; data links; **Danger zone** (owner only: "Erase all data" → prompt to back up first → type `ERASE` + PIN); **About** (app version, schema version, DB size, "stored only on this device", open-source licences); all settings changes audit-logged
- [ ] **Demo data** (`__DEV__` only, Settings → About → developer): 150 members with realistic Indian names, plans, payments, 90 days of attendance, enquiries, expenses; "Clear demo data"
- [ ] **Performance:** a 5,000-member / 20,000-payment / 100,000-attendance dataset; lists scroll smoothly; dashboard < 500 ms; fix slow queries and indexes
- [ ] **Hindi:** complete translation review of `hi.json`; no hardcoded English anywhere
- [ ] **Help screens:** adding members, renewals, QR check-in, sending reminders, **backups (prominent)**, **re-signing every 7 days, and never deleting the app**, what happens if the phone is lost
- [ ] **iPad:** two-column members list + profile at width ≥ 768; rotation allowed on iPad
- [ ] Pass the cross-cutting checklist on every screen (states, Dynamic Type, accessibility labels, keyboard handling)
- [ ] Finish `README.md` (§20)

### M21 · Final QA
**Spec:** `acceptance.md` (§19)
- [ ] Every acceptance checkbox passes on a **real sideloaded build**, including a full Airplane Mode run
- [ ] The Wire-up register is fully ticked and a search for `TODO(` across the code comes back empty
- [ ] Fix the issues found, tag `v1.0.0`, build the release `.ipa`, update the Decisions Log

---

## Wire-up register

Features built as stubs early on that must be finished later. The owning milestone ticks them.

| Stub | Created in | Finished in | Done |
|---|---|---|---|
| More-menu items "Coming in Mxx" | M01 | each owning milestone | ⬜ |
| Theme & language preferences persisted to settings (in-memory until then) | M01 | M04 | ✅ |
| Home header "Lock" button | M01 | M04 | ✅ |
| Home / Members header "Search" button (global search) | M01 | M06 | ✅ |
| FAB "Add member" | M01 | M06 | ✅ |
| FAB "Record payment" | M01 | M08 | ✅ |
| FAB "Mark attendance" | M01 | M09 | ✅ |
| Onboarding "Restore a backup" | M04 | M11 | ⬜ |
| Onboarding "Done" schedules notifications | M04 | M15 | ⬜ |
| Members row tap + duplicate-phone "Open" → member profile (open the edit form until then) | M06 | M07 | ✅ |
| Show ID numbers with `maskIdNumber` (Aadhaar last 4) wherever they appear in lists/profile | M06 | M07 | ✅ |
| Settings toggle for `trash_auto_purge` (default on) | M06 | M20 | ⬜ |
| Settings toggle for `checkin_sound` (also a chip on the scanner for `settings.manage`) | M09 | M20 | ⬜ |
| Members swipe "Check-in" | M06 | M09 | ✅ |
| Members swipe "Renew" | M06 | M07 | ✅ |
| Members swipe / profile WhatsApp and SMS with templates (+ message log) | M06/M07 | M14 | ⬜ |
| Renew / Add plan / Change plan: offer "Share receipt" for the payment just recorded | M07 | M08 | ✅ |
| Receipt "WhatsApp" summary uses the `payment_receipt` template | M08 | M14 | ⬜ |
| Members bulk "Send message" | M06 | M14 | ⬜ |
| Members bulk "Export selected" | M06 | M11 | ⬜ |
| Members bulk "Change branch" + Branch filter | M06 | M19 | ⬜ |
| Success sheet "Send welcome" (templated) | M06 | M14 | ⬜ |
| Success sheet "Share receipt" | M06 | M08 | ✅ |
| Success sheet "Share card" | M06 | M13 | ⬜ |
| Trash tab: payments | M06 | M08 | ✅ |
| Trash tab: enquiries | M06 | M16 | ⬜ |
| Trash tab: expenses | M06 | M17 | ⬜ |
| Global search: enquiries | M06 | M16 | ⬜ |
| Profile "Collect payment" + Payments tab | M07 | M08 | ✅ |
| Profile "Check-in" + Attendance tab | M07 | M09 | ✅ |
| Profile Card / Share card / Generate QR | M07 | M13 | ⬜ |
| Profile Messages tab | M07 | M14 | ⬜ |
| Profile Measurements tab | M07 | M17 | ⬜ |
| Dues "WhatsApp reminder" (templated) | M08 | M14 | ⬜ |
| Attendance history export | M09 | M11 | ⬜ |
| Absentees bulk message | M09 | M14 | ⬜ |
| Dashboard "Send wishes" (plain WhatsApp wishes now; templates in M14) | M10 | M14 | ⬜ |
| Dashboard "Back up now" banner | M10 | M11 | ⬜ |
| Dashboard "Expenses" card → today's expenses list | M10 | M17 | ⬜ |
| Dashboard "Enquiry follow-ups due" row → follow-ups list | M10 | M16 | ⬜ |
| FAB "Add enquiry" | M01 | M16 | ⬜ |
| FAB "Add expense" | M01 | M17 | ⬜ |
| Start-up pipeline: reschedule notifications | M11 | M15 | ⬜ |
| PT trainer picker / "My PT clients" | M05/M06 | M19 | ⬜ |
| Permission gating on all earlier screens | M04 | M19 | ⬜ |
| `AppGate` start-up hook (`TODO(M11)`): auto check-out (M09), trash purge (members + payments), end finished freezes (M07) already run there; M11 adds daily auto-backup and puts all steps in the §13 order | M04 | M11 | ⬜ |
| Security settings (lock on/off, auto-lock minutes, Face ID toggle, change PIN) — must go through `settingsStore.update` so the Keychain copy stays in sync | M04 | M20 | ⬜ |
| Staff PINs set/reset by the owner (lock screen already lists every active staff member with a PIN) | M04 | M19 | ⬜ |

---

## Coverage map (every spec section → milestone)

| Spec § | Topic | Milestone(s) |
|---|---|---|
| 0 | Non-negotiable rules | all (cross-cutting) |
| 1 | Tech stack & dependency rules | M00 |
| 2 | Windows / Expo Go workflow & limits | M00, cross-cutting |
| 3 | App identity & config | M00, M12 |
| 4 | Structure & architecture rules | M00, M02, cross-cutting |
| 5.1–5.3 | DB connection, schema, migrations | M02 |
| 6.1–6.9 | Business rules | M03 (logic), M06–M09 (UI) |
| 7 | Onboarding wizard | M04 (+M11, M15 wire-ups) |
| 8 | Security, lock, staff login | M04, M19 |
| 9 | Navigation, More menu, search, FAB | M01, M06, M10, M16 |
| 10.1 | Dashboard | M10 |
| 10.2 | Members (list, form, profile, trash, import) | M06, M07, M08, M09, M11, M17 |
| 10.3 | Plans, PT, services | M05, M19 |
| 10.4 | Check-in / attendance / kiosk / staff attendance | M09, M19 |
| 10.5 | Payments & receipts | M08 |
| 10.6 | Membership card | M13 |
| 10.7 | Messages & reminders | M14 |
| 10.8 | Local notifications | M15 |
| 10.9 | Enquiries | M16 |
| 10.10 | Referrals | M16 |
| 10.11 | Expenses | M17 |
| 10.12 | Reports | M18 |
| 10.13 | Staff & roles | M19 |
| 10.14 | Branches | M19 |
| 10.15 | Backup & restore | M11 |
| 10.16 | Export data | M11 |
| 10.17 | Settings | M04 (store), M20 (all screens) |
| 10.18 | Activity log | M02 (writes), M19 (screen) |
| 10.19 | Help | M20 |
| 11 | i18n | M01, cross-cutting, M14 (templates), M20 |
| 12 | UI/UX guidelines | M01, cross-cutting, M20 |
| 13 | Data integrity & start-up pipeline | M02, M11, cross-cutting |
| 14 | Demo data | M20 |
| 15 | Permission keys, `can()`, `<Can>` | M03, M04, M19 |
| 16 | Out of scope | enforced throughout |
| 18 | GitHub Actions `.ipa` build | M12 |
| 19 | Acceptance criteria | M21 |
| 20 | Owner README | M12, M20 |
| 21 | Coding conventions | cross-cutting |
| 22 | Decisions log | updated whenever a decision changes |
