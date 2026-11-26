"""MOD routing API."""

import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api import graph as graph_module
from api import places as places_module
from api import probes, store
from api.models import (
    VEHICLES,
    AssignmentRequest,
    Point,
    Closure,
    ClosureRequest,
    PlaceSearchResponse,
    Report,
    ReportRequest,
    RouteOption,
    RouteRequest,
    Coverage,
    ProbeRequest,
    RouteResponse,
    SpreadResponse,
    SpreadSplit,
    TripAnswerRequest,
)
from api.routing import alternatives, shortest

GRAPH: graph_module.Graph | None = None
DB = None

# Posting a closure changes what every traveller is told, so it is not open to
# anyone who finds the endpoint. One shared secret is thin, but an operator
# console with no auth at all is worse than one with a token the deployment
# sets.
OPERATOR_TOKEN = os.environ.get("MOD_OPERATOR_TOKEN", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Loading takes about 40 ms and the graph is read-only afterwards, so it
    # is held for the life of the process rather than per request.
    global GRAPH, DB
    GRAPH = graph_module.load()
    DB = store.connect()
    yield
    DB.close()


app = FastAPI(title="MOD routing", version="0.1.0", lifespan=lifespan)

# The frontend dev server runs on its own origin, and TanStack Start's router
# answers every path before any Vite or nitro proxy sees it, so the browser
# calls this API directly and needs permission to.
#
# Localhost is allowed by default. A browser only sends these origins if the
# page is served from the viewer's own machine, so this is not a way in from
# the internet, and requiring an environment variable for the ordinary case
# meant every first run failed with an opaque CORS error. Anything that
# changes what travellers are told is behind the operator token regardless.
# In production nginx serves both halves from one origin and MOD_CORS_ORIGINS
# can be set to that origin, or to an empty string to allow none.
DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    # Expo's web target (mod-traveller), default dev port.
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]
_configured = os.environ.get("MOD_CORS_ORIGINS")
CORS_ORIGINS = (
    [o for o in _configured.split(",") if o] if _configured is not None else DEV_ORIGINS
)
if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        # DELETE and the token header are what the operator console's
        # "Clear disruption" and "Publish" send; without them the browser's
        # preflight refuses both before the token is ever checked.
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["content-type", "x-operator-token"],
    )


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": GRAPH is not None, "nodes": len(GRAPH.nodes) if GRAPH else 0}


@app.post("/route")
def route(request: RouteRequest) -> RouteResponse:
    """Quickest route and alternatives for one traveller.

    An empty route list is a real answer, not an error: the corridor graph
    keeps disconnected pieces, and a closure can leave no way through.
    """
    origin = GRAPH.nearest_node(request.origin.lon, request.origin.lat)
    destination = GRAPH.nearest_node(request.destination.lon, request.destination.lat)

    # A traveller does not know which edges are shut, so the server applies
    # what is active rather than expecting the client to send it. The request
    # field remains for testing a hypothetical closure.
    shut = set(request.closed)
    for closure in store.active_closures(DB):
        shut.update(closure["edges"])

    found = alternatives(
        GRAPH,
        origin,
        destination,
        VEHICLES[request.vehicle],
        closed=frozenset(shut),
        k=request.alternatives,
    )

    # Spreading: a traveller whose usual quickest path runs through a shut
    # edge is assigned whichever alternative the fewest affected travellers
    # on the same trip have accepted recently, ties going to the quicker
    # one. Nothing is counted until the traveller accepts (POST
    # /assignments), so reloading a screen or re-checking mid-trip does not
    # inflate the split the operator sees. This is MOD's own engineering
    # default, not a simulated result: see docs/product.md, "What the
    # research does not support (yet)" for why it isn't cited to the study.
    unconstrained = (
        shortest(GRAPH, origin, destination, VEHICLES[request.vehicle]) if shut else None
    )
    affected = unconstrained is not None and any(e in shut for e in unconstrained.edges)
    key = f"{origin}:{destination}:{request.vehicle}" if affected and found else None
    counts = store.recent_assignments(DB, key, len(found)) if key else None
    assigned = counts.index(min(counts)) if counts else 0

    return RouteResponse(
        routes=[
            RouteOption(
                edges=list(r.edges),
                seconds=round(r.seconds, 1),
                metres=round(r.metres, 1),
                geometry=_geometry(r.edges, origin),
            )
            for r in found
        ],
        origin_node=origin,
        destination_node=destination,
        # What the trip costs with nothing shut, so the app can say "about 6
        # minutes longer than usual" instead of hiding the price of the detour.
        usual_seconds=round(unconstrained.seconds, 1) if affected else None,
        assigned=assigned,
        spread_key=key,
        recent_assignments=counts,
    )


