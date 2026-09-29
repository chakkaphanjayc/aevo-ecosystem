# Open questions and recommended defaults

ARCHITECTURE REVIEW REVISION

These questions should be answered before implementation begins. The recommended default keeps the first slice small and reversible.

## 1. Where is TraceDee data authoritative?

Current evidence is split: Core README says Core owns migration writes, while the concrete TraceDee domain/schema lives in Supabase migrations and aevo-hub packages.

Recommended default, recorded in ADR-000: keep existing TraceDee/public discovery data behind a private server-side adapter for V1; Core owns new Feed control-plane schema after FEED-000 approval; freeze new unowned Supabase schema growth.

## 2. Is Core API the public Customer Gateway?

The Edge Gateway and Go worker both forward API paths to Core API, but inspected Core routes do not include public TraceDee handlers.

Recommended default: Core owns the public facade and session/policy; use a private data adapter. If a second data connection is unacceptable, create a dedicated private customer-data service rather than restoring Hub Gateway.

## 3. Which place identity wins?

tracedee_places and customer_store_profiles both represent discoverable places.

Recommended default: define a canonical public place identity mapping and deduplicate at the Feed adapter boundary. Keep Store booking/catalog authority separate from TraceDee editorial metadata.

## 4. What is the first product surface?

For You, Following, Nearby, Search, and the map have different candidate and privacy needs.

Recommended default: launch a server-owned mixed For You endpoint with TRACE + PLACE; retain Following and Nearby as explicit tabs with deterministic behavior until their data contracts are complete.

## 5. Are guests eligible for personalization?

Current settings allow guest browsing, while taste preferences are account-based.

Recommended default: guests receive deterministic public ranking with coarse session exploration only; authenticated users may enter SHADOW/LIVE cohorts after opt-in and privacy review.

## 6. What is the media rights/storage provider?

TraceDee posts have no canonical media relation.

Recommended default: defer Post candidates until object storage, attachment, moderation, CDN variant, deletion, and Admin preview contracts are approved.

## 7. What are the Feed SLOs and traffic assumptions?

No measured production Feed traffic or query-plan baseline was found.

Recommended default: adopt the initial targets in 14-cache-and-scale.md, load test the first slice, and revise from evidence.

## 8. Where do Feed events report?

Core overview reads aevo_product_events; TraceDee activity/impressions are in Supabase; the worker path is incomplete.

Recommended default: use the versioned Feed event specification in 06-events-and-analytics.md, durable intake through existing GCP Pub/Sub/Cloud Tasks/Cloud Run, and a named consumer/warehouse source. Keep compatibility writes only during a measured migration window.

## 9. Who can publish ranking config?

Platform roles and Go settings permissions exist, but Feed-specific draft/publish/rollback does not.

Recommended default: go.settings.manage can draft/publish; content.moderate controls content safety only; system.jobs controls projection operations; audit.read controls history. Require reason/ticket for every mutation.

## 10. What is the Admin migration deadline?

aevo-admin is the stated long-term control plane, while aevo-hub/apps/admin contains transitional TraceDee screens.

Recommended default: add no new Feed control to the Hub Admin. Port existing capability after Core contracts are stable and remove the transitional app only after preview/production verification.

## 11. How much ranking sophistication is needed at launch?

The code already contains taste SHADOW/LIVE fields, but the universal mixed pipeline and guardrails are not complete.

Recommended default: deterministic TRACE + PLACE first, taste ranking in SHADOW, explicit diversity, and a server kill switch. Defer ML/vector retrieval until the event and evaluation pipeline is trustworthy.
