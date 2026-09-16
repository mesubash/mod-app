# Data provenance and terms

The MIT licence in `LICENSE` covers the code in this repository. It does not
cover the road graph, which is a derived database and carries its own terms.

## data/corridor-graph.json.gz

Road graph for the Tripureshwor–Koteshwor corridor: nodes with coordinates,
edges with length, free-flow speed, lane count and permitted vehicle classes.

**© OpenStreetMap contributors, available under the
[Open Database Licence](https://opendatacommons.org/licenses/odbl/) (ODbL).**

It is produced from an OpenStreetMap extract by `pipeline/export_graph.py` in
the research repository [`mesubash/mod`](https://github.com/mesubash/mod), via
a network build that derives lane counts from carriageway width. That makes it
a **derived database** in ODbL's terms, so:

- reuse requires attribution to OpenStreetMap contributors
- any further derived database must be released under the ODbL as well

<https://www.openstreetmap.org/copyright>

The extraction and the width-derived lane counts are mine; the underlying road
geometry is OpenStreetMap's.

### Attribution in the product

Any surface that displays or is built on this graph must credit OpenStreetMap.
One line is enough, and it belongs on the "How it works" page rather than on
every screen:

> Road data © OpenStreetMap contributors, ODbL.

## Research figures

Claims in `docs/product.md` about intervention effects come from the study
published at ICICSET 2026, whose data and method live in the research
repository. Cite the study for those figures, not this repository.

The surveys the study itself builds on — JICA 2012 and 2019, and Department of
Roads station records — are documented in that repository's `DATA.md`. Cite the
original surveys for the underlying figures.

## What this repository must never contain

Probe traces, GPS points tied to a traveller, trip sessions, or any other
identifiable location data. These are excluded in `.gitignore`, and the
exclusion is not the safeguard — aggregating before persisting is. See the
privacy section of `docs/product.md`.

## Place search (Baato)

Place-name search, when a key is configured, is proxied from Baato's API
(`api/places.py`, `GET /places/search`). Results are not stored — a query
goes out, the response comes back, nothing about it persists. This
repository holds no Baato data and redistributes none.

The key itself is a credential, not project data: it belongs in
`BAATO_API_KEY`, set in the deployment environment, never committed. See
`docs/architecture.md` for how the fallback behaves with no key set.

MOD's own router is not replaced by anything Baato provides. Its routing
endpoint is not called from this codebase, on purpose — see the comment at
the top of `api/places.py`.
