#!/bin/bash
set -euo pipefail
OUT="$(cd "$(dirname "$0")/../.." && pwd)/apps/web/public/toolchain"
mkdir -p "$OUT"
cp "$1"/{cc1plus,as,ld,objcopy}.{mjs,wasm} "$1"/bundle.json "$OUT/"
echo "Installed to $OUT"
