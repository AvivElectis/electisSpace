# electisCompass — Mobile Biometric Authentication

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Context:** Compass mobile app (Capacitor 7) supports device-level authentication using fingerprint, Face ID, and device PIN as alternatives to email+code login.

---

## 1. Overview

Mobile Compass users should be able to unlock the app quickly without re-entering their email+code on every session. Three mechanisms work together:

| Mechanism | Purpose | Persistence |
|-----------|---------|-------------|
| **Device Token** | Auto-login for returning users | Stored in Capacitor Preferences (encrypted) |
| **Biometric Lock** | Protect app access with fingerprint/face | Guards device token access |
| **Refresh Token** | Maintain session without re-auth | httpOnly cookie (web) or Capacitor Preferences (native) |

---

## 2. Auth Flow with Biometrics

```
┌────────────────────────────────────────────────────────────────┐
│                     App Launch (Capacitor)                       │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Check stored tokens  │
                 │ (Capacitor Prefs)    │
                 └───┬─────────────┬───┘
                     │             │
               Has tokens     No tokens
                     │             │
                     ▼             ▼
          ┌──────────────────┐  ┌──────────────────┐
          │ Biometric enabled?│  │  Welcome Screen   │
          └──┬────────────┬──┘  │  → Login Flow     │
             │            │     └──────────────────┘
           Yes           No
             │            │
             ▼            ▼
    ┌─────────────┐  ┌──────────────────┐
    │ Show Native │  │ Auto-refresh     │
    │ Biometric   │  │ using stored     │
    │ Prompt      │  │ device token     │
    │             │  └────────┬─────────┘
    │ ┌─────────┐│           │
    │ │ 🔐      ││      ┌────┴────┐
    │ │ Touch   ││    Valid    Invalid
    │ │ your    ││      │         │
    │ │ finger  ││      │         ▼
    │ │ sensor  ││      │   ┌──────────┐
    │ │         ││      │   │ Clear    │
    │ │ [Use    ││      │   │ tokens → │
    │ │  PIN]   ││      │   │ Login    │
    │ └─────────┘│      │   └──────────┘
    └──┬──────┬──┘      │
       │      │         │
     Pass   Fail        │
       │      │         │
       │    ┌─┴──────┐  │
       │    │3 fails?│  │
       │    └┬─────┬─┘  │
       │    No    Yes   │
       │     │     │    │
       │     │     ▼    │
       │     │  ┌──────────┐
       │     │  │ Force    │
       │     │  │ email+   │
       │     │  │ code     │
       │     │  │ login    │
       │     │  └──────────┘
       │     │
       │     ▼
       │  Retry biometric
       │
       ▼
  ┌──────────────────┐
  │ Refresh access   │
  │ token using      │
  │ device token     │
  │ + refresh token  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │   Home Screen    │
  └──────────────────┘
```

---

## 3. Capacitor Biometric Plugin

### 3.1 Plugin: `@capacitor-community/biometric-auth`

```typescript
// compass/src/shared/infrastructure/biometric.ts

import { BiometricAuth, BiometryType } from '@capacitor-community/biometric-auth';
import { Capacitor } from '@capacitor/core';

export interface BiometricCapability {
  isAvailable: boolean;
  biometryType: 'FINGERPRINT' | 'FACE_ID' | 'IRIS' | 'NONE';
  strongLevel: boolean;   // Android: Class 3 (strong) biometric
}

export async function checkBiometricAvailability(): Promise<BiometricCapability> {
  if (!Capacitor.isNativePlatform()) {
    return { isAvailable: false, biometryType: 'NONE', strongLevel: false };
  }

  try {
    const result = await BiometricAuth.checkBiometry();
    return {
      isAvailable: result.isAvailable,
      biometryType: mapBiometryType(result.biometryType),
      strongLevel: result.strongBiometryIsAvailable ?? false,
    };
  } catch {
    return { isAvailable: false, biometryType: 'NONE', strongLevel: false };
  }
}

export async function authenticateWithBiometric(
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Use Email Code',
      allowDeviceCredential: true,  // Allow PIN/pattern as fallback
      iosFallbackTitle: 'Enter Passcode',
      androidTitle: 'Compass Authentication',
      androidSubtitle: 'Verify your identity',
    });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    return {
      success: false,
      error: err.code === 'userCancel' ? 'USER_CANCELLED' : 'BIOMETRIC_FAILED',
    };
  }
}

function mapBiometryType(type: BiometryType): BiometricCapability['biometryType'] {
  switch (type) {
    case BiometryType.fingerprintAuthentication:
    case BiometryType.touchId:
      return 'FINGERPRINT';
    case BiometryType.faceAuthentication:
    case BiometryType.faceId:
      return 'FACE_ID';
    case BiometryType.irisAuthentication:
      return 'IRIS';
    default:
      return 'NONE';
  }
}
```

