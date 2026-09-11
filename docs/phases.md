# Build order

Six phases. Each is useful on its own and produces what the next one needs.

The ordering is forced by one fact: **there is no live traffic feed for
Kathmandu.** No public real-time source was found in the research. The only
credible source is probe data from this product's own users, which is circular
— speeds come from users, users come from an app already worth using. So
phases 1 and 2 have to be worth using with no live data at all.

Do not start a phase before the one before it is done. Do not build ahead into
a later phase "while you are here"; the shape of Phase 3 depends on what
Phase 2 actually measures.

---

## Phase 1 — Router as a service

Load the graph, route on it, expose one endpoint.

**Build**
- Graph loader: read `data/corridor-graph.json.gz` once at startup into an
  adjacency structure held in memory.
- Dijkstra with a hard exclusion set and a vehicle-class filter.
- *k* distinct alternatives — each successive path avoids the previous one's
  mid-section, so they are different corridors rather than variations of one.
- One endpoint: origin, destination, vehicle class, closed edges → primary
  route plus alternatives, each with distance and free-flow time.

**Weights** are free-flow (`length / speed`) at this stage. No live data.

**Done when**
- A request returns a route in well under 100 ms.
- A motorcycle and a car get different routes for at least one
  origin–destination pair that uses a motorcycle-only link.
- Closing an edge changes the returned route.
- Requesting an unreachable pair returns a clean "no route", not an error.
- Tests cover all four.

**Not in this phase:** users, sessions, persistence, live data, any UI.

---

## Phase 2 — Closures, operator console, traveller app

The first shippable product. Works with zero live-traffic data.

**Build**
- Closure store: an operator posts *this link is shut, from then until then*.
  Active closures become the exclusion set for affected routes.
- Operator console: post a disruption; live view of how assignments split
  across alternatives. Before offering to close a link, show current flow on
  it — closing a road that is already stopped removes nothing.
- Traveller app: onboarding, home (normal and disrupted), alternatives,
  after-trip questions. Screens are specified in `UI-PROMPT.md`, which is
  binding.
- After-trip questions, one tap each: *did you take the suggested route?* and
  *did you already know this route?*

**Done when**
- An operator can post a closure and a traveller sees a different route.
- Both after-trip answers are recorded against the trip.
- The app is honest when it has no traveller count to show.

**This phase is where the product's core premise gets tested.** If most users
answer "yes, I already knew this route", the value is the disruption feed and
vehicle-class routing, not the guidance. Look at that answer before optimising
anything.

---

## Phase 3 — Probe collection

Start gathering the data the live version needs. Do not route on it yet.

**Build**
- The app reports position periodically while a trip is active. Interval is a
  battery and data decision, not a technical one — Kathmandu users are
  price-sensitive about mobile data and every phone is a battery complaint
  waiting to happen.
- Map matching: turn a stream of noisy GPS points into "this vehicle was on
  edge X at Y m/s". Harder than it sounds in a dense grid where parallel roads
  sit fifteen metres apart, and harder again for motorcycles that weave. The
  standard approach is a hidden Markov model over candidate edges; libraries
  exist.
- Store matched traces, aggregate to speed per edge per time window.

**Done when** you can answer: *how many active travellers does the corridor
need before edge speeds are usable?* That number is the output of this phase.
It decides whether Phase 4 is possible yet.

**Privacy is decided here, not later.** See `product.md`.

---

## Phase 4 — Live weights

Route on measured speeds where they exist, free-flow where they do not.

**Build**
- Replace the weight function: measured speed for edges with recent data,
  falling back to free-flow.
- A freshness rule — how old is too old — and an honest display when a route
  is computed on stale or absent data.

**Done when** a route visibly changes because measured conditions changed, and
the system can say which edges it actually had data for.

---

## Phase 5 — Sessions and continuous re-advice

A trip becomes a live session rather than a single question.

**Build**
- Session state: origin, destination, vehicle class, current position, the
  advised route, the assigned alternative.
- Re-advice on the three-part threshold in `product.md`. Never auto-accept,
  never pre-select.
- The trip-in-progress and re-advice screens from `UI-PROMPT.md`.

**Done when** a traveller can be re-advised mid-trip, at most once in a few
minutes, and can decline without the app nagging.

---

## Phase 6 — Spreading across travellers

The research finding made operational. Last, because it needs everything above.

**Build**
- Assignment counters: who has been sent down which alternative, decaying over
  a time window.
- Proportional assignment: new travellers displaced by the same event are
  spread across alternatives rather than all given the best one.

**Done when** two travellers with the same origin, destination and disruption
receive different alternatives, and the operator console shows the split.

**Below a density threshold this changes nothing.** With ten travellers on the
corridor, spreading is theatre. The app should be honest about that rather than
pretending to balance load it does not have.

---

## What "done" never means

A phase is not done because the code runs. It is done when the acceptance
points above hold and there is a test that fails if they stop holding.
