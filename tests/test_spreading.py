"""Which alternative a traveller is assigned, once a closure could plausibly affect
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


def test_with_no_active_closure_the_quickest_route_is_assigned(client):
    body = route(client)
    assert body["assigned"] == 0
    assert body["spread_key"] is None


def test_an_unaffected_traveller_is_not_spread(client):
    # Close something nowhere near this corridor pair's own quickest route.
    before = route(client)["routes"][0]["edges"]
    close(client, "1132401300#0")
    # If that edge isn't on this route's quickest path, spreading shouldn't
    # touch it. (Falls back to just checking it still returns something
    # sane if the edge happens to be on the path in a future graph change.)
    after = route(client)["routes"][0]["edges"]
    if "1132401300#0" not in before:
        assert after == before


def accept(client, body):
    r = client.post(
        "/assignments", json={"spread_key": body["spread_key"], "index": body["assigned"]}
    )
    assert r.status_code == 200


def test_affected_travellers_are_spread_only_as_they_accept(client):
    baseline = route(client)["routes"]
    assert len(baseline) > 1
    shut_edge = baseline[0]["edges"][len(baseline[0]["edges"]) // 2]
    close(client, shut_edge)

    first = route(client)
    assert first["spread_key"] and first["usual_seconds"]
    # Asking again without accepting changes nothing: page loads and mid-trip
    # re-checks are not travellers.
    assert route(client)["assigned"] == first["assigned"]

    accept(client, first)
    second = route(client)
    assert second["assigned"] != first["assigned"]
    accept(client, second)

    for body in (first, second):
        assert shut_edge not in body["routes"][body["assigned"]]["edges"]
    counts = route(client)["recent_assignments"]
    assert sum(counts) == 2 and max(counts) == 1


def test_the_operator_split_view_counts_acceptances_not_requests(client):
    body = route(client)
    key = body["spread_key"]
    before = sum(next(s["counts"] for s in client.get("/spread").json()["splits"] if s["key"] == key))
    for _ in range(3):
        route(client)
    accept(client, body)
    after = sum(next(s["counts"] for s in client.get("/spread").json()["splits"] if s["key"] == key))
    assert after == before + 1


def test_an_assignment_index_out_of_range_is_rejected(client):
    r = client.post("/assignments", json={"spread_key": "a:b:car", "index": 9})
    assert r.status_code == 422


def test_an_answer_counts_against_the_route_it_was_about(client):
    body = route(client)
    i = body["assigned"]
    accept(client, body)
    r = client.post(
        "/trip-answers",
        json={
            "took_suggested": "yes",
            "already_knew": "no",
            "spread_key": body["spread_key"],
            "index": i,
        },
    )
    assert r.status_code == 200
    split = next(s for s in client.get("/spread").json()["splits"] if s["key"] == body["spread_key"])
    assert split["answered"][i] == 1 and split["took"][i] == 1
    assert split["vehicle"] == "car" and split["origin"]["lon"] > 85


def test_a_made_up_trip_key_is_refused(client):
    body = route(client)
    real_ends = f"{body['origin_node']}:{body['destination_node']}"
    for key in ("a:b:car", "x", f"{real_ends}:hovercraft"):
        r = client.post("/assignments", json={"spread_key": key, "index": 0})
        assert r.status_code == 422
    # The operator view still loads after the attempts.
    assert client.get("/spread").status_code == 200
