#!/bin/sh

set -eu

app_id='dev.sidequests.pilly'
simulator_permissions="${MAESTRO_APPLE_SIM_UTILS:-${HOME}/.maestro/deps/applesimutils}"

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro is required. Install it from https://docs.maestro.dev/getting-started/installing-maestro"
  exit 1
fi

if [ ! -x "$simulator_permissions" ]; then
  echo "applesimutils was not found at $simulator_permissions"
  echo "Install Maestro's iOS simulator dependencies or set MAESTRO_APPLE_SIM_UTILS."
  exit 1
fi

for flow in .maestro/flows/*.yaml; do
  case "$(basename "$flow")" in
    03-*|04-*|06-*|09-*) notifications='YES' ;;
    07-*) notifications='NO' ;;
    *) notifications='unset' ;;
  esac
  "$simulator_permissions" \
    --booted \
    --bundle "$app_id" \
    --setPermissions "notifications=$notifications"
  maestro test "$flow"
done
