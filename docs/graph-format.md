# The road graph file

`data/corridor-graph.json.gz` — gzipped JSON, about 0.6 MB compressed and
3.6 MB raw. Exported from the calibrated SUMO network in the research repo by
`pipeline/export_graph.py`.

11,693 nodes, 28,719 edges, covering the Tripureshwor–Koteshwor corridor.

## Shape

```json
{
  "source": "corridor.net.xml",
  "classes": { "m": "motorcycle", "c": "passenger", "b": "bus", "t": "truck" },
  "nodes": {
    "<node id>": [85.317123, 27.693456]
  },
  "edges": [
    { "i": "123456#0", "f": "n1", "t": "n2", "l": 137.4, "s": 13.9, "n": 2, "c": "bcmt" }
  ]
}
```

**Nodes** map an id to `[longitude, latitude]`, WGS84, rounded to six decimals
(about 0.1 m — far finer than GPS error).

**Edges** are directed. One physical two-way street appears as two edges.

| Key | Meaning |
| --- | --- |
| `i` | edge id, unique, matches the SUMO network |
| `f` | from-node id |
| `t` | to-node id |
| `l` | length, metres |
| `s` | free-flow speed, m/s |
| `n` | lane count |
| `c` | permitted classes, as a sorted string of codes from `classes` |

An edge with `"c": "bcmt"` allows all four. `"c": "m"` is motorcycle-only.
Every edge permits at least one class; edges usable only by pedestrians or
bicycles are dropped at export.

## Weights

Free-flow travel time is `l / s`, in seconds. That is the Phase 1 weight.

From Phase 4, measured speed replaces `s` on edges with recent probe data, with
`s` as the fallback. The file itself does not change — live speeds live
elsewhere and are joined by edge id.

## Lane counts are width-derived, not tag-derived

`n` does not come from OpenStreetMap's `lanes` tag. Kathmandu's arterials carry
no lane markings, so OSM records them as single-lane and puts the carriageway
in a separate `width` tag. Both tags are accurate, and taking `lanes` at face
value builds a third of the road: Ram Shah Path is tagged `lanes=1, width=6`,
which netconvert turns into one 3.2 m lane out of six metres of road.

The export derives lane count from carriageway width instead. In the research
this moved peak-hour delivery from 6.7% to 10.5% of counted flow. Width is
present on 1,578 road ways in the extract against 635 for lanes.

## The mistake that silently breaks the product

**The graph must be exported from the pre-filter network build.**

The research pipeline produces three networks:

| Build | Motorcycle-only edges |
| --- | --- |
| `corridor.net.xml` | **488** |
| `corridor-filtered.net.xml` | 0 |
| `corridor-calibrated.net.xml` | 0 |

The filtered and calibrated builds are made with `--keep-edges.by-vclass
passenger`, which deletes every edge a car cannot use — including the
motorcycle-only links that are this product's clearest differentiator over a
general-purpose router.

Exporting from the calibrated build produces a graph where **a scooter and a
truck route identically**, and nothing errors. The failure is silent.

Width-derived lane counts are already present in the pre-filter build, so
nothing is lost by reading it.

There is a test asserting the motorcycle-minus-car edge set stays above 100.
Keep it, and keep an equivalent test in this repository: if routing ever
returns the same path for a motorcycle and a truck across the whole corridor,
the graph is wrong, not the router.

## Connectivity

The pre-filter build keeps disconnected islands, which the research build
removed with `--keep-edges.components 1`. On random node pairs, about 6% had no
route.

That is probably harmless for real corridor trips, which start and end on
connected arterials, but it has not been measured on realistic
origin–destination pairs. "No route found" is a real outcome and must be
handled as a normal response, not an error.
