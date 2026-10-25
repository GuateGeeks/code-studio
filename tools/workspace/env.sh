#!/usr/bin/env bash
MAKECODE_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="v22.23.4"
NODE_HOME="$MAKECODE_ROOT/.tools/node-$NODE_VERSION-linux-x64"
export PATH="$NODE_HOME/bin:$MAKECODE_ROOT/node_modules/.bin:$PATH"
export npm_config_cache="$MAKECODE_ROOT/.tools/npm-cache"
