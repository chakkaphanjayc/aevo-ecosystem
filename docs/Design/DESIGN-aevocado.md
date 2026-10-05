---
version: alpha
name: Klarna
description: "Klarna's brand system is confident and playful-modern: crisp white and near-black ink surfaces punctuated by the signature soft pink accent, with lilac and green as secondary flourishes. Typography leans on the custom Klarna Title for oversized editorial display headings and Klarna Text for body and UI, giving a friendly fintech voice. Surfaces are generously rounded — from 16–32px cards up to fully pill-shaped buttons — over a clean hairline-bordered layout with a lightweight static header."
colors:
  primary: "#88DBA5"
  ink: "#0B051D"
  ink-alt: "#0E0E0F"
  text-secondary: "#282636"
  text-tertiary: "#373544"
  text-slate: "#504F5F"
  text-muted: "#615F6D"
  muted: "#96959F"
  neutral-light: "#C4C3CA"
  surface: "#FFFFFF"
  surface-lilac: "#EFECFF"
  border: "#E2E2E7"
  accent-green: "#136E43"
  accent-green-light: "#88DBA5"
  black: "#000000"
typography:
  hero-display:
    fontFamily: Klarna Title
    fontSize: 84px
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: normal
  display-lg:
    fontFamily: Klarna Title
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1
  display-md:
    fontFamily: Klarna Title
    fontSize: 52px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0.32px
  display-sm:
    fontFamily: Klarna Title
    fontSize: 43.2px
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: normal
  title-md:
    fontFamily: Klarna Text
    fontSize: 31.008px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.048px
  body:
    fontFamily: Klarna Text
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: -0.048px
  body-relaxed:
    fontFamily: Klarna Text
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-ui:
    fontFamily: Klarna Text
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.25
  body-strong:
    fontFamily: Klarna Text
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.25
  caption:
    fontFamily: Klarna Text
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.048px
  nav-link:
    fontFamily: -apple-system
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.15
  label-sm:
    fontFamily: -apple-system
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.3
rounded:
  sm: 2px
  md: 8px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
  4xl: 48px
  pill: 99999px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
  4xl: 40px
  5xl: 64px
  section: 72px
components:
  navbar:
    height: 72px
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderWidth: 0px
    position: static
  nav-link:
    textColor: "{colors.text-tertiary}"
    typography: "{typography.nav-link}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: 11px 24px
  button-secondary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: 11px 24px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: rgba(0, 0, 0, 0.1) 0px 2px 4px 0px
  card-lilac:
    backgroundColor: "{colors.surface-lilac}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: 24px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.lg}"
    typography: "{typography.body-ui}"
    padding: 12px 16px
  chip:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    typography: "{typography.caption}"
    padding: 4px 12px
  badge-success:
    backgroundColor: "{colors.accent-green-light}"
    textColor: "{colors.accent-green}"
    rounded: "{rounded.pill}"
    typography: "{typography.caption}"
  avatar:
    rounded: "{rounded.pill}"
    size: 48px
  link:
    textColor: "{colors.ink}"
    typography: "{typography.body-ui}"
  tooltip:
    backgroundColor: "{colors.surface}"
    boxShadow: rgba(0, 0, 0, 0.2) 0px 0px 18px 0px
    rounded: "{rounded.lg}"
---

# Klarna

## Overview

Klarna's design system is confident, playful, and unmistakably editorial for a fintech brand. It rejects the stiff corporate-bank aesthetic in favor of oversized display typography, punchy pink color-blocking, and generously rounded geometry that feels approachable to everyday shoppers. Hierarchy is built almost entirely through **scale and type contrast** — a hero headline at 84px (`{typography.hero-display}`) sits against 16px body copy, a 5x jump that does the heavy lifting instead of color or shadow.

