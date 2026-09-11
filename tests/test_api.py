import pytest
from fastapi.testclient import TestClient

from api.main import app

TRIPURESHWOR = {"lon": 85.3140, "lat": 27.6929}
KOTESHWOR = {"lon": 85.3495, "lat": 27.6785}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_reports_a_loaded_graph(client):
    body = client.get("/health").json()
    assert body["ok"] is True
    assert body["nodes"] > 10_000


def test_route_returns_alternatives_with_geometry(client):
    body = client.post(
        "/route",
        json={"origin": TRIPURESHWOR, "destination": KOTESHWOR, "vehicle": "car"},
    ).json()
    assert len(body["routes"]) > 1
    for route in body["routes"]:
        assert route["seconds"] > 0 and route["metres"] > 0
        # One point per edge, plus the origin.
        assert len(route["geometry"]) == len(route["edges"]) + 1


def test_closing_an_edge_diverts_the_route(client):
    payload = {"origin": TRIPURESHWOR, "destination": KOTESHWOR, "vehicle": "car"}
    first = client.post("/route", json=payload).json()["routes"][0]
    shut = first["edges"][len(first["edges"]) // 2]

    diverted = client.post("/route", json={**payload, "closed": [shut]}).json()
    assert diverted["routes"]
    for route in diverted["routes"]:
        assert shut not in route["edges"]


def test_no_route_is_an_empty_list_not_an_error(client):
    # The graph keeps disconnected pieces, so some origins cannot reach the
    # corridor at all. The app shows "no alternative available" for this; it
    # is a real outcome and must not arrive as an error.
    island = {"lon": 85.282756, "lat": 27.680483}
    response = client.post(
        "/route",
        json={"origin": island, "destination": KOTESHWOR, "vehicle": "car"},
    )
    assert response.status_code == 200
    assert response.json()["routes"] == []


def test_vehicle_class_changes_the_answer(client):
    # Either end of a motorcycle-only link. A scooter goes straight through;
    # a car has to go round. This is the differentiator over a general router,
    # and it disappears silently if the graph is exported from the
    # passenger-filtered network build.
    payload = {
        "origin": {"lon": 85.335341, "lat": 27.656103},
        "destination": {"lon": 85.335586, "lat": 27.655594},
    }
    moto = client.post("/route", json={**payload, "vehicle": "motorcycle"}).json()
    car = client.post("/route", json={**payload, "vehicle": "car"}).json()
    assert moto["routes"] and car["routes"]
    assert car["routes"][0]["metres"] > moto["routes"][0]["metres"] * 1.5


def test_unknown_vehicle_is_rejected(client):
    r = client.post(
        "/route",
        json={"origin": TRIPURESHWOR, "destination": KOTESHWOR, "vehicle": "tractor"},
    )
    assert r.status_code == 422


def test_coordinates_are_validated(client):
    r = client.post(
        "/route",
        json={"origin": {"lon": 999, "lat": 0}, "destination": KOTESHWOR},
    )
    assert r.status_code == 422


def test_no_cross_origin_access_unless_configured():
    # Production serves both halves from one origin, so nothing should be
    # allowed by default. MOD_CORS_ORIGINS opens it for the dev server only.
    from api.main import CORS_ORIGINS

    assert CORS_ORIGINS == []
