-- ============================================================
-- Patch: Allocate 5000 welcome credits to every tenant
-- ============================================================
-- Safe to run on existing databases — skips tenants that
-- already have a credit balance.
--
-- Creates a complete paper trail:
--   credit_requests  (status=approved)   → shows in super-admin requests list
--   credit_transactions (type=CREDIT)    → shows in transaction history at all levels
--   tenant_credit_balance                → balance=5000
-- ============================================================

DO $$
DECLARE
    v_tenant          RECORD;
    v_super_admin     UUID;
    v_tenant_admin    UUID;
    v_request_id      UUID;
    v_balance_before  INTEGER := 0;
    v_welcome_credits CONSTANT INTEGER := 5000;
BEGIN
    -- Resolve the first super admin as the approver
    SELECT id INTO v_super_admin FROM users WHERE role = 'SUPER_ADMIN' ORDER BY created_at LIMIT 1;

    IF v_super_admin IS NULL THEN
        RAISE EXCEPTION 'No SUPER_ADMIN user found. Run full_setup.sql first.';
    END IF;

    FOR v_tenant IN SELECT id, tenant_name FROM tenants WHERE is_active = true ORDER BY created_at LOOP

        -- Skip tenants that already have credits allocated
        IF EXISTS (SELECT 1 FROM tenant_credit_balance WHERE tenant_id = v_tenant.id AND balance > 0) THEN
            RAISE NOTICE 'Tenant "%" already has credits, skipping', v_tenant.tenant_name;
            CONTINUE;
        END IF;

        -- Resolve the tenant admin (requester)
        SELECT id INTO v_tenant_admin
        FROM users
        WHERE tenant_id = v_tenant.id AND role = 'TENANT_ADMIN' AND is_active = true
        ORDER BY created_at LIMIT 1;

        IF v_tenant_admin IS NULL THEN
            v_tenant_admin := v_super_admin;
        END IF;

        -- 1. Insert approved credit request
        INSERT INTO credit_requests (
            tenant_id, requested_by, requested_amount, status,
            justification, processed_by, processed_at, requested_at
        ) VALUES (
            v_tenant.id,
            v_tenant_admin,
            v_welcome_credits,
            'approved',
            'Welcome credits allocated on account creation',
            v_super_admin,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO v_request_id;

        -- 2. Insert CREDIT transaction linked to the request
        INSERT INTO credit_transactions (
            tenant_id, transaction_type, amount,
            balance_before, balance_after,
            reference_id, reference_type,
            description, created_by
        ) VALUES (
            v_tenant.id,
            'CREDIT',
            v_welcome_credits,
            v_balance_before,
            v_balance_before + v_welcome_credits,
            v_request_id,
            'CREDIT_APPROVAL',
            'Welcome credits: ' || v_welcome_credits || ' credits allocated on account creation',
            v_super_admin
        );

        -- 3. Upsert balance (insert if missing, update if exists with 0)
        INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
        VALUES (v_tenant.id, v_welcome_credits, v_welcome_credits, 0)
        ON CONFLICT (tenant_id) DO UPDATE
          SET balance        = v_welcome_credits,
              total_received = v_welcome_credits,
              updated_at     = CURRENT_TIMESTAMP;

        RAISE NOTICE 'Allocated % welcome credits to tenant "%"', v_welcome_credits, v_tenant.tenant_name;
    END LOOP;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Welcome credits patch complete.';
    RAISE NOTICE 'Each tenant now has % credits.', v_welcome_credits;
    RAISE NOTICE 'Check: SELECT t.tenant_name, tcb.balance, tcb.total_received';
    RAISE NOTICE '       FROM tenants t JOIN tenant_credit_balance tcb ON t.id = tcb.tenant_id;';
    RAISE NOTICE '==============================================';
END $$;
