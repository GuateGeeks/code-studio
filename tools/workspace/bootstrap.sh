#!/usr/bin/env bash
# Prepara el workspace desde fuentes públicas fijadas en release/source-lock.json:
# Node exacto, Xcratch y pxt-microbit en su revisión (con el parche previo),
# PXT Core fuente, dependencias y precompilados. Al final verifica cada hash.
#
#   bash tools/workspace/bootstrap.sh [--browsers]
#
# El workspace es la carpeta padre de este repositorio. No modifica repositorios
# hermanos que ya existan en otra revisión: se detiene y lo explica.
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
workspace_root="$(dirname -- "$project_root")"
for tool in git curl tar sha256sum; do
  command -v "$tool" >/dev/null || { echo "Falta instalar $tool." >&2; exit 1; }
done
[[ "$(uname -s)-$(uname -m)" == Linux-x86_64 ]] || { echo 'La preparación requiere Linux x86_64.' >&2; exit 1; }

node_version="$(sed -n 's/.*"node": *"\(v[0-9.]*\)".*/\1/p' "$project_root/release/source-lock.json" | head -n 1)"
mkdir -p "$workspace_root/scripts"
if [[ ! -f "$workspace_root/scripts/env.sh" ]]; then
  cp "$project_root/tools/workspace/env.sh" "$workspace_root/scripts/env.sh"
fi
grep -q "NODE_VERSION=\"$node_version\"" "$workspace_root/scripts/env.sh" || {
  echo "scripts/env.sh no usa Node $node_version; revísalo antes de continuar." >&2; exit 1; }
source "$workspace_root/scripts/env.sh"
if [[ ! -x "$NODE_HOME/bin/node" ]]; then
  archive="node-$node_version-linux-x64.tar.xz"
  mkdir -p "$workspace_root/.tools/downloads"
  (
    cd "$workspace_root/.tools/downloads"
    curl --fail --location --retry 3 --silent --show-error --output "$archive" "https://nodejs.org/dist/$node_version/$archive"
    curl --fail --location --retry 3 --silent --show-error --output SHASUMS256.txt "https://nodejs.org/dist/$node_version/SHASUMS256.txt"
    grep " $archive$" SHASUMS256.txt | sha256sum --check --quiet -
    tar -xJf "$archive" -C ..
  )
fi
echo "Node $(node --version), npm $(npm --version)"
exec node "$project_root/tools/workspace/bootstrap.mjs" "$@"
