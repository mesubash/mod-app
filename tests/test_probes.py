from api.graph import load
from api.probes import MAX_GAP_SECONDS, Ping, match

GRAPH = load()


def a_real_edge():
    """An edge with a plausible length, plus the coordinates of its ends."""
    for tail, arcs in GRAPH.arcs.items():
        for arc in arcs:
            if 40 < arc.metres < 300:
                return arc.edge, GRAPH.nodes[tail], GRAPH.nodes[arc.to], arc.metres
    raise AssertionError("no suitable edge")


def test_two_pings_along_one_edge_become_one_observation():
    edge, tail, head, metres = a_real_edge()
    seconds = metres / 8.0
    got = match(GRAPH, [Ping(tail[0], tail[1], 1000.0), Ping(head[0], head[1], 1000.0 + seconds)])
    assert len(got) == 1
    assert got[0].edge == edge
    assert 7.5 < got[0].speed < 8.5


def test_nothing_is_matched_when_the_pings_do_not_share_an_edge():
    _, tail, _, _ = a_real_edge()
    far = GRAPH.nodes[GRAPH.nearest_node(85.297, 27.699)]
    assert match(GRAPH, [Ping(tail[0], tail[1], 0.0), Ping(far[0], far[1], 30.0)]) == []


def test_a_long_gap_says_nothing_about_the_road_between():
    edge, tail, head, metres = a_real_edge()
    got = match(
        GRAPH,
        [Ping(tail[0], tail[1], 0.0), Ping(head[0], head[1], MAX_GAP_SECONDS + 1)],
    )
    assert got == []


def test_impossibly_fast_pings_are_discarded():
    # A whole edge in a tenth of a second is a GPS jump, not a vehicle.
    _, tail, head, _ = a_real_edge()
    assert match(GRAPH, [Ping(tail[0], tail[1], 0.0), Ping(head[0], head[1], 0.1)]) == []


def test_crawling_traffic_is_kept_because_that_is_the_signal():
    # An edge covered slowly is a jam, and a jam is the thing worth measuring.
    # The speed floor exists for stationary jitter, and with the 120 s gap cap
    # above it can only bite on very short edges.
    _, tail, head, metres = a_real_edge()
    got = match(GRAPH, [Ping(tail[0], tail[1], 0.0), Ping(head[0], head[1], 119.0)])
    assert len(got) == 1
    assert got[0].speed < 3.0


def test_pings_far_from_any_road_are_ignored():
    # Middle of nowhere, well outside the corridor.
    assert match(GRAPH, [Ping(80.0, 20.0, 0.0), Ping(80.001, 20.001, 30.0)]) == []


def test_pings_are_ordered_before_matching():
    edge, tail, head, metres = a_real_edge()
    seconds = metres / 8.0
    shuffled = [Ping(head[0], head[1], 1000.0 + seconds), Ping(tail[0], tail[1], 1000.0)]
    assert len(match(GRAPH, shuffled)) == 1


def test_flow_on_a_link_is_unknown_until_measured(tmp_path, monkeypatch):
    import importlib
    import time

    from api.probes import Observation

    monkeypatch.setenv("MOD_DB", str(tmp_path / "flow.db"))
    import api.main
    import api.store

    importlib.reload(api.store)
    importlib.reload(api.main)
    from fastapi.testclient import TestClient

    with TestClient(api.main.app) as c:
        edge = next(iter(api.main.GRAPH.edge_nodes))
        assert c.get("/flow", params={"edge": edge}).json()["measured_kmh"] is None
        api.store.add_speeds(api.main.DB, [Observation(edge, 5.0, time.time())])
        assert c.get("/flow", params={"edge": edge}).json()["measured_kmh"] == 18.0
        assert c.get("/flow", params={"edge": "not-an-edge"}).status_code == 404
