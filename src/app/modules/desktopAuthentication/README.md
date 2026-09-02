# ACS desktop authentication

This module is isolated from the existing web authentication module. It stores
short-lived transactions in Redis and writes to `studentAuthLog` only after a
successful desktop exchange. It does not use the existing social-login routes
or browser refresh-token cookies.

## Required environment

```dotenv
DESKTOP_AUTH_PUBLIC_URL=https://api.varsity.aparsclassroom.com
DESKTOP_AUTH_FIREBASE_API_KEY=
DESKTOP_AUTH_FIREBASE_AUTH_DOMAIN=
DESKTOP_AUTH_FIREBASE_PROJECT_ID=
DESKTOP_AUTH_FIREBASE_APP_ID=
```

`FCM_SERVICE_ACCOUNT_JSON` must belong to the same Firebase project as the
browser configuration above. Enable Google and Apple in Firebase
Authentication and add the public auth domain to Firebase's authorized domains.

The public URL defaults to `https://api.varsity.aparsclassroom.com`. The
environment variable remains available as an override for staging or local
deployments. The public URL must route both `/desktop-auth` and
`/api/v1/desktop-auth/*` to this Express application.

## ACS contract

ACS creates and persists:

- A random PKCE verifier containing 43–128 URL-safe characters.
- Its S256 challenge: `base64url(sha256(verifier))`.
- A stable, random installation ID stored in OS-protected application storage.

Create the transaction from the Electron main process:

```http
POST /api/v1/desktop-auth/start
Content-Type: application/json

{
  "provider": "GOOGLE",
  "installationId": "stable-random-installation-id",
  "codeChallenge": "base64url-sha256-value",
  "codeChallengeMethod": "S256"
}
```

The response contains `transactionId`, `pollToken`, `browserUrl`, and
`expiresAt`. Open only the returned HTTPS URL with `shell.openExternal()`.
Never pass an arbitrary renderer-controlled URL to `shell.openExternal()`.

Poll from the main process:

```http
GET /api/v1/desktop-auth/status/:transactionId
X-Desktop-Auth-Poll-Token: <pollToken>
```

Possible statuses:

- `PENDING`
- `READY`
- `ACCOUNT_LINK_REQUIRED`
- `REGISTRATION_REQUIRED`
- `FAILED`
- `CANCELLED`
- `CONSUMED`

The browser also attempts:

```text
acs://auth/callback?transactionId=...&status=...
```

Polling remains the fallback if the operating system does not deliver the deep
link.

For `READY`, exchange from the main process:

```http
POST /api/v1/desktop-auth/exchange
Content-Type: application/json

{
  "transactionId": "...",
  "codeVerifier": "the-original-pkce-verifier"
}
```

The exchange is single-use and returns the existing ACS access/refresh token
shape. Keep the access token in memory where possible and store the refresh
token in the operating system credential store.

For `ACCOUNT_LINK_REQUIRED`, authenticate the existing ACS account through the
normal email/password or phone/OTP flow, then bind that verified account to the
provider identity held by the desktop transaction. The same link endpoint may
also be used from `REGISTRATION_REQUIRED` when the student explicitly chooses
to link a different existing ACS account instead of creating a new one:

```http
POST /api/v1/desktop-auth/link
X-Access-Token: <student-access-token>
Content-Type: application/json

{
  "transactionId": "...",
  "pollToken": "..."
}
```

The access token must be a valid student access token. Provider identity is
always read from the server-side transaction; the app cannot choose a provider
UID or email to link.

For `REGISTRATION_REQUIRED`, request a five-digit OTP for a Bangladeshi mobile
number:

```http
POST /api/v1/desktop-auth/registration/otp
Content-Type: application/json

{
  "transactionId": "...",
  "pollToken": "...",
  "phone": "01712345678"
}
```

Complete registration with the same number and transaction-bound OTP:

```http
POST /api/v1/desktop-auth/registration/complete
Content-Type: application/json

{
  "transactionId": "...",
  "pollToken": "...",
  "phone": "01712345678",
  "otp": "12345",
  "name": "Optional display name"
}
```

If the email or phone becomes associated with an account while registration is
in progress, the transaction moves to `ACCOUNT_LINK_REQUIRED` instead of
creating a duplicate student.

Both successful linking and registration move the transaction to `READY`.
Exchange it with the original PKCE verifier as described above.

## Desktop session lifecycle

Every authenticated desktop API request must include these headers:

```http
X-Access-Token: <access-token-without-Bearer>
Platform: mac
X-ACS-Installation-Id: <stable-installation-id>
```

`Platform` accepts the existing desktop values `mac`, `windows`, or `linux`.
The installation ID must remain stable for that installation and must not be a
hardware identifier. The server hashes it before using it as the desktop
session host.

Rotate an expired access token from the Electron main process:

```http
POST /api/v1/desktop-auth/refresh
Content-Type: application/json

{
  "refreshToken": "...",
  "installationId": "..."
}
```

The response contains a new access token and a rotated refresh token. Replace
the old refresh token atomically in the OS credential store; it cannot be used
again.

Sign out the exact desktop installation with:

```http
POST /api/v1/desktop-auth/logout
Content-Type: application/json

{
  "refreshToken": "...",
  "installationId": "..."
}
```

The refresh token belongs in the operating system credential store. Keep the
short-lived access token in the Electron main process and expose only narrow
authenticated IPC methods to the renderer.

## Security properties

- Transactions expire after 10 minutes.
- Browser and polling credentials are independently generated and stored only
  as SHA-256 hashes.
- Browser credentials stay in the URL fragment and are sent to the API through
  a request header, keeping them out of normal URL/access logs.
- Firebase ID tokens are verified by Firebase Admin and the actual
  `sign_in_provider` must match the provider selected by ACS.
- Provider identity matching uses `(provider, providerUid)`, not email.
- ACS tokens are created only during the PKCE-bound desktop exchange.
- The exchange is protected by a Redis single-use lock.
- No ACS token is placed in a browser URL or deep link.
- Linking and registration require the transaction polling secret and can only
  use the Firebase identity already verified by the server.
- Registration OTPs are bound to the transaction and phone number, expire in
  five minutes, and are consumed atomically.
- Refresh tokens rotate and are bound to one stable desktop installation.
