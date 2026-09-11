from api.graph import load

GRAPH = load()


def test_every_arc_endpoint_is_a_known_node():
    for node, arcs in GRAPH.arcs.items():
        assert node in GRAPH.nodes
        for arc in arcs:
            assert arc.to in GRAPH.nodes


def test_traversal_time_is_positive():
    assert all(arc.seconds > 0 for arcs in GRAPH.arcs.values() for arc in arcs)


def test_motorcycles_reach_edges_cars_cannot():
    # The product's vehicle-class differentiator. Exporting from the
    # passenger-filtered network build drops these silently, leaving a graph
    # where a scooter and a truck route identically. See docs/graph-format.md.
    moto = {a.edge for arcs in GRAPH.arcs.values() for a in arcs if "m" in a.classes}
    car = {a.edge for arcs in GRAPH.arcs.values() for a in arcs if "c" in a.classes}
    assert len(moto - car) > 100


def test_nearest_node_snaps_to_something_routable():
    # Maitighar, roughly.
    node = GRAPH.nearest_node(85.3188, 27.6931)
    assert node in GRAPH.arcs


def test_nearest_node_returns_the_node_itself_when_given_its_coordinate():
    node = next(iter(GRAPH.arcs))
    lon, lat = GRAPH.nodes[node]
    assert GRAPH.nearest_node(lon, lat) == node
