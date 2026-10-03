"""Genera un conjunto sintético de viajes para entrenar modelos de regresión.

Este módulo toma la red base de transporte, calcula rutas planificadas y
crea un dataset reproducible con variables como hora, lluvia, ocupación,
incidencias y duración observada simulada.
"""

from __future__ import annotations

import csv
import json
import random
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from app import Connection, RoutePlanner  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent / "data"
OUTPUT_PATH = DATA_DIR / "trips.csv"
NETWORK_PATH = ROOT_DIR / "network.json"
SAMPLE_SIZE = 1200
SEED = 2026
FIELDNAMES = [
    "origin",
    "destination",
    "planned_minutes",
    "departure_hour",
    "weekday",
    "is_weekend",
    "rain_mm",
    "occupancy_level",
    "incident",
    "transfers",
    "actual_minutes",
]


def build_route_options() -> list[dict[str, object]]:
    """Calcula todos los pares de estaciones conectados y sus rutas planificadas.

    Returns:
        Una lista con el origen, destino, tiempo planificado y número de transbordos
        de cada conexión válida dentro de la red.
    """
    network = json.loads(NETWORK_PATH.read_text(encoding="utf-8"))
    stations = [station["name"] for station in network["stations"]]
    connections = [Connection(**item) for item in network["connections"]]
    planner = RoutePlanner()
    routes: list[dict[str, object]] = []

    # Se evalúa cada combinación posible de estaciones para generar rutas válidas.
    for origin in stations:
        for destination in stations:
            if origin == destination:
                continue
            try:
                segments, planned_minutes = planner.find_route(
                    connections, origin, destination
                )
            except ValueError:
                # Si no hay camino disponible, se descarta la combinación.
                continue
            routes.append(
                {
                    "origin": origin,
                    "destination": destination,
                    "planned_minutes": planned_minutes,
                    "transfers": max(0, len({segment.line for segment in segments}) - 1),
                }
            )
    return routes


def synthetic_trip_duration(
    planned_minutes: int,
    departure_hour: int,
    rain_mm: int,
    occupancy_level: int,
    incident: int,
    transfers: int,
    rng: random.Random,
) -> int:
    """Simula una duración observada de viaje con condiciones operativas plausibles.

    Esta función no usa datos reales; solo genera valores sintéticos con un
    comportamiento similar al de un sistema de transporte con congestión y retrasos.
    """
    rush_hour = departure_hour in {7, 8, 9, 16, 17, 18}
    congestion = rng.uniform(0.08, 0.28) if rush_hour else rng.uniform(0, 0.12)
    delay = (
        planned_minutes * congestion
        + rain_mm * 0.35
        + max(0, occupancy_level - 2) * 1.1
        + incident * rng.uniform(5, 18)
        + transfers * 1.5
        + rng.gauss(0, 2.5)
    )
    return max(planned_minutes, round(planned_minutes + delay))


def generate_dataset(sample_size: int = SAMPLE_SIZE, seed: int = SEED) -> Path:
    """Escribe el CSV del conjunto sintético con una semilla fija.

    Args:
        sample_size: número de filas del dataset.
        seed: semilla usada para la reproducibilidad.

    Returns:
        Ruta del archivo CSV generado.
    """
    route_options = build_route_options()
    if not route_options:
        raise ValueError("La red no contiene pares de estaciones conectados.")

    rng = random.Random(seed)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDNAMES)
        writer.writeheader()
        for _ in range(sample_size):
            route = rng.choice(route_options)
            hour = rng.randrange(24)
            weekday = rng.randrange(7)
            rain_mm = rng.choices(range(0, 21), weights=[8] * 6 + [4] * 15)[0]
            occupancy = rng.choices(range(1, 6), weights=[2, 4, 5, 4, 2])[0]
            incident = int(rng.random() < 0.06)
            planned_minutes = int(route["planned_minutes"])
            transfers = int(route["transfers"])
            writer.writerow(
                {
                    "origin": route["origin"],
                    "destination": route["destination"],
                    "planned_minutes": planned_minutes,
                    "departure_hour": hour,
                    "weekday": weekday,
                    "is_weekend": int(weekday >= 5),
                    "rain_mm": rain_mm,
                    "occupancy_level": occupancy,
                    "incident": incident,
                    "transfers": transfers,
                    "actual_minutes": synthetic_trip_duration(
                        planned_minutes,
                        hour,
                        rain_mm,
                        occupancy,
                        incident,
                        transfers,
                        rng,
                    ),
                }
            )
    return OUTPUT_PATH


if __name__ == "__main__":
    # Genera el dataset cuando se ejecuta este archivo directamente.
    path = generate_dataset()
    print(f"Dataset generado: {path}")
    print(f"Registros: {SAMPLE_SIZE}; semilla: {SEED}")