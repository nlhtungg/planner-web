# LUỒNG XÁC THỰC HAI LỚP (TWO-FACTOR AUTHENTICATION - 2FA)

## TỔNG QUAN KIẾN TRÚC

Luồng Two-Factor Authentication (2FA) trong ứng dụng sử dụng **TOTP (Time-based One-Time Password)** algorithm theo chuẩn **RFC 6238**, tương tự như Google Authenticator, Authy, Microsoft Authenticator. Hệ thống cung cấp thêm **Backup Codes** cho account recovery khi user mất access vào authenticator app.

## TOTP LÀ GÌ?

### Định Nghĩa

**TOTP (Time-based One-Time Password)** là một thuật toán tạo mã xác thực một lần (6 chữ số) dựa trên thời gian hiện tại. Mã này thay đổi mỗi 30 giây và được tính toán độc lập trên cả client (authenticator app) và server sử dụng cùng một secret key.

### Cơ Chế Hoạt Động

```
Shared Secret (Base32 encoded)
        ↓
[HMAC-SHA1 Algorithm]
        ↓
Current Unix Timestamp / 30 (time step)
        ↓
Generate 6-digit code
        ↓
Code valid trong ±60 seconds (window = 2)
```

**Công thức:**
```
TOTP = HMAC-SHA1(Secret, CurrentTime / 30) % 10^6
```

### Ưu Điểm

- ✅ **Không cần network:** Hoạt động offline
- ✅ **Time-based:** Tự động expire sau 30s
- ✅ **Standard:** RFC 6238, tương thích nhiều apps
- ✅ **Secure:** Secret key không truyền qua network
- ✅ **Two-factor:** "Something you know" (password) + "Something you have" (phone)

---

## CẤU TRÚC FILE VÀ CHỨC NĂNG

### 1. MODEL LAYER

#### **User.js** (`backend/src/models/User.js`)

**TOTP-related Fields trong Schema:**

```javascript
// TOTP (Two-Factor Authentication) fields
totpSecret: {
  type: String,
  select: false        // Không return mặc định (security)
}

totpEnabled: {
  type: Boolean,
  default: false       // Mặc định tắt 2FA
}

totpBackupCodes: [{
  code: {
    type: String,
    select: false      // Sensitive data
  },
  used: {
    type: Boolean,
    default: false     // Track used codes
  }
}]
```

**Đặc điểm kỹ thuật:**

- **totpSecret:** Base32-encoded secret key (32 characters)
  - Generated bởi `speakeasy.generateSecret()`
  - Stored encrypted trong database
  - Select: false → phải explicitly request

- **totpEnabled:** Boolean flag
  - `false`: User chưa enable 2FA hoặc đã disable
  - `true`: 2FA active, require verification khi login

- **totpBackupCodes:** Array of recovery codes
  - Mỗi code: 8 hex characters (e.g., "A3F5-B2C1")
  - Format: 4-4 with hyphen separator
  - Single-use: `used: true` sau khi dùng
  - Generated 10 codes mặc định

**Security Considerations:**
- `select: false` ngăn accidental exposure
- Backup codes phải query explicitly với `.select('+totpBackupCodes')`
- Không log sensitive fields

---

### 2. SERVICE LAYER

#### **totpService.js** (`backend/src/services/totpService.js`)

**Chức năng:** Core TOTP business logic sử dụng `speakeasy` và `qrcode` libraries.

**Dependencies:**
- **speakeasy:** TOTP/HOTP implementation
- **qrcode:** Generate QR codes
- **crypto:** Secure random generation

---

**Phương thức chính:**

#### 1. **generateSecret(email, appName)**

**Purpose:** Tạo TOTP secret cho user mới setup 2FA.

**Parameters:**
- `email`: User's email (displayed trong authenticator app)
- `appName`: Application name (default: 'WorkspaceApp')

**Output:**
```javascript
{
  secret: "JBSWY3DPEHPK3PXP...",        // Base32 encoded
  otpauthUrl: "otpauth://totp/WorkspaceApp (user@example.com)?secret=..."
}
```

**Technical Details:**
- Secret length: 32 characters (Base32)
- Format: `otpauth://totp/{issuer} ({email})?secret={secret}&issuer={issuer}`
- Issuer: Application name hiển thị trong authenticator

**Security:**
- Random generation với cryptographically secure algorithm
- Base32 encoding (no ambiguous characters)

---

#### 2. **generateQRCode(otpauthUrl)**

**Purpose:** Convert otpauth URL thành QR code image (data URL).

**Parameters:**
- `otpauthUrl`: The otpauth URL từ generateSecret()

**Output:**
```javascript
"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
```

**Technical Details:**
- Format: PNG image as base64 data URL
- QR code type: otpauth://totp
- Readable by: Google Authenticator, Authy, Microsoft Authenticator, etc.

**Usage Flow:**
1. Generate secret
2. Generate QR code
3. Display QR trong frontend
4. User scan với authenticator app
5. App automatically adds account

---

#### 3. **verifyToken(token, secret)**

**Purpose:** Verify TOTP code từ user.

