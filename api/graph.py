"""The corridor road graph, held in memory.

See docs/graph-format.md for the file's contents.
"""

import gzip
import json
import math
from dataclasses import dataclass
from pathlib import Path

GRAPH_FILE = Path(__file__).parent.parent / "data" / "corridor-graph.json.gz"


@dataclass(frozen=True, slots=True)
class Arc:
    """One directed edge, ready to traverse."""

    to: str
    edge: str
    metres: float
    seconds: float
    classes: str


@dataclass(frozen=True, slots=True)
class Graph:
    nodes: dict[str, tuple[float, float]]
    arcs: dict[str, tuple[Arc, ...]]
    edge_nodes: dict[str, tuple[str, str]]

    def allows(self, edge: str, vclass: str) -> bool:
        for arc in self.arcs.get(self.edge_nodes[edge][0], ()):
            if arc.edge == edge:
                return vclass in arc.classes
        return False

    def nearest_node(self, lon: float, lat: float) -> str:
        """Snap a coordinate to the closest node that has outgoing arcs.

        A linear scan over 11,693 nodes, about 1.4 ms. That is a third of a
        route, so index it if snapping ever happens more than twice per
        request, or if the graph grows past this corridor.
        """
        scale = math.cos(math.radians(lat)) ** 2
        best, best_d = None, float("inf")
        for node, (nlon, nlat) in self.nodes.items():
            if node not in self.arcs:
                continue
            d = (nlon - lon) ** 2 * scale + (nlat - lat) ** 2
            if d < best_d:
                best, best_d = node, d
        if best is None:
            raise ValueError("graph has no routable nodes")
        return best


def load(path: Path = GRAPH_FILE) -> Graph:
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        raw = json.load(fh)

    arcs: dict[str, list[Arc]] = {}
    edge_nodes: dict[str, tuple[str, str]] = {}
    for e in raw["edges"]:
        # Free-flow traversal time is the Phase 1 weight. From Phase 4 a
        # measured speed replaces it for edges with recent probe data.
        arcs.setdefault(e["f"], []).append(
            Arc(e["t"], e["i"], e["l"], e["l"] / e["s"], e["c"])
        )
        edge_nodes[e["i"]] = (e["f"], e["t"])

    return Graph(
        nodes={k: (v[0], v[1]) for k, v in raw["nodes"].items()},
        arcs={k: tuple(v) for k, v in arcs.items()},
        edge_nodes=edge_nodes,
    )
