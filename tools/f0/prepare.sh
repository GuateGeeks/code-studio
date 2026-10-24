#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
workspace_root="$(dirname -- "$project_root")"
source "$workspace_root/scripts/env.sh"
export OPENSPEC_TELEMETRY=0 CODEGRAPH_TELEMETRY=0 DO_NOT_TRACK=1
cd "$project_root"
if [[ ! -f artifacts/baseline/inventory.json ]]; then
  node tools/f0/baseline.mjs
fi
cd "$workspace_root/xcratch-scratch-editor"
npm ci --ignore-scripts --no-audit --no-fund > "$project_root/artifacts/xcratch-install.log" 2>&1
tail -n 8 "$project_root/artifacts/xcratch-install.log"
npm exec --workspace=@scratch/scratch-svg-renderer -- webpack --mode development > "$project_root/artifacts/svg-build.log" 2>&1
npm exec --workspace=@scratch/scratch-render -- webpack --mode development > "$project_root/artifacts/render-build.log" 2>&1
printf 'Dependencias, SVG y renderer preparados.\n'
