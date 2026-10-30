# TransformPro Spec — Digital Membership Card (spec §10.6)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

### 10.6 Digital Membership Card

- Three designs: **Modern** (gradient), **Classic** (white, bordered), **Bold** (dark).
- Shows: gym logo + name, member photo, name, member code, plan, valid from–to,
  phone, blood group (optional toggle), **QR code** (`TRANSFORMPRO:<member_code>`).
- Rendered as a React view → captured with `react-native-view-shot` → PNG →
  share sheet (WhatsApp/email/save to Photos).
- Bulk: generate cards for selected members (sequentially) and share.
