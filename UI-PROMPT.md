# MOD — build prompt

You are building the complete frontend for **MOD**, a mobile-first progressive
web app for commuters in Kathmandu, plus a small operator console. Read this
entire document before generating anything; every section is binding.

## What the product is

When a road closes — a VIP convoy, an accident, a flooded underpass, heavy
rain — everyone who checks a map is told to take the same next-best road, and
the jam simply moves there. MOD's job is to spread that displaced traffic:
each affected traveller is guided to a *different* alternative, so no single
parallel road absorbs the whole diverted flow. Some travellers are asked to
take a longer route, and the app says so honestly.

A trip is a live session, not a single question. Once a traveller is moving,
the app watches conditions on the roads ahead and re-advises when a materially
better path appears. It does not re-advise constantly: an app that changes its
mind every minute is one nobody trusts.

There are no credits, no points and no rewards. An earlier draft proposed
credits for departing before the peak; the study behind this product measured
departure retiming and found it *raises* network delay at every share tested,
because the corridor's morning profile is a plateau rather than a spike.
Building a reward for it would be building the intervention the research
measured as counterproductive. Do not add it back.

MOD is not a navigation app. It does not compute turn-by-turn directions or
compete with Google Maps. It tells you that the road ahead is disrupted, which
alternative *you specifically* should take, and why.

Two surfaces:

- the **traveller app** (the main build)
- an **operator console** where a traffic-control user posts a disruption

## Name and mark

The product is **MOD**, from the Nepali **मोड** — a turn, a bend in the road, the
point where you go a different way. The name is the product: MOD's whole job is
to send you a different way, and to send the person behind you a *different*
different way.

It reads in both languages without translation. A Kathmandu commuter hears the
Nepali word; an English speaker reads three letters. Do not explain the pun
anywhere in the interface — a name that needs a footnote is a name that failed.

**The mark is the word.** There is no symbol, no logotype drawing, no icon, no
monogram in a rounded square. The wordmark is the product name set in the UI
typeface, in ink, at the weight it needs for its position. This follows from the
palette rule already stated: the ink is the brand.

Where it appears, and nowhere else:

- the first onboarding screen, once, at the top
- the "How it works" page, once, in the first line of prose
- the operator console header, small, beside the console's own label

It does **not** appear in the app header on every screen. A traveller who has
opened the app knows what it is; a persistent logo bar costs vertical space on
a 360px screen that the disruption line needs more.

**Setting the Devanagari.** Where मोड is shown beside MOD — on the onboarding
screen and in the how-it-works prose, and only there — set it in **IBM Plex Sans
Devanagari**, the companion to the Latin family already specified. Same weight,
same size, same ink. Never larger than the Latin, never as decoration, never
rotated, never as a watermark. If the Devanagari face is unavailable, show the
Latin alone rather than substituting a system fallback: a mismatched script is
worse than no script.

The rest of the interface stays English, as specified below. The name carries
the Nepali; the UI does not need to.

## Traveller app — screens to build

1. **Onboarding** — phone number, 6-digit SMS code, then save your usual trip
   (from, to, typical departure time). Three steps, one per screen, progress
   as plain text ("Step 2 of 3").
2. **Home, normal state** — "No disruptions on your route" as the calm
   default, your saved trip shown plainly, and a single quiet line for
   "Start trip". Most mornings this screen says nothing is wrong, and it
   should look comfortable saying that.
3. **Home, disrupted state** — the case the product exists for:
   - what happened, in one line: "Tinkune–Koteshwor closed until about 10:30
     — VIP movement"
   - **your** assigned alternative, named by road, with the honest cost:
     "Via Old Baneshwor — about 6 minutes longer than usual"
   - one line explaining why it is yours specifically: "Others are being sent
     via Sinamangal, so no single road takes the whole diversion."
   - actions: "Got it" (accepts) and "Show other options" (secondary)

   On the count: only claim a number of travellers when the system actually
   has them. Early on it will not, and a fabricated "one of about 400 drivers"
   is the kind of detail that destroys trust the first time someone checks.
   Design the line to read correctly with no number at all.
4. **Alternatives** — the two or three other viable routes with their extra
   time, and which one the system is loading most heavily. A traveller who
   overrides the assignment should be able to, and the screen should not
   nag.
5. **Trip in progress** — the live session, and the screen a traveller will
   see for longest. Quiet by default: where they are on the advised route,
   the next point where advice could change, and an honest arrival estimate.
   It must be readable at a glance, mounted on a handlebar, in sun. One
   secondary action: "Report a problem". No moving elements.
6. **Re-advice** — the moment the route changes mid-trip. One line for what
   happened, one for the new advice and its cost: "Flooding at Thapathali.
   Via Maitighar, about 8 minutes faster than staying on." Two actions of
   equal weight: "Switch" and "Stay on this route". Never auto-accept, never
   pre-select, and never show this more than once in a few minutes even if
   conditions keep moving.
