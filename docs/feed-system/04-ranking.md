# Ranking, diversity, and explainability

ARCHITECTURE REVIEW REVISION

## Ranking stages

Ranking is a pipeline, not one SQL expression:

1. hard eligibility;
2. entity-specific feature extraction;
3. entity-specific calibration;
4. common normalized feature space;
5. baseline/global score;
6. personalization score, if the cohort and preference allow it;
7. deterministic tie-break;
8. diversity and exploration selection;
9. final position and reason assignment.

The current TraceDee SQL function already contains deterministic and taste-personalized behavior, stable-hash cohorts, quality/taste projections, and guardrail reporting. Treat it as the baseline implementation to measure and refactor, not as the final universal ranking contract.

## Feature families

Use named, normalized feature families:

- quality: content-quality score and confidence;
- freshness: bounded publication-age decay;
- relationship: follows, saves, prior opens, and explicit preferences;
- affinity: topic, area, category, pace, and budget affinities;
- geography: distance or area match when the surface supplies location;
- popularity: aggregate saves, opens, and completion evidence with time decay;
- exploration: controlled candidate quota;
- penalties: reports, dismissals, quick-back, repetition, and stale projection.

Weights, caps, decay windows, and penalties come from a typed active config. Do not let Admin submit arbitrary SQL or an unvalidated expression tree.

## Mixed-entity calibration

TRACE and PLACE engagement signals are not interchangeable. Each entity type has an extractor and calibration version before features enter the common scorer.

- TRACE quality combines content-quality score/confidence, saves, follows, starts, and completions. Counts are log-scaled or percentile-normalized within TRACE and then mapped to a bounded 0..1 feature.
- PLACE quality combines rating with review-count confidence, public opens, saves, booking clicks, and distance/area match. Volume is normalized within PLACE and never treated as a raw cross-entity count.
- Freshness, affinity, relationship, geography, popularity, exploration, and penalty features are all represented in a common 0..1 space with an entity-type calibration version.
- Missing or stale features use a documented neutral/default value and a confidence penalty; they do not silently become a high score.

Global scoring consumes the calibrated feature vector. The selector then applies source budgets, optional source minimums, entity-type maximum ratios, consecutive entity caps, place repetition caps, and Trace repetition/lineage caps.

## Deterministic baseline

The baseline must work for anonymous users and as the safe fallback for authenticated users. The exact weights are a versioned product decision, but the score should be normalized so a single count or raw reputation value cannot dominate. Use a stable sort key such as score descending, publishedAt descending, itemId ascending.

Personalized ranking may compare deterministic and personalized lists in SHADOW. The served order remains deterministic until the active guardrails pass and Admin explicitly publishes a LIVE config.

## Diversity

Diversity occurs after candidate scoring and before pagination. The controlled
Core selector now enforces configurable caps when alternatives exist:

- maximum items per creator per page/session;
- maximum items per canonical place;
- maximum consecutive items of one item type;
- maximum repeated category/area/business concentration (`3/4/1` baseline);
- lineage/repost repetition cap;
- minimum exploration quota when sufficient eligible candidates exist.

The signed cursor also carries a compact server-produced seen-key window
(maximum 32 keys). It complements the ranked ordering anchor so a candidate
whose score changes between requests cannot re-enter immediately; the browser
cannot author or widen the window.

The selector must return a reason for a withheld candidate internally, so concentration and empty-page behavior can be diagnosed.

## Explainability

Public reason codes:

- FOLLOWING_TRACER;
- TASTE_MATCH;
- NEARBY;
- POPULAR;
- NEW;
- EDITORIAL, if later introduced.

Public reason parameters are whitelisted and human-safe. Keep full feature contributions only in protected evaluation telemetry with retention and access controls. The current reasonParams object contains ranking-mode/debug fields and should not become a stable client contract.

## Versioning and evaluation

Every ranking response and evaluation record carries:

- configVersion;
- rankingVersion;
- modelVersion, if applicable;
- cohort/variant derived from a stable experiment seed;
- surface and tab;
- generator versions;
- served item IDs;
- deterministic comparison IDs;
- stage timings and candidate counts.

Do not infer a model version from a reason string. The version is server-owned and immutable for a published revision.

The default experiment assignment is deterministic bucketing, for example hash(experimentId + stableUserKey + salt). Do not create a per-user assignment table by default. Persist only experiment definitions, variants, rollout rules, and narrowly scoped manual overrides. Persisted assignments are exceptional and require cross-device continuity, regulatory holdout, support override/audit, or another documented need.

## Guardrails

Minimum launch guardrails:

- p95 and p99 feed latency;
- empty/degraded response rate;
- duplicate item rate;
- creator concentration;
- item-type and topic diversity;
- hide/dismiss rate;
- quick-back rate;
- open/save/follow conversion;
- report rate;
- personalization uplift versus deterministic baseline;
- event delivery and outbox lag.

Calibration drift, source domination, and entity-type ratio violations are also launch guardrails.

Kill switch behavior must immediately select deterministic ranking and suppress optional generators without requiring a client release.
