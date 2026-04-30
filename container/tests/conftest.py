"""
Shared test configuration for container tests.
Ensures container/ is on sys.path so imports work.
"""

import sys
from pathlib import Path

# Add container/ to sys.path so `import main` and `import telemetry_helper` work
container_dir = str(Path(__file__).resolve().parent.parent)
if container_dir not in sys.path:
    sys.path.insert(0, container_dir)
