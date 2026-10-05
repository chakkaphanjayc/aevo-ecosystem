---
version: alpha
name: Snapchat
description: "Snapchat's marketing web presence pairs a crisp, high-contrast editorial layout with its unmistakable signal-yellow accent. Surfaces are predominantly white and near-black with soft grey fields, letting the #FFFC00 brand yellow pop against neutral ink for CTAs and highlights. Typography leans on the geometric warmth of Avenir Next across a tight ladder from bold display headings down to compact captions and nav labels, while pill-shaped buttons, rounded cards and hairline dividers keep the feel friendly, modern and app-native. A full dark theme inverts the neutrals to white-on-black while retaining the same yellow accent."
colors:
  primary: "#FFFC00"
  ink: "#000000"
  ink-strong: "#121314"
  body: "#53575B"
  muted: "#656D78"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F0F1F2"
  surface-dark: "#262626"
  surface-deep: "#2C3137"
  hairline: "#CCCCCC"
  border-muted: "#666666"
  link: "#0000EE"
  info: "#0096E5"
  info-bright: "#0FADFF"
  success: "#157015"
typography:
  title-lg:
    fontFamily: Avenir Next
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: normal
  title-md:
    fontFamily: Avenir Next
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: normal
  body:
    fontFamily: Avenir Next
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: normal
  body-sm:
    fontFamily: Avenir Next
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: normal
  body-strong:
    fontFamily: Avenir Next
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: normal
  label:
    fontFamily: Avenir Next
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: normal
  caption:
    fontFamily: Avenir Next
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: normal
  caption-strong:
    fontFamily: Avenir Next
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: normal
  micro:
    fontFamily: Avenir Next
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: normal
  button:
    fontFamily: Avenir Next
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: normal
  nav-link:
    fontFamily: Avenir Next
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: normal
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 20px
  2xl: 32px
  pill: 999px
spacing:
  2xs: 2px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
  2xl: 16px
  3xl: 20px
  4xl: 24px
  section: 72px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 11px 20px
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 11px 20px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    boxShadow: rgba(0, 0, 0, 0.3) 0px 1px 3px 0px
    padding: 16px
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-strong}"
    borderColor: "{colors.hairline}"
    borderWidth: 1px
    rounded: "{rounded.md}"
    boxShadow: color(srgb 0.0705882 0.0745098 0.0784314 / 0.12) 0px 0px 0px 1px inset
  avatar:
    borderColor: "{colors.surface}"
    borderWidth: 2px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.body}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 6px 12px
  navbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: 72px
    borderColor: "{colors.surface-muted}"
    borderWidth: 1px
    position: static
  nav-link:
    textColor: "{colors.body}"
    typography: "{typography.nav-link}"
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    height: 53px
    position: fixed
    columns: "3"
  link:
    textColor: "{colors.link}"
    typography: "{typography.body-sm}"
dark:
  colors:
    ink: "#FFFFFF"
    ink-strong: "#FFFFFF"
    body: "#D4D5D6"
    muted: "#999999"
    on-primary: "#000000"
    surface: "#121314"
    surface-muted: "#3A3E41"
    hairline: "#333333"
    link: "#9E9EFF"
    success: "#4ECB4E"
---

# Snapchat

## Overview

Snapchat's marketing web presence is loud where it counts and calm everywhere else. The design leans on a single, unmistakable move: signal-yellow **Snap Yellow** (`{colors.primary}` — #FFFC00) detonating against a near-monochrome field of white, near-black ink, and soft grey. Nothing else in the palette competes for attention, so hierarchy is built almost entirely from that one accent plus type weight and scale — not from color variety or shadow.

Density shifts by context. Marketing surfaces (home, download) are airy and editorial with generous `{spacing.section}` (72px) rhythm between full-bleed blocks, while content-discovery pages (Discover, Spotlight, local) pack dense masonry grids of vertical video cards. Both share the same friendly geometry — pill CTAs, rounded cards, circular avatars — that keeps the web feeling app-native rather than corporate.

Type is a tight Avenir Next ladder that tops out at a modest 22px display heading, so hierarchy is made by weight (600 vs 400) and by the yellow accent far more than by dramatic size jumps. The whole system reads playful, youthful, and high-contrast without ever feeling busy.