def _check_key(key: str) -> None:
    """These endpoints are open, so a key must name real junctions and a real
    vehicle class, or the operator's split view would carry whatever was sent."""
    parts = key.split(":")
    if (
        len(parts) != 3
        or parts[0] not in GRAPH.nodes
        or parts[1] not in GRAPH.nodes
        or parts[2] not in VEHICLES
    ):
        raise HTTPException(status_code=422, detail="unknown trip key")


def _labelled(split: dict) -> SpreadSplit:
    """A split with its two ends as coordinates, so the console can name them."""
    origin, destination, vehicle = split["key"].split(":")
    (olon, olat), (dlon, dlat) = GRAPH.nodes[origin], GRAPH.nodes[destination]
    return SpreadSplit(
        **split,
        origin=Point(lon=olon, lat=olat),
        destination=Point(lon=dlon, lat=dlat),
        vehicle=vehicle,
    )


def _geometry(edges: tuple[str, ...], origin: str) -> list[tuple[float, float]]:
    """Node coordinates along the route, for drawing it.

    Junction positions only. The client has no graph of its own, so without
    this the edge ids mean nothing to it.
    """
    points = [GRAPH.nodes[origin]]
    for edge in edges:
        points.append(GRAPH.nodes[GRAPH.edge_nodes[edge][1]])
    return points


def operator(x_operator_token: str = Header(default="")) -> None:
    """Guards anything that changes what travellers are told."""
    if not OPERATOR_TOKEN or x_operator_token != OPERATOR_TOKEN:
        raise HTTPException(status_code=401, detail="operator token required")


@app.get("/closures")
def list_closures() -> list[Closure]:
    """What is shut right now. Open: travellers need to see this."""
    return [Closure(**c) for c in store.active_closures(DB)]


@app.post("/closures", dependencies=[Depends(operator)])
def post_closure(request: ClosureRequest) -> Closure:
    unknown = [e for e in request.edges if e not in GRAPH.edge_nodes]
    if unknown:
        raise HTTPException(status_code=422, detail=f"unknown edges: {unknown[:5]}")
    closure_id = store.add_closure(
        DB, request.edges, request.reason, request.kind, request.minutes
    )
    posted = next(c for c in store.active_closures(DB) if c["id"] == closure_id)
    return Closure(**posted)


@app.delete("/closures/{closure_id}", dependencies=[Depends(operator)])
def clear_closure(closure_id: int) -> dict[str, bool]:
    if not store.clear_closure(DB, closure_id):
        raise HTTPException(status_code=404, detail="no such closure")
    return {"cleared": True}


@app.get("/reports")
def list_reports() -> list[Report]:
    return [Report(**r) for r in store.recent_reports(DB)]


@app.post("/reports")
def post_report(request: ReportRequest) -> Report:
    """A traveller reporting what they can see.

    Until probe collection exists, these are the only live signal the system
    has about the roads. Deliberately unauthenticated: a report costs one tap
    and asking for an account first means getting none.
    """
    report_id = store.add_report(DB, request.kind, request.at.lon, request.at.lat)
    return Report(
        id=report_id,
        kind=request.kind,
        lon=request.at.lon,
        lat=request.at.lat,
        created=next(r["created"] for r in store.recent_reports(DB) if r["id"] == report_id),
    )