**Parameters:**
- `token`: 6-digit code từ authenticator app (string)
- `secret`: User's TOTP secret (Base32)

**Output:**
- `true`: Code valid
- `false`: Code invalid hoặc expired

**Technical Details:**
```javascript
speakeasy.totp.verify({
  secret: secret,
  encoding: 'base32',
  token: token,
  window: 2             // ±60 seconds tolerance
})
```

**Time Window:**
- Current time step (30s)
- Previous 2 steps (60s ago)
- Next 2 steps (60s future)
- Total window: ~2.5 minutes

**Why window = 2?**
- Clock drift tolerance
- User typing delay
- Network latency
- UX improvement (không reject ngay khi switch step)

---

#### 4. **generateBackupCodes(count)**

**Purpose:** Generate recovery codes cho account access khi mất authenticator.

**Parameters:**
- `count`: Số lượng codes (default: 10)

**Output:**
```javascript
[
  { code: "A3F5B2C1", used: false },
  { code: "D7E9F1A4", used: false },
  ...
]
```

**Technical Details:**
- **Generation:** `crypto.randomBytes(4)` → 8 hex chars
- **Format:** Uppercase hex (A-F, 0-9)
- **Entropy:** 32 bits per code (2^32 = 4.3 billion combinations)
- **Single-use:** Each code valid only once

**Security:**
- Cryptographically secure random
- Stored hashed trong database (nếu có hash implementation)
- Display only once (during setup)

---

#### 5. **verifyBackupCode(inputCode, backupCodes)**

**Purpose:** Validate backup code và mark as used.

**Parameters:**
- `inputCode`: Code từ user (có thể có hyphen/spaces)
- `backupCodes`: Array of backup code objects từ database

**Output:**
```javascript
{
  success: true/false,
  backupCodes: [...],    // Updated array (code marked used)
  message: "..."
}
```

**Logic:**
1. Normalize input (remove hyphens, spaces, uppercase)
2. Find matching code trong array
3. Check `used: false`
4. Mark `used: true`
5. Return updated array

**Validation:**
- ❌ Code không tồn tại → Invalid
- ❌ Code đã used → Already used
- ✅ Code valid và unused → Success

---

#### 6. **formatBackupCodes(backupCodes)**

**Purpose:** Format codes cho display user-friendly.

**Input:**
```javascript
[{ code: "A3F5B2C1", used: false }, ...]
```

**Output:**
```javascript
["A3F5-B2C1", "D7E9-F1A4", ...]
```

**Format:**
- Groups of 4 characters
- Separated by hyphen
- Easier to read/type

---

### 3. CONTROLLER LAYER

#### **authController.js** (`backend/src/controllers/authController.js`)

**Chức năng:** HTTP Request Handlers cho TOTP management và verification.

---

#### **Endpoint 1: GET /totp/status**

**Handler:** `getTOTPStatus()`

**Purpose:** Check xem user đã enable 2FA chưa.

**Authentication:** Required (JWT token)

**Request:**
```http
GET /api/auth/totp/status
Authorization: Bearer {accessToken}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "totpEnabled": false
  }
}
```

**Use Case:**
- Settings page load → hiển thị toggle 2FA
- Check before allowing setup/disable

---

#### **Endpoint 2: POST /totp/setup**

**Handler:** `setupTOTP()`

**Purpose:** Khởi tạo TOTP setup - generate secret và QR code.

**Authentication:** Required

**Validation:**
- ❌ User not found
- ❌ TOTP already enabled

**Flow:**
1. Get authenticated user
2. Check `totpEnabled === false`
3. Generate TOTP secret (totpService)
4. Generate QR code
5. Save `totpSecret` to database (NOT enabled yet)
6. Return secret + QR code

**Request:**
```http
POST /api/auth/totp/setup
Authorization: Bearer {accessToken}
```

**Response Success:**
```json
{
  "success": true,
  "message": "TOTP setup initiated. Please scan the QR code with your authenticator app.",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP...",
    "qrCode": "data:image/png;base64,..."
  }
}
```

**State Change:**
```
totpSecret: null    → "SECRET_KEY"
totpEnabled: false  → false (unchanged)
```

**Note:** Secret saved nhưng chưa enable. User phải verify code trước.

---

#### **Endpoint 3: POST /totp/enable**

**Handler:** `enableTOTP()`

**Purpose:** Enable 2FA sau khi verify initial token từ authenticator app.

**Authentication:** Required

**Request Body:**
```json
{
  "token": "123456"    // 6-digit code
}
```

**Validation:**
- ❌ Token missing/invalid format (not 6 digits)
- ❌ User not found
- ❌ TOTP already enabled
- ❌ totpSecret not set (setup chưa gọi)
- ❌ Token verification failed

**Flow:**
1. Validate token format (regex: `^\d{6}$`)
2. Get user với `.select('+totpSecret')`
3. Verify token với totpService.verifyToken()
4. Generate 10 backup codes
5. Update database:
   - `totpEnabled = true`
   - `totpBackupCodes = [...]`
6. Return backup codes (ONLY TIME displayed)

