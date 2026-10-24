#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
workspace_root="$(dirname -- "$project_root")"
source "$workspace_root/scripts/env.sh"
export CODEGRAPH_TELEMETRY=0 DO_NOT_TRACK=1
mkdir -p "$project_root/artifacts/codegraph" "$workspace_root/.tools/pxt-core-source"
pxt_commit=af4bcc89fd2114b6ec232860ce0458cb9aa0dd28
if [[ ! -f "$workspace_root/.tools/pxt-core-source/package.json" ]]; then
  curl -fsSL "https://codeload.github.com/microsoft/pxt/tar.gz/$pxt_commit" -o "$workspace_root/.tools/pxt-core-source.tar.gz"
  tar -xzf "$workspace_root/.tools/pxt-core-source.tar.gz" -C "$workspace_root/.tools/pxt-core-source" --strip-components=1
fi
sha256sum "$workspace_root/.tools/pxt-core-source.tar.gz" > "$project_root/artifacts/codegraph/pxt-core-source.sha256"
index_repo() {
  local name="$1" path="$2" preset="$3"
  if [[ -f "$path/codegraph.json" ]]; then
    cmp "$project_root/config/codegraph/$preset.json" "$path/codegraph.json"
  else
    cp "$project_root/config/codegraph/$preset.json" "$path/codegraph.json"
  fi
  printf 'Indexando %s\n' "$name"
  "$project_root/node_modules/.bin/codegraph" init --yes "$path" > "$project_root/artifacts/codegraph/$name.index.log" 2>&1
  tail -n 7 "$project_root/artifacts/codegraph/$name.index.log"
  "$project_root/node_modules/.bin/codegraph" status "$path" > "$project_root/artifacts/codegraph/$name.status.txt" 2>&1
}
index_repo blockly "$workspace_root/raspberrypi-blockly" blockly
index_repo xcratch "$workspace_root/xcratch-scratch-editor" xcratch
index_repo microbit "$workspace_root/pxt-microbit" microbit
index_repo pxt-core "$workspace_root/.tools/pxt-core-source" pxt-core
"$project_root/node_modules/.bin/codegraph" init --yes "$project_root" > "$project_root/artifacts/codegraph/studio.index.log" 2>&1