### 3.2 Secure Token Storage

```typescript
// compass/src/shared/infrastructure/secureStorage.ts

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// On native: Capacitor Preferences uses Android EncryptedSharedPreferences
// On web: falls back to localStorage (less secure, acceptable for PWA)

const DEVICE_TOKEN_KEY = 'compass_device_token';
const REFRESH_TOKEN_KEY = 'compass_refresh_token';
const BIOMETRIC_ENABLED_KEY = 'compass_biometric_enabled';

export async function storeTokens(deviceToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    Preferences.set({ key: DEVICE_TOKEN_KEY, value: deviceToken }),
    Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken }),
  ]);
}

export async function getStoredTokens(): Promise<{
  deviceToken: string | null;
  refreshToken: string | null;
}> {
  const [device, refresh] = await Promise.all([
    Preferences.get({ key: DEVICE_TOKEN_KEY }),
    Preferences.get({ key: REFRESH_TOKEN_KEY }),
  ]);
  return {
    deviceToken: device.value,
    refreshToken: refresh.value,
  };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    Preferences.remove({ key: DEVICE_TOKEN_KEY }),
    Preferences.remove({ key: REFRESH_TOKEN_KEY }),
  ]);
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: String(enabled) });
}

export async function isBiometricEnabled(): Promise<boolean> {
  const result = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  return result.value === 'true';
}
```

---

## 4. Auth Store Integration

```typescript
// compass/src/features/auth/application/useAuthStore.ts

interface AuthState {
  // Token state
  accessToken: string | null;
  user: CompanyUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Biometric state
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricType: 'FINGERPRINT' | 'FACE_ID' | 'IRIS' | 'NONE';

  // Actions
  initializeAuth: () => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  loginWithDeviceToken: () => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

// Auth initialization flow (called on app start)
async function initializeAuth() {
  set({ isLoading: true });

  // 1. Check biometric capability
  const bioCapability = await checkBiometricAvailability();
  set({
    biometricAvailable: bioCapability.isAvailable,
    biometricType: bioCapability.biometryType,
  });

  // 2. Check stored tokens
  const tokens = await getStoredTokens();
  if (!tokens.deviceToken) {
    set({ isLoading: false });
    return; // No stored session → show login screen
  }

  // 3. Check if biometric is enabled
  const bioEnabled = await isBiometricEnabled();
  set({ biometricEnabled: bioEnabled });

  if (bioEnabled && bioCapability.isAvailable) {
    // Don't auto-login — wait for biometric prompt
    set({ isLoading: false });
    return;
  }

  // 4. Auto-login with device token (no biometric configured)
  try {
    await get().loginWithDeviceToken();
  } catch {
    // Device token expired or revoked → show login screen
    await clearTokens();
    set({ isLoading: false });
  }
}
```

---

## 5. Server-Side Device Token API

```typescript
// server/src/features/compass-auth/compass-auth.routes.ts

// POST /api/v2/compass/auth/device-login
// Authenticate using stored device token
router.post('/device-login', async (req, res) => {
  const { deviceToken } = deviceLoginSchema.parse(req.body);
  const result = await compassAuthService.loginWithDeviceToken(deviceToken);
  res.json({ data: result });
});

// POST /api/v2/compass/auth/device-register
// Register a new device after email+code login
router.post('/device-register', compassAuth, async (req, res) => {
  const { platform, deviceName } = deviceRegisterSchema.parse(req.body);
  const token = await compassAuthService.registerDevice(req.userId, platform, deviceName);
  res.json({ data: { deviceToken: token } });
});

// DELETE /api/v2/compass/auth/devices/:deviceId
// Revoke a specific device
router.delete('/devices/:deviceId', compassAuth, async (req, res) => {
  await compassAuthService.revokeDevice(req.userId, req.params.deviceId);
  res.json({ data: { success: true } });
});

// GET /api/v2/compass/auth/devices
// List all active devices for session management
router.get('/devices', compassAuth, async (req, res) => {
  const devices = await compassAuthService.listDevices(req.userId);
  res.json({ data: devices });
});
```

