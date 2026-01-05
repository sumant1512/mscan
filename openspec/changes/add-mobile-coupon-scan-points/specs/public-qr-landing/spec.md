## ADDED Requirements

### Requirement: QR URL Structure
The system SHALL encode each coupon's QR to a canonical public URL that opens in a browser.

- Canonical format: `https://{tenant-subdomain}.{domain}/scan/{coupon_code}`
- Alternate format (if subdomains unavailable): `https://{domain}/t/{tenant}/scan/{coupon_code}`
- Coupon code MUST be path-based (not fragment) to allow server handling

#### Scenario: Generate QR URL for coupon
- **WHEN** a tenant creates a coupon with code `ABC123`
- **THEN** the QR encodes the canonical URL
- **AND** scanning the QR opens the browser to that URL

### Requirement: Browser Navigation on Scan
The system MUST ensure that scanning the QR with any scanner navigates to the landing page without third-party integrations.

- Behavior: Any scanner opens the encoded URL in the device browser
- Landing route: `GET /scan/{coupon_code}`
- Response: Minimal page/JSON prompting "Login to get award" with session bootstrap

#### Scenario: Scan with any QR scanner
- **WHEN** user scans QR via camera or QR app
- **THEN** device opens browser at the canonical URL
- **AND** server renders/returns landing content

#### Scenario: Deep link fallback
- **WHEN** device attempts in-app open
- **THEN** link still resolves in a webview or browser with identical landing behavior

### Requirement: Tenant Isolation and Routing
The system SHALL scope requests by Host subdomain or tenant path to resolve the correct tenant context.

#### Scenario: Subdomain routing
- **WHEN** Host is `tenant.localhost`
- **THEN** landing and subsequent API calls are scoped to that tenant

#### Scenario: Path-based routing
- **WHEN** URL uses `/t/{tenant}/scan/{coupon_code}`
- **THEN** system resolves tenant from path

### Requirement: Invalid or Redeemed QR Handling
The system SHALL handle QR navigation for invalid or already redeemed coupons.

#### Scenario: Invalid coupon code
- **WHEN** QR URL is opened for unknown coupon code
- **THEN** system returns `400` with `invalid_or_redeemed_coupon` and guidance message

#### Scenario: Already redeemed coupon
- **WHEN** QR URL is opened for a redeemed coupon
- **THEN** system returns `400` with `invalid_or_redeemed_coupon` and suggests contacting support

### Requirement: Reliability and Usability
The system SHALL ensure QR and landing work across devices and avoid caching issues.

#### Scenario: No-cache landing
- **WHEN** landing page is served
- **THEN** response sets headers to prevent caching (`Cache-Control: no-store`)

#### Scenario: Trailing slash tolerance
- **WHEN** URL contains trailing slash `/scan/{coupon_code}/`
- **THEN** system normalizes and serves identical landing content

## Implementation Status

- Landing route implemented: `GET /scan/{coupon_code}` returns JSON with `status: pending-verification` and no-cache headers.
- Public scan APIs implemented:
	- `POST /api/public/scan/start` → creates `scan_sessions` in `pending-verification`.
	- `POST /api/public/scan/:sessionId/mobile` → collects mobile (E.164), issues OTP, sets `otp-sent`.
	- `POST /api/public/scan/:sessionId/verify-otp` → verifies OTP, awards `coupon_points`, marks coupon `used`, completes session.
- Mobile auth APIs added under `/api/mobile/v1/auth` for customer login via phone OTP (`request-otp`, `verify-otp`, `me`, `refresh`, `logout`).
- Migrations added: `customers`, `customer_devices`, `mobile_otps`; points ledger and scan sessions already present.
- E2E coverage: Playwright spec `tests/public/public-scan-flow.spec.ts` that exercises start→mobile→verify flow; skips gracefully if no active coupon.
