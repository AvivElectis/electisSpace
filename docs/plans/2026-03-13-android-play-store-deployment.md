# Android Play Store Deployment Plan

**Date:** 2026-03-13
**App:** electisSpace (`com.electisspace.app`)
**Current state:** Capacitor 7, Android project exists, builds unsigned APK in CI
**Goal:** Signed AAB → Google Play internal testing → production

---

## Decisions (from brainstorming session 2026-03-12)

| Decision | Choice |
|----------|--------|
| Release track | Internal testing first, then promote to production |
| CI/CD | Semi-automated: CI builds signed AAB → GitHub Release, manual upload to Play Console |
| Developer account | Needs creation ($25 one-time fee) |
| Keystore | Needs creation from scratch |
| Versioning | Sync from `package.json` — versionName = client version, versionCode = `major*10000 + minor*100 + patch` |
| Listing assets | Not ready — placeholder steps included |

---

## Current State Audit

| Item | Status | Detail |
|------|--------|--------|
| Capacitor | 7.x core, CLI 8.x | `@capacitor/core: ^7.4.4`, `@capacitor/cli: ^8.0.2` |
| Android project | Exists | `android/` with Gradle 8.11.1, AGP 8.7.2 |
| SDK versions | OK | compileSdk 35, targetSdk 35, minSdk 23 |
| Java | 21 (local), 17 (CI) | CI uses `actions/setup-java@v4` with Java 17 |
| Version | Stale | `versionCode: 1`, `versionName: "1.0"` — never updated |
| Signing | None | No keystore, no signing config in `build.gradle` |
| CI | Unsigned APK only | `release.yml` → `./gradlew assembleRelease` → artifact |
| google-services.json | Missing | Optional — only needed for push notifications |

---

## Implementation Steps

### Phase 1: Developer Account & Keystore Setup (Manual)

#### Step 1.1 — Create Google Play Developer Account
- [ ] Go to https://play.google.com/console/signup
- [ ] Sign up with Electis Google account
- [ ] Pay $25 registration fee
- [ ] Complete identity verification (can take 48h)

#### Step 1.2 — Generate Upload Keystore
```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore electisspace-upload.keystore \
  -alias electisspace \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Electis, OU=Development, O=Electis, L=Tel Aviv, ST=Israel, C=IL"
```
- [ ] Store keystore file securely (NOT in repo)
- [ ] Record the keystore password and key password
- [ ] Add to GitHub Secrets:
  - `ANDROID_KEYSTORE_BASE64` — `base64 -w 0 electisspace-upload.keystore`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS` = `electisspace`
  - `ANDROID_KEY_PASSWORD`

> **Note:** Google Play App Signing will manage the final signing key. This keystore is only the "upload key" used to verify builds come from you.

---

### Phase 2: Version Automation

#### Step 2.1 — Auto-sync version from package.json to Gradle

Create `android/app/version.gradle`:
```groovy
import groovy.json.JsonSlurper

def packageJson = new JsonSlurper().parseText(
    file("../../package.json").text
)
def versionParts = packageJson.version.split('\\.')
def major = versionParts[0] as int
def minor = versionParts[1] as int
def patch = versionParts[2] as int

ext {
    appVersionCode = major * 10000 + minor * 100 + patch
    appVersionName = packageJson.version
}
```

#### Step 2.2 — Update `android/app/build.gradle`

Replace the static version lines in `defaultConfig`:
```groovy
apply from: 'version.gradle'

