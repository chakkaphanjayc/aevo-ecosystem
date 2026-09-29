# Security and Tenant Boundaries

## Security posture

The architecture has the right defense-in-depth shape: app-scoped opaque sessions, Edge signing, Core authorization, RLS/data-store checks, service secrets, and separate Admin. The audit found implementation and transition gaps that must be closed before legacy deletion is considered safe.

## Findings and actions

| Finding | Severity | Required action |
| --- | --- | --- |
| Edge still allows removed `:4321` origin | Medium | Remove after compatibility inventory. |
| Development entitlement shortcut can say `allowed=true` | High | Fail closed outside isolated local mode; add configuration test. |
| `/health` connection probe is not compatibility/tenant proof | High | Add signed versioned handshake. |
| Onboarding returns removed `/modern/organize` | Medium | Update route contract and test. |
| Shared public tables have multiple migration/read paths | High | Single writer and migration authority. |
| RLS uses transaction settings | High | Prove Core sets tenant context before every query and cannot be bypassed by request hints. |
| Edge code has no visible rate limiting/WAF | Medium | Evidence infrastructure enforcement or implement policy. |
| Passkey contract incomplete | Medium | Design WebAuthn ownership and recovery flows before enabling. |
| Duplicate app/control-plane contracts | Medium | Consolidate Core shapes into released contracts. |

## Tenant test model

Create at least two organizations, three stores, two members with different app assignments, one platform admin, one unassigned identity, and two app sessions. Test every read/write path using:

- valid same-tenant identifiers;
- another tenant’s organization/store/member identifiers;
- a valid user with no assignment;
- a revoked/expired session;
- a mismatched app code;
- client-supplied organization/store headers that conflict with server scope;
- duplicate/replayed mutation idempotency keys.

## Data handling requirements

- logs redact provider tokens, passwords, reset tokens, cookies, and secret values;
- audit records distinguish actor, source app, target tenant, action, result, and reason;
- debug logs are bounded and disabled or sanitized in production;
- exports and reports require explicit permission and tenant filters;
- deletion/retention behavior is documented for personal data and audit records.

