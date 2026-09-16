"""Place search, proxied through Baato rather than called from the browser.

Baato's own authentication docs say to do this: a key used from a browser is
visible in devtools, so either restrict it to known origins or proxy it
through a backend. This is the backend.

Baato's routing endpoint is deliberately not proxied here. MOD's own router
-- vehicle-class permissions, closures, genuinely distinct alternatives -- is
the product's reason to exist over a general-purpose router. Routing through
Baato instead would replace the one thing that makes this different from
Baato itself.

No key is configured yet. Every call below degrades to an empty result rather
than failing, so the corridor's fixed place list in the client keeps working
exactly as it does today until a key is added.
"""

import os

import httpx

from api.models import PlaceResult

BAATO_KEY = os.environ.get("BAATO_API_KEY", "")
BAATO_SEARCH_URL = "https://api.baato.io/api/v1/search"

# The corridor's own centre, already used to frame the map. Baato's search
# takes a bias point; without one a query for a common name returns results
# from anywhere in Nepal instead of Kathmandu.
CORRIDOR_CENTRE = (85.33, 27.69)

# Below this, a query is a keystroke mid-word, not a search. Proxying it
# would spend a credit on every character typed.
MIN_QUERY_LENGTH = 2


async def search(query: str, limit: int = 5) -> list[PlaceResult]:
    if not BAATO_KEY or len(query.strip()) < MIN_QUERY_LENGTH:
        return []

    lon, lat = CORRIDOR_CENTRE
    params = {"q": query, "lat": lat, "lon": lon, "limit": limit, "key": BAATO_KEY}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(BAATO_SEARCH_URL, params=params)
            response.raise_for_status()
            body = response.json()
    except (httpx.HTTPError, ValueError):
        # A traveller typing a place name should never see a stack trace for
        # a third-party outage. They see no suggestions and can still use the
        # fixed list, same as when no key is configured at all.
        return []

    results = []
    for row in body.get("data", []):
        centroid = row.get("centroid") or {}
        if "lat" not in centroid or "lon" not in centroid:
            continue
        results.append(
            PlaceResult(name=row.get("name", query), lon=centroid["lon"], lat=centroid["lat"])
        )
    return results
