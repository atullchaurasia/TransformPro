# TransformPro Spec — README.md for the Gym Owner (spec §20)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

## 20. README.md for the Gym Owner (Claude Code must write this)

Write `README.md` in **simple English** (non-technical reader, Windows user) covering:

1. **What this app is** and that data is stored only on the iPhone.
2. **One-time setup on Windows**: install Node.js LTS, Git, VS Code; clone repo; `npm install`.
3. **Run & test on iPhone with Expo Go**: `npx expo start` (and `--tunnel`), scan QR.
4. **Build the .ipa on GitHub (free)**: create GitHub account, push code, Actions tab →
   "Build iOS IPA (unsigned)" → Run workflow → wait ~15 min → download artifact zip →
   extract `TransformPro.ipa`.
5. **Install on iPhone with Sideloadly (free)**:
   - Install **iTunes** and **iCloud** for Windows from **apple.com** (not Microsoft Store).
   - Install Sideloadly from sideloadly.io.
   - Connect iPhone via USB → trust computer → drag `TransformPro.ipa` into Sideloadly →
     enter Apple ID → Start.
   - On iPhone: Settings → General → VPN & Device Management → trust your Apple ID.
   - Settings → Privacy & Security → **Developer Mode** → On → restart.
6. **Every 7 days: re-sign** (same Apple ID, same `.ipa` or newer, same bundle ID) —
   your data stays. Enable Sideloadly's auto-refresh if possible.
   ⚠️ **NEVER delete the app** from the iPhone — that deletes all gym data.
   ⚠️ **Never change the bundle identifier** after first install.
7. **Updating to a new version**: build new `.ipa` → install over the old one with
   Sideloadly → data stays.
8. **Backups**: how to back up weekly and copy the file to the Windows PC
   (Apple Devices app / iTunes → File Sharing → TransformPro, or email/WhatsApp to yourself),
   and how to restore on a new phone.
9. **Troubleshooting**: app won't open (signature expired → re-sign), "Untrusted
   developer", Developer Mode missing, Sideloadly login errors, build failures on GitHub.
10. **Limits of free Apple ID**: 7-day signing, max 3 sideloaded apps per device.
    Optional: Apple Developer Program (USD 99/yr) removes the 7-day limit later — no
    code changes needed.
