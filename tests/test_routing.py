import pytest

from api.graph import load
from api.routing import alternatives, shortest

GRAPH = load()
# Two ends of the corridor: Tripureshwor and Koteshwor, roughly.
WEST = GRAPH.nearest_node(85.3140, 27.6929)
EAST = GRAPH.nearest_node(85.3495, 27.6785)


def test_finds_a_route_across_the_corridor():
    route = shortest(GRAPH, WEST, EAST, "c")
    assert route is not None
    assert route.edges and route.seconds > 0 and route.metres > 0


def test_route_edges_join_end_to_end():
    route = shortest(GRAPH, WEST, EAST, "c")
    node = WEST
    for edge in route.edges:
        tail, head = GRAPH.edge_nodes[edge]
        assert tail == node
        node = head
    assert node == EAST


def test_no_route_returns_none_rather_than_raising():
    # The graph keeps disconnected islands, so "no route" is a real outcome
    # and not an error. A node with no outgoing arcs cannot start a trip.
    sink = next(n for n in GRAPH.nodes if n not in GRAPH.arcs)
    assert shortest(GRAPH, sink, EAST, "c") is None


def test_closing_an_edge_changes_the_route():
    route = shortest(GRAPH, WEST, EAST, "c")
    closed = frozenset({route.edges[len(route.edges) // 2]})
    diverted = shortest(GRAPH, WEST, EAST, "c", banned=closed)
    assert diverted is not None
    assert closed.isdisjoint(diverted.edges)
    assert diverted.edges != route.edges


def test_a_route_never_uses_an_edge_its_class_may_not():
    for vclass in ("c", "m", "b", "t"):
        route = shortest(GRAPH, WEST, EAST, vclass)
        if route is None:
            continue
        for edge in route.edges:
            assert GRAPH.allows(edge, vclass)


def test_motorcycles_can_use_links_cars_cannot():
    # The differentiator, end to end rather than at the graph level: find a
    # motorcycle-only edge and check a car cannot be routed along it.
    moto_only = next(
        a.edge
        for arcs in GRAPH.arcs.values()
        for a in arcs
        if "m" in a.classes and "c" not in a.classes
    )
    tail, head = GRAPH.edge_nodes[moto_only]
    assert shortest(GRAPH, tail, head, "m") is not None
    car = shortest(GRAPH, tail, head, "c")
    assert car is None or moto_only not in car.edges


def test_alternatives_are_distinct_routes():
    routes = alternatives(GRAPH, WEST, EAST, "c", k=3)
    assert len(routes) > 1
    assert len({r.edges for r in routes}) == len(routes)


def test_alternatives_are_different_corridors_not_detours():
    # The point of an alternative is that it uses other roads. Banning only
    # the mid-edge of each route returns paths sharing 98% of their edges,
    # which spreads nothing.
    routes = alternatives(GRAPH, WEST, EAST, "c", k=3)
    assert len(routes) > 1
    primary = set(routes[0].edges)
    for other in routes[1:]:
        shared = len(primary & set(other.edges)) / len(primary)
        assert shared < 0.5, f"alternative shares {shared:.0%} of the primary route"


def test_alternatives_come_back_quickest_first():
    routes = alternatives(GRAPH, WEST, EAST, "c", k=3)
    assert routes == sorted(routes, key=lambda r: r.seconds)


def test_alternatives_respect_closures():
    first = shortest(GRAPH, WEST, EAST, "c")
    closed = frozenset({first.edges[len(first.edges) // 2]})
    for route in alternatives(GRAPH, WEST, EAST, "c", closed=closed, k=3):
        assert closed.isdisjoint(route.edges)


@pytest.mark.parametrize("k", [1, 2, 5])
def test_alternatives_returns_at_most_k(k):
    assert len(alternatives(GRAPH, WEST, EAST, "c", k=k)) <= k
