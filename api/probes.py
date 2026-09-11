"""Turning position pings into speed on a road.

The privacy rule comes first and shapes everything else: a trace belonging to a
traveller is never stored. Pings arrive, are matched to an edge, become an
anonymous speed observation, and the trace is discarded inside the request.
What persists is "edge X was travelled at Y m/s at time T" with nothing
attached saying who.

Matching is deliberately conservative. Two consecutive pings are accepted only
when they snap to two nodes that a single edge joins, in that direction. That
is not hidden-Markov map matching and does not pretend to be: it throws away
anything ambiguous rather than guessing, which is the right trade while the
question is still "is there enough data at all".
"""

from dataclasses import dataclass

from api.graph import Graph

# A ping further than this from any node is not on the corridor.
MAX_SNAP_METRES = 60.0

# Speeds outside this are a GPS artefact, not traffic: a stationary jitter or
# a jump between towers. Motorcycles on this corridor do not do 30 m/s.
MIN_SPEED, MAX_SPEED = 0.3, 30.0

# Two pings more than this apart say nothing about the road between them.
MAX_GAP_SECONDS = 120.0


@dataclass(frozen=True, slots=True)
class Ping:
    lon: float
    lat: float
    at: float


@dataclass(frozen=True, slots=True)
class Observation:
    edge: str
    speed: float
    at: float


def _metres(a: tuple[float, float], b: tuple[float, float]) -> float:
    import math

    dlat = (b[1] - a[1]) * 111_320
    dlon = (b[0] - a[0]) * 111_320 * math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot(dlat, dlon)


def match(graph: Graph, pings: list[Ping]) -> list[Observation]:
    """Speed observations from one traveller's pings. The pings are not kept."""
    ordered = sorted(pings, key=lambda p: p.at)
    snapped: list[tuple[str, float]] = []
    for ping in ordered:
        node = graph.nearest_node(ping.lon, ping.lat)
        if _metres(graph.nodes[node], (ping.lon, ping.lat)) > MAX_SNAP_METRES:
            continue
        snapped.append((node, ping.at))

    out: list[Observation] = []
    for (node_a, t_a), (node_b, t_b) in zip(snapped, snapped[1:]):
        gap = t_b - t_a
        if node_a == node_b or gap <= 0 or gap > MAX_GAP_SECONDS:
            continue
        edge = graph.edge_between(node_a, node_b)
        if edge is None:
            continue  # they did not travel one edge; say nothing
        speed = graph.edge_length(edge) / gap
        if MIN_SPEED <= speed <= MAX_SPEED:
            out.append(Observation(edge, round(speed, 2), t_b))
    return out
