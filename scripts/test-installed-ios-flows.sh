#!/bin/sh

set -eu

app_id='dev.sidequests.pilly'
simulator_permissions="${MAESTRO_APPLE_SIM_UTILS:-${HOME}/.maestro/deps/applesimutils}"

for flow in .maestro/flows/*.yaml; do
  if [ -x "$simulator_permissions" ]; then
    case "$(basename "$flow")" in
      03-*|04-*|06-*|09-*) notifications='YES' ;;
      07-*) notifications='NO' ;;
      *) notifications='unset' ;;
    esac
    "$simulator_permissions" \
      --booted \
      --bundle "$app_id" \
      --setPermissions "notifications=$notifications"
  fi
  maestro test "$flow"
done
