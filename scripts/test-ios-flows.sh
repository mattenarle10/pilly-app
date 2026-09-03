#!/bin/sh

set -eu

bun run verify
EXPO_PUBLIC_E2E_CLOCK_HOUR=23 bunx expo run:ios --configuration Release --no-bundler
bun run test:flows:installed
