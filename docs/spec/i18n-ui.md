# TransformPro Spec — Languages & UI/UX Guidelines (spec §11–12)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

## 11. Languages (i18n)

- **All** user-facing strings go through `t('key')`. No hardcoded English in components.
- Ship `en.json` and `hi.json` complete. Structure so adding Marathi/Gujarati/Tamil/etc.
  is just a new JSON file. Language switch applies instantly without restart.
- Dates/numbers formatted with locale-aware helpers in `src/utils/format.ts`.
- Message templates are separate per language (store `language` in template or keep
  both versions seeded).

---

## 12. UI / UX Guidelines

- Clean, modern, **iOS-native feel**: large titles, grouped lists, bottom sheets for
  quick actions, native date pickers (`@react-native-community/datetimepicker` via
  `npx expo install`).
- **Brand color**: energetic orange `#FF6B2C` (primary), dark slate `#1E293B`,
  success `#16A34A`, warning `#F59E0B`, danger `#DC2626`, info `#2563EB`.
  Full **dark mode** palette. Define all colors as theme tokens.
- **Status badge colors**: Active green, Expiring soon amber, In grace orange,
  Expired red, Frozen blue, Upcoming purple, No plan gray.
- Minimum tap target 44pt. Big, readable numbers on dashboard. Support Dynamic Type
  reasonably (don't break layouts at larger sizes).
- Every list has: loading skeleton, empty state with illustration/icon + action,
  error state with retry.
- Every destructive action: confirmation dialog; permanent deletes need typed confirmation.
- Toasts/snackbars for success ("Payment of ₹2,000 recorded").
- Keyboard: avoid covering inputs (`KeyboardAvoidingView` / scroll), numeric keypad for
  phone & amounts, "Next" moves between fields.
- iPad: two-column layout for members list + profile where width ≥ 768.
- Performance: list of 5,000 members must scroll smoothly; dashboard loads < 500ms
  with 5,000 members / 20,000 payments / 100,000 attendance rows (use indexed SQL
  aggregates, not JS loops over all rows).