**Request:**
```http
POST /api/auth/totp/enable
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "token": "123456"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Two-factor authentication enabled successfully",
  "data": {
    "backupCodes": [
      "A3F5-B2C1",
      "D7E9-F1A4",
      ...
    ]
  }
}
```

**State Change:**
```
totpEnabled: false → true
totpBackupCodes: [] → [10 codes]
```

**Security Note:**
- Backup codes hiển thị ONLY ONCE
- User phải save codes securely
- Không thể retrieve lại sau này

---

#### **Endpoint 4: POST /totp/disable**

**Handler:** `disableTOTP()`

**Purpose:** Tắt 2FA (require verification để prevent unauthorized disable).

**Authentication:** Required

**Request Body:**
```json
{
  "token": "123456"    // Current TOTP code
}
```

**Validation:**
- ❌ Token invalid format
- ❌ TOTP not enabled
- ❌ Token verification failed

**Flow:**
1. Validate token
2. Verify current TOTP code (security check)
3. Update database:
   - `totpEnabled = false`
   - `totpSecret = null`
   - `totpBackupCodes = []`
4. Complete disable

**Request:**
```http
POST /api/auth/totp/disable
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "token": "123456"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Two-factor authentication disabled successfully"
}
```

**State Change:**
```
totpEnabled: true → false
totpSecret: "KEY" → null
totpBackupCodes: [...] → []
```

---

#### **Endpoint 5: POST /verify-totp** (Public Route)

**Handler:** `verifyTOTP()`

**Purpose:** Verify TOTP code during login process (step 2 of 2FA login).

**Authentication:** NOT Required (pre-login)

**Request Body:**
```json
{
  "userId": "user_id_from_login",
  "token": "123456"
}
```

**Validation:**
- ❌ userId missing
- ❌ Token invalid format
- ❌ User not found
- ❌ TOTP not enabled
- ❌ Token verification failed

**Flow:**
1. Validate inputs
2. Get user với `.select('+totpSecret')`
3. Verify TOTP token
4. **Generate JWT tokens** (access + refresh)
5. Save refresh token
6. Update lastLogin timestamp
7. Return full login response

**Request:**
```http
POST /api/auth/verify-totp
Content-Type: application/json

{
  "userId": "67890abcdef",
  "token": "123456"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Two-factor authentication verified successfully",
  "data": {
    "user": { ...userObject },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

**Integration với Login Flow:**
```
POST /login → 200 {requiresTOTP: true, userId}
    ↓
POST /verify-totp → 200 {user, tokens}
```

---

#### **Endpoint 6: POST /verify-backup-code** (Public Route)

**Handler:** `verifyBackupCode()`

**Purpose:** Alternative verification method khi user mất access vào authenticator.

**Authentication:** NOT Required (pre-login)

**Request Body:**
```json
{
  "userId": "user_id",
  "backupCode": "A3F5-B2C1"    // Có thể có/không có hyphen
}
```

**Validation:**
- ❌ userId/backupCode missing
- ❌ User not found
- ❌ TOTP not enabled
- ❌ Backup code invalid/used

**Flow:**
1. Get user với `.select('+totpBackupCodes')`
2. Verify backup code (totpService)
3. Mark code as `used: true`
4. Update database với updated backupCodes
5. Generate JWT tokens
6. Return login response

**Request:**
```http
POST /api/auth/verify-backup-code
Content-Type: application/json

