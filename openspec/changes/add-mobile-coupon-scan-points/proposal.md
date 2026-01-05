# Change: Public QR Scan Flow + Loyalty Points

## Why
Users scan tenant-issued QR codes with any scanner that opens a browser. The browser flow must guide the user to login via mobile number + OTP and, upon successful verification, award points attached to that specific QR/coupon. No third-party payment app integration is required.

## What Changes
- Add public browser scan flow with session lifecycle: landing → collect mobile → send OTP → verify OTP → award points (per-QR) → mark coupon redeemed
- Points are defined per QR/coupon and stored with the coupon; remove any default points-per-scan configuration
- Ensure tenant isolation via Host/subdomain or verification app ID, with idempotent operations per coupon/session
- Add observability events: scan_started, otp_sent, otp_verified, points_awarded, coupon_redeemed
- **BREAKING (none)**: New endpoints and public landing route only; no removal of existing behavior

## Impact
- Affected specs: public-qr-landing, coupon-scan-api, loyalty-points
- Affected code: mscan-server routes/controllers (new public `/scan/:coupon_code` landing and `/api/public/scan/*`), OTP integration reuse, DB migrations for `scan_sessions`, `user_points`, `points_transactions`, optional coupon points field