7. **Report a problem** — one tap from the trip screen, four choices with no
   free-text required: heavy jam, flooding, closed road, accident. Submits
   with the traveller's current position attached. Confirmation is one line,
   not a dialog. This is a live data source, so it must be faster to use than
   to ignore.
8. **After the trip** — two questions, one tap each, on one screen. First:
   did you take the suggested route? Yes / No / Partly. Second: did you
   already know this route? Yes / No. The first measures compliance, the
   second measures whether the guidance was worth anything at all. Never a
   form, never more than two taps.
9. **How it works** — one short page of plain prose explaining why different
   people get different routes. No illustrations, no icons, no
   steps-with-circles graphics.

## Operator console — screens to build

1. **Post a disruption** — select affected road segment, type (closure,
   accident, weather, event), expected duration, then publish. Confirmation
   shows how many travellers match that segment.
2. **Live view** — the active disruption, how many travellers were notified,
   how the assignments split across alternatives (a plain table: route,
   assigned count, reported compliance), and a "Clear disruption" action.
3. **Reported conditions** — what travellers are reporting right now, as a
   dense list: what, where, how many reports, how recently. The operator
   decides what to act on; the console does not decide for them. Before
   offering to close a link, show the current flow on it — closing a road
   that is already stopped removes nothing.

Use realistic data: Kathmandu road names (Tinkune, Koteshwor, Maitighar,
Thapathali, Old Baneshwor, Sinamangal, Jadibuti), times like 08:22, delays
like "6 minutes longer", arrival estimates like "09:04, about 12 minutes",
weekday dates. English UI text. No lorem ipsum, no fake user names, no placeholder
avatars, no invented statistics.

## Design system (locked — do not improvise)

### Palette (monochrome; the ink is the brand)

| Token | Value | Use |
| --- | --- | --- |
| bg | `#fafafa` | page background |
| surface | `#f2f2f2` | grouped/component background (hover `#ebebeb`) |
| border | `#eaeaea` | hairline borders (strong: `#d4d4d4`) |
| muted | `#666666` | secondary text, captions |
| ink | `#171717` | primary text, primary buttons |
| inverse | `#ffffff` | text on ink |

No other colours. No gradients of any kind, no purple, no glassmorphism, no
glows, no blurred background shapes, no dark mode. Two exceptions, used on
one line each and nowhere else: a desaturated amber (`#8a6d1f`) for the
active-disruption line, and a desaturated green (`#2f6f4f`) for a confirmed
check-in. A disruption notice must read as information, not as an alarm.

### Typography

- One family: **IBM Plex Sans** (never Inter, never Poppins/Space Grotesk),
  with **IBM Plex Sans Devanagari** for मोड in the two places named above and
  nowhere else.
- Body 16px, line-height 1.6, max 80ch measure.
- Type scale with ≥1.25 ratio between steps; hierarchy through size and
  weight only, never colour.
- Sentence case everywhere. No all-caps labels, no gradient text, no
  decorative serif-italic accent words.

### Layout

- Left-aligned throughout. No centred hero, no badge pill above a heading, no
  three-feature-card rows, no stat banners, no testimonial or logo sections.
- One primary action per screen, solid `#171717` with white text; secondary
  actions are plain text links.
- Spacing: tight within a group, generous between groups. Density is fine —
  the reported-conditions list and the operator's assignment table are dense
  lists, not cards.

### Components

- Borderless by default: separate content with whitespace and `#f2f2f2`
  surface shifts; hairline `#eaeaea` borders only where grouping fails
  without them. Never border and shadow on the same element.
- One small shadow allowed, for dialogs only.
- Border-radius 6px on everything interactive; nothing larger, nothing mixed.
- No cards inside cards, no coloured border strips, no unmodified
  shadcn/Tailwind default tokens.

### Responsive behaviour (mobile-first, not desktop-shrunk)

Design every traveller screen at **360px wide first**, then let it widen.
Commuters open this on a phone, outdoors, often one-handed, sometimes on a
slow connection while a road is blocked in front of them.

- **Breakpoints:** phone up to 640px (the design target), tablet 641–1024px,
  desktop above 1024px. Use `min-width` media queries only, so the phone
  layout is the base and never an override.
- **Single column on phones.** Content spans the full width minus 16px
  gutters. Nothing side-by-side below 640px. Above 640px the layout may grow
  to a comfortable measure (max 720px for reading screens) and stay
  left-aligned rather than stretching edge to edge.
- **Touch targets minimum 44×44px** with at least 8px between adjacent
  targets. The disrupted-state primary action ("Got it") sits within thumb
  reach — bottom third of the viewport on phones, not pinned to the top.
- **Type scales with the viewport but never below 16px body** (smaller
  triggers zoom-on-focus in mobile Safari). Use relative units; do not set a
  fixed pixel width on any container.
- **No horizontal scrolling anywhere.** Long road names wrap rather than
  truncate — a traveller must be able to read the full street name.
