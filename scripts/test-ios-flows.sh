#!/bin/sh

set -eu

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro is required. Install it from https://docs.maestro.dev/getting-started/installing-maestro"
  exit 1
fi

bun run verify
bunx expo run:ios --configuration Release
maestro test .maestro/flows
