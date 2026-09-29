# ADR-000: Place ownership and contract boundary

Status: accepted for implementation; production cutover and privileged writes
remain gated by the downstream acceptance criteria below.

Date: 2026-09-24

## Decision

The implementation proceeds with the following ownership boundary, based on
the existing repository policy and the architecture review recorded in
`map-implementation-plan.md`:

| Concern | Decision |
| --- | --- |
| Canonical Place authority | Aevo Core API domain boundary, with an Aevo-owned Place identity and read projection |
| Database migration owner | `aevo-core-api` / infrastructure migration workflow |
| Public Place route owner | Core API under `/api/v1/public/places/*` |
| Existing Hub/TraceDee data | Compatibility/read adapters until the canonical projection is accepted |
| Customer client | `aevo-go` consumes versioned contracts; it does not call Supabase or external POI providers in production |
| Admin | `aevo-admin` owns privileged review and mutations through the Core API BFF; platform RBAC remains separate from organization RBAC |
| Basemap/geocoder | Provider-neutral interfaces; provider and terms approval are still required before production selection |
| Place geometry | Point plus polygon/multipolygon-safe transport; no indoor geometry in V1 |
| Live state | Booking, queue, wait, and inventory remain owning-domain reads, never map overlay/static tile fields |
| Merge behavior | One bounded resolver with redirect metadata, loop/hop protection, retired-ID write rejection, split compensation, and audit |

No second public gateway is introduced. Local migration files, projection-gated
read handlers, and read-only Admin surfaces may be implemented under this ADR;
external migration application, source import, public client switch, and
privileged write commands remain separately gated.

## Explicit cardinality

- `Place` is the cross-product geographic identity and may contain multiple
  businesses or child Places.
- `Organization` is the tenant/legal operating scope.
- `Business` is a commercial identity/brand and may operate many branches.
- `Branch` has one primary Place before public location enablement and may have
  typed secondary service/location links.
- `Store` remains the existing operational identity, not the universal Place ID.
- `Venue` remains the booking-domain identity and links to a Place explicitly.
- `BookableResource` remains under a Venue and is never a Place identity.

## MAP-001 approval record

The user instruction to implement the plan authorizes this contract batch.
The following items are intentionally recorded as open gates for later tasks:

1. production basemap and geocoder providers, attribution, commercial terms,
   quotas, privacy, and SLA;
2. source dataset and territory approval for the first ingestion;
3. measured overlay/search/nearby budgets and performance owner;
4. field-level authority matrix confirmation by product/data owners;
5. compatibility row inventory and public route smoke test against deployment.

Until those gates are closed, implementation may build comparison fixtures,
read-only projections, and compatibility adapters, but it must not create a
new canonical browser write path, import unapproved sources, or switch the
existing discovery client by default. Current local defaults preserve the
legacy Go adapter and expose the canonical routes as projection-gated reads.