- **Dense tables reflow on phones:** the operator's assignment table and the
  reported-conditions list become stacked rows with inline labels below
  640px, not a table in a horizontally-scrolling box.
- **The operator console is desktop-first** — it is used at a control desk —
  but must remain usable at tablet width, since a duty officer may post a
  disruption from a phone.
- Assume slow networks: no layout shift once content loads, and the
  disruption line renders before anything decorative.

Verify each screen at 360px, 414px, 768px and 1280px before finishing.

### Icons and motion

- Icons: none, or a single consistent stroke set used sparingly. No emoji
  anywhere, no sparkle icons, no icons in rounded tinted squares.
- Motion: nothing decorative. State transitions only, 150–200ms, ease-out. No
  entrance animations, no bounce easing, no pulsing dots, no marquees, no
  hover transforms.

### Copy

Plain and specific. Buttons say what they do ("Show other options",
"Stay on this route", "Clear disruption"). State costs honestly — "about 6
minutes longer" — never hide them. Banned words: supercharge, empower,
unlock, seamless, elevate, revolutionize, effortless, and any "Build faster,
ship smarter" cadence.

### Accessibility

- 4.5:1 minimum contrast for all text.
- Visible focus rings: 2px `#171717`, 2px offset.
- Semantic HTML (real buttons, labels, headings in order).
- Designed empty, error, and loading states for every screen — including "no
  alternative available", which is a real outcome, not an error.

## Banned patterns (never produce any of these)

Documented tells of machine-generated design. Producing any of them is a
failure regardless of how good it looks.

### Colour and background

- Purple/violet-to-blue gradients in any form; gradient text; cyan-purple
  washes; any gradient at all.
- Glassmorphism, neon glows, coloured box-shadow halos, glowing card borders.
- Floating blurred gradient orbs or shapes behind content.
- Dark mode (not requested); near-black backgrounds with neon accents.
- The "Linear clone" look: dark background plus glass plus thin hairlines
  copied wholesale.

### Typography tells

- Inter, or the recycled Poppins/Space Grotesk pairings.
- Flat type hierarchy; all-caps section eyebrow labels; a decorative
  serif-italic accent word in a heading.

### Layout and components

- Centred hero with a pill badge above the heading and two equal-weight
  buttons.
- Exactly-three identical feature cards, icon-on-top, stock stroke icons in
  rounded tinted squares.
- Everything-in-a-card; cards nested in cards; border plus shadow on the same
  element; coloured left/top border strips.
- Uniform rounded-2xl (or larger) radii; untouched shadcn/Tailwind defaults.
- Stat banner rows; 01/02/03 numbered step strips; perfectly monotone section
  spacing with zero variation.

### Content and trust

- Emoji as icons or in headings/buttons; sparkle decorations.
- Fake testimonials, circular placeholder avatars, "Trusted by" logo bars,
  stock illustrations.
- Buzzword copy of any kind.

### Motion

- Entrance animations on everything; bounce/elastic easing; pulsing status
  dots; auto-scrolling marquees; hover scale/transform effects.

## Working rules (apply while building)

1. Separation order: whitespace first, then a 3–5% background shift, then a
   hairline border; shadow only for true elevation (dialogs).
2. One layout primitive repeated as the signature; asymmetry allowed.
3. Real content only — the realistic data described above, nothing invented
   beyond it.
4. Density is respectable: lists and tables may be dense; group tightly,
   separate groups generously.
5. Hierarchy through size and weight; colour never carries meaning except the
   two single-line exceptions named above.
6. The disrupted-state home screen and the re-advice screen are the product.
   If they are not the two clearest screens in the build, the build is wrong.
   A traveller reads the re-advice screen while stopped in traffic, in a
   hurry, possibly in rain. Nothing on it may be ambiguous.
7. When in doubt between plain and clever: plain.

## Acceptance checklist (verify before you finish)

- Zero gradients, zero purple, zero emoji, zero sparkle icons anywhere.
- Only the six palette values plus the two single-line exceptions.
- Font is IBM Plex Sans everywhere; no all-caps.
- Every screen has its empty and error states, including "no alternative
  available".
- The assigned alternative always shows its honest time cost and one line
  explaining why this traveller got this route.
- No credits, points, rewards or raffle anywhere in the build.
- The mark is typographic only: no symbol, no icon, no monogram tile, and no
  logo bar persisting across screens.
- मोड appears in exactly two places, set in IBM Plex Sans Devanagari at the
  same size and weight as the Latin beside it.
- Re-advice never auto-accepts and never pre-selects an option.
- No traveller count is shown unless the system actually has that number.
- All copy is specific; no marketing verbs; no placeholder content.
- One primary action per screen; radius 6px uniform; no decorative motion.
- Every screen verified at 360px, 414px, 768px and 1280px: single column on
  phones, no horizontal scroll, touch targets at least 44px, body text never
  below 16px.
