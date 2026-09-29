# Devices and Terminals

## Current state

Core Hub routes expose device listing, registration, and revocation. POS/Kiosk/Queue are the likely domain owners for terminal operation, while Core should own identity, store association, lifecycle, and revocation of a first-party device credential.

## Ownership recommendation

| Concern | Owner |
| --- | --- |
| Device record, store binding, status, revocation | Core |
| Terminal capability and app-specific settings | POS/Kiosk/Queue |
| Device secret/private key | Device/secret boundary; never Hub database plaintext |
| Pairing challenge and expiry | Core |
| Receipt/printer/cash-drawer behavior | POS |
| Queue/KDS behavior | Queue/POS domain |
| Device telemetry | App/worker event pipeline with tenant scope |

## Required lifecycle

```text
created → pairing_pending → paired → active → suspended/revoked → retired
```

Registration must be idempotent. Revocation must invalidate sessions/credentials and be visible to the owning app. Duplicating a store must never duplicate an active terminal identity or private key.

## Gaps to close later

- Define device attestation or minimum trust signal for production.
- Define offline behavior and replay protection for POS terminals.
- Define whether a device can run multiple app codes and how each app session is scoped.
- Add tenant-security tests for a device identifier moved between stores.

