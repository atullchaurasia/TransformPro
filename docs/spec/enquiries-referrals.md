# TransformPro Spec — Enquiries & Referrals (spec §10.9–10.10)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.9 Enquiries / Leads

- List with segments: Hot 🔴 / Warm 🟠 / Cold 🔵 / Converted 🟢 / Lost ⚫ and "Follow-up due".
- Add enquiry: name, phone (duplicate check vs members and enquiries), gender, age,
  source, interested plan, fitness goal, status, next follow-up date+time, trial date,
  assigned staff, notes.
- Enquiry detail: info, follow-up timeline (add follow-up: channel, outcome, next date,
  new status), actions Call / WhatsApp / SMS, **Convert to member** (pre-fills member
  form, links `converted_member_id`, status → converted), **Mark lost** (reason).
- Stats: enquiries this month, conversion rate %, by source (pie chart).

### 10.10 Referrals

- Member form "Referred by" links members.
- Referrals screen: leaderboard of members by number of successful referrals,
  list of who referred whom, date. Optional reward note field (e.g. "1 month free given").
