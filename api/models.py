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
