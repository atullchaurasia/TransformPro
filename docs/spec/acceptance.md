# TransformPro Spec — Acceptance Criteria — Final QA (spec §19)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

## 19. Acceptance Criteria (final QA checklist)

- [ ] App launches in Expo Go on iPhone with no warnings/red screens.
- [ ] Works in **Airplane Mode** for every feature (except opening WhatsApp/SMS to actually send).
- [ ] Onboarding → add plans → add member with payment → receipt PDF shares to WhatsApp.
- [ ] Member status correctly shows Active / Expiring / Expired / Frozen / Upcoming / No plan.
- [ ] Renewal of an active plan starts the day after current end date.
- [ ] Freeze extends the end date by frozen days.
- [ ] Dues calculate correctly with partial payments and refunds.
- [ ] QR check-in works from a shared membership card image shown on another phone.
- [ ] Expired member is blocked at check-in; override works and is logged.
- [ ] Dashboard numbers match reports for the same dates.
- [ ] Reminder queue sends via WhatsApp and advances; message log saved.
- [ ] Backup file created, saved to Files; **app deleted & reinstalled → restore → all
      data and photos back**.
- [ ] Staff with Receptionist role cannot see revenue, reports, or delete anything.
- [ ] App lock works with PIN and Face ID; locks after background timeout.
- [ ] Hindi language shows fully translated UI.
- [ ] Smooth with demo data of 5,000 members.
- [ ] `npx tsc --noEmit`, `npm test`, `npx expo-doctor` all pass.
- [ ] GitHub Action produces `TransformPro.ipa`; Sideloadly installs it on iPhone with a free
      Apple ID; data persists after re-signing.
