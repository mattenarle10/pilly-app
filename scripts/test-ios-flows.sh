#!/bin/sh

set -eu

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro is required. Install it from https://docs.maestro.dev/getting-started/installing-maestro"
  exit 1
fi

bun run verify
EXPO_PUBLIC_E2E_CLOCK_HOUR=23 bunx expo run:ios --configuration Release --no-bundler
maestro test .maestro/flows
