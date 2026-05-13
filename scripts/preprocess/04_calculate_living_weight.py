"""Compatibility entrypoint for LivingWeight calculation.

The active pipeline runs LivingWeight after score calculation, so the maintained
implementation lives in 05_calculate_living_weight.py. This wrapper exists only
for users who call the requested script name directly.
"""

from __future__ import annotations

from pathlib import Path
import runpy


if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("05_calculate_living_weight.py")), run_name="__main__")