// In defaultConfig:
versionCode appVersionCode    // 2.10.0 → 21000
versionName appVersionName    // "2.10.0"
```

**Current version 2.10.0 → versionCode 21000, versionName "2.10.0"**

---

### Phase 3: Signing Configuration

#### Step 3.1 — Add signing config to `android/app/build.gradle`

```groovy
android {
    signingConfigs {
        release {
            def keystoreFile = System.env.ANDROID_KEYSTORE_FILE ?: 'keystore.jks'
            if (file(keystoreFile).exists()) {
                storeFile file(keystoreFile)
                storePassword System.env.ANDROID_KEYSTORE_PASSWORD ?: ''
                keyAlias System.env.ANDROID_KEY_ALIAS ?: 'electisspace'
                keyPassword System.env.ANDROID_KEY_PASSWORD ?: ''
            }
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

#### Step 3.2 — Update `.gitignore`

Ensure these are ignored (some may already be):
```
*.keystore
*.jks
android/app/keystore.jks
```

---

### Phase 4: Build AAB Instead of APK

#### Step 4.1 — Update CI workflow (`.github/workflows/release.yml`)

Replace the current `build-android` job:

```yaml
build-android:
  name: Build Android (Capacitor)
  runs-on: ubuntu-latest

  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'

    - name: Setup Java
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'

    - name: Install dependencies
      run: npm ci

    - name: Build web app
      run: npm run build

    - name: Sync Capacitor
      run: npx cap sync android

    - name: Decode keystore
      run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/keystore.jks

    - name: Build signed AAB
      working-directory: ./android
      env:
        ANDROID_KEYSTORE_FILE: app/keystore.jks
        ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
        ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
        ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      run: ./gradlew bundleRelease

    - name: Upload AAB artifact
      uses: actions/upload-artifact@v4
      with:
        name: android-aab
        path: android/app/build/outputs/bundle/release/*.aab
        retention-days: 30

    - name: Also build APK for direct install
      working-directory: ./android
      env:
        ANDROID_KEYSTORE_FILE: app/keystore.jks
        ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
        ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
        ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      run: ./gradlew assembleRelease

    - name: Upload APK artifact
      uses: actions/upload-artifact@v4
      with:
        name: android-apk
        path: android/app/build/outputs/apk/release/*.apk
        retention-days: 30
```

Update the `create-release` job to attach both AAB and APK to the GitHub Release.

#### Step 4.2 — Update artifact references in `create-release`

```yaml
- name: Download Android AAB
  uses: actions/download-artifact@v4
  with:
    name: android-aab
    path: ./release-artifacts/android

- name: Download Android APK
  uses: actions/download-artifact@v4
  with:
    name: android-apk
    path: ./release-artifacts/android

# In the release files list:
files: |
  release-artifacts/windows/*.exe
  release-artifacts/windows/latest.yml
  release-artifacts/android/*.aab
  release-artifacts/android/*.apk
```

---

### Phase 5: Capacitor CLI Version Alignment

#### Step 5.1 — Align CLI with core

Currently `@capacitor/cli: ^8.0.2` but `@capacitor/core: ^7.4.4`. These should match major versions.

```bash
npm install --save-dev @capacitor/cli@^7
```

Or if upgrading core to 8:
```bash
npm install @capacitor/core@^8 @capacitor/android@^8 @capacitor/app@^8 \
  @capacitor/browser@^8 @capacitor/device@^8 @capacitor/filesystem@^8 \
  @capacitor/network@^8 @capacitor/preferences@^8
```

> **Decision needed at implementation time:** Check Capacitor 8 changelog for breaking changes. If minimal, upgrade all to 8. Otherwise pin CLI to 7.

---

### Phase 6: Play Store Setup (Manual)

#### Step 6.1 — Create App in Play Console
- [ ] Go to Play Console → Create app
- [ ] App name: "electisSpace"
- [ ] Default language: English (United States)
- [ ] App type: App (not game)
- [ ] Free or paid: Free
- [ ] Declarations: complete content declarations

#### Step 6.2 — Enable Play App Signing
- [ ] In Release → Setup → App signing, opt in to Google Play App Signing
- [ ] Upload the upload keystore certificate (exported from the keystore created in Step 1.2):
  ```bash
  keytool -export -alias electisspace \
    -keystore electisspace-upload.keystore \
    -file upload-cert.pem -rfc
  ```

#### Step 6.3 — Store Listing (Minimum Required)
- [ ] Short description (80 chars max): "ESL management system for SoluM AIMS"
- [ ] Full description (4000 chars max): Describe electisSpace features
- [ ] App icon: 512x512 PNG
- [ ] Feature graphic: 1024x500 PNG
- [ ] Screenshots: min 2 phone screenshots (min 320px, max 3840px per side)
  - Dashboard view
  - Spaces management view
- [ ] Privacy policy URL (required)
- [ ] App category: Business → Office

#### Step 6.4 — Content Rating
- [ ] Complete the IARC questionnaire (straightforward for a business app)

#### Step 6.5 — Target Audience & Content
- [ ] Target age group: 18+ (business app)
- [ ] Not designed for children

---

### Phase 7: First Internal Test Release

#### Step 7.1 — Build & Upload
1. Tag a release: `git tag v2.10.0 && git push --tags`
2. CI builds signed AAB → attached to GitHub Release
3. Download the `.aab` from GitHub Release
4. In Play Console → Internal testing → Create new release
5. Upload the `.aab`
6. Add release notes
7. Review and roll out to internal testers

#### Step 7.2 — Add Internal Testers
- [ ] Create an email list in Play Console (Internal testing → Testers)
- [ ] Add tester emails
- [ ] Share the opt-in URL with testers

#### Step 7.3 — Verify
- [ ] Testers can install from Play Store (internal track)
- [ ] App opens, login works, data loads
- [ ] Version displayed matches `2.10.0`
- [ ] Test a second release to verify update flow works

---

### Phase 8: Promote to Production

Once internal testing is validated:

1. Play Console → Internal testing → Promote to Production
2. Review all store listing details
3. Submit for review (typically 1-3 days for first app)
4. Once approved, app is live on Google Play

---

## File Changes Summary

| File | Change |
|------|--------|
| `android/app/version.gradle` | **New** — reads version from `package.json` |
| `android/app/build.gradle` | Add signing config, version.gradle import, AAB build |
| `.github/workflows/release.yml` | Signed AAB build, keystore decode, dual artifact upload |
| `.gitignore` | Ensure `*.keystore`, `*.jks` are ignored |
| `package.json` | Align `@capacitor/cli` version with core |

## GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | `electisspace` |
| `ANDROID_KEY_PASSWORD` | Key password |

## Timeline Estimate

| Phase | Dependency | Blocker? |
|-------|-----------|----------|
| 1. Account & keystore | Manual setup | **Yes** — blocks everything |
| 2. Version automation | None | No |
| 3. Signing config | Phase 1 keystore | No (can prep code first) |
| 4. CI AAB build | Phase 1 secrets | No (can prep code first) |
| 5. CLI alignment | None | No |
| 6. Play Store setup | Phase 1 account | **Yes** — blocks upload |
| 7. Internal test | All above | — |
| 8. Production | Phase 7 validated | — |

**Phases 2-5 can be implemented immediately.** Phases 1 & 6 require manual account/keystore setup and can happen in parallel.