### Device Token Service

```typescript
// Device token format: random 64-byte hex string
// Stored as bcrypt hash in database (like passwords)
// One token per device — re-registration replaces old token

interface DeviceToken {
  id: string;
  userId: string;
  tokenHash: string;          // bcrypt hash of the device token
  platform: 'ANDROID' | 'IOS' | 'WEB';
  deviceName: string | null;  // e.g., "Pixel 7", "iPhone 15"
  lastUsedAt: Date;
  createdAt: Date;
}

async function loginWithDeviceToken(rawToken: string): Promise<AuthTokens> {
  // Find all device tokens and check hash (like password verification)
  const devices = await this.tokenRepo.findAll();

  for (const device of devices) {
    const valid = await bcrypt.compare(rawToken, device.tokenHash);
    if (valid) {
      const user = await this.userRepo.findById(device.userId);
      if (!user || !user.isActive) throw new UnauthorizedError('ACCOUNT_DEACTIVATED');

      // Update last used timestamp
      await this.tokenRepo.updateLastUsed(device.id);

      // Issue new access + refresh tokens
      return {
        accessToken: this.signAccessToken(user),
        refreshToken: this.signRefreshToken(user),
      };
    }
  }

  throw new UnauthorizedError('INVALID_DEVICE_TOKEN');
}
```

---

## 6. Biometric Configuration Screen

```
┌─────────────────────────────────────┐
│ 🔒 Security Settings               │
├─────────────────────────────────────┤
│                                     │
│ Biometric Unlock                    │
│ ┌─────────────────────────────────┐ │
│ │ Use fingerprint to unlock       │ │
│ │ Compass when opening the app    │ │
│ │                                 │ │
│ │ Status: Enabled                 │ │
│ │ Type: Fingerprint               │ │
│ │                    [━━━● On]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Active Sessions                     │
│ ┌─────────────────────────────────┐ │
│ │ 📱 Pixel 7 (this device)       │ │
│ │    Last active: now             │ │
│ │                                 │ │
│ │ 📱 Samsung Galaxy S24          │ │
│ │    Last active: 2 days ago     │ │
│ │    [Revoke]                    │ │
│ │                                 │ │
│ │ 🌐 Chrome (Web)                │ │
│ │    Last active: 1 week ago     │ │
│ │    [Revoke]                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🚪 Logout from all devices     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Token theft from device** | Biometric gate required before token access. Android EncryptedSharedPreferences. |
| **Root/jailbreak** | Capacitor detects rooted devices. Show warning but don't block (user choice). |
| **Biometric spoofing** | Use Android Class 3 (strong) biometrics when available. Allow PIN fallback for usability. |
| **Stolen device** | Admin can revoke all devices via electisSpace. User can revoke via another device session. |
| **Device token brute-force** | Tokens are 64-byte random (512 bits entropy). Rate-limited at 5 attempts/minute. |
| **Token hash performance** | bcrypt with cost=10. ~100ms per compare. Lookup by userId first to reduce hash comparisons. |
| **Session fixation** | Device token is one-time-use for generating new access/refresh tokens. Original token stays valid. |
| **Web PWA fallback** | Biometric not available on web. Use standard refresh token in httpOnly cookie. |

---

## 8. Platform-Specific Notes

### Android (Capacitor 7)
- Minimum: Android 9 (API 28) for BiometricPrompt
- Uses `BiometricPrompt` from AndroidX
- `EncryptedSharedPreferences` for token storage
- `allowDeviceCredential: true` — allows PIN/pattern as biometric fallback

### iOS (Phase 2)
- Face ID requires `NSFaceIDUsageDescription` in Info.plist
- Touch ID available on older devices
- Keychain used for token storage (with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`)
- `LAContext` for biometric authentication

### Web (PWA Fallback)
- WebAuthn API available on modern browsers (optional, Phase 3)
- No native biometric — rely on device token + refresh cookie
- localStorage for device token (acceptable security for PWA use case)
