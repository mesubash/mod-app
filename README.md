# MOD

Route guidance for the Tripureshwor–Koteshwor corridor in Kathmandu.

When a road closes, everyone who checks a map is told to take the same
next-best road, so the jam relocates rather than clears. MOD sends different
travellers down *different* alternatives, and tells each of them honestly what
it costs.

The name is the Nepali **मोड** — a turn, a bend in the road.

## Start here

| Read | For |
| --- | --- |
| [`docs/product.md`](docs/product.md) | What this is, what it may and may not claim |
| [`docs/phases.md`](docs/phases.md) | Build order, and what "done" means for each phase |
| [`docs/architecture.md`](docs/architecture.md) | Folder layout and the decisions behind it |
| [`docs/graph-format.md`](docs/graph-format.md) | The road graph file the router reads |

**Read [`docs/product.md`](docs/product.md) before writing anything.** The
product's claims are constrained by published research, and several
obvious-looking features are forbidden for measured reasons rather than
stylistic ones.

Two further documents are binding but not kept in this repository:
`AI-GUARDRAILS.md`, the coding and writing standard, and `UI-PROMPT.md`, the
frontend design spec. They are working documents rather than repo content, held
the same way in the research repo. Ask for them before building anything here;
the frontend in particular cannot be built correctly without the second.

## Where this comes from

The routing approach is not guesswork. It comes out of a calibrated SUMO
microsimulation of the same corridor, published at ICICSET 2026: *What Works
and What Backfires — Mode Shift, Rerouting and Departure-Time Policy on a
Saturated Kathmandu Corridor*.

That study is a separate repository, [`mesubash/mod`](https://github.com/mesubash/mod),
which is research-heavy and has no runtime relationship to this one. The only
thing that crosses the boundary is `data/corridor-graph.json.gz`, exported from
the calibrated network and committed here.

What the study established, and this product is built on:

- Diverting corridor trips onto alternatives reduces network delay, and the
  effect grows with the share diverted — **−42.6 ± 2.5%** at a 20% share,
  across 24 treatment-assignment seeds, with cordon throughput rising too.
- Alternatives exist for essentially every corridor origin–destination pair.
- Departure retiming **raises** delay at every share tested. The corridor's
  morning peak is a plateau, not a spike, so moving trips to an adjacent hour
  moves them into an hour that is already as busy.

## Status

Nothing is built yet. The documents above are the plan.

## Licence

MIT for the code (`LICENSE`).

The road graph is a derived database from OpenStreetMap and carries ODbL
share-alike terms instead. See [`DATA.md`](DATA.md) — this matters if you reuse
it, and the product must credit OpenStreetMap on its "How it works" page.
