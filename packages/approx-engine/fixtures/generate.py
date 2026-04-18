# Regenerate from the backend repo:
#   cd ../almagest-backend && SWISSEPH_PATH=./data python3 scripts/generate_swiss_golden.py
# then copy scripts/swiss-ephemeris-golden.json back to this directory.
"""Generate a Swiss Ephemeris golden-file fixture.

Run from the almagest-backend repo root:
    SWISSEPH_PATH=./data python3 scripts/generate_swiss_golden.py

Produces scripts/swiss-ephemeris-golden.json with apparent geocentric
ecliptic longitudes/latitudes for Sun, Moon, the eight planets+Pluto,
Chiron, and the Mean North/South lunar nodes across 20 UTC epochs spanning
~1950-2050. Flags used: FLG_SWIEPH | FLG_SPEED (same as
app.engines.swisseph.CALC_FLAGS) so results include annual aberration
and light-deflection. MEAN_SOUTH_NODE is derived as MEAN_NORTH_NODE + 180°
(matching the backend's calculate_south_node helper).
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure imports resolve when run from the repo root
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

os.environ.setdefault("SWISSEPH_PATH", str(REPO_ROOT / "data"))

from app.engines import swisseph as swe  # noqa: E402
from app.engines.positions import calculate_south_node  # noqa: E402
from app.models.common import CelestialBody  # noqa: E402


# Bodies covered by the frontend approx-engine.
# The 10 classical bodies are computed via astronomy-engine; Chiron is
# computed via approx-engine/src/chiron.ts using a Keplerian approximation
# (JPL SBDB osculating elements at J2000 + linear secular rates); the two
# mean lunar nodes (MEAN_NORTH_NODE / MEAN_SOUTH_NODE) are computed via
# approx-engine/src/nodes.ts using a simple mean-node polynomial.
# Lilith is intentionally excluded — approx-engine has no implementation for
# it. True nodes are also excluded (only mean nodes are implemented on the
# frontend).
BODIES: list[CelestialBody] = [
    CelestialBody.SUN,
    CelestialBody.MOON,
    CelestialBody.MERCURY,
    CelestialBody.VENUS,
    CelestialBody.MARS,
    CelestialBody.JUPITER,
    CelestialBody.SATURN,
    CelestialBody.URANUS,
    CelestialBody.NEPTUNE,
    CelestialBody.PLUTO,
    CelestialBody.CHIRON,
    CelestialBody.MEAN_NORTH_NODE,
    CelestialBody.MEAN_SOUTH_NODE,
]


def build_dates() -> list[datetime]:
    """20 epochs at 12:00 UTC on Jan 1st, every ~5 years from 1955 to 2050.

    Starts at 1955 rather than 1950 so the list ends at 2050 with a clean
    5-year stride (20 × 5 = 95 years, 1955-2050 inclusive). This guarantees
    2000-01-01T12:00:00Z lands in the set for the Sun sanity check.
    """
    years = list(range(1955, 2051, 5))  # 1955, 1960, ..., 2050 -> 20 entries
    assert len(years) == 20, f"expected 20 years, got {len(years)}"
    return [datetime(y, 1, 1, 12, 0, 0, tzinfo=timezone.utc) for y in years]


def main() -> None:
    swe.init()
    dates = build_dates()

    rows: list[dict[str, float | str]] = []
    for dt in dates:
        jd = swe.datetime_to_jd(dt)
        iso = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        for body in BODIES:
            # MEAN_SOUTH_NODE is derived from MEAN_NORTH_NODE in the
            # backend (swe.calc_planet has no direct mapping for it —
            # see app.engines.positions.calculate_south_node). Mirror
            # that exact derivation here so the fixture stays consistent
            # with the backend's production behavior.
            if body is CelestialBody.MEAN_SOUTH_NODE:
                north = swe.calc_planet(jd, CelestialBody.MEAN_NORTH_NODE)
                pos = calculate_south_node(north)
            else:
                pos = swe.calc_planet(jd, body)
            rows.append(
                {
                    "date": iso,
                    # body.value matches the frontend CelestialBody string values
                    # (both use lowercase strings like "sun", "moon", etc).
                    "body": body.value,
                    "longitude": pos.longitude,
                    "latitude": pos.latitude,
                }
            )

    out_path = Path(__file__).resolve().parent / "swiss-ephemeris-golden.json"
    out_path.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(rows)} rows to {out_path}")
    # Sanity: first Sun entry at 2000-01-01T12:00:00Z should be ~280.33°
    for row in rows:
        if row["date"] == "2000-01-01T12:00:00Z" and row["body"] == "sun":
            print(f"Sun @ 2000-01-01T12:00:00Z = {row['longitude']:.4f}° (expect ~280.33°)")
            break


if __name__ == "__main__":
    main()
