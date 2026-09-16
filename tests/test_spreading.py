"""Which alternative leads the list, once a closure could plausibly affect
this trip. This is MOD's own engineering default -- see docs/product.md,
"What the research does not support (yet)" -- not a simulated result, so
these tests are about the mechanism doing what it claims, not about it
matching a study."""

import os

import pytest
from fastapi.testclient import TestClient

TRIPURESHWOR = {"lon": 85.3140, "lat": 27.6929}
KOTESHWOR = {"lon": 85.3495, "lat": 27.6785}
TOKEN = "test-token"


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    os.environ["MOD_DB"] = str(tmp_path_factory.mktemp("db") / "test.db")
    os.environ["MOD_OPERATOR_TOKEN"] = TOKEN
    import importlib

    import api.main
    import api.store

    importlib.reload(api.store)
    importlib.reload(api.main)
    with TestClient(api.main.app) as c:
        yield c


def route(client, closed=None):
    return client.post(
        "/route",
        json={
            "origin": TRIPURESHWOR,
            "destination": KOTESHWOR,
            "vehicle": "car",
            "closed": closed or [],
        },
    ).json()


def close(client, edge):
    r = client.post(
        "/closures",
        json={"edges": [edge], "reason": "VIP movement", "minutes": 30},
        headers={"x-operator-token": TOKEN},
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_with_no_active_closure_the_same_route_leads_every_time(client):
    a = route(client)["routes"][0]["edges"]
    b = route(client)["routes"][0]["edges"]
    assert a == b


def test_an_unaffected_travellers_suggestion_does_not_rotate(client):
    # Close something nowhere near this corridor pair's own quickest route.
    before = route(client)["routes"][0]["edges"]
    close(client, "1132401300#0")
    # If that edge isn't on this route's quickest path, spreading shouldn't
    # touch it. (Falls back to just checking it still returns something
    # sane if the edge happens to be on the path in a future graph change.)
    after = route(client)["routes"][0]["edges"]
    if "1132401300#0" not in before:
        assert after == before


def test_an_affected_travellers_suggestion_rotates_round_robin(client):
    baseline = route(client)["routes"]
    assert len(baseline) > 1
    primary_edges = baseline[0]["edges"]
    shut_edge = primary_edges[len(primary_edges) // 2]
    close(client, shut_edge)

    seen = [route(client)["routes"][0]["edges"] for _ in range(4)]
    # Round-robin over however many alternatives exist: not everyone gets
    # the same leading route.
    assert len(set(tuple(r) for r in seen)) > 1
    # None of them can contain the edge that's now shut.
    for edges in seen:
        assert shut_edge not in edges


def test_each_key_has_its_own_independent_counter(tmp_path):
    # Regression guard at the storage layer: the round-robin key must
    # include origin/destination/vehicle, or two unrelated trips would
    # perturb each other's rotation.
    import api.store as store_module

    store_module.DB_PATH = tmp_path / "spread.db"
    db = store_module.connect()

    a_first = store_module.next_spread_index(db, "A", 3)
    b_first = store_module.next_spread_index(db, "B", 3)
    a_second = store_module.next_spread_index(db, "A", 3)

    assert (a_first, b_first) == (0, 0)
    assert a_second == 1
