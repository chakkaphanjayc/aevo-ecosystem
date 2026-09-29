# Events, analytics, and the behavior pipeline

ARCHITECTURE REVIEW REVISION

## Separate facts from domain state

Feed delivery, user behavior, and business state are different facts:

- a feed response is a delivery decision;
- an impression is a client-observed visibility event;
- an open/save/follow/dismiss is a user interaction;
- a trace publication or moderation action is a domain event.

Do not update feed ranking counters synchronously in the request that records an impression. Use append-only events and asynchronous aggregation.

## Event contract

Use the following Feed event specification version 1 for all Feed behavior:

    eventId
    schemaVersion
    eventName
    occurredAt
    receivedAt
    userId or anonymousId
    sessionId
    feedSessionId
    itemToken
    surface
    position
    entityType
    entityId
    candidateSource
    configVersion
    rankingVersion
    experimentVariants
    itemVersion
    clientEventId
    requestId
    viewportThreshold
    distanceBucket or coarseGeoCell
    metadata

The server supplies identity, session, item token, entity type/id, candidate source, request, and active config context. The client may supply a bounded position hint, visibility threshold, duration, client event ID, and offline timestamp. Precise location is not recorded by default.

### Event meanings

- impression: item is at least 50% visible continuously for 1 second, once per itemToken/session exposure;
- engaged_view: item is at least 50% visible continuously for 3 seconds, once per itemToken/session exposure;
- open/click: explicit user activation that opens the item/detail surface;
- save/share: successful server-accepted action, not merely a button press;
- trace_start/trace_complete: server-accepted TraceDee journey state transition;
- place_open: explicit public place detail open;
- booking_click: explicit navigation into booking/availability, not booking success.

The 50% and 1/3 second thresholds are V1 defaults and must be versioned if changed. Web, PWA, and Capacitor use the same semantic thresholds. Visibility timers pause when the document/WebView is hidden, the item is removed, or the observer is disconnected.

### Delivery semantics

- Batch events in bounded groups, for example up to 50 events or 5 seconds.
- Suppress duplicate impression/engaged_view events by itemToken, feedSessionId, eventName, and exposure window.
- Retry with the same clientEventId/idempotency key; reject conflicting payload reuse.
- Accept only bounded timestamp skew and record server received time.
- Queue a bounded offline batch in platform-appropriate local storage; discard or sample when full and expose no false success.
- The server validates payload size, session membership, item token, event name, and actor binding.

Initial event names:

- feed_requested;
- feed_response_served;
- feed_item_impression;
- feed_item_engaged_view;
- feed_item_open;
- feed_item_click;
- feed_item_save;
- feed_item_share;
- trace_start;
- trace_complete;
- place_open;
- booking_click;
- feed_item_dismiss;
- feed_item_quick_back;
- feed_degraded;
- feed_exposure.

During compatibility, legacy names such as feed_item_impressed, feed_item_opened, feed_item_dismissed, and feed_item_quick_back must be mapped to the versioned names above with schemaVersion preserved. Do not silently count a legacy event as a V1 event without recording the mapping.

Keep the existing TraceDee domain event names for trace/journey/content actions and map them into the same analytics vocabulary only at the consumer boundary.

## Ingest boundary

Provide a batch event route through the Customer API. It validates app session, item token, session membership, event type, payload size, timestamp skew, and idempotency. It returns accepted/rejected counts and a request ID. An unknown or expired token is rejected or recorded as an explicitly invalid telemetry event; it must not be treated as a valid impression.

The current synchronous tracedee_record_activity_event RPC can remain as a compatibility path during migration, but new Feed events should not depend on a transaction that also serves content. Use the existing GCP Pub/Sub topic, dead-letter subscription, Cloud Tasks retry path, Cloud Run worker, and observability infrastructure unless measured requirements justify another queue. Do not add Cloudflare Queue only for symmetry. Cloudflare remains appropriate for Edge/CDN/R2 responsibilities.

## Consumers

1. operational projection consumer: updates bounded counters and quality projections;
2. ranking evaluation consumer: aggregates experiment outcomes;
3. analytics export consumer: sends redacted events to the warehouse or long-term analytics store;
4. retention/deletion consumer: applies policy and subject deletion requests;
5. alert consumer: detects outbox lag, dead letters, abuse, and guardrail failures.

Each consumer uses an inbox/idempotency key and acknowledges only after its own transaction succeeds. One consumer failure must not block unrelated consumers.

## Current gap

tracedee_event_outbox exists, but the aevo-hub worker does not consume it and aevo-background-worker event persistence is not configured. The Core Go overview reads aevo_product_events, while TraceDee activity and impressions live in Supabase. This produces two analytics planes and a misleading pendingOutbox value. The implementation must choose one reporting source and publish freshness/coverage explicitly.

## Retention and privacy

Define retention by event class before enabling high-volume impressions. Store coarse location buckets rather than exact client coordinates. Do not put email, raw profile text, private preferences, or access tokens in event metadata. Support deletion/erasure propagation and aggregate re-computation.

Partition or archive high-volume event data by occurred_at. Keep operational aggregates small and indexed by item type, item ID, date bucket, and version. A warehouse export is recommended before Feed traffic grows; current infrastructure enables BigQuery but does not show a connected Feed dataset/sink.

## Required event tests

Test semantic consistency across Web/PWA/Capacitor, viewport/duration thresholds, duplicate suppression, batching, retries, timestamp skew, bounded offline behavior, idempotency, event version compatibility, no precise-location leakage, and exposure attribution to config/ranking/experiment variants.
