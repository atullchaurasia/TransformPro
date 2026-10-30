# TransformPro Spec — Onboarding, Security & App Lock (spec §7–8)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

## 7. First-Run Onboarding Wizard (`app/onboarding/`)

Shown when `onboarding_complete = false`. Steps (with progress dots, Back/Next):

1. **Welcome** — app name, "Your data stays only on this iPhone" explanation,
   language picker (English / हिन्दी).
2. **Gym details** — gym name (required), logo (optional, from photos), phone, address,
   email, GSTIN (optional).
3. **Owner account** — owner name, phone, **create 4–6 digit PIN** (enter twice),
   toggle **Use Face ID** (only if device supports it).
4. **Preferences** — currency (default INR ₹), country code (+91), date format,
   expiring-soon days (7), grace days (0).
5. **Plans** — the seeded plans listed with price fields to fill; add/remove.
6. **Restore option** — "Already have a backup? Restore it" (jumps to restore flow).
7. **Done** — set `onboarding_complete = true`, schedule local notifications, go to Dashboard.

---

## 8. Security, App Lock & Staff Login

- **Lock screen** shows on cold start and after the app has been in background longer
  than `lock_after_minutes`.
- Unlock with **Face ID / Touch ID** (if enabled) or **PIN keypad** (custom large keypad UI).
- Multi-staff: lock screen shows staff avatars → tap a person → enter their PIN.
  The **current staff member** is stored in zustand and used for `created_by`,
  `received_by`, audit log, and permission checks.
- 5 wrong PIN attempts → 30-second cooldown, doubling each time.
- **Forgot PIN (owner)**: not recoverable online (no cloud). Offer: "Unlock using Face ID
  to reset PIN" if biometrics enabled; otherwise show instructions that data can only be
  recovered by restoring a backup after reinstall. Make this clear during onboarding.
- PIN stored as `SHA-256(salt + pin)` — never plain text.
- "Switch user" and "Lock now" buttons in the More tab.
- Hide sensitive numbers (revenue, collections) for roles without
  `reports.financial` permission — show "••••" instead.
