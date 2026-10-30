# TransformPro Spec — Messages, Reminders & Local Notifications (spec §10.7–10.8)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.7 Messages & Reminders (no automatic sending — one tap per message)

**Templates** (editable, with live preview). Placeholders:
`{member_name}`, `{first_name}`, `{member_code}`, `{gym_name}`, `{gym_phone}`,
`{plan_name}`, `{start_date}`, `{expiry_date}`, `{days_left}`, `{days_since_expiry}`,
`{due_amount}`, `{paid_amount}`, `{receipt_no}`, `{trainer_name}`, `{today}`.

Seed these system templates in **English and Hindi**:
- Welcome (new member)
- Expiry reminder (X days before)
- Expires today
- Expired (win-back)
- Dues reminder
- Payment received / thank you
- Renewal thank you
- Birthday wishes
- Anniversary wishes
- Absent ("We miss you")
- Enquiry follow-up
- Festival / holiday notice (custom)
- Gym closed / timing change (custom)

**Sending:**
- WhatsApp: `whatsapp://send?phone=<digits>&text=<urlencoded>`; if WhatsApp not installed,
  fall back to `https://wa.me/<digits>?text=...`. Option to prefer **WhatsApp Business**
  (`whatsapp-business://` — fall back if unavailable).
- SMS: `sms:<number>&body=<urlencoded>` (iOS format).
- Call: `tel:<number>`. Email: `mailto:`.
- Attach files (receipt PDF / card PNG): use the **share sheet** (`expo-sharing`) since
  URL schemes cannot attach files; copy the message text to clipboard first
  (`expo-clipboard`) and tell the user "Message copied — paste in WhatsApp".

**Reminder center** (`messages/`):
- Smart lists with counts: Expiring in N days, Expiring today, Expired (last 7/30 days),
  Dues pending, Birthdays today, Anniversaries today, Absent X days,
  Enquiry follow-ups due.
- Open a list → choose template → **Send queue** screen: shows one member at a time with
  the rendered message; buttons **Send via WhatsApp** / **SMS** / **Skip** / **Next**.
  After returning from WhatsApp, auto-advance and mark as sent in `message_log`.
  Show progress "12 / 40 sent". Members already messaged today are marked.
- **Broadcast**: pick any filter (all active, all members, by plan, by gender, custom
  selection) + template → same send queue.

### 10.8 Local Notifications (on-device only)

Using `expo-notifications` **local scheduled** notifications (no push, no tokens):
- **Daily summary** at `daily_summary_time`: "Today: 4 memberships expire, 2 birthdays,
  3 follow-ups, ₹12,500 dues pending." (Recompute and reschedule each time the app opens
  and after relevant writes — schedule the next 7 days.)
- **Enquiry follow-up** reminders at the chosen follow-up date/time.
- **Backup reminder** every `backup_reminder_days`.
- **Freeze ending** reminders.
- Settings screen to toggle each type. Ask permission politely with an explanation screen first.
