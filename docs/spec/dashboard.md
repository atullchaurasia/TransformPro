# TransformPro Spec — Dashboard (spec §10.1)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.1 Dashboard (Home)

Header: gym name/logo, greeting with staff name, today's date, search icon, lock icon.

**Today cards (tap each to open the filtered list):**
- Today's check-ins (count) + currently inside (checked in, not checked out)
- Today's collection (₹) with cash/UPI/card split
- Today's expenses (₹)
- New admissions today
- Renewals today

**Attention section:**
- Expiring today
- Expiring in next N days (N = `expiring_soon_days`)
- Expired in last 30 days (not renewed) — "win-back" list
- Members with dues (count + total ₹ due)
- Birthdays today (with one-tap "Send wishes")
- Anniversaries today
- Enquiry follow-ups due today / overdue
- Members absent for 7+ days (active members who haven't checked in)
- Frozen memberships ending soon

**Membership stats:** total members, active, expired, frozen, upcoming, no plan
(donut chart).

**This month:** collections vs last month (₹ and % change), expenses, net profit,
new admissions, renewals, renewal rate %.

**Charts:**
- Last 7 / 30 days collections (bar)
- Last 7 / 30 days attendance (line)
- Peak hours heatmap or bar (check-ins by hour of day, last 30 days)

**Backup banner:** if `last_backup_at` older than `backup_reminder_days` (or never),
show a yellow banner "Last backup: X days ago — Back up now".

Pull-to-refresh. Every number respects permissions (§8).
