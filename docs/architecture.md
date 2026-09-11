# Architecture

## Layout

```
mod-app/
├── pyproject.toml              backend deps, managed with uv
├── docker-compose.yml          api + postgres
├── .env.example
│
├── data/
│   └── corridor-graph.json.gz  the road graph, versioned here
│
├── api/
│   ├── main.py                 FastAPI app and endpoints
│   ├── graph.py                load the graph into memory at startup
│   ├── routing.py              Dijkstra, k alternatives, vehicle class
│   ├── closures.py             what is shut now, as an exclusion set
│   └── models.py               request and response shapes
│
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── traveller/          onboarding, home, disrupted, trip, re-advice
│       ├── console/            operator: post disruption, live view
│       ├── lib/                api client, shared state
│       └── styles/tokens.css   the locked palette, one file
│
├── tests/
└── deploy/
    └── Dockerfile
```

Later phases add `api/probes.py`, `api/sessions.py`, `api/assignment.py` and a
database schema. **Do not create those files before their phase.** An empty
module invites speculative structure, and the shape of the probe pipeline
depends on what Phase 2 actually measures.

## Decisions

### Python for the backend

The router is about forty lines in any language, so it does not decide this.
Phases 3 and 4 do: map matching and speed aggregation are data-pipeline work —
hidden Markov matching over candidate edges, rolling medians per edge per
window, outlier rejection. Python has the libraries and the research half is
already Python.

### One frontend build, two route trees

`web/src/traveller/` and `web/src/console/` live in one Vite app, not two
projects. They share the design tokens, the API client and the build. The
console is desktop-first and the traveller app is mobile-first, but that is a
layout difference, not a codebase difference. Split only if a team appears.

### Monorepo

One person, two surfaces that ship together. Two repositories would mean two
deploy pipelines and a version-skew bug the first time the API contract
changes.

### The graph is copied in, not fetched

`data/corridor-graph.json.gz` is committed here. At 0.6 MB that is cheap, and
it means this repository has **no runtime dependency on the research repo**.
When the network is rebuilt, a new file is copied in deliberately — a visible
commit rather than silent drift.

Regenerate it in the research repo with:

```
uv run python -m pipeline.export_graph
```

then copy `results/corridor-graph.json.gz` here. See
[`graph-format.md`](graph-format.md) for the file's contents and for the one
mistake that silently breaks the product.

### Not serverless

The engine is stateful and memory-resident: the graph in RAM, live assignment
counters, open trip sessions. Cold starts and no shared memory make Vercel,
Workers and Lambda the wrong shape. This wants a long-running process.

## Hosting

Target is the existing VPS. Measured from Kathmandu: **11.8 ms** round trip,
against roughly 50 ms to Mumbai, 100 ms to Singapore and 250 ms to Europe. For
an app advising Kathmandu commuters, being in Kathmandu beats any managed
platform's conveniences.

That box has 16 cores at a load average under 1, so CPU is free. **RAM is the
constraint** — about 3 GB available, with the rest used by unrelated services
that matter more than this one. Set a hard memory limit on the container so
this can never starve them.

Isolation, because the box runs other things:

- own container, own Docker network, own port
- own database container, not the existing MySQL
- nothing written outside its own directory

Move off it when there are real users, or when the product's uptime should not
be tied to a machine running something else. Not before.

Serve the built frontend from nginx and proxy `/api` to the Python container.

## Performance

Routing on this graph measures **4.2 ms per query in pure Python with no
heuristic**, on 11,693 nodes and 28,719 edges. With A\* it would be about a
millisecond. Routing will not be the bottleneck, and optimising it before
anything else is measured is wasted work.

The things that will actually hurt, in order: map matching throughput in Phase
3, database write volume from probes, and battery drain on the client.
