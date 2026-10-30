# TransformPro Spec — Plans, PT & Services (spec §10.3)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.3 Plans, Personal Training & Services

- Three segments: **Memberships**, **Personal Training**, **Services**.
- CRUD with fields from §5.2. Show active member count per plan.
- Reorder (sort_order), deactivate (hidden from pickers, history kept).
- Price change never alters existing subscriptions (snapshots).
- PT plans: pick trainer on assignment; trainer sees "My PT clients".
- Services: e.g. Locker (monthly), Steam, Diet plan — can have duration or be one-time.
