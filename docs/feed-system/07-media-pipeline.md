# Media and attachment pipeline

## Current state

TraceDee places expose image_url and some place/media URL arrays. TraceDee posts currently have body, author, optional trace/place, moderation status, and timestamps, but no canonical media attachment relation was found. Aevo Go contains media-oriented UI components and remote image rendering, yet this is not a durable upload or processing pipeline.

Do not make a universal Feed depend on arbitrary client-provided image URLs. A URL is not proof of ownership, safety, availability, or a stable rendition.

## Proposed media model

Introduce a domain-neutral media attachment model only when post candidates enter the live Feed:

    media_asset(
      id,
      owner_id,
      source_application,
      storage_key,
      media_type,
      byte_size,
      checksum,
      width,
      height,
      duration_ms,
      moderation_state,
      lifecycle_state,
      created_at,
      deleted_at
    )

    media_attachment(
      entity_type,
      entity_id,
      asset_id,
      position,
      alt_text,
      crop_metadata
    )

Keep storage keys private. Public Feed hydration returns signed or CDN-safe variant URLs with bounded expiry and a media version. Never expose service credentials or unrestricted bucket paths to the browser.

## Processing states

UPLOAD_REQUESTED -> UPLOADED -> SCANNING -> TRANSCODING -> READY

Failure states are QUARANTINED, REJECTED, and FAILED. A post with no READY attachment may still be visible as text if product policy allows; a post with a failed required asset must be omitted or rendered with a safe placeholder.

Processing should be asynchronous and idempotent. The upload endpoint returns an opaque upload instruction. The worker validates content type, size, checksum, dimensions, malware/safety results, and generated variants before marking the asset ready.

## Feed integration

The Post generator should require:

- post status VISIBLE/LIMITED;
- author and target trace/place still public;
- media attachments either READY or explicitly optional;
- safe text length and edit/delete version;
- no block/mute/report suppression;
- a public detail route and stable entity version.

Image selection and alt text are hydration concerns, not ranking features in the first release. Do not introduce video ranking, client-side upload transforms, or a separate media microservice in the first mixed TRACE/PLACE rollout.

## Ownership

Core API should own upload authorization and public attachment contracts. The storage provider and worker are infrastructure concerns. Aevo Go renders the typed media variant. Admin moderation needs a read-only preview and quarantine action, but never receives storage credentials.

