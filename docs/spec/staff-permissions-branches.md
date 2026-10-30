# TransformPro Spec — Staff, Roles, Permissions & Branches (spec §10.13–10.14, §15)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.13 Staff & Roles

- Staff list: name, role, phone, active toggle.
- Add/edit staff: name, phone, role, PIN (set/reset by owner), branch, salary, join date,
  photo, permission checkboxes (pre-filled from role, customizable).
- Trainers see **My Members / My PT clients** filter.
- Staff detail: members added, payments collected, attendance.

**Default permissions by role** (see §15 for keys):
- **Owner** — everything.
- **Manager** — everything except: staff management, delete permanently, restore backup,
  settings.security.
- **Receptionist** — members (view/add/edit), check-in, record payments, enquiries,
  messages; **no** financial reports, no delete, no expenses view, no settings.
- **Trainer** — view members (assigned only by default), check-in, measurements,
  view PT clients; no payments, no reports.

### 10.14 Branches (optional multi-branch on one device)

- Settings → Branches: add multiple branches. If only one exists, hide all branch UI.
- When >1: branch switcher in Dashboard header ("All branches" for owner), branch field on
  members/payments/expenses/attendance, branch filter on lists and reports.
- Note in UI: branches are on this device only (no sync between devices).

## 15. Permission Keys (`src/domain/permissions.ts`)

```
members.view, members.view_all (vs assigned only), members.create, members.edit,
members.delete, members.delete_permanent, members.import, members.export,
membership.create, membership.renew, membership.freeze, membership.freeze_override,
membership.cancel, membership.edit_dates,
payments.view, payments.create, payments.refund, payments.delete,
attendance.mark, attendance.override_block, attendance.delete,
measurements.manage,
enquiries.view, enquiries.manage,
expenses.view, expenses.manage,
reports.view, reports.financial,
messages.send, templates.manage,
plans.manage, staff.manage, branches.manage,
settings.manage, settings.security,
backup.create, backup.restore, data.erase, audit.view
```

Provide a `can(staff, permissionKey)` helper and a `<Can permission="...">` component.
Hide (don't just disable) UI the user can't use.