Density is airy. Sections breathe on a 72px rhythm (`{spacing.section}`), content sits on a crisp white canvas (`{colors.surface}` — #FFFFFF), and near-black ink (`{colors.ink}` — #0B051D) carries the text load. The signature soft pink (`{colors.primary}` — #88DBA5) is used sparingly as an accent — for secondary buttons, chips, and color-blocked emphasis panels — never as a wash. Depth is deliberately minimal: emphasis comes from color blocks and scale, not from stacked shadows.

The result is a friendly-but-premium voice: casual German copy paired with typographic swagger, soft pill buttons, and large rounded cards that all reinforce a non-sharp, human aesthetic.

**Key Characteristics:**

- Oversized editorial display type (up to 84px) drives all hierarchy
- Near-black ink (`{colors.ink}`) on white (`{colors.surface}`) as the core contrast
- Signature soft pink (`{colors.primary}`) as the sole loud accent
- Fully pill-shaped buttons (`{rounded.pill}`) and large 32px card radii (`{rounded.3xl}`)
- Flat elevation — color blocks over shadows
- Only three font weights in play: 400, 500, 700
- Hairline borders (`{colors.border}`, 1px) instead of dividers with weight
- Generous whitespace on a 72px section cadence

## Colors

Klarna's palette is a disciplined near-monochrome — white and near-black ink — activated by a single loud pink accent and quiet lilac/green secondaries.

### Brand & Accent

- **Signature Pink** (`{colors.primary}` — #88DBA5): the brand's loud accent. Used for secondary button fills, chips (`{components.chip}`), and color-blocked emphasis panels. Never a full-page wash — always a punctuation mark.
- **Lilac Surface** (`{colors.surface-lilac}` — #EFECFF): a soft tinted surface for lilac cards (`{components.card-lilac}`) and quiet callout panels.
- **Klarna Green** (`{colors.accent-green}` — #136E43): text/icon accent for success and positive framing.
- **Green Light** (`{colors.accent-green-light}` — #88DBA5): success badge fill (`{components.badge-success}`), paired with the darker green as text.
- **Accent Purple** (`{colors.accent-purple}` — #88DBA5): a rare tertiary flourish, lowest-frequency in the evidence.

### Surface

- **White** (`{colors.surface}` — #FFFFFF): the primary canvas and card background.
- **Lilac** (`{colors.surface-lilac}` — #EFECFF): secondary tinted surface (see above).

### Text

- **Ink** (`{colors.ink}` — #0B051D): primary text and near-black button fills; the dominant ink by a wide margin.
- **Ink Alt** (`{colors.ink-alt}` — #0E0E0F): a near-identical alternate near-black for text.
- **Secondary** (`{colors.text-secondary}` — #282636): sub-headings and dense body.
- **Tertiary** (`{colors.text-tertiary}` — #373544): nav links (`{components.nav-link}`) and supporting text.
- **Slate** (`{colors.text-slate}` — #504F5F) and **Muted** (`{colors.text-muted}` — #615F6D): descending muted text tiers.
- **Muted Grey** (`{colors.muted}` — #96959F) and **Neutral Light** (`{colors.neutral-light}` — #C4C3CA): faint captions, placeholders, disabled text.
- **Pure Black** (`{colors.black}` — #000000): used narrowly (e.g. the cookie modal surface).

### Hairlines & Borders

- **Hairline** (`{colors.border}` — #E2E2E7): the universal 1px border for cards, inputs, and dividers.

This system uses **no gradients** — emphasis is delivered through flat color blocks, not blends. There is **no dark-mode token block**; the system is designed light-only, so a builder should not assume theme inversion. The many text greys (`{colors.text-secondary}` through `{colors.neutral-light}`) form a deliberate ink ladder — pick the tier by importance, not by taste.

## Typography

Type is the star of this system. Two custom families do all the work: an oversized editorial display face and a friendly UI/body face.

### Font Family

- **Klarna Title** — the editorial display face, used only for large headings from 43px up to the 84px hero. Carries the brand's confident, oversized personality.
- **Klarna Text** — the workhorse for body, UI labels, captions, and mid-size titles.
- **-apple-system** — the system fallback observed on nav links and small labels; effectively the substitute stack when Klarna Text hasn't loaded, and the measured face for navigation.

### Hierarchy

| Token                       | Size     | Weight | Line Height | Letter Spacing | Use                      |
| --------------------------- | -------- | ------ | ----------- | -------------- | ------------------------ |
| `{typography.hero-display}` | 84px     | 700    | 0.9         | normal         | Hero headline            |
| `{typography.display-lg}`   | 52px     | 700    | 1           | normal         | Bold section display     |
| `{typography.display-md}`   | 52px     | 400    | 1.1         | 0.32px         | Light editorial display  |
| `{typography.display-sm}`   | 43.2px   | 700    | 0.95        | normal         | Smaller display headings |
| `{typography.title-md}`     | 31.008px | 700    | 1.1         | -0.048px       | Sub-section titles       |
| `{typography.body}`         | 16px     | 400    | 1.45        | -0.048px       | Standard body copy       |
| `{typography.body-relaxed}` | 16px     | 400    | 1.5         | normal         | Longer-form paragraphs   |
| `{typography.body-ui}`      | 16px     | 400    | 1.25        | normal         | UI labels, links         |
| `{typography.body-strong}`  | 16px     | 500    | 1.25        | normal         | Button labels, emphasis  |
| `{typography.caption}`      | 14px     | 400    | 1.05        | -0.048px       | Captions, chips          |
| `{typography.nav-link}`     | 14px     | 500    | 1.15        | normal         | Navigation links         |
| `{typography.label-sm}`     | 14px     | 400    | 1.3         | normal         | Small labels             |

### Principles

Only **three weights exist**: 400 (regular), 500 (medium, reserved for buttons and nav emphasis), and 700 (bold display). There is no 600 or heavier cut — do not introduce one. Display type runs **tight to sub-1.0 line height** (0.9–1.0) so oversized headlines stack densely; body loosens to 1.25–1.5 for readability. Letter spacing is near-neutral — a slight negative tightening (-0.048px) on body and captions, and one deliberate positive 0.32px on the light 52px display (`{typography.display-md}`). Both 52px tokens share a size but split by weight (700 vs 400), a deliberate bold/light editorial pairing.

### Note on Font Substitutes

Klarna Title and Klarna Text are proprietary. For rebuilds, substitute a geometric-humanist sans: **Inter** or **Hanken Grotesk** for Klarna Text, and a heavier display grotesk such as **Clash Display** or bold Inter for Klarna Title. Tune by tightening display line-height to ~0.9 and keeping the -0.048px body tracking to preserve the compact, editorial feel.

## Layout

### Spacing System

Spacing is built on a **4px base unit**, expanding through a consistent scale: `{spacing.xxs}` (2px), `{spacing.xs}` (4px), `{spacing.sm}` (8px), `{spacing.md}` (12px), `{spacing.lg}` (16px), `{spacing.xl}` (20px), `{spacing.2xl}` (24px), `{spacing.3xl}` (32px), `{spacing.4xl}` (40px), `{spacing.5xl}` (64px), and `{spacing.section}` (72px). The most-used steps in evidence are 4px, 8px, 16px, 12px, and 24px — tight component-level rhythm — while 64px and 72px handle section separation.

### Grid & Container

The layout is **single-column and hero-driven**. The hero centers oversized headline type that intentionally breaks strict grid alignment, with a right-aligned floating promo card and a horizontal stat row (rating, years, users, merchants) evenly distributed beneath. The header is a fixed 72px bar (`{components.navbar}`). Cards and panels sit within a centered content measure with generous side gutters. No rigid multi-column grid is evident on the marketing pages — content flows as stacked full-width sections.

### Whitespace Philosophy

Whitespace is generous and load-bearing. Sections breathe on a 72px cadence (`{spacing.section}`), and the hero leans on large top whitespace to let display type dominate. The strategy: let scale and empty space create hierarchy so color and shadow can stay minimal.

## Elevation & Depth

| Level         | Treatment                               | Use                                                        |
| ------------- | --------------------------------------- | ---------------------------------------------------------- |
| 0 — Flat      | No shadow, color block or hairline only | Default sections, color-blocked pink panels, most content  |
| 1 — Hairline  | 1px border `{colors.border}`            | Cards (`{components.card}`), inputs (`{components.input}`) |
| 2 — Soft card | `rgba(0,0,0,0.1) 0px 2px 4px`           | Card lift, floating phone-mockup UI buttons                |
| 3 — Overlay   | `rgba(0,0,0,0.2) 0px 0px 18px`          | Tooltip (`{components.tooltip}`), cookie modal             |

**Shadow philosophy.** Elevation comes from surface change and color-blocking, not from shadows. The default state is flat — pink and lilac panels create emphasis by hue, and cards are separated by a 1px hairline (`{colors.border}`) rather than a drop shadow. Shadows appear only in two narrow cases: a soft 2px/4px lift on genuine cards and floating UI elements, and a wider 18px ambient glow reserved for true overlays (tooltips, modals) that must float above the page. Keep shadows subtle and rare — reaching for depth is off-brand.

## Shapes

### Border Radius Scale

| Token            | Value   | Use                                     |
| ---------------- | ------- | --------------------------------------- |
| `{rounded.sm}`   | 2px     | Minimal rounding, small marks           |
| `{rounded.md}`   | 8px     | Small controls                          |
| `{rounded.lg}`   | 16px    | Inputs (`{components.input}`), tooltips |
| `{rounded.xl}`   | 20px    | Mid panels                              |
| `{rounded.2xl}`  | 24px    | Lilac cards (`{components.card-lilac}`) |
| `{rounded.3xl}`  | 32px    | Standard cards (`{components.card}`)    |
| `{rounded.4xl}`  | 48px    | Large feature panels                    |
| `{rounded.pill}` | 99999px | Buttons, chips, badges, avatars         |

The geometry is emphatically **soft and rounded**. Cards cluster at 16–32px radii, feature panels reach 48px, and every interactive pill — buttons (`{components.button-primary}`, `{components.button-secondary}`), chips (`{components.chip}`), success badges (`{components.badge-success}`), and avatars (`{components.avatar}`) — is fully pill-shaped via `{rounded.pill}`. Avatars use the pill radius at a fixed 48px size to render as circles. Sharp corners are essentially absent; the smallest radius (2px) is a near-square exception. This consistent rounding, echoed in the hero's abstract blob shape, is core to the friendly, non-corporate feel.

## Components

### Navigation

**`navbar`** — A lightweight, **static** (non-sticky) header at 72px tall (`{components.navbar.height}`) on a white surface (`{colors.surface}`) with **no bottom border** (borderWidth 0px) and **no backdrop blur** (backdropFilter none). Text is ink (`{colors.ink}`). The bar carries **6 nav links** styled in tertiary grey (`{components.nav-link}` → `{colors.text-tertiary}` — #373544) at 14px/500 weight in the -apple-system fallback face (`{typography.nav-link}`), plus a CTA button on the right. On mobile the links collapse to a hamburger menu.

### Buttons

**`button-primary`** — Near-black ink fill (`{colors.ink}`) with white text (`{colors.surface}`), fully pilled (`{rounded.pill}`), 11px/24px padding, label in `{typography.body-strong}` (16px/500). The primary CTA.

**`button-secondary`** — Signature pink fill (`{colors.primary}` — #88DBA5) with ink text (`{colors.ink}`), same pill shape and padding as primary. The brand-forward alternative action.

### Cards & Containers

**`card`** — White surface (`{colors.surface}`), 32px radius (`{rounded.3xl}`), 1px hairline border (`{colors.border}`), and a soft lift shadow (`rgba(0,0,0,0.1) 0px 2px 4px`). Ink text.

**`card-lilac`** — Tinted lilac surface (`{colors.surface-lilac}` — #EFECFF), 24px radius (`{rounded.2xl}`), 24px padding, ink text, no border or shadow — depth comes from the tint alone.

### Inputs & Forms

**`input`** — White surface with a 1px hairline (`{colors.border}`), 16px radius (`{rounded.lg}`), 12px/16px padding, text in `{typography.body-ui}` (16px/400). Ink text on white.

### Badges & Chips

**`chip`** — Pink fill (`{colors.primary}`), ink text, fully pilled (`{rounded.pill}`), caption type (`{typography.caption}`), 4px/12px padding.

**`badge-success`** — Light-green fill (`{colors.accent-green-light}` — #88DBA5) with dark-green text (`{colors.accent-green}` — #136E43), pilled, caption type — the positive/status pattern.

### Media & Misc

**`avatar`** — Pilled (`{rounded.pill}`), fixed 48px — renders as a circle.

**`link`** — Ink text (`{colors.ink}`), `{typography.body-ui}`. Inline links stay near-black rather than colored.

**`tooltip`** — White surface, 16px radius (`{rounded.lg}`), ambient overlay shadow (`rgba(0,0,0,0.2) 0px 0px 18px`) so it floats above content.

### Footer

The evidence's landmark capture only measured the header (72px, 6 links, CTA). Footer structure — column count and legal-text treatment — was not resolved in the measured landmarks, so build it as a standard multi-column link list using muted text tiers (`{colors.text-muted}`, `{colors.muted}`) and hairline dividers (`{colors.border}`), pending confirmation.

## Do's and Don'ts

### Do

- Do let oversized display type (`{typography.hero-display}`, `{typography.display-lg}`) carry hierarchy — scale first, not color.
- Do use only the observed font weights — 400, 500, 700; weight 500 is reserved for buttons/nav (`{typography.body-strong}`, `{typography.nav-link}`).
- Do keep the signature pink (`{colors.primary}`) as a punctuating accent — secondary buttons, chips, emphasis panels — never a full wash.
- Do separate cards with the 1px hairline (`{colors.border}`) and reach for shadow only on genuine floats.
- Do fully pill every interactive control (`{rounded.pill}`) and round cards at 24–32px (`{rounded.2xl}`, `{rounded.3xl}`).
- Do pace sections on the 72px rhythm (`{spacing.section}`) and keep whitespace generous.
- Do pick the text grey by importance from the ink ladder (`{colors.ink}` → `{colors.neutral-light}`), not by taste.

### Don't

- Don't add heavier or lighter font cuts (no 300, 600, 800) beyond 400/500/700.
- Don't introduce gradients — this system is flat color blocks only.
- Don't stack heavy shadows for depth; max is the soft `rgba(0,0,0,0.1) 0px 2px 4px` card lift.
- Don't make the header sticky or add a backdrop blur — it is static (`{components.navbar.position}`) with no border.
- Don't color inline links blue; keep them ink (`{components.link}` → `{colors.ink}`).
- Don't use pink as a text color — it appears only as surface/interactive fill.
- Don't assume a dark theme — no dark tokens exist; design light-only.
- Don't tighten body tracking beyond the -0.048px norm or loosen display line-height above ~1.1.

## Responsive Behavior

This is a **two-viewport analysis** (desktop and mobile captures only); no intermediate breakpoint pixel values were measured, so none are asserted here.

On desktop, the hero is a single column with oversized headline type breaking grid alignment, a right-aligned floating promo card, and a horizontal stat row (4.5★, 20 years, 120M users, 1.2M merchants) evenly spaced beneath the headline. The header shows all 6 nav links plus the CTA.

On mobile, the layout **collapses to a stacked single column**: the nav links fold into a hamburger menu, the stat row and card/blob elements scale down, and carousel dots appear for swipeable content. The core elements (headline, card, blob) persist but shrink responsively rather than restructure.

Touch targets are comfortable: pill buttons carry 11px/24px padding on `{typography.body-strong}` (16px), and avatars are 48px (`{components.avatar}`) — at or above the ~44px minimum. Inputs use 12px/16px padding (`{components.input}`) for adequate tap area.

## Iteration Guide

1. **Reference tokens, never raw hex.** Edit `{colors.primary}` or `{colors.ink}` centrally; the accent-vs-ink relationship must survive any recolor.
2. **Button variants live in two places** — `{components.button-primary}` (ink fill) and `{components.button-secondary}` (pink fill). Both share `{rounded.pill}` and `{typography.body-strong}`; keep them in lockstep.
3. **Respect the three-weight ceiling.** Any new type token must use 400, 500, or 700 — pull from the existing `{typography}` ladder rather than inventing sizes.
4. **Depth is capped.** New elevated elements use the card shadow (`rgba(0,0,0,0.1) 0px 2px 4px`) for lifts and the tooltip shadow for overlays — nothing heavier.
5. **Rounding is a brand boundary.** Interactive controls stay pilled (`{rounded.pill}`); containers stay 16–48px. Do not ship sharp corners.
6. **Keep the header static and borderless.** Don't convert `{components.navbar}` to sticky or add blur — that breaks the lightweight intent.
7. **No gradients, no dark mode, no blue links.** These are systemic absences, not omissions — preserve them.

## Known Gaps

- **Hover, focus, active, and disabled states** were not captured — button and link interaction styling is inferred from resting tokens only.
- **Footer structure** was not resolved in the measured landmarks (only the header was captured); column layout, link grouping, and legal-text treatment are unverified.
- **Animation and transitions** (carousel behavior, blob motion, scroll effects) are visible in screenshots but their timing/easing is unmeasured.
- **Two-viewport capture only** — no intermediate/tablet breakpoints were observed, so exact responsive thresholds are unknown.
- **Auth-walled and checkout surfaces** (actual Klarna payment flows) were not captured; tokens reflect marketing pages.
- **Accent purple** (`{colors.accent-purple}`) and **green** accents appear at very low frequency (1–3 pages), so their exact usage patterns are lightly evidenced.
- No values were dropped during grounding, so the token set is complete relative to what was extracted — but absence of a dark block is by design, not omission.
