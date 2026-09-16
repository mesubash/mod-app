# What MOD is, and what it may claim

Read this before writing code. Several features that look obviously good are
forbidden here, and the reasons are measured rather than stylistic.

## The goal

A traveller is going from A to Z. Along the way there may be many points where
the advice could change. The road network is static, but everything else is
live: where each traveller is, what the traffic is on each road, whether there
is an incident, flooding, heavy rain, a closure. The system takes all of that
and re-advises in real time, sending a traveller a different way when a
different way is better.

Two commitments inside that, and they are what make this MOD rather than
another router:

**It advises, it does not command.** The product recommends. The traveller
decides. Compliance is a thing to measure, never to assume.

**Different travellers get different advice.** When one event displaces many
people, sending them all down the same next-best road just moves the jam.
Spreading them across more than one alternative is the point -- but that
specific mechanism is a design choice built on top of the study, not
something the study itself validated. See "What the research supports"
below for exactly what was and wasn't measured.

## What it is not

Not a navigation app. No turn-by-turn, no competing with Google Maps. MOD tells
you the road ahead is disrupted, which alternative *you specifically* should
take, and why.

Worth knowing: [Baato](https://baato.io/) already provides Nepal maps, routing
and offline navigation, built by Kathmandu Living Labs. They are the closest
thing to a competitor and a plausible data source. MOD's differentiators are
spreading, vehicle-class routing, and the closure feed — not the base map.

## Forbidden, with reasons

These are not preferences. Each one contradicts a measured result, and
implementing it would mean shipping something the research says is wrong.

### No credits, points, rewards or raffle

An earlier draft proposed credits for departing before the morning peak. The
study measured departure retiming directly and found it **raises** network
delay at every share tested — from +7.9 ± 3.1% at a 5% share to +36.1 ± 5.1%
at 25% — because the corridor's morning profile is a plateau (6.8% of daily
traffic in the busiest hour, 6.7% in the next) rather than a spike. An
incentive to travel fifteen minutes earlier moves a trip into an hour that is
already as busy.

Building a reward for it would be building the intervention the research
measured as counterproductive.

### Do not promise a percentage

−42.6% is a modelled figure, at a modelled loading, in a model that **forced**
compliance. A real app advises. The product may say that diverting some
share of travellers onto an alternative route helps the network as well as
the driver, and may cite the study for that. It may not promise a congestion
reduction to any user or authority, and it may not cite this figure as
evidence that spreading across *multiple* alternatives specifically helps --
that mechanism was tested separately and the result is retracted (see below).

### Do not re-advise continuously

Systems that change their advice every minute flip-flop, and users stop
trusting them. Re-advise only when all three hold:

- the remaining route's estimate worsens by a meaningful margin, **and**
- an alternative beats it by more than that margin, **and**
- the traveller has not been re-advised in the last few minutes

Those thresholds are product decisions. Getting them wrong is the most common
way this class of app fails.

### Do not show a traveller count the system does not have

"You are one of about 400 drivers sent this way" is a good line and it will be
a lie at launch. Any count shown must be real. Design every screen to read
correctly with no number at all.

### Do not lose the vehicle-class distinction

The corridor graph contains **488 edges a motorcycle may use that a car may
not**. That asymmetry is the clearest differentiator over every general-purpose
router, and it is fragile: the research network is normally built with a
passenger-vehicle filter that deletes exactly those links. If routing ever
returns identical paths for a scooter and a truck, the graph is wrong, not the
router. There is a test for this and it must stay.

## What the research supports

- **Alternatives exist.** Essentially every corridor origin–destination pair
  has at least one alternative when the primary path is excluded.
- **Diverting a share of travellers onto an alternative helps the network,
  not only the driver.** −14.4 ± 3.1% network delay at a 5% diverted share,
  −25.7 ± 3.1% at 10%, −42.6 ± 2.5% at 20%, with cordon throughput rising
  across the same range. This is ICICSET 2026 (accepted), under **recurring
  peak congestion, no closure**, and every diverted traveller on a given
  origin-destination pair gets sent to the **same single** alternative
  (`experiments/transforms.py::reroute()` in the research repo) -- it is not
  evidence about spreading travellers across *multiple* different
  alternatives.
- **A driver without local knowledge gains from being told.** This needs no
  simulation: the alternative exists, and a driver who does not know it cannot
  use it.
- **Non-recurring disruption is the regime where a fixed mental map fails
  hardest** — and where a trip already underway can be rerouted but cannot be
  retimed or mode-shifted.

## What the research does not support (yet)

- **Spreading travellers across k>1 alternatives under a closure**, rather
  than sending every diverted traveller to the same one, has its own
  mechanism in the research repo (`spread_reroute()`, round-robin over the k
  alternatives) and its own experiment grid (S4). That grid's result is
  retracted by the paper's own limitations section: the closure was never
  enforced in SUMO for the first run, the rerouter placement was broken in
  the fix's first attempt (a vehicle can't be diverted by a rerouter placed
  on the edge it's already too late to avoid), and the corrected version has
  not been re-run. There is currently no valid result showing k>1 beats k=1
  under a closure.
- Because of that, MOD's k-distinct-alternatives assignment (`api/routing.py`,
  and whatever policy picks which alternative a given traveller gets) is an
  **engineering design choice**, not a simulated result. It may be described
  as such -- a reasonable default pending better evidence -- but not cited to
  the study, and not described as something the research "measured" or
  "validated."

## What is unmeasured, and must be treated as open

- **Compliance.** Nobody has established what share of Kathmandu drivers will
  accept a longer route. The entire benefit is conditional on it. The
  after-trip question exists to measure it.
- **Local knowledge.** How many drivers already know the alternatives is
  unknown. If most do, the value is the disruption feed and vehicle-class
  routing, not the guidance. The second after-trip question measures this, and
  it is the cheapest way to find out whether the core premise holds.
- **Induced demand.** If guidance works it sends traffic through residential
  internal roads. A real externality, unmeasured, and the kind of thing
  residents notice before developers do.

## Users

- **Newcomer or occasional driver.** Highest value. No mental map. Wants a
  route that works for their vehicle.
- **Professional rider** (delivery, ride-hail). Knows the main roads; wants the
  disruption feed and the vehicle-class shortcuts.
- **Operator / traffic police.** Publishes closures, sees where diverted
  traffic went. Console, not the traveller app.

## Privacy

Continuous location from identifiable users is sensitive, more so when the
operator console may be run by traffic police. Decide before Phase 3, not
after:

- what is stored, and for how long
- what the operator can see — aggregated edge speeds do not require retaining
  individual traces
- whether a traveller can use the product without an account

Aggregate early. A probe pipeline that never persists an identifiable trace is
much easier to defend than one that deletes them later.
