#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "$(dirname -- "$project_root")/scripts/env.sh"
export CODEGRAPH_TELEMETRY=0 CODEGRAPH_NO_DOWNLOAD=1 DO_NOT_TRACK=1
cd "$project_root"
exec "$project_root/node_modules/.bin/codegraph" "$@"
