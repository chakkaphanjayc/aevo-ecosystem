# Identity, SSO, Sessions, and Access

## Current ownership

| Concern | Owner | Evidence | Assessment |
| --- | --- | --- | --- |
| External identity provider interaction | Accounts | `aevo-accounts/src/index.ts`, README | GOOD; broker role is clear. |
| Redirect allowlist and PKCE flow | Accounts | signed flow state and exchange routes | GOOD/PARTIAL; requires full-app callback matrix. |
| Durable app-scoped session | Core | `CoreDataStore`, internal session routes, migrations 0001/0003/0005/0006 | GOOD direction. |
| Organization membership authorization | Core | `ApplicationAuthorizationDataStore`, `HubDataStore` | PARTIAL; shared-table ownership is transitional. |
| App assignment and scope | Core | `member_app_assignments`, scopes, roles | PARTIAL; app repositories still read related tables directly. |
| Privileged platform authorization | Core + Admin UI | Admin README/routes | GOOD direction; test separation from Hub. |
| App-local domain authorization | POS/Play/Go | app APIs and RLS | KEEP; must consume canonical identity/app context. |

## Required invariants

1. A browser never stores or sends a provider access token to an app domain API.
2. Each first-party app uses a distinct app code and cookie/session namespace.
3. A valid identity does not imply organization membership, store access, app assignment, entitlement, or feature availability.
4. Core resolves membership and location scope server-side. `x-organization-id` and `x-store-id` are hints at most, never authority.
5. Platform roles and organization/workforce roles remain separate.
6. Logout and revocation are app-specific but must support an explicit “sign out everywhere” policy.
7. Password reset, passkey, recovery, and session refresh all have auditable outcomes and rate limits.

## Current gaps

- Passkey/WebAuthn is not a complete Core/Accounts contract; local configuration currently gates it off.
- Cross-app SSO is present as an authorization-code/handoff concept but needs a matrix proving allowed source/target app pairs and redirect origins.
- App repositories retain local auth/db packages. The audit must distinguish a client adapter from a second authority before deprecating anything.
- The app-assignment model is not yet demonstrated consistently across all apps and all tenant denial cases.

## Target access sequence

```text
Identity proof (Accounts)
  → Core app session (app code + CSRF + timeouts)
    → Core organization membership
      → Core store/location scope
        → Core app assignment
          → Core entitlement / plan
            → app-specific role/scope
              → app domain authorization + RLS
```

## Security tests required

- authenticated but unassigned user cannot enter Hub;
- Hub member cannot open another organization by guessed ID;
- store member cannot access an unassigned store;
- assigned user without entitlement cannot launch an app;
- app session cannot be replayed under another app code;
- cross-app handoff rejects unregistered target, origin, nonce, expired code, replay, and wrong audience;
- revoked session fails at Core and at each app edge;
- provider tokens never appear in browser-visible responses or logs.

