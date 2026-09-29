# Billing and Entitlements

## Current state

The repository set contains plan/subscription/entitlement concepts in the historical public schema, Hub routes for subscriptions and entitlements, Admin billing UI, and Core control-plane tables. Admin documentation states that billing webhook events are the source of truth. This is the correct principle, but the projection ownership and event path are not yet fully demonstrated.

## Target authority

```text
Stripe/provider webhook
  → verified billing ingestion
    → durable billing event/idempotency record
      → Core entitlement projection
        → organization installation / store binding decisions
          → app authorization checks
```

Hub and apps read the projection. They do not decide that payment succeeded, extend a trial, or grant a paid capability from a client action.

## Assessment

| Concern | Status | Action |
| --- | --- | --- |
| Plan catalog | PARTIAL/DUPLICATED | Choose Core/billing source and reconcile public rows. |
| Webhook verification | UNKNOWN from this audit | Produce code/test evidence and idempotency report. |
| Entitlement projection | PARTIAL | Define event-to-projection schema and stale-state behavior. |
| Development unlimited mode | RISK | Local-only guard; production fail closed. |
| Usage metering | PARTIAL | Keep app event ownership, centralize aggregation policy. |
| Refund/cancel/downgrade | UNKNOWN/PARTIAL | Specify revocation timing and grace periods. |

## Required invariants

- Entitlements are separate from RBAC permissions.
- A revoked subscription eventually revokes launch and API access, with documented grace behavior.
- Webhook processing is idempotent and ordered by provider event/version semantics.
- Every entitlement decision records source, version, and evaluation time.
- A development seed cannot be promoted to production billing state.

