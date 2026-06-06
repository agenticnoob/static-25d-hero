#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${TMPDIR:-/tmp}/static-25d-hero-blender-monolith.log"

launchctl asuser "$(id -u)" /bin/zsh -lc \
  "cd '$ROOT' && /usr/local/bin/blender -b --python scripts/generate-monolith.blender.py > '$LOG' 2>&1"

cat "$LOG"