@app.post("/trip-answers")
def post_trip_answer(request: TripAnswerRequest) -> dict[str, int]:
    """The two questions asked after a trip.

    The second one -- did you already know this route -- is what says whether
    guidance is worth anything on this corridor. Nothing identifying the
    traveller is stored with it.
    """
    if request.spread_key is not None:
        _check_key(request.spread_key)
    answer_id = store.add_trip_answer(
        DB, request.took_suggested, request.already_knew, request.spread_key, request.index
    )
    return {"id": answer_id}


@app.post("/assignments")
def accept_assignment(request: AssignmentRequest) -> dict[str, bool]:
    """A diverted traveller accepting one of the alternatives they were shown.

    Counted on acceptance rather than when routes are fetched, so the split
    is travellers, not page loads. Unauthenticated for the same reason as
    reports; the key carries graph node ids and a vehicle class, nothing
    about the person.
    """
    _check_key(request.spread_key)
    store.record_spread_selection(DB, request.spread_key, request.index)
    return {"recorded": True}


@app.get("/trip-answers/summary")
def trip_answer_summary() -> dict[str, int]:
    return store.answer_summary(DB)


@app.post("/probes")
def post_probes(request: ProbeRequest) -> dict[str, int]:
    """Positions from a trip in progress, turned into speed on a road.

    The pings are matched and discarded inside this request. What is stored
    is an anonymous speed per edge, with nothing recording whose trip it came
    from. That is a deliberate choice made before there was any data to
    regret: a pipeline that never persists an identifiable trace is far easier
    to defend than one that deletes them afterwards.
    """
    observed = probes.match(
        GRAPH, [probes.Ping(p.lon, p.lat, p.at) for p in request.pings]
    )
    store.add_speeds(DB, observed)
    return {"matched": len(observed), "sent": len(request.pings)}


@app.get("/places/search")
async def search_places(q: str) -> PlaceSearchResponse:
    """Place search, proxied through Baato.

    Returns an empty list with configured=false when no key is set, which is
    the state today -- the client falls back to its own fixed corridor list
    exactly as it did before this endpoint existed. Nothing about the app's
    current behaviour changes until a key is added.
    """
    results = await places_module.search(q)
    return PlaceSearchResponse(results=results, configured=bool(places_module.BAATO_KEY))


@app.get("/coverage")
def coverage(minutes: int = 15) -> Coverage:
    """How much of the network has measured speed right now.

    Phase 3 exists to produce this number. Until it is meaningfully above
    zero, routing on measured speed is not possible and the product says
    free-flow instead of pretending.
    """
    counted = store.edge_speed_coverage(DB, minutes)
    total = len(GRAPH.edge_nodes)
    share = counted["edges_with_data"] / total if total else 0.0
    return Coverage(
        **counted,
        edges_total=total,
        share_of_network=round(share, 5),
        # Nothing routes on this yet. The threshold is a placeholder for a
        # decision Phase 4 has to make with real numbers in front of it.
        usable=False,
    )


@app.get("/flow")
def flow(edge: str, minutes: int = 15) -> dict[str, object]:
    """Current flow on one link, for the operator to see before closing it.

    Closing a road that is already stopped removes nothing. Measured speed is
    the median of matched probes in the window; with none, it is null and the
    console says the flow is unknown rather than showing the free-flow figure
    as if it were live.
    """
    if edge not in GRAPH.edge_nodes:
        raise HTTPException(status_code=404, detail="no such edge")
    measured = store.median_speeds(DB, minutes).get(edge)
    return {
        "edge": edge,
        "window_minutes": minutes,
        "measured_kmh": round(measured * 3.6, 1) if measured is not None else None,
    }


@app.get("/spread")
def spread(minutes: int = 120) -> SpreadResponse:
    """How affected travellers have actually split across alternatives.

    Real counts over a window: who accepted each alternative, and how many of
    them later said they took it. Not a claim that the assignment must be
    even. Each split carries its two ends as coordinates, since the graph has
    no place names and the console labels them itself.
    """
    return SpreadResponse(
        window_minutes=minutes,
        splits=[_labelled(s) for s in store.spread_split(DB, minutes)],
    )
