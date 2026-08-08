# Pilly

Pilly is a local-first medication tracker for iPhone. It answers a small set of everyday questions: what is due today, whether it was recorded, what is coming this week, and roughly when the current supply may run out.

The core tracker works without an account or network connection. Medication details, schedules, dose records, and settings are stored in SQLite on the device.

## Current slice

- Local onboarding with no sign-in
- Guided medicine setup with Zod validation and a recoverable draft
- Daily and selected-weekday schedules
- Medicine detail, future-effective schedule edits, and reversible archive/restore
- Today view with Taken, Skipped, and correction actions
- Immediate undo and a local dose-change history
- Seven-day view driven by the same schedule state
- Reconciled local reminders with private notification copy
- Audited manual supply corrections with an explicitly approximate estimate
- Local privacy and data controls
- RevenueCat-ready Pilly Plus screen with a one-time $4.99 position

Pilly Plus is reserved for themes, alternate icons, printable plans, and CSV export. Today, week, dose history, reminders, and supply estimates remain free.

The current product decisions, code boundaries, data map, screen inventory, and release roadmap are maintained in [`docs/product-knowledge.md`](docs/product-knowledge.md).

## Stack

- Expo SDK 57 and Expo Router
- React Native 0.86 and TypeScript 6
- SQLite with Drizzle ORM
- TanStack Query and TanStack Form
- Zod at input and persistence boundaries
- React Native SVG and Reanimated
- RevenueCat for optional purchases
- Bun for dependencies and scripts

## Run locally

Install dependencies:

```sh
bun install
```

Start a development build:

```sh
bun run dev
```

Run the repository checks:

```sh
bun run verify
```

Pilly uses native modules, including SQLite, notifications, and RevenueCat. Use an Expo development build rather than Expo Go for full behavior.

The SQLite schema is migrated on device. Schedule edits begin the following day and retain the older schedule rows so past dose identities and records are not rewritten.

## RevenueCat setup

Set the public iOS SDK key in a local environment file. Do not commit a secret key.

```sh
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_public_sdk_key
```

Create a one-time iOS product in App Store Connect, attach it to the current RevenueCat offering, and map the purchase to a `plus` entitlement. Until that store setup exists, the Plus screen stays usable as a preview and reports that purchasing is unavailable.

## Product boundaries

Pilly records information exactly as entered. It does not recommend doses, diagnose conditions, identify pills, check interactions, or tell someone what to do after a missed dose. Supply dates are estimates.
