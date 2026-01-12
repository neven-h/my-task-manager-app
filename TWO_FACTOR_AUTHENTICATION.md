# 🔐 Two-Factor Authentication (2FA) Documentation

## Overview

Two-Factor Authentication (2FA) adds an extra layer of security to your Task Manager account by requiring both:
1. **Something you know** - Your password
2. **Something you have** - Your phone with an authenticator app

This implementation uses **TOTP** (Time-based One-Time Password) compatible with popular authenticator apps like Google Authenticator, Microsoft Authenticator, and Authy.

---

## 🚀 For Users: How to Enable 2FA

### Step 1: Download an Authenticator App

Choose one of these apps (all are free):
- **Google Authenticator** - [iOS](https://apps.apple.com/app/google-authenticator/id388497605) | [Android](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- **Microsoft Authenticator** - [iOS](https://apps.apple.com/app/microsoft-authenticator/id983156458) | [Android](https://play.google.com/store/apps/details?id=com.azure.authenticator)
- **Authy** - [iOS](https://apps.apple.com/app/twilio-authy/id494168017) | [Android](https://play.google.com/store/apps/details?id=com.authy.authy) | [Desktop](https://authy.com/download/)
- **1Password** (requires subscription)

### Step 2: Set Up 2FA in Task Manager

1. Log in to your Task Manager account
2. Navigate to **Settings** → **Security** → **Two-Factor Authentication**
3. Click **"Enable 2FA"**
4. A QR code will appear on the screen

### Step 3: Scan the QR Code

1. Open your authenticator app
2. Tap **"Add account"** or the **"+"** button
3. Choose **"Scan QR code"**
4. Point your camera at the QR code on the screen
5. The app will add "Task Manager" to your list

### Step 4: Verify Your Setup

1. Your authenticator app will show a 6-digit code that changes every 30 seconds
2. Enter this code in the Task Manager verification field
3. Click **"Verify and Enable"**

### Step 5: Save Your Backup Codes

**⚠️ CRITICAL: DO NOT SKIP THIS STEP!**

After verification, you'll see 10 backup codes. **Save these immediately!**

```
a1b2c3d4
e5f6g7h8
i9j0k1l2
m3n4o5p6
q7r8s9t0
u1v2w3x4
y5z6a7b8
c9d0e1f2
g3h4i5j6
k7l8m9n0
```

**How to save them:**
- Screenshot and save to a secure folder
- Print and store in a safe place
- Save in a password manager (recommended)
- **DON'T** email them to yourself

**Why backup codes matter:**
- If you lose your phone, you can still log in
- Each code works only ONCE
- You have 10 codes total

---

## 🔒 How 2FA Login Works

### Without 2FA (Before):
1. Enter username and password
2. Click "Login"
3. ✅ Access granted

### With 2FA (After):
1. Enter username and password
2. Click "Login"
3. **NEW:** Enter 6-digit code from authenticator app
4. Click "Verify"
5. ✅ Access granted

---

## 🛠️ For Developers: API Documentation

### Authentication Flow

```
┌─────────────┐
│  User Login │
│ (username + │
│  password)  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ POST /api/login │
└──────┬──────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
   No 2FA               2FA Enabled
       │                     │
       ▼                     ▼
  Return Token      Return requires_2fa: true
       │                     │
       ▼                     ▼
   ✅ Done          User enters 2FA code
                            │
                            ▼
                  POST /api/auth/2fa/verify
                            │
                            ▼
                       Verify Code
                            │
                    ├───────┴───────┐
                    │               │
                    ▼               ▼
                 Valid          Invalid
                    │               │
                    ▼               ▼
              Return Token    Show Error
                    │
                    ▼
                 ✅ Done
```

### API Endpoints

#### 1. Setup 2FA

**POST** `/api/auth/2fa/setup`

**Request:**
```json
{
  "username": "pitz"
}
```

**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "already_enabled": false
}
```

#### 2. Enable 2FA

**POST** `/api/auth/2fa/enable`

**Request:**
```json
{
  "username": "pitz",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "backup_codes": [
    "a1b2c3d4",
    "e5f6g7h8",
    ... (10 total)
  ]
}
```

#### 3. Verify 2FA During Login

**POST** `/api/auth/2fa/verify`

**Request:**
```json
{
  "username": "pitz",
  "code": "123456"
}
```

**Response (TOTP Code):**
```json
{
  "success": true,
  "username": "pitz",
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Backup Code):**
```json
{
  "success": true,
  "username": "pitz",
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "backup_code_used": true,
  "backup_codes_remaining": 9
}
```

#### 4. Check 2FA Status

**GET** `/api/auth/2fa/status?username=pitz`

**Response:**
```json
{
  "enabled": true,
  "backup_codes_remaining": 10
}
```

#### 5. Disable 2FA

**POST** `/api/auth/2fa/disable`

**Request:**
```json
{
  "username": "pitz",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

---

## 🗄️ Database Schema

### Users Table Updates

```sql
ALTER TABLE users
ADD COLUMN two_factor_secret VARCHAR(32),          -- TOTP secret (base32)
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_backup_codes TEXT;           -- Comma-separated backup codes
```

**Example Data:**
```
two_factor_secret: "JBSWY3DPEHPK3PXP"
two_factor_enabled: TRUE
two_factor_backup_codes: "a1b2c3d4,e5f6g7h8,i9j0k1l2,m3n4o5p6,..."
```

---

## 🔐 Security Considerations

### What We Did Right

✅ **TOTP Standard** - Uses RFC 6238 (industry standard)
✅ **Clock Skew** - Accepts ±30 seconds (valid_window=1)
✅ **Backup Codes** - 10 one-time use codes for emergencies
✅ **Password Required** - Must enter password to disable 2FA
✅ **Database Storage** - Secrets stored securely in MySQL
✅ **QR Code Generation** - Generated server-side (secure)
✅ **Single-Use Backup Codes** - Removed after use
✅ **No Rate Limiting Bypass** - 2FA verification subject to rate limits

### Potential Improvements (Future)

- [ ] **SMS Backup** - Send backup codes via SMS
- [ ] **Email Alerts** - Notify on 2FA enable/disable
- [ ] **Device Trust** - "Remember this device for 30 days"
- [ ] **Recovery Email** - Alternative recovery method
- [ ] **Audit Log** - Log all 2FA events
- [ ] **WebAuthn** - Support hardware keys (YubiKey, etc.)

---

## 🐛 Troubleshooting

### Issue: "Invalid verification code"

**Causes:**
1. **Clock Skew** - Phone time is off by more than 1 minute
2. **Wrong Code** - Code already used or expired
3. **Wrong Secret** - Scanned QR code for different account

**Solutions:**
1. Check your phone's time settings (use automatic time)
2. Wait for a new code (codes change every 30 seconds)
3. Re-scan the QR code

### Issue: "Lost my phone, can't access authenticator"

**Solution:** Use a backup code!
1. Go to login page
2. Enter username and password
3. When prompted for 2FA code, enter a backup code
4. **Important:** Each backup code works only once
5. After logging in, regenerate backup codes or disable/re-enable 2FA

### Issue: "Backup codes not working"

**Causes:**
1. Code already used
2. Typo in code
3. 2FA was disabled and re-enabled (old codes invalid)

**Solution:**
- Try another backup code
- Ensure no spaces or dashes
- Contact admin to reset 2FA

### Issue: "QR code won't scan"

**Solutions:**
1. Increase screen brightness
2. Try manual entry: Enter the secret key manually in your app
3. Use a different authenticator app
4. Zoom browser to make QR code larger

---

## 📱 Frontend Integration (TODO)

### Required UI Components

1. **2FA Setup Page** (`TwoFactorSetup.jsx`)
   - Display QR code
   - Show manual entry secret key
   - Verification code input
   - Backup codes display
   - Download/Print backup codes button

2. **Login Page Update** (`LoginPage.jsx`)
   - Detect `requires_2fa` from login response
   - Show 2FA code input field
   - "Use backup code" toggle
   - "Lost access?" help link

3. **Settings Page** (`Settings.jsx`)
   - Enable/Disable 2FA toggle
   - View backup codes remaining
   - Regenerate backup codes
   - Download backup codes

### Example React Code

```jsx
// LoginPage.jsx - After password verification
const handleLogin = async () => {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();

  if (data.requires_2fa) {
    setShow2FAInput(true);
  } else {
    // Normal login - save token
    localStorage.setItem('token', data.token);
    navigate('/tasks');
  }
};

const verify2FA = async () => {
  const response = await fetch('/api/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ username, code: twoFactorCode })
  });
  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.token);
    navigate('/tasks');
  }
};
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Enable 2FA:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/2fa/setup \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser"}'
   ```

2. **Scan QR code** with Google Authenticator

3. **Enable with code:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/2fa/enable \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "code": "123456"}'
   ```

4. **Test login:**
   ```bash
   # First, verify password
   curl -X POST http://localhost:5001/api/login \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123"}'

   # Response: {"requires_2fa": true}

   # Then, verify 2FA
   curl -X POST http://localhost:5001/api/auth/2fa/verify \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "code": "123456"}'

   # Response: {"token": "..."}
   ```

5. **Test backup codes:**
   - Use one of the 10 backup codes instead of TOTP code
   - Verify it's removed from database
   - Confirm can't be reused

---

## 📚 Additional Resources

- [RFC 6238 - TOTP Specification](https://tools.ietf.org/html/rfc6238)
- [pyotp Documentation](https://pyauth.github.io/pyotp/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Google Authenticator Protocol](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)

---

**Last Updated:** 2026-01-12
**Version:** 1.0.0
**Status:** Backend Complete ✅ | Frontend In Progress 🚧
