## 1. Implementation
- [x] 1.1 Add DB tables: `scan_sessions`, `user_points`, `points_transactions`
- [ ] 1.2 Ensure coupons have `coupon_points` (per-QR) and include in QR URL generation/metadata
- [x] 1.3 Implement public landing: `GET /scan/:coupon_code` (browser page/JSON)
- [x] 1.4 Implement `/api/public/scan/start` (create session, validate coupon)
- [x] 1.5 Implement `/api/public/scan/:sessionId/mobile` (capture mobile, start OTP)
- [x] 1.6 Implement `/api/public/scan/:sessionId/verify-otp` (verify, award per-QR points, redeem coupon)
- [x] 1.7 Enforce idempotency for session and coupon status
 - [x] 1.7b Add rate limits; log audit events
- [ ] 1.8 Unit tests for session lifecycle and points ledger
- [ ] 1.9 E2E tests: landing → login → award → redeem
- [ ] 1.10 API docs in `mscan-server/API.md`
- [ ] 1.11 QR URL generation helper to produce canonical URLs (subdomain or path-based)
- [ ] 1.12 Add no-cache headers and trailing-slash normalization for landing

## 2. Design & Security
- [ ] 2.1 Finalize OTP flow integration (reuse existing auth OTP endpoints)
- [x] 2.2 Define session states and failure handling
- [ ] 2.3 Define points ledger semantics (balance, transactions, idempotency keys)
 - [x] 2.4 Add rate limits: per mobile/day, per coupon, per device
 - [x] 2.5 Telemetry: scan_started, otp_sent, otp_verified, points_awarded, coupon_redeemed

## 3. Migration
- [x] 3.1 Create migrations; add `coupon_points` where missing
- [ ] 3.2 Backfill coupon points as per tenant policy (optional)
- [x] 3.3 Feature is additive; no legacy removal
 - [ ] 3.4 Update QR generation in coupon/batch creation to encode canonical URL
