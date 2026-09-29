# Candidate generators

ARCHITECTURE REVIEW REVISION

## Generator contract

Each generator is an isolated server module with a stable name and version:

    generate(context) -> {
      candidates: Candidate[]
      exhausted: boolean
      degraded: boolean
      sourceVersion: string
      latencyMs: number
      reason?: string
    }

Candidate contains only the minimum identity and features needed for eligibility/ranking. It is not the public response object:

    Candidate {
      itemType
      itemId
      source
      entityVersion
      creatorId
      placeId
      areaKey
      topicKeys
      publishedAt
      sourceScore
      sourceReason
    }

The repository implementation must use strict types. Candidate generators may return zero items; empty is a valid result. Each generator receives an AbortSignal or equivalent deadline and must not issue unbounded queries.

## Initial generators

### Trace generator

Reuse the existing tracedee_discovery_feed behavior as a compatibility baseline, but put it behind the new Feed repository. Remove client ownership of the RPC shape, raw cursor, rankScore, and internal reasonParams. The generator should return enough candidates for post-ranking diversity, not just the final page.

Required fixes before it is used as a scalable universal source:

- replace per-row correlated count subqueries with maintained aggregates or a bounded aggregate join;
- make cursor/request context server-owned;
- include a real session identifier when recording ranking evaluations;
- stop exposing internal ranking debug fields;
- ensure moderation and block/mute filters are applied before candidate output;
- make the active config version explicit.

### Place generator

Adapt the existing public discovery read model and tracedee_places. It must normalize Store and TraceDee Place identities, honor public_enabled/moderation state, support area and optional nearby context, and return a stable source score. Do not interleave public stores in the browser.

### Post generator

Use tracedee_posts only after the Feed can enforce VISIBLE/LIMITED state, soft deletion, report policy, creator suppression, and a complete media/summary contract. A post without a canonical public detail route or media policy is not a valid candidate.

### Tracer generator

Use public user profile and expertise projections only after profile visibility, privacy, block/mute, and creator disclosure rules are defined. Do not infer creator identity from internal score tables alone.

### Future generators

Potential future sources include followed creators, saved traces, editorial modules, and nearby topic modules. They should remain separate generators so they can be enabled, budgeted, or removed independently.

## Generator budgeting

The config should specify maximum candidates, optional source minimums, latency budgets, and maximum final ratios per generator/entity type. The server enforces total candidate count and a maximum response budget. Optional generators fail open to an empty result; safety/eligibility checks fail closed.

Recommended first budget:

- TRACE: 4x requested page size, hard cap 96;
- PLACE: 3x requested page size, hard cap 72;
- optional generators: disabled;
- total pre-ranking candidate cap: 160;
- response target: p95 under 300 ms before event enqueue.

These are starting guardrails, not product commitments; measure them against production data before tuning.

Final composition must not be proportional to generator volume. A generator that returns more candidates cannot dominate simply because it filled the pool. The selector applies source minimums only when enough eligible candidates exist, entity-type maximum ratios, consecutive-type caps, place repetition caps, and Trace lineage repetition caps.

## Deduplication

Deduplicate by canonical item identity, not by presentation ID. A place linked from a trace must not duplicate the same public place result unless the surface explicitly permits contextual variants. Preserve the strongest candidate source and record all contributing sources internally for evaluation.

## Failure behavior

The generator result records degraded state for observability, but the public response should expose only a safe feed status. If all optional generators fail and the deterministic baseline is available, serve the baseline. If safety eligibility or public profile lookup cannot be verified, omit the candidate.
