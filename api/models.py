"""Request and response shapes for the routing endpoint."""

from typing import Literal

from pydantic import BaseModel, Field

# What a traveller picks at onboarding, mapped to the graph's class codes.
# "passenger" is SUMO's name for a car; the app says car.
VEHICLES: dict[str, str] = {
    "motorcycle": "m",
    "car": "c",
    "bus": "b",
    "truck": "t",
}

Vehicle = Literal["motorcycle", "car", "bus", "truck"]


class Point(BaseModel):
    lon: float = Field(ge=-180, le=180)
    lat: float = Field(ge=-90, le=90)


class RouteRequest(BaseModel):
    origin: Point
    destination: Point
    vehicle: Vehicle = "motorcycle"
    closed: list[str] = Field(default_factory=list)
    alternatives: int = Field(default=3, ge=1, le=5)


class RouteOption(BaseModel):
    edges: list[str]
    seconds: float
    metres: float
    geometry: list[tuple[float, float]]


class RouteResponse(BaseModel):
    routes: list[RouteOption]
    origin_node: str
    destination_node: str
    # Set only when an active closure sits on this trip's usual quickest path.
    usual_seconds: float | None = None
    # Index into routes of the alternative this traveller is advised to take.
    assigned: int = 0
    # Present only for a diverted trip; sent back with POST /assignments.
    spread_key: str | None = None
    # Accepted assignments per route over the last two hours, same order.
    recent_assignments: list[int] | None = None


class AssignmentRequest(BaseModel):
    spread_key: str = Field(min_length=3, max_length=200)
    index: int = Field(ge=0, le=4)


class ClosureRequest(BaseModel):
    edges: list[str] = Field(min_length=1)
    reason: str = Field(min_length=3, max_length=200)
    kind: Literal["closure", "accident", "weather", "event"] = "closure"
    minutes: int = Field(default=60, ge=5, le=720)


class Closure(BaseModel):
    id: int
    edges: list[str]
    reason: str
    kind: str
    starts: float
    ends: float


class ReportRequest(BaseModel):
    kind: Literal["jam", "flood", "closed", "accident"]
    at: Point


class Report(BaseModel):
    id: int
    kind: str
    lon: float
    lat: float
    created: float


class TripAnswerRequest(BaseModel):
    took_suggested: Literal["yes", "no", "partly"]
    already_knew: Literal["yes", "no"]
    # The trip's origin:destination:vehicle key and the route index taken.
    spread_key: str | None = Field(default=None, max_length=200)
    index: int | None = Field(default=None, ge=0, le=4)


class PingIn(BaseModel):
    lon: float = Field(ge=-180, le=180)
    lat: float = Field(ge=-90, le=90)
    at: float


class ProbeRequest(BaseModel):
    """A short run of positions from one trip.

    Sent in batches rather than one at a time: a request per ping would cost
    the traveller battery and mobile data for no gain.
    """

    pings: list[PingIn] = Field(min_length=2, max_length=120)


class Coverage(BaseModel):
    window_minutes: int
    observations: int
    edges_with_data: int
    edges_total: int
    share_of_network: float
    usable: bool


class SpreadSplit(BaseModel):
    key: str
    counts: list[int]
    answered: list[int]
    took: list[int]
    origin: Point
    destination: Point
    vehicle: str


class SpreadResponse(BaseModel):
    window_minutes: int
    splits: list[SpreadSplit]


class PlaceResult(BaseModel):
    name: str
    lon: float
    lat: float


class PlaceSearchResponse(BaseModel):
    results: list[PlaceResult]
    # False whenever no Baato key is configured. The frontend uses this to
    # decide what an empty list means: not configured falls back to filtering
    # the fixed corridor list client-side, same as today; configured-but-empty
    # is a real "no matches" and should be shown as one.
    configured: bool
