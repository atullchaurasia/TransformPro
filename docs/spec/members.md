# TransformPro Spec — Members (spec §10.2)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.2 Members

**List screen**
- Search bar (name / phone / code), instant filtering (debounced 200ms, SQL `LIKE`).
- Filter chips: All, Active, Expiring soon, Expired, Frozen, Upcoming, No plan, Has dues,
  Birthday this month, PT members, Gender, Plan (multi-select), Trainer, Branch, Joined
  date range.
- Sort: Name A–Z, Newest, Expiry date (soonest), Due amount (highest), Last visit.
- Each row: photo (or initials avatar with color), name, member code, phone, plan name,
  status badge (color coded), days left / "Expired 5d ago", due amount in red if any.
- Swipe actions: **Call**, **WhatsApp**, **Check-in**, **Renew**.
- Multi-select mode → bulk: send message (queue), export selected, move to trash,
  change branch, assign trainer.
- Header shows count of results. Empty state with "Add your first member" button.

**Add / Edit member form** (sections, collapsible; only name, phone, joining date required)
- Photo (camera or library; crop square)
- Basic: full name, phone (+ country code prefix), alternate phone, email, gender, DOB
  (with calculated age), anniversary
- Address: address, area, city, pincode
- Health: blood group, height, medical conditions, fitness goal
- Emergency contact: name, phone, relation
- ID proof: type (Aadhaar / PAN / Driving Licence / Voter ID / Passport / Other), number
  (mask Aadhaar to show last 4 only in lists)
- Gym: member code (auto, editable), joining date (default today), branch, assigned
  trainer, source, referred by (search existing member), notes
- **Step 2 — Plan & Payment** (on Add only; can skip):
  pick plan → start date (default today) → auto end date (editable) → price auto-filled
  → admission fee (toggle) → discount (₹ or %) with reason → tax line (if enabled) →
  **Total** → amount paid now (default total) → payment mode → reference →
  shows **balance due**.
  Optional: add PT plan and services in same flow.
- On save (single transaction): member + subscription(s) + payment + audit log.
- After save: success sheet with actions — **Send welcome message (WhatsApp)**,
  **Share receipt**, **Share membership card**, **Add another**, **Done**.

**Member profile screen** (`member/[id]`)
- Header: large photo, name, code, status badge, days left, due badge, phone.
- Action row: Call, WhatsApp, SMS, Check-in, Renew, Collect payment, Card, More (…).
- Tabs/segments:
  1. **Overview** — current membership (plan, start, end, days-left progress bar),
     current PT plan + trainer + sessions left, services, total paid lifetime, total due,
     last visit, visits this month, member since, referred by / referrals made, notes.
  2. **Plans** — history of all subscriptions (timeline), each with status, dates, amounts,
     paid/due; actions per subscription: Freeze / Unfreeze, Extend end date (with reason),
     Change plan (upgrade: prorate shown as suggestion), Cancel (with refund amount),
     Edit, Delete (owner only, only if no payments).
  3. **Payments** — list of payments with receipt numbers; tap → receipt preview
     (share PDF / WhatsApp); record new payment; refund; delete (owner only, audit logged).
  4. **Attendance** — calendar month view with checked-in days highlighted, list with
     in/out times, total visits per month, streak, average visit duration.
  5. **Measurements** — table + line charts (weight, BMI, body fat, waist…) over time,
     add/edit/delete entry, progress photo comparison (first vs latest side by side),
     share progress report as PDF.
  6. **Messages** — log of messages sent to this member.
- More menu: Edit, Share card, Generate QR, Move to Trash, Audit history for this member.

**Trash**
- Lists soft-deleted members (and payments/expenses/enquiries tabs).
- Restore or **Delete permanently** (owner only, confirmation by typing "DELETE").
- Auto-purge items older than 30 days (on app open), with setting to disable.

**Import members (CSV)**
- Download a sample CSV template (share sheet).
- Pick CSV → preview first 20 rows → map columns → validate (show errors per row) →
  import valid rows in a transaction. Optional columns for plan name, start/end date,
  amount paid to create subscriptions. Skip duplicates by phone (option).

**Clarifications (M06, see CLAUDE.md Decisions Log 2026-10-30)**
- "Active" chip includes Expiring soon; "Expired" chip includes In grace.
- One payment row / receipt number per subscription that receives money (plus one for an advance).
- Auto-purge is controlled by the setting `trash_auto_purge` (default on).

**Clarifications (M07, see CLAUDE.md Decisions Log 2026-10-30)**
- The profile route is `/members/[id]` (inside the Members tab).
- Change plan: the old plan ends yesterday; the suggested credit is the unused share of the old plan's total, pre-filled as a discount on the new plan.
- Cancel requires a reason; the refund can't exceed what was paid on that plan and is recorded as a refund payment.
- Overview also lists the member's personal details (Aadhaar masked to the last 4 digits).
