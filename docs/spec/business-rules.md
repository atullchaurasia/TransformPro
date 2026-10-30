# TransformPro Spec — Core Business Rules (spec §6)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

## 6. Core Business Rules (`src/domain/`) — unit test all of these

### 6.1 Membership status (computed, per member)

Given a member's subscriptions with `category = membership` (ignore cancelled):

- **Upcoming** – the latest subscription's `start_date` is after today.
- **Active** – today is between `start_date` and `end_date` (inclusive) and not frozen.
- **Frozen** – there is an open freeze on the current subscription.
- **Expiring soon** – Active **and** `end_date − today ≤ expiring_soon_days`.
- **In grace** – expired but within `grace_period_days` (treated as active for check-in, shown orange).
- **Expired** – latest `end_date` < today (minus grace).
- **No plan** – member has no membership subscriptions.

Also compute: `daysLeft`, `daysSinceExpiry`, current plan name, current trainer.
PT and service subscriptions have their own status shown separately on the profile.

### 6.2 End date calculation

- `months`: use `addMonths(start, n)` then `subDays(…, 1)`
  (e.g. start 31 Jan + 1 month → end 28/29 Feb; start 15 Mar → end 14 Apr).
- `days`: `start + n − 1`. `years`: `addYears` then `−1 day`.
- `sessions`: end date = start + optional validity (default 90 days); usage counted by
  `sessions_used`.

### 6.3 Renewal

- Renewing an **active/expiring** membership: new `start_date` = old `end_date + 1`
  (no lost days). Owner can override.
- Renewing an **expired** membership: default `start_date` = today. Option:
  "Start from expiry date" (backdate) for gyms that charge for gap days.
- Link with `renewed_from_subscription_id`.

### 6.4 Freeze

- Freeze from date X for N days (or open-ended until "Unfreeze").
- On unfreeze/end: `end_date += frozen days`, `frozen_days_total += days`.
- Enforce plan `max_freeze_days` / `max_freeze_times` unless owner overrides
  (owner/manager permission `membership.freeze_override`).
- Frozen members cannot check in (show message).

### 6.5 Dues

- **Subscription due** = `total_paise − sum(payments for that subscription, minus refunds)`.
- **Member due** = sum of subscription dues + any unlinked charges.
- Payment can be split across subscriptions; default applies to the oldest unpaid first.
- Overpayment is not allowed (show error) unless recorded as "advance" (store as a payment
  with no subscription; it auto-applies to the next subscription created).

### 6.6 Money & tax

- Integer paise everywhere. Format with `Intl.NumberFormat('en-IN', { style: 'currency', currency })`
  using Indian digit grouping (₹1,23,456.00). Hide `.00` when whole.
- If `tax_enabled`: compute GST either inclusive or exclusive per settings; show
  CGST/SGST split (half each) on invoices when GSTIN is set.

### 6.7 Codes

- Member code: `prefix + zero-padded next_member_number` (GYM0001). Increment atomically
  in the same transaction as the insert. Editable by owner, must stay unique.
- Receipt number: same pattern with `receipt_prefix`, never reused even after deletion.

### 6.8 Check-in rules

- Block if expired (setting `checkin_block_expired`), frozen, or (optional) has dues.
- Owner/manager can **override** a block with a reason (logged in audit log).
- One check-in per member per day unless `allow_multiple_checkins_per_day`.
- If already checked in today → offer **Check out**.
- Session-based plans: each check-in increments `sessions_used`; block at 0 remaining.
- Auto check-out: any open check-in older than `auto_checkout_hours` is closed
  automatically when the app opens.

### 6.9 Phone numbers

- Normalize on save: strip spaces, dashes, leading 0; if 10 digits, prepend country code
  digits (`91`). Validate Indian mobiles (`^[6-9]\d{9}$` after country code) but allow
  other formats when country code ≠ +91.
- **Duplicate check**: warn when adding a member/enquiry whose phone already exists
  (offer "Open existing").

### Clarifications (M03, see CLAUDE.md Decisions Log 2026-10-30)

- §6.2: when the month is too short (31 Jan + 1 month) the end is the last day of that month (28/29 Feb).
- §6.1: "Expiring soon" counts to the end of back-to-back renewals.
- §6.4: plan freeze limits of 0 mean "no limit".
- §6.6: with inclusive GST the total is base + admission − discount, and the tax is the GST inside it.
- §6.8: Upcoming and No-plan members follow `checkin_block_expired`; used-up session plans always block.

### Clarifications (M07)

- §6.3: renewals don't charge the admission fee by default; unapplied advances are linked to the renewal first.
- §6.4: a freeze starts between the plan start and today. Fixed freezes end by themselves after their last day; an open-ended freeze that ran past the plan limit adds only the allowed days unless the user can override.
