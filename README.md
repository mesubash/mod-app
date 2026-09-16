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

## Running it

Needs [uv](https://docs.astral.sh/uv/).

```sh
uv sync
uv run uvicorn api.main:app --reload
uv run pytest
```

One endpoint:

```sh
curl -X POST localhost:8000/route -H 'content-type: application/json' -d '{
  "origin":      {"lon": 85.3140, "lat": 27.6929},
  "destination": {"lon": 85.3495, "lat": 27.6785},
  "vehicle":     "motorcycle",
  "closed":      []
}'
```

Returns the quickest route and up to five alternatives, each with its edge
ids, free-flow seconds, metres, and the junction coordinates to draw it. An
empty list is a real answer: the graph keeps disconnected pieces, and a
closure can leave no way through.

`vehicle` is one of `motorcycle`, `car`, `bus`, `truck`, and it changes the
answer — 488 edges in the corridor are open to a motorcycle and not a car.

In Docker:

```sh
docker compose up --build
```

## The frontend

TanStack Start on React 19, in `web/`. Needs [bun](https://bun.sh/).

```sh
cd web
bun install
bun run dev      # http://localhost:3000
bun run build
```

Both halves at once, in two terminals:

```sh
uv run uvicorn api.main:app
cd web && bun run dev                # http://localhost:3000
```

`docker compose up --build` runs the API in a container instead, if you want it
detached from the shell.

Nothing to configure: the API allows localhost origins by default. The browser
calls it directly rather than through a proxy, because TanStack Start's router
answers every path before Vite or nitro can forward one. In production, serve
both halves from one origin behind nginx and set `MOD_CORS_ORIGINS` to that
origin, or to an empty string to allow none.

Posting closures needs `MOD_OPERATOR_TOKEN` set, and the same value entered in
the operator console at `/operator`.

Place search is proxied through Baato (`/places/search`) rather than called
from the browser, per Baato's own guidance on keeping a key off the client.
Set `BAATO_API_KEY` to turn it on. Unset, the endpoint returns an empty
result with `configured: false` and nothing else changes -- the app keeps
using its fixed corridor place list exactly as it does today. Baato's routing
is not proxied anywhere and should not be: MOD's own router is the product.

Home, Trip, Report and After-trip are wired to the real API, including
Baato-backed place search once `BAATO_API_KEY` is set, continuous re-advice
while a trip runs, and geometry-only turn cues. All three operator screens
are wired too, including a live view of real closures and how affected
travellers' alternatives have actually split.

## Status

Phase 1 (router as a service) and Phase 2 (closures, operator console,
traveller app) are done. Phase 3 (probe collection) is built but hasn't yet
answered the question it exists to produce -- how many active travellers the
corridor needs before edge speeds are usable. Phase 4 (live weights) is not
built; routing is still free-flow only.

Phase 5 (continuous re-advice) and Phase 6 (spreading) have real, tested
pieces built ahead of Phase 4, which is out of the order `docs/phases.md`
itself sets and says not to do. That happened on explicit direction to build
all of these at once; it wasn't a quiet drift. Two things worth revisiting
before calling either phase actually done: Phase 5 has no formal session
state, the re-advice logic in `web/src/routes/trip.tsx` runs on ordinary
component state rather than the persisted session `docs/phases.md` describes;
and neither Phase 5 nor 6 has been exercised against Phase 4's live weights,
since those don't exist yet.

See [`docs/phases.md`](docs/phases.md) for what each phase means and what
"done" requires.

Measured on the corridor graph: 4.7 ms for one route, 14.7 ms for three
alternatives, 22 ms end to end over HTTP. About 54 MB resident.

## Licence

MIT for the code (`LICENSE`).

The road graph is a derived database from OpenStreetMap and carries ODbL
share-alike terms instead. See [`DATA.md`](DATA.md) — this matters if you reuse
it, and the product must credit OpenStreetMap on its "How it works" page.