{
  "userId": "67890abcdef",
  "backupCode": "A3F5B2C1"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Backup code verified successfully",
  "data": {
    "user": { ...userObject },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

**State Change:**
```javascript
backupCodes[i].used: false → true
```

**Security:**
- Single-use codes
- Permanent marking (không reset)
- User should setup new 2FA nếu hết codes

---

### 4. ROUTING LAYER

#### **authRoutes.js** (`backend/src/routes/authRoutes.js`)

**TOTP Routes Configuration:**

```javascript
// Public routes - TOTP verification during login
router.post('/verify-totp', authController.verifyTOTP);
router.post('/verify-backup-code', authController.verifyBackupCode);

// Protected routes - TOTP management
router.use(authenticateToken);  // Middleware

router.get('/totp/status', authController.getTOTPStatus);
router.post('/totp/setup', authController.setupTOTP);
router.post('/totp/enable', authController.enableTOTP);
router.post('/totp/disable', authController.disableTOTP);
```

**Route Categories:**

**1. Public Routes:**
- `/verify-totp` - Login step 2
- `/verify-backup-code` - Recovery login

**2. Protected Routes:**
- `/totp/status` - Check status
- `/totp/setup` - Initialize setup
- `/totp/enable` - Activate 2FA
- `/totp/disable` - Deactivate 2FA

**Endpoint Table:**

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/verify-totp` | ❌ | Verify TOTP during login |
| POST | `/api/auth/verify-backup-code` | ❌ | Verify backup code |
| GET | `/api/auth/totp/status` | ✅ | Check 2FA status |
| POST | `/api/auth/totp/setup` | ✅ | Generate QR code |
| POST | `/api/auth/totp/enable` | ✅ | Enable 2FA |
| POST | `/api/auth/totp/disable` | ✅ | Disable 2FA |

---

## DATA FLOW DIAGRAMS

### Flow 1: Initial 2FA Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Navigate to Security Settings
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Check Current Status                                    │
├─────────────────────────────────────────────────────────────────┤
│  GET /api/auth/totp/status                                       │
│  Authorization: Bearer {accessToken}                             │
│                                                                   │
│  Response: { totpEnabled: false }                                │
│  → Display "Enable 2FA" button                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Click "Enable 2FA"
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Initialize Setup                                        │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/auth/totp/setup                                       │
│  Authorization: Bearer {accessToken}                             │
│                                                                   │
│  Backend:                                                         │
│    1. totpService.generateSecret(email)                          │
│       → secret: "JBSWY3DP..."                                    │
│       → otpauthUrl: "otpauth://totp/..."                         │
│                                                                   │
│    2. totpService.generateQRCode(otpauthUrl)                     │
│       → qrCode: "data:image/png;base64,..."                      │
│                                                                   │
│    3. User.update({ totpSecret: secret })                        │
│       → Save secret (NOT enabled yet)                            │
│                                                                   │
│  Response:                                                        │
│    {                                                              │
│      secret: "JBSWY3DP...",                                      │
│      qrCode: "data:image/png;..."                                │
│    }                                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Display QR code + Manual entry code
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: User Scans QR Code                                      │
├─────────────────────────────────────────────────────────────────┤
│  1. Open authenticator app (Google Authenticator/Authy)          │
│  2. Scan QR code hoặc enter secret manually                      │
│  3. App adds "WorkspaceApp (user@email.com)"                     │
│  4. App starts generating 6-digit codes every 30s                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ User enters code from app
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Verify và Enable 2FA                                    │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/auth/totp/enable                                      │
│  Authorization: Bearer {accessToken}                             │
│  Body: { token: "123456" }                                       │
│                                                                   │
│  Backend:                                                         │
│    1. Validate token format (6 digits)                           │
│                                                                   │
│    2. User.findById().select('+totpSecret')                      │
│       → Get stored secret                                        │
│                                                                   │
│    3. totpService.verifyToken(token, secret)                     │
│       → HMAC-SHA1(secret, currentTime/30)                        │
│       → Compare với user input                                   │
│       → Return true/false                                        │
│                                                                   │
│    4. Generate backup codes:                                     │
│       totpService.generateBackupCodes(10)                        │
│       → [                                                         │
│           { code: "A3F5B2C1", used: false },                     │
│           { code: "D7E9F1A4", used: false },                     │
│           ...                                                     │
│         ]                                                         │
│                                                                   │
│    5. User.update({                                              │
│         totpEnabled: true,                                       │
│         totpBackupCodes: backupCodes                             │
│       })                                                          │
│                                                                   │
│  Response:                                                        │
│    {                                                              │
│      success: true,                                              │
│      backupCodes: [                                              │
│        "A3F5-B2C1",                                              │
│        "D7E9-F1A4",                                              │
│        ...                                                        │
│      ]                                                            │
│    }                                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Display backup codes
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Save Backup Codes                                       │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️  CRITICAL: Backup codes displayed ONLY ONCE                  │
│                                                                   │
│  User actions:                                                    │
│    - Download codes as text file                                 │
│    - Print codes                                                 │
│    - Save trong password manager                                 │
│    - Write down securely                                         │
│                                                                   │
│  ✅ 2FA Setup Complete                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 2: Login với 2FA Enabled

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Initial Login (Username + Password)                     │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/auth/login                                            │
│  Body: { email, password }                                       │
│                                                                   │
│  Backend:                                                         │
│    1. Find user by email                                         │
│    2. Compare password (bcrypt)                                  │
│    3. Check isActive, isActivated                                │
│    4. Check user.totpEnabled                                     │
│                                                                   │
│  IF totpEnabled === false:                                       │
│    → Generate JWT tokens immediately                             │
│    → Return { user, accessToken, refreshToken }                  │
│    → Login complete ✅                                           │
│                                                                   │
│  IF totpEnabled === true:                                        │
│    → DO NOT generate tokens yet                                  │
│    → Return {                                                     │
│         success: true,                                           │
│         requiresTOTP: true,                                      │
│         userId: user._id,                                        │
│         message: "Please enter your 6-digit code"                │
│       }                                                           │
│    → Continue to Step 2 ↓                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Frontend detects requiresTOTP: true
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Display TOTP Input Form                                 │
├─────────────────────────────────────────────────────────────────┤
│  UI Components:                                                   │
│    - Input field: 6-digit code                                   │
│    - "Verify Code" button                                        │
│    - "Use backup code instead" link                              │
│                                                                   │
│  User opens authenticator app:                                   │
│    → Current code: 123456 (expires in 15s)                       │
│                                                                   │
│  User enters code → Click Verify                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Submit TOTP code
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Verify TOTP Code                                        │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/auth/verify-totp                                      │
│  Body: { userId: "...", token: "123456" }                        │
│  (NO Authorization header - pre-login)                           │
│                                                                   │
│  Backend:                                                         │
│    1. Validate userId và token format                            │
│                                                                   │
│    2. User.findById(userId).select('+totpSecret')                │
│       → Get totpSecret từ database                               │
│                                                                   │
│    3. totpService.verifyToken("123456", secret)                  │
│       Algorithm:                                                  │
│         currentTimeStep = Math.floor(Date.now()/1000/30)         │
│         for step in [current-2, current-1, current,              │
│                      current+1, current+2]:                      │
│           calculatedToken = HMAC-SHA1(secret, step) % 10^6       │
│           if calculatedToken === inputToken:                     │
│             return true                                          │
│         return false                                             │
│                                                                   │
│    4. IF verification successful:                                │
│       a. Generate JWT tokens:                                    │
│          accessToken = sign({ id: userId }, secret, 15m)         │
│          refreshToken = sign({ id: userId }, secret, 7d)         │
│                                                                   │
│       b. Save refreshToken to database                           │
│                                                                   │
│       c. Update user.lastLogin = Date.now()                      │
│                                                                   │
│       d. Return {                                                 │
│            success: true,                                        │
│            user: {...},                                          │
│            accessToken,                                          │
│            refreshToken                                          │
│          }                                                        │
│                                                                   │
│  Response Success:                                                │
│    → Frontend saves tokens                                       │
│    → Redirect to dashboard                                       │
│    → Login complete ✅                                           │
│                                                                   │
│  Response Error (invalid code):                                  │
│    → Display error message                                       │
│    → Allow retry                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 3: Login với Backup Code (Recovery)

```
┌─────────────────────────────────────────────────────────────────┐
│  SCENARIO: User mất access vào authenticator app                 │
│            (Phone lost, app uninstalled, etc.)                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ After password login
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: TOTP Required Screen                                    │
├─────────────────────────────────────────────────────────────────┤
│  Display:                                                         │
│    - "Enter 6-digit code" input                                  │
│    - Link: "Use backup code instead" ← User clicks this          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Navigate to backup code form
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Backup Code Input Form                                  │
├─────────────────────────────────────────────────────────────────┤
│  Display:                                                         │
│    - Input field: Backup code                                    │
│    - Helper text: "Enter one of your 10 backup codes"            │
│    - Format: XXXX-XXXX or XXXXXXXX                              │
│    - Link: "Back to authenticator code"                          │
│                                                                   │
│  User retrieves saved backup code:                               │
│    → From password manager: "A3F5-B2C1"                          │
│    → Enter code                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Submit backup code
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Verify Backup Code                                      │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/auth/verify-backup-code                               │
│  Body: { userId: "...", backupCode: "A3F5-B2C1" }                │
│                                                                   │
│  Backend:                                                         │
│    1. User.findById(userId).select('+totpBackupCodes')           │
│       → Get backup codes array                                   │
│                                                                   │
│    2. totpService.verifyBackupCode(input, backupCodes)           │
│       Process:                                                    │
│         a. Normalize input: "A3F5-B2C1" → "A3F5B2C1"             │
│         b. Search trong array:                                   │
│            backupCodes.find(bc =>                                │
│              bc.code === "A3F5B2C1" && bc.used === false         │
│            )                                                      │
│         c. If found:                                             │
│            - Mark bc.used = true                                 │
│            - Return { success: true, backupCodes }               │
│         d. If not found hoặc already used:                       │
│            - Return { success: false, message }                  │
│                                                                   │
│    3. Update database:                                           │
│       User.update({ totpBackupCodes: updatedArray })             │
│       → Code marked as used permanently                          │
│                                                                   │
│    4. Generate JWT tokens (same as TOTP verify)                  │
│                                                                   │
│    5. Return login response với tokens                           │
│                                                                   │
│  Response Success:                                                │
│    → Login complete ✅                                           │
│    → Warning: "You have used 1 of 10 backup codes"              │
│                                                                   │
│  ⚠️  IMPORTANT:                                                  │
│    - Each backup code single-use only                            │
│    - User should setup new authenticator ASAP                    │
│    - If all 10 codes used → contact support for recovery         │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 4: Disable 2FA

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Navigate to Security Settings                           │
├─────────────────────────────────────────────────────────────────┤
│  User logged in → Settings → Security                            │
│                                                                   │
│  GET /api/auth/totp/status                                       │
│  Response: { totpEnabled: true }                                 │
│  → Display "Disable 2FA" button                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Click "Disable 2FA"
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Confirmation Dialog                                     │
├─────────────────────────────────────────────────────────────────┤
│  Display warning:                                                 │
│    "Are you sure you want to disable two-factor                  │
│     authentication? This will make your account                  │
│     less secure."                                                │
│                                                                   │
│  Input field: "Enter current 6-digit code to confirm"            │
│  Buttons: [Cancel] [Disable 2FA]                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ User enters TOTP code + Confirms
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Verify và Disable                                       │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/auth/totp/disable                                     │
│  Authorization: Bearer {accessToken}                             │
│  Body: { token: "123456" }                                       │
│                                                                   │
│  Backend:                                                         │
│    1. Get authenticated user                                     │
│                                                                   │
│    2. Verify current TOTP code (security check):                 │
│       totpService.verifyToken(token, user.totpSecret)            │
│       → Ensures legitimate user disabling                        │
│                                                                   │
│    3. IF verification successful:                                │
│       User.update({                                              │
│         totpEnabled: false,                                      │
│         totpSecret: null,                                        │
│         totpBackupCodes: []                                      │
│       })                                                          │
│       → Complete reset of 2FA data                               │
│                                                                   │
│  Response Success:                                                │
│    { success: true, message: "2FA disabled successfully" }       │
│                                                                   │
│  Frontend:                                                        │
│    → Display success message                                     │
│    → Update UI (show "Enable 2FA" button)                        │
│    → 2FA disabled ✅                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## SECURITY CONSIDERATIONS

### 1. Secret Storage

**Current Implementation:**
- `totpSecret` stored as plaintext Base32 trong MongoDB
- `select: false` prevents accidental exposure
- Backup codes stored as plaintext

**Recommendations:**
```javascript
// Hash backup codes before storage
const hashedCode = await bcrypt.hash(code, 10);

// Verify with bcrypt.compare()
const isValid = await bcrypt.compare(inputCode, hashedCode);
```

**Why hash backup codes?**
- Database breach → codes still useless
- Defense in depth
- Standard security practice

---

### 2. Time Synchronization

**Issue:** Clock drift between server và user device.

**Mitigation:**
- `window: 2` trong verifyToken (±60 seconds tolerance)
- Server should use NTP for accurate time
- Educate users about time sync

---

### 3. Rate Limiting

**Vulnerability:** Brute force TOTP codes (1 million possibilities).

**Mitigation:**
```javascript
// Pseudo-code
const attemptCount = getAttempts(userId);
if (attemptCount > 5) {
  return res.status(429).json({ message: 'Too many attempts' });
}

// Lock account after 10 failed attempts
if (attemptCount > 10) {
  await User.update({ isActive: false });
}
```

**Recommended Limits:**
- 5 attempts per 5 minutes
- 10 attempts → temporary lock (15 minutes)
- 20 attempts → permanent lock (require support)

---

### 4. Backup Code Management

**Best Practices:**
- Generate 10 codes (balance security vs usability)
- Single-use codes (mark as used)
- Display only once during setup
- Encourage users to regenerate after use
- Provide "regenerate backup codes" feature

**Implementation:**
```javascript
// POST /api/auth/totp/regenerate-backup-codes
// Require current TOTP verification
const newCodes = totpService.generateBackupCodes(10);
await User.update({ totpBackupCodes: newCodes });
```

---

### 5. Account Recovery

**Scenario:** User loses authenticator + all backup codes.

**Current Gap:** No recovery mechanism.

**Recommended Solutions:**

**Option 1: Recovery Email**
```javascript
// Store recovery email (different from login email)
recoveryEmail: String

// User requests reset
// Send unique link to recovery email
// Verify identity + disable 2FA
```

**Option 2: Support Ticket**
```javascript
// Manual verification:
// - Government ID
// - Security questions
// - Previous login history
// Support manually disables 2FA
```

**Option 3: Recovery Codes (Premium)**
```javascript
// Generate master recovery code during setup
// Stored encrypted với user's password
// Can only decrypt với correct password
```

---

### 6. Session Management

**Issue:** Long-lived sessions với 2FA bypass.

**Mitigation:**
- Access token: 15 minutes (short-lived)
- Refresh token: 7 days
- Require re-authentication for sensitive actions:
  - Change email
  - Disable 2FA
  - Delete account
  - Change password

**Example:**
```javascript
// Sensitive action endpoint
router.post('/change-email', 
  authenticateToken,
  requireRecentAuth,  // Check lastAuth < 15 minutes
  authController.changeEmail
);
```

---

### 7. Audit Logging

**Log Events:**
- 2FA enabled/disabled
- TOTP verification attempts (success/fail)
- Backup code usage
- Failed login attempts

**Implementation:**
```javascript
const auditLog = {
  userId,
  action: 'TOTP_VERIFY_SUCCESS',
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: Date.now()
};

await AuditLog.create(auditLog);
```

**Benefits:**
- Security monitoring
- Anomaly detection
- Compliance requirements
- Incident response

---

## TESTING SCENARIOS

### Unit Tests

**totpService Tests:**
```javascript
describe('totpService', () => {
  test('generateSecret returns valid Base32', () => {
    const { secret } = totpService.generateSecret('test@example.com');
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  test('verifyToken accepts valid code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const token = generateCurrentToken(secret);  // Helper
    expect(totpService.verifyToken(token, secret)).toBe(true);
  });

  test('verifyToken rejects invalid code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    expect(totpService.verifyToken('000000', secret)).toBe(false);
  });

  test('generateBackupCodes creates 10 codes', () => {
    const codes = totpService.generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(codes[0].code).toMatch(/^[A-F0-9]{8}$/);
  });

  test('verifyBackupCode marks code as used', () => {
    const codes = [{ code: 'A3F5B2C1', used: false }];
    const result = totpService.verifyBackupCode('A3F5-B2C1', codes);
    expect(result.success).toBe(true);
    expect(result.backupCodes[0].used).toBe(true);
  });
});
```

---

### Integration Tests

**Setup Flow:**
```javascript
describe('2FA Setup Flow', () => {
  let user, token;

  beforeAll(async () => {
    user = await createTestUser();
    token = generateToken(user._id);
  });

  test('GET /totp/status shows disabled initially', async () => {
    const res = await request(app)
      .get('/api/auth/totp/status')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.body.data.totpEnabled).toBe(false);
  });

  test('POST /totp/setup returns QR code', async () => {
    const res = await request(app)
      .post('/api/auth/totp/setup')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.qrCode).toMatch(/^data:image\/png;base64/);
  });

  test('POST /totp/enable with valid code succeeds', async () => {
    const user = await User.findById(user._id).select('+totpSecret');
    const validToken = generateCurrentToken(user.totpSecret);
    
    const res = await request(app)
      .post('/api/auth/totp/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: validToken });
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.backupCodes).toHaveLength(10);
  });
});
```

---

**Login Flow:**
```javascript
describe('2FA Login Flow', () => {
  let user;

  beforeAll(async () => {
    user = await createUserWith2FA();
  });

  test('Login returns requiresTOTP flag', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });
    
    expect(res.body.requiresTOTP).toBe(true);
    expect(res.body.userId).toBe(user._id.toString());
    expect(res.body.accessToken).toBeUndefined();
  });

  test('TOTP verification with valid code succeeds', async () => {
    const validToken = generateCurrentToken(user.totpSecret);
    
    const res = await request(app)
      .post('/api/auth/verify-totp')
      .send({ userId: user._id, token: validToken });
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('Backup code verification works', async () => {
    const backupCode = user.totpBackupCodes[0].code;
    
    const res = await request(app)
      .post('/api/auth/verify-backup-code')
      .send({ userId: user._id, backupCode });
    
    expect(res.body.success).toBe(true);
    
    // Verify code marked as used
    const updated = await User.findById(user._id).select('+totpBackupCodes');
    expect(updated.totpBackupCodes[0].used).toBe(true);
  });
});
```

---

## PERFORMANCE OPTIMIZATION

### 1. Database Queries

**Optimization:**
```javascript
// Use lean() khi không cần Mongoose methods
const user = await User.findById(userId)
  .select('+totpSecret')
  .lean();

// Index on totpEnabled for analytics
userSchema.index({ totpEnabled: 1 });

// Query optimization
const stats = await User.aggregate([
  { $match: { totpEnabled: true } },
  { $count: 'total' }
]);
```

---

### 2. QR Code Generation

**Current:** Generate on-demand (slow).

**Optimization:**
```javascript
// Cache QR code trong Redis
const cached = await redis.get(`qr:${userId}`);
if (cached) return cached;

const qrCode = await totpService.generateQRCode(url);
await redis.setex(`qr:${userId}`, 3600, qrCode);  // 1 hour
```

---

### 3. Token Verification

**Speakeasy Performance:**
- HMAC-SHA1 computation: ~0.1ms
- Window = 2: 5 computations max
- Total: ~0.5ms (acceptable)

**No optimization needed** - already fast.

---

## USER EXPERIENCE CONSIDERATIONS

### 1. Onboarding

**Best Practices:**
- Clear explanation of 2FA benefits
- Step-by-step wizard
- Multiple authenticator app options (Google, Authy, Microsoft)
- Manual entry option (for non-QR devices)
- Backup code emphasis (save securely!)

---

### 2. Error Messages

**Good Messages:**
- ❌ "Invalid verification code" → ✅ "The code you entered is incorrect or expired. Please try again."
- ❌ "Token expired" → ✅ "This code has expired. Please use the current code from your authenticator app."
- ❌ "Backup code used" → ✅ "This backup code has already been used. Please try another one."

---

### 3. Accessibility

**Considerations:**
- Screen reader compatible
- Keyboard navigation
- High contrast mode support
- Font size adjustments
- Clear focus indicators

---

### 4. Mobile Experience

**Challenges:**
- App switching (Auth app ↔ Browser)
- Auto-fill support
- Copy-paste backup codes

**Solutions:**
- SMS backup codes (optional)
- WebAuthn/FIDO2 integration (future)
- Biometric verification (future)

---

## COMPLIANCE & STANDARDS

### Standards Followed

**1. RFC 6238 (TOTP)**
- Time-based OTP algorithm
- 30-second time step
- HMAC-SHA1 hash function
- 6-digit codes

**2. RFC 4226 (HOTP)**
- Base algorithm cho TOTP
- Counter-based OTP

**3. Security Best Practices**
- PCI DSS compliance (if applicable)
- GDPR (protect user secrets)
- OWASP Top 10 mitigations

---

### Compliance Checklist

- ✅ Secure secret generation (crypto.randomBytes)
- ✅ Encrypted storage (select: false)
- ✅ Time window tolerance (±60s)
- ✅ Backup codes for recovery
- ✅ Single-use backup codes
- ✅ User consent (opt-in)
- ⚠️  Audit logging (recommended)
- ⚠️  Rate limiting (recommended)
- ❌ Secret encryption (future improvement)
- ❌ Recovery mechanism (future improvement)

---

## TROUBLESHOOTING GUIDE

### Problem 1: "Invalid verification code" (most common)

**Possible Causes:**
1. Clock drift (device time incorrect)
2. Wrong secret (multiple accounts)
3. Code expired (31st second)
4. Typo trong code

**Solutions:**
1. Check device time sync (Settings → Date & Time → Auto)
2. Verify correct account trong authenticator
3. Wait for new code
4. Double-check digits

---

### Problem 2: QR code won't scan

**Causes:**
- Poor image quality
- Screen brightness too low
- Camera focus issues

**Solutions:**
- Zoom QR code
- Increase brightness
- Manual entry option (show secret)

---

### Problem 3: All backup codes used

**Solution:**
- Contact support với identity verification
- Support manually disables 2FA
- User re-enables with new codes

---

### Problem 4: Lost authenticator app

**Solution:**
- Use backup code
- Disable 2FA
- Re-enable with new device
- Generate new backup codes

---

## FUTURE ENHANCEMENTS

### 1. WebAuthn/FIDO2 Support

**Benefits:**
- Hardware security keys (YubiKey)
- Biometric authentication
- Phishing-resistant
- Better UX

**Implementation:**
```javascript
// Register security key
navigator.credentials.create({
  publicKey: { ... }
});

// Authenticate
navigator.credentials.get({
  publicKey: { ... }
});
```

---

### 2. SMS Backup Option

**Pros:**
- Easier recovery
- No app required

**Cons:**
- SIM swap attacks
- SMS interception
- Not recommended as primary

**Implementation:**
```javascript
// Send OTP via SMS
await twilioClient.messages.create({
  to: user.phone,
  from: TWILIO_NUMBER,
  body: `Your verification code: ${code}`
});
```

---

### 3. Trusted Devices

**Feature:**
- Remember device for 30 days
- Skip 2FA on trusted devices
- Revoke trust anytime

**Implementation:**
```javascript
// Store device fingerprint
const deviceId = hash(userAgent + IP + ...);
await User.update({
  trustedDevices: [{ deviceId, expiresAt }]
});

// Check during login
if (isTrustedDevice(deviceId)) {
  skipTOTP();
}
```

---

### 4. Push Notifications

**Feature:**
- Send push to mobile app
- User taps "Approve" or "Deny"
- Like Duo Push

**Benefits:**
- No typing codes
- Better UX
- Real-time approval

---

### 5. Security Analytics

**Dashboard:**
- Total users với 2FA enabled
- Failed TOTP attempts
- Backup code usage
- Anomaly detection

**Alerts:**
- Unusual login patterns
- Multiple failed attempts
- Geographic anomalies

---

## MONITORING & METRICS

### Key Metrics

**Adoption:**
- % users với 2FA enabled
- Time to enable after account creation
- Disable rate

**Usage:**
- TOTP verifications per day
- Backup code usage frequency
- Failed verification attempts

**Security:**
- Brute force attempts detected
- Account lockouts
- Recovery requests

---

### Example Queries

```javascript
// MongoDB aggregation
const stats = await User.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      with2FA: {
        $sum: { $cond: ['$totpEnabled', 1, 0] }
      }
    }
  },
  {
    $project: {
      adoptionRate: {
        $multiply: [
          { $divide: ['$with2FA', '$total'] },
          100
        ]
      }
    }
  }
]);

console.log(`2FA Adoption Rate: ${stats[0].adoptionRate}%`);
```

---

## REFERENCES

### Documentation
- [RFC 6238 (TOTP)](https://tools.ietf.org/html/rfc6238)
- [RFC 4226 (HOTP)](https://tools.ietf.org/html/rfc4226)
- [Speakeasy Library](https://github.com/speakeasyjs/speakeasy)
- [QRCode Library](https://github.com/soldair/node-qrcode)

### Security Resources
- [OWASP 2FA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)

### Authenticator Apps
- Google Authenticator (iOS/Android)
- Microsoft Authenticator (iOS/Android)
- Authy (iOS/Android/Desktop)
- 1Password (với TOTP support)

---

## CONCLUSION

Hệ thống Two-Factor Authentication trong **Planner Web** cung cấp:

✅ **Standard TOTP implementation** (RFC 6238)  
✅ **Secure secret generation** với speakeasy  
✅ **QR code setup** cho easy onboarding  
✅ **10 backup codes** cho account recovery  
✅ **Single-use backup codes** ngăn replay attacks  
✅ **Time window tolerance** (±60s) cho UX  
✅ **Clean API design** với protected routes  
✅ **Comprehensive verification** trong login flow  

**Security Posture:**
- Defense-in-depth với 2FA layer
- Backup codes cho disaster recovery
- Select: false cho sensitive fields
- Future-ready cho WebAuthn/FIDO2

**Recommended Next Steps:**
1. Implement rate limiting (prevent brute force)
2. Add audit logging (security monitoring)
3. Hash backup codes (defense in depth)
4. Implement recovery mechanism (email/support)
5. Add trusted devices feature (UX improvement)
6. Monitor adoption metrics (analytics)

---

**Version:** 1.0.0  
**Last Updated:** December 24, 2025  
**Maintained by:** Development Team
