# TransformPro Spec — Building the .ipa for Free (spec §18)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

## 18. Building the `.ipa` for Free (GitHub Actions, no Mac)

Create `.github/workflows/build-ios.yml`. It builds an **unsigned** `.ipa` on GitHub's
free macOS runner. Sideloadly signs it later on Windows with a free Apple ID.

```yaml
name: Build iOS IPA (unsigned)

on:
  workflow_dispatch:        # "Run workflow" button on GitHub
  push:
    tags: ['v*']            # or push a tag like v1.0.0

jobs:
  build-ios:
    runs-on: macos-15
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4

      # Use the Xcode version required by the installed Expo SDK (check Expo docs).
      - uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Generate native iOS project
        run: npx expo prebuild --platform ios --clean --no-install

      - name: Remove push-notification entitlement (not allowed with free Apple ID)
        run: |
          find ios -name "*.entitlements" -exec /usr/libexec/PlistBuddy -c "Delete :aps-environment" {} \; || true

      - name: Install CocoaPods
        run: cd ios && pod install

      - name: Build (unsigned)
        run: |
          xcodebuild \
            -workspace ios/TransformPro.xcworkspace \
            -scheme TransformPro \
            -configuration Release \
            -sdk iphoneos \
            -destination 'generic/platform=iOS' \
            -archivePath "$PWD/build/TransformPro.xcarchive" \
            archive \
            CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""

      - name: Package .ipa
        run: |
          mkdir -p Payload
          cp -R build/TransformPro.xcarchive/Products/Applications/TransformPro.app Payload/
          zip -qry TransformPro.ipa Payload

      - uses: actions/upload-artifact@v4
        with:
          name: TransformPro-ipa
          path: TransformPro.ipa
          retention-days: 14
```

Notes for Claude Code:
- If the workspace/scheme name differs after prebuild, list `ios/` and fix the names.
- `ios/` and `android/` folders are generated — add them to `.gitignore`
  (Continuous Native Generation). All native config goes through `app.json` / config plugins.
- Make sure the JS bundle is embedded in the Release build (it is by default with Expo).
- Do not use EAS Build (requires paid Apple account for device builds).
- Private repos have limited free macOS minutes (macOS minutes count 10×); keep builds
  lean and only trigger manually or on tags. Public repos are unlimited — but tell the
  owner in the README that the **code** would be public (gym data is never in the repo).
- Increment `version` / `ios.buildNumber` in `app.json` for each release.
