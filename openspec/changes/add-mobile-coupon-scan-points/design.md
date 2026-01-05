## Context
QR codes issued by tenants are scanned by any device and open a browser landing page. The flow will ask the user to log in via mobile number + OTP and, on success, award points attached to that specific QR/coupon. Points are defined per coupon (no global default). We will reuse existing OTP infrastructure.

## Goals / Non-Goals
- Goals: Mobile scan session flow; OTP verification; points ledger; tenant isolation; idempotency; rate limits; observability
- Non-Goals: Full loyalty program (tiers, expiry), monetary payouts, deep third-party SDK integration

## Decisions
- Public landing route: `GET /scan/:coupon_code` serves a minimal page or JSON to instruct "Login to get award"
- API endpoints live under `/api/public/scan/*` with tenant isolation via Host/verification app ID
- Session states: `pending-verification` → `otp-sent` → `completed` or `verification-failed`
- OTP binding: Associate challenge with session and mobile; reuse existing `/api/auth/request-otp` & `/api/auth/verify-otp` under-the-hood or implement session-bound variants
- Points model: Points are read from the coupon (`coupon_points`) and awarded on completion; immutable transactions with derived balance per tenant+mobile; idempotency ensured via `session_id` as `idempotency_key`
- Abuse controls: Per-session OTP throttling (60s), per-mobile daily limit, per-coupon single redemption; optional `device_id` fingerprinting

## Risks / Trade-offs
- SMS delivery latency → Use retry windows and informative UI responses
- Replay attempts → Enforce idempotency and coupon single-use
- Cross-tenant leakage → Strict Host-based scoping and app ID validation

## Migration Plan
- Add tables and deploy behind feature flag (if needed)
- Ensure coupons have a `coupon_points` field or equivalent in batches; backfill as needed
- Rollout in stages: dev → staging → production with E2E coverage

## Open Questions
- Do we need phone-based KYC beyond OTP? (Out of scope now)
- Should points expire or support tiers? (Future change)
