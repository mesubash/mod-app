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
    # Imported here so the module picks up the env above.
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


def test_posting_a_closure_needs_the_operator_token(client):
    body = {"edges": ["nope"], "reason": "VIP movement"}
    assert client.post("/closures", json=body).status_code == 401
    assert (
        client.post("/closures", json=body, headers={"x-operator-token": "wrong"}).status_code
        == 401
    )


def test_a_closure_cannot_name_an_edge_that_does_not_exist(client):
    r = client.post(
        "/closures",
        json={"edges": ["not-an-edge"], "reason": "VIP movement"},
        headers={"x-operator-token": TOKEN},
    )
    assert r.status_code == 422


def test_an_active_closure_diverts_travellers_without_them_asking(client):
    before = route(client)["routes"][0]
    shut = before["edges"][len(before["edges"]) // 2]

    posted = client.post(
        "/closures",
        json={"edges": [shut], "reason": "VIP movement", "minutes": 30},
        headers={"x-operator-token": TOKEN},
    )
    assert posted.status_code == 200

    # The traveller sends no closure list; the server applies what is active.
    after = route(client)
    assert after["routes"]
    for r in after["routes"]:
        assert shut not in r["edges"]

    assert any(c["reason"] == "VIP movement" for c in client.get("/closures").json())

    cleared = client.delete(
        f"/closures/{posted.json()['id']}", headers={"x-operator-token": TOKEN}
    )
    assert cleared.status_code == 200
    assert shut in route(client)["routes"][0]["edges"]


def test_reports_are_open_and_come_back_newest_first(client):
    for kind in ("jam", "flood"):
        r = client.post("/reports", json={"kind": kind, "at": TRIPURESHWOR})
        assert r.status_code == 200
    kinds = [r["kind"] for r in client.get("/reports").json()]
    assert kinds[:2] == ["flood", "jam"]


def test_an_unknown_report_kind_is_rejected(client):
    assert client.post("/reports", json={"kind": "ufo", "at": TRIPURESHWOR}).status_code == 422


def test_trip_answers_are_counted(client):
    client.post("/trip-answers", json={"took_suggested": "yes", "already_knew": "no"})
    client.post("/trip-answers", json={"took_suggested": "no", "already_knew": "yes"})
    summary = client.get("/trip-answers/summary").json()
    assert summary["answers"] >= 2
    assert summary["took_suggested"] >= 1
    assert summary["already_knew"] >= 1
