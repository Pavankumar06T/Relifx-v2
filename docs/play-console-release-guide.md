# Google Play Console Release & Staged Rollout Guide — ReLifeX

This guide documents the release configuration, keystore management, service account credentials, and staged rollout procedures for the ReLifeX mobile application.

---

## 1. Prerequisites & App Identity

- **Package Name / Application ID**: `com.relifex.app`
- **Minimum SDK**: 24 (Android 7.0 Nougat)
- **Target SDK**: 34+ (Android 14)
- **Artifact Format**: Android App Bundle (`.aab`)

---

## 2. Release Tracks Architecture

ReLifeX follows a multi-tier staged release methodology:

| Track | Target Audience | Purpose | Rollout Fraction |
| :--- | :--- | :--- | :--- |
| **Internal Testing** | Internal developers & QA | Immediate build verification | 100% (Instant) |
| **Closed Testing (Alpha)** | Clinical testers & pilot users | Feature acceptance testing | 100% |
| **Open Testing (Beta)** | Opted-in public beta testers | Stress & performance validation | 100% |
| **Production Staged Rollout** | General public users | Phased release to minimize risk | 10% → 25% → 50% → 100% |

---

## 3. Staged Rollout Progression Plan

To prevent widespread regressions or crashes in production:

1. **Phase 1 — 10% Canary (Day 1 - 2)**:
   - Monitor crash-free user rate (must exceed 99.0%).
   - Monitor ANR rate (must be below 0.47%).
   - Validate Google Fit connection success rates.

2. **Phase 2 — 25% Expansion (Day 3 - 5)**:
   - Monitor customer support logs and API latencies on Render/AWS backend.
   - Verify medicine cart and ordering conversions.

3. **Phase 3 — 50% Expansion (Day 6 - 7)**:
   - Ensure backend database connection pools and FCM push volumes scale stably.

4. **Phase 4 — 100% Full Rollout (Day 8+)**:
   - Complete rollout to all active Android users.

---

## 4. Emergency Halt & Rollback Procedure

If the crash rate exceeds **1.5%** or critical defects emerge:
1. Open Google Play Console → **Release overview** → **Production**.
2. Click **Halt rollout**.
3. Revert to the previous stable release version code, or patch the hotfix and deploy a new build with an incremented `versionCode`.

---

## 5. Automated CI/CD Deployment

A GitHub Actions workflow is provisioned at `.github/workflows/play-console-release.yml`.

### Required GitHub Secrets:
- `PLAY_CONSOLE_SERVICE_ACCOUNT_JSON`: Service account JSON key with `Release Manager` permissions in the Google Play Console API access settings.
- `ANDROID_KEYSTORE_BASE64`: Base64-encoded release upload keystore.
- `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`: Android signing key credentials.
