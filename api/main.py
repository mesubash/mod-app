"""MOD routing API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from api import graph as graph_module
from api.models import VEHICLES, RouteOption, RouteRequest, RouteResponse
from api.routing import alternatives

GRAPH: graph_module.Graph | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Loading takes about 40 ms and the graph is read-only afterwards, so it
    # is held for the life of the process rather than per request.
    global GRAPH
    GRAPH = graph_module.load()
    yield


app = FastAPI(title="MOD routing", version="0.1.0", lifespan=lifespan)


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

    found = alternatives(
        GRAPH,
        origin,
        destination,
        VEHICLES[request.vehicle],
        closed=frozenset(request.closed),
        k=request.alternatives,
    )

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