**Key Characteristics:**
- One hero accent: **Snap Yellow** (`{colors.primary}` — #FFFC00) does all the shouting; neutrals do everything else.
- Near-black ink (`{colors.ink}` #000000 / `{colors.ink-strong}` #121314) on white (`{colors.surface}` #FFFFFF) for maximum editorial contrast.
- Pill-shaped CTAs everywhere (`{rounded.pill}` — 999px).
- Single typeface — Avenir Next — across the entire ladder, in only three weights (400/500/600).
- Compact type scale: display caps at `{typography.title-lg}` 22px.
- Mostly flat; depth comes from layered device mockups and one subtle card shadow, not heavy elevation.
- Full dark theme that inverts neutrals to white-on-black while keeping the yellow accent identical.
- Rounded, soft geometry from 6px chips up to 32px containers.

## Colors

The palette is deliberately austere: one screaming accent, a monochrome ink-and-surface spine, and a handful of functional link/status colors. There are no decorative gradients in the token set — depth on marketing pages comes from photographic device mockups, not color blends.

### Brand & Accent
- **Snap Yellow** (`{colors.primary}` — #FFFC00): the entire brand identity in one hue. Reserved for primary CTAs, highlights, and logo lockups. Used sparingly (measured at a fraction of the neutrals' weight) so it never dilutes.
- **On Primary** (`{colors.on-primary}` — #FFFFFF): white text/icon color for use on dark surfaces; note primary buttons pair yellow with black ink, not white.

### Surface
- **Paper White** (`{colors.surface}` — #FFFFFF): dominant page background.
- **Mist Grey** (`{colors.surface-muted}` — #F0F1F2): soft fields for secondary buttons, inputs, chips, and the navbar hairline.
- **Slate** (`{colors.surface-dark}` — #262626): dark panels and overlays.
- **Deep Slate** (`{colors.surface-deep}` — #2C3137): the deepest neutral field, seen on darker content sections.

### Text
- **Ink** (`{colors.ink}` — #000000): primary headings and high-emphasis text; also button text on yellow.
- **Ink Strong** (`{colors.ink-strong}` — #121314): the workhorse body/heading ink, carrying the largest text weight across all 8 pages.
- **Body Grey** (`{colors.body}` — #53575B): secondary body copy and nav-link text.
- **Muted Grey** (`{colors.muted}` — #656D78): tertiary captions and de-emphasized labels.

### Hairlines & Borders
- **Hairline** (`{colors.hairline}` — #CCCCCC): input and divider borders.
- **Border Muted** (`{colors.border-muted}` — #666666): stronger border accents (rare, 3 border uses).

### Links & Status
- **Link Blue** (`{colors.link}` — #0000EE): classic underlined hyperlink color for inline text links.
- **Info** (`{colors.info}` — #0096E5) and **Info Bright** (`{colors.info-bright}` — #0FADFF): informational accents/icons.
- **Success Green** (`{colors.success}` — #157015): confirmation states.

### Dark Mode
A full dark theme inverts the neutral spine while keeping **Snap Yellow** untouched. The strategy is a straight neutral inversion, not a re-hue.

| Token | Light | Dark |
|---|---|---|
| `{colors.ink}` | #000000 | #FFFFFF |
| `{colors.ink-strong}` | #121314 | #FFFFFF |
| `{colors.body}` | #53575B | #D4D5D6 |
| `{colors.muted}` | #656D78 | #999999 |
| `{colors.on-primary}` | #FFFFFF | #000000 |
| `{colors.surface}` | #FFFFFF | #121314 |
| `{colors.surface-muted}` | #F0F1F2 | #3A3E41 |
| `{colors.hairline}` | #CCCCCC | #333333 |
| `{colors.link}` | #0000EE | #9E9EFF |
| `{colors.success}` | #157015 | #4ECB4E |

Note that `{colors.on-primary}` flips to black in dark mode — because the yellow button stays yellow, its text must switch from white to black to stay legible against the constant accent.

## Typography

### Font Family
The system runs on a single typeface: **Avenir Next** — a geometric sans with humanist warmth that carries every role from display heading to 10px micro label. **Arial** appears only as the system fallback (measured at a tiny fraction of Avenir Next's weight). Keep the two-typeface split and add no third family. Note: the header evidence reports a `Graphik` link font as a secondary detected face, but the token system standardizes on Avenir Next throughout.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.title-lg}` | 22px | 600 | 1.25 | normal | Largest display/section heading (h2) |
| `{typography.title-md}` | 16px | 600 | 1.25 | normal | Card and subsection headings (h3) |
| `{typography.body}` | 16px | 400 | 1.5 | normal | Default body copy, list items, links |
| `{typography.body-sm}` | 14px | 400 | 1.3 | normal | Secondary body, inline text links |
| `{typography.body-strong}` | 12px | 600 | 1.5 | normal | Emphasized small text |
| `{typography.label}` | 12px | 500 | 1.35 | normal | Chip and UI labels |
| `{typography.caption}` | 13px | 400 | 1.25 | normal | Captions and metadata |
| `{typography.caption-strong}` | 13px | 500 | 1.4 | normal | Emphasized captions |
| `{typography.micro}` | 10px | 500 | 1.3 | normal | Micro labels, tiny UI text |
| `{typography.button}` | 14px | 500 | 1.15 | normal | Button labels |
| `{typography.nav-link}` | 14px | 400 | 1.2 | normal | Header navigation links |

### Principles
Three weights exist and only three — **400 (regular), 500 (medium), 600 (semibold)**. There is no 700 bold and no light cut; do not add either. Hierarchy is a weight game: 600 for headings and emphasis, 500 for interactive labels, 400 for reading text. The scale is compact — the display heading caps at 22px, so this is not a big-headline system; it makes impact through the yellow accent and contrast, not type size. Letter spacing is `normal` on every token — no tracking adjustments anywhere. Line height tightens as text shrinks and loosens for reading: body copy runs a comfortable 1.5, headings and buttons a tight 1.15–1.25.

### Note on Font Substitutes
Avenir Next is a licensed Linotype face. For an open-source stand-in use **Nunito Sans** or **Montserrat** (geometric, similarly warm); tune by mapping semibold to 600, slightly reducing letter-spacing to 0, and keeping line-heights as specified. **Inter** is a safe utilitarian fallback if geometric warmth is not required.

## Layout

### Spacing System
Spacing is built on a fine-grained scale rooted in a 2px base, favoring small increments for dense UI: `{spacing.2xs}` 2px, `{spacing.xs}` 4px, `{spacing.sm}` 6px, `{spacing.md}` 8px, `{spacing.lg}` 10px, `{spacing.xl}` 12px, `{spacing.2xl}` 16px, `{spacing.3xl}` 20px, `{spacing.4xl}` 24px, and a large `{spacing.section}` 72px for major vertical section breaks. The measured evidence confirms 6px, 10px, 8px, 16px, and 12px as the most-used values — this is a tightly-packed system where 6px does most of the small-gap work.

### Grid & Container
Layouts observed across the 8 captured pages split into two archetypes. The login/home surface is a two-column split (form left, media grid right); content pages (Discover, Spotlight, local city pages) use a dense multi-column masonry grid of vertical video cards with a 'Mehr für dich' sidebar rail. The header is a 72px static bar; the footer is a fixed 53px bar with 3 link columns. Exact container max-widths and column counts are not encoded in the tokens, so treat card grids as fluid/responsive rather than fixed-column.

### Whitespace Philosophy
Whitespace is generous on marketing sections — the 72px `{spacing.section}` step lets full-bleed colorful blocks breathe — but content-discovery grids are deliberately dense, packing video thumbnails edge-to-edge with only small 6–10px gutters. The contrast is intentional: marketing sells with air, discovery engages with density.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No shadow, surface color only | Page backgrounds, most sections, buttons, chips |
| 1 — Hairline | 1px border in `{colors.surface-muted}` or `{colors.hairline}` | Navbar bottom rule, input borders, dividers |
| 2 — Inset | `0 0 0 1px inset` at 12% ink | Input fields (`{components.input}`) |
| 3 — Card shadow | `rgba(0,0,0,0.3) 0px 1px 3px 0px` | Elevated cards (`{components.card}`) |

**Shadow philosophy.** This is a near-flat system. Elevation comes from surface change and layering, not from a shadow ramp — device mockups float on colorful backgrounds and dark overlay bars sit on photo tiles to create depth photographically. Only one real drop shadow exists (`rgba(0,0,0,0.3) 0px 1px 3px 0px` on cards), and it is tight and subtle. Inputs use a 12%-ink inset ring rather than an outer shadow. A single stray `rgba(0,0,0,0.14) 0px 2px 4px 0px` was observed once and should be treated as incidental, not a system tier.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.sm}` | 6px | Small controls, tight rounding |
| `{rounded.md}` | 8px | Inputs, small cards |
| `{rounded.lg}` | 12px | Cards, media tiles (most common — 188 uses) |
| `{rounded.xl}` | 20px | Larger containers |
| `{rounded.2xl}` | 32px | Big rounded panels |
| `{rounded.pill}` | 999px | Pill buttons, chips |

### Geometry Character
Everything is soft. Rounded rectangles dominate the entire surface — cards and video tiles at 12px (`{rounded.lg}`), inputs at 8px (`{rounded.md}`), and CTAs fully pilled at 999px (`{rounded.pill}`). Pills are the signature interactive shape: Log in, Chat Now, and Download buttons are all fully rounded, echoing the app's soft-edged iconography and the thick rounded-black frame on device mockups. Circular geometry (50%, observed 137 times across 6 pages) is reserved for avatars and icon buttons — the avatar token uses a 2px `{colors.surface}` ring for separation from busy backgrounds. Note: a dedicated `rounded.circle` (9999px) token was dropped during grounding as unobserved, so use `{rounded.pill}` (999px) for fully-round shapes and 50% for circles. There are no sharp corners anywhere in the system.

## Components

### Navigation
**`navbar`** — A 72px-tall bar (`{components.navbar.height}`) on white `{colors.surface}` with black `{colors.ink}` text, separated from content by a 1px bottom hairline in `{colors.surface-muted}` (#F0F1F2). Position is `static` — it scrolls away rather than sticking, and carries no backdrop blur. The header packs a large link set (up to 25 links measured) styled via `{components.nav-link}`: `{colors.body}` (#53575B) text at `{typography.nav-link}` (14px/400). The header does carry a CTA button (`hasCtaButton: true`) — a yellow pill Login/Download.

**`nav-link`** — Body-grey (`{colors.body}`) text at `{typography.nav-link}` 14px regular; low-key until hovered.

### Buttons
**`button-primary`** — The signal CTA: **Snap Yellow** background (`{colors.primary}`), black `{colors.ink}` text, `{typography.button}` (14px/500), fully pilled (`{rounded.pill}`), padding 11px 20px. Used for Log in, Download, Chat Now.

**`button-secondary`** — Same pill shape and type, but on Mist Grey `{colors.surface-muted}` with black text — the quiet alternative when yellow would be too loud.

### Cards & Containers
**`card`** — White `{colors.surface}` surface, 12px radius (`{rounded.lg}`), 16px padding, with the system's one real shadow: `rgba(0,0,0,0.3) 0px 1px 3px 0px`. Houses content in the discovery grids.

**`chip`** — Pill-shaped (`{rounded.pill}`) tag on `{colors.surface-muted}` with `{colors.body}` text at `{typography.label}` (12px/500), padding 6px 12px. Used for filters and category labels.

### Inputs & Forms
**`input`** — Mist Grey field (`{colors.surface-muted}`) with `{colors.ink-strong}` text, 1px `{colors.hairline}` border, 8px radius (`{rounded.md}`), plus a subtle 12%-ink inset ring (`0 0 0 1px inset`). Seen on the login form.

### Avatars
**`avatar`** — Circular (50%) with a 2px `{colors.surface}` ring to lift it off busy photo backgrounds. Appears in creator/content attribution across discovery pages.

### Footer
**`footer`** — A fixed (`position: fixed`) bar 53px tall on black `{colors.ink}` background with white `{colors.on-primary}` text. It is minimal: only 3 links measured (`columns: 3`), in Avenir Next at 14px/400, white. Legal/nav links only — no CTA. This is a slim persistent utility footer, not a fat sitemap footer.

### Links
**`link`** — Inline hyperlinks in classic Link Blue (`{colors.link}` #0000EE) at `{typography.body-sm}` (14px/400).

## Do's and Don'ts

### Do
- Do reserve **Snap Yellow** (`{colors.primary}` — #FFFC00) for primary CTAs and key highlights only — its impact depends on scarcity against the neutral field.
- Do pair yellow buttons with black text (`{colors.ink}`), and flip `{colors.on-primary}` to black in dark mode since the accent stays yellow.
- Do keep the two-typeface split — Avenir Next for everything, Arial only as fallback; never introduce a third family.
- Do use only the observed weights (400, 500, 600); build hierarchy from weight and the yellow accent, not from heavier cuts or bigger sizes.
- Do pill all interactive CTAs and chips (`{rounded.pill}`) and round cards at 12px (`{rounded.lg}`) for the app-native feel.
- Do reserve `#444546`-class treatments for interactive elements (observed 10 interactive uses vs 0 elsewhere).
- Do use `{colors.body}` (#53575B) for nav and secondary text, keeping `{colors.ink-strong}` for headings and high-emphasis copy.

### Don't
- Don't add gradients — the system has none; create depth with layered mockups and dark overlay bars instead.
- Don't lean on drop shadows; only `{components.card}` carries a real shadow — keep everything else flat.
- Don't scale headings past `{typography.title-lg}` (22px); this is a compact-type system, not a big-headline one.
- Don't apply letter-spacing — every token is `normal`; tracking adjustments break the ladder.
- Don't recolor the yellow accent in dark mode — invert neutrals only.
- Don't make the header sticky or add backdrop blur; it is `static` (`{components.navbar.position}`) by design.
- Don't overuse Link Blue (`{colors.link}`) outside inline text links — CTAs are yellow pills, not blue text.

## Responsive Behavior

This is a two-viewport analysis (desktop and mobile capture); no intermediate breakpoint pixel values were measured, so treat the transitions qualitatively.

### Observed behavior
- **Desktop:** The home/login surface is a two-column split (form left, media grid right); discovery pages show a dense multi-column masonry of vertical video cards with a 'Mehr für dich' sidebar rail.
- **Mobile:** Collapses to a single-column stack. A sticky bottom navigation appears, and a rounded pill CTA anchors the top — the multi-column grid reflows to one column.

### Touch targets
Button padding of 11px 20px (`{components.button-primary}`) with `{typography.button}` at 14px yields comfortably tappable pills. Chips at 6px 12px are smaller and better suited to secondary filtering. The 72px navbar and 53px fixed footer give generous vertical tap zones on both viewports.

Because only two viewports were captured, exact breakpoints, column counts at each width, and reflow thresholds are not verifiable here.

## Iteration Guide

1. **Change the accent in one place.** All CTAs pull from `{colors.primary}`; edit that token to re-skin the brand, and remember to keep `{colors.on-primary}` legible against it (black in dark mode, white on dark surfaces).
2. **Add variants via the component tokens, not ad-hoc styles.** Button variants live in `{components.button-primary}` / `{components.button-secondary}`; both share `{rounded.pill}` and `{typography.button}` — clone that shape for any new button.
3. **Respect the weight ceiling.** Reference `{typography.title-lg}` down to `{typography.micro}` and stay within weights 400/500/600 — do not introduce 700 or lighter cuts.
4. **Keep elevation flat.** Only `{components.card}` may carry the `rgba(0,0,0,0.3)` shadow; new surfaces should use color/hairline separation (`{colors.surface-muted}`, `{colors.hairline}`) instead of shadows.
5. **Theme by inverting neutrals only.** Dark-mode overrides live in the `dark.colors` block; map surface/ink/hairline tokens there and never re-hue the yellow.
6. **Use the spacing scale, ending at section.** Small gaps come from `{spacing.sm}`–`{spacing.2xl}`; only major section breaks use `{spacing.section}` (72px).
7. **Unbreakable boundaries:** one typeface (Avenir Next + Arial fallback), one accent (Snap Yellow), pill CTAs, no gradients, static header. Breaking any of these breaks the brand.

## Known Gaps

- **Circle token dropped.** `rounded.circle` (9999px) and the `components.avatar.rounded` reference to it were dropped during grounding as unobserved; avatars are documented as 50% circular, but the exact rounding token is inferred.
- **Hover/focus/active states unverified.** Static captures could not observe interactive state changes (button hover fills, focus rings, link hover) — only resting styles are encoded.
- **Header font ambiguity.** Landmark evidence reports header links in `Graphik` while the token system standardizes on Avenir Next; the true nav font could not be reconciled.
- **Footer measured on one page.** The fixed 53px footer with 3 links was captured on a single page; other pages may present a different footer.
- **Grid specifics unknown.** Exact container max-widths, column counts, and gutters for the masonry discovery grids are not in the tokens and were not measured.
- **Two-viewport responsive only.** Breakpoint pixel values and intermediate reflow behavior were not captured.
- **Auth-walled surfaces.** The web chat client and logged-in experiences were not fully explorable, so in-app component styling is out of scope.
- **Animation/motion.** Transitions, scroll effects, and any device-mockup motion could not be captured from static evidence.
