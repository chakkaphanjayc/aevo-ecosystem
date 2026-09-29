# Open Decisions

These decisions must be recorded before implementation reaches the corresponding phase.

| ID | Decision | Why it matters | Default recommendation |
| --- | --- | --- | --- |
| OD-001 | Is `brand` a billing/security boundary or a grouping? | Determines hierarchy and entitlements. | Keep organization as authority; brand optional grouping unless a concrete policy requires otherwise. |
| OD-002 | Which database/schema is the final Core control-plane store? | Current Core uses transitional `public.*` tables. | Core-owned schema/ledger, with explicit compatibility views during migration. |
| OD-003 | Which service verifies billing webhooks? | Prevents client/admin entitlement grants. | Dedicated verified consumer feeding Core projection. |
| OD-004 | What is the app compatibility handshake? | Health is insufficient. | Signed endpoint returning contract/capabilities/version and optional tenant-safe probe. |
| OD-005 | Are app features declared by manifest or app config schema? | Prevents hard-coded Hub drift. | Manifest declares capability; app owns schema/validation. |
| OD-006 | What is the local unlimited-development policy? | Prevents dev bypass promotion. | Local profile only, explicit env assertion, fail closed elsewhere. |
| OD-007 | Which app owns shared catalog? | Avoids duplicate product truth. | POS/catalog app owns operational catalog; Hub orchestrates. |
| OD-008 | How are stores archived/deleted? | Data retention and app cleanup. | Soft archive with audited compensating cleanup; hard delete only local reset. |
| OD-009 | What is the workforce invitation lifecycle? | Required for member/admin UX and security. | Pending/accepted/suspended/revoked state machine with expiry. |
| OD-010 | How much generic plugin support is needed now? | Avoids premature runtime complexity. | Registry/credentials boundary only; defer arbitrary plugin runtime. |
| OD-011 | What is the first analytics read model? | Avoids synchronous multi-app fan-out. | Core control-plane counts plus app-owned reports with freshness. |
| OD-012 | What is the deprecation observation window? | Needed before deleting compatibility. | Define per environment using deployment telemetry; do not guess. |

