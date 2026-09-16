"""Place search degrades cleanly at every point where it has no key, a bad
query, or the network fails -- it must never surface a third-party outage to
a traveller typing a place name."""

import asyncio

import httpx

from api import places


def test_no_results_when_no_key_is_configured(monkeypatch):
    monkeypatch.setattr(places, "BAATO_KEY", "")
    assert asyncio.run(places.search("thamel")) == []


def test_short_queries_are_not_sent_anywhere(monkeypatch):
    # A single keystroke is not a search. If this reached the network it
    # would spend a credit per character typed.
    monkeypatch.setattr(places, "BAATO_KEY", "test-key")
    assert asyncio.run(places.search("t")) == []


def test_a_failed_request_returns_empty_rather_than_raising(monkeypatch):
    monkeypatch.setattr(places, "BAATO_KEY", "test-key")

    class FailingClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, *a, **kw):
            raise httpx.ConnectError("no network in this test")

    monkeypatch.setattr(places.httpx, "AsyncClient", lambda **kw: FailingClient())
    assert asyncio.run(places.search("thamel")) == []


def test_a_well_formed_response_is_parsed_into_place_results(monkeypatch):
    monkeypatch.setattr(places, "BAATO_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "data": [
                    {"name": "Thamel", "centroid": {"lat": 27.715, "lon": 85.31}},
                    # A row missing a centroid is dropped rather than crashing
                    # the whole search.
                    {"name": "No location", "centroid": {}},
                ]
            }

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, *a, **kw):
            return FakeResponse()

    monkeypatch.setattr(places.httpx, "AsyncClient", lambda **kw: FakeClient())
    results = asyncio.run(places.search("thamel"))
    assert len(results) == 1
    assert results[0].name == "Thamel"
    assert results[0].lat == 27.715 and results[0].lon == 85.31


def test_endpoint_reports_whether_a_key_is_configured(monkeypatch):
    monkeypatch.setattr(places, "BAATO_KEY", "")
    from fastapi.testclient import TestClient

    from api.main import app

    with TestClient(app) as client:
        body = client.get("/places/search", params={"q": "thamel"}).json()
        assert body == {"results": [], "configured": False}
