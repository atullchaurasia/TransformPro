# TransformPro Spec — Attendance / Check-in (spec §10.4)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.4 Attendance / Check-in tab

Three modes (segmented control at top):

1. **Scan QR** — full-screen camera (`expo-camera` `CameraView`, QR only). On scan:
   look up `member_code` (QR payload format: `TRANSFORMPRO:<member_code>`), run check-in
   rules (§6.8), show a big result card for 2 seconds:
   - ✅ green: photo, name, plan, days left — "Checked in 6:42 PM"
   - ⚠️ orange: expiring soon / dues pending (still checked in)
   - ⛔ red: expired / frozen — with "Renew" and "Override" buttons
   - Haptic feedback + optional sound. Auto-resume scanning. Debounce same code 5s.
   - **Kiosk mode** toggle: keeps screen awake (`expo-keep-awake`), front camera
     option, hides tabs, exit requires PIN — for leaving an iPad at the front desk.
2. **Search & mark** — search box + recent members; tap → check-in/check-out.
3. **Today's list** — everyone who checked in today with in/out times, filter
   inside/left, manual check-out, delete wrong entry (manager+).

Additional:
- **Attendance history** screen: pick date or range → list + count; export.
- **Absentees** list: active members not seen in X days (7/14/30) → bulk message.
- **Staff attendance**: staff check-in/out (manual), monthly staff attendance sheet.
