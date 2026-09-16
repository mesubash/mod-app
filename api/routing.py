"""Shortest path and distinct alternatives, per vehicle class.

This module only finds routes; it has no opinion on which one a given
traveller should be told about first. That policy (currently: round-robin
across the k returned here, for travellers a closure actually affects) lives
in api/main.py's /route handler, next to the store it needs to keep count.
See docs/product.md, "What the research does not support (yet)," for why
that policy is an engineering default and not a cited result.
"""

import heapq
from dataclasses import dataclass

from api.graph import Graph

# Edges left routable at each end of a route when banning it, so the next
# alternative can still use the origin and destination streets.
ENDS_KEPT = 2


@dataclass(frozen=True, slots=True)
class Route:
    edges: tuple[str, ...]
    seconds: float
    metres: float


def shortest(
    graph: Graph,
    start: str,
    end: str,
    vclass: str,
    banned: frozenset[str] = frozenset(),
) -> Route | None:
    """Quickest path from start to end, or None if there is not one.

    Exclusions are applied in the search rather than by editing edge weights.
    An earlier version of this in the research code "closed" an edge by
    mutating its speed, which the router ignored because it caches.
    """
    dist = {start: 0.0}
    prev: dict[str, tuple[str, str, float]] = {}
    queue = [(0.0, start)]
    done: set[str] = set()

    while queue:
        cost, node = heapq.heappop(queue)
        if node in done:
            continue
        done.add(node)
        if node == end:
            break
        for arc in graph.arcs.get(node, ()):
            if arc.edge in banned or vclass not in arc.classes:
                continue
            through = cost + arc.seconds
            if through < dist.get(arc.to, float("inf")):
                dist[arc.to] = through
                prev[arc.to] = (node, arc.edge, arc.metres)
                heapq.heappush(queue, (through, arc.to))

    if end not in dist:
        return None

    edges, metres, node = [], 0.0, end
    while node != start:
        node, edge, length = prev[node]
        edges.append(edge)
        metres += length
    edges.reverse()
    return Route(tuple(edges), dist[end], metres)


def alternatives(
    graph: Graph,
    start: str,
    end: str,
    vclass: str,
    closed: frozenset[str] = frozenset(),
    k: int = 3,
) -> list[Route]:
    """Up to k routes, quickest first, each a different corridor.

    Each route found bans its own middle for the next search, keeping the
    first and last few edges so a traveller can still leave and reach their
    own street. Banning only the mid-edge, as the research code does, returns
    alternatives that share 98% of their edges with the quickest path: the
    same road with a one-edge detour, which spreads no traffic at all. Banning
    the whole route instead leaves no way out of the origin street and returns
    a single option. Keeping two edges at each end gives alternatives that
    overlap by 4 to 6%.
    """
    banned = set(closed)
    found: list[Route] = []
    seen: set[tuple[str, ...]] = set()

    for _ in range(k):
        route = shortest(graph, start, end, vclass, frozenset(banned))
        if route is None or route.edges in seen:
            break
        found.append(route)
        seen.add(route.edges)
        banned.update(route.edges[ENDS_KEPT:-ENDS_KEPT])

    return found
