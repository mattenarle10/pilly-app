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
- Reconciled local reminders with private foreground/background presentation and same-time grouping
- Privacy-safe small and medium iOS Next dose Home Screen widgets
- Audited manual supply corrections with an explicitly approximate estimate
- Local privacy and data controls
- Free private JSON export plus RevenueCat-backed Plus PDF and CSV tools
- A focused iOS 3D appearance preview for round, oval, and capsule medicines, with an accessible native fallback

Pilly Plus is the next development phase and is not enabled in production. Its approved direction is an optional account, secure cross-device backup and recovery, private medicine photos, monthly and yearly subscriptions, and the existing PDF and CSV export tools. Today, Week, dose history, reminders, supply estimates, and a complete JSON data export remain free without an account.

The repository contains the production application and automated tests. Product planning and operational runbooks are maintained locally and intentionally excluded from the public repository.

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

Pilly uses native modules, including SQLite, notifications, widgets, and RevenueCat. Use an Expo development build rather than Expo Go for full behavior. After adding or changing a widget target, rebuild the iOS app with `bun run ios`; restarting Metro alone cannot install a native extension. After first installing or upgrading `expo-widgets`, restart Metro once with `bun run dev -- --clear` so the SDK 57 widget serializer is loaded before the app registers its layouts.

The SQLite schema is migrated on device. Schedule edits begin the following day and retain the older schedule rows so past dose identities and records are not rewritten.

## Pilly Plus development configuration

Copy `.env.example` to a local environment file. Values prefixed with `EXPO_PUBLIC_` are embedded in the application bundle and are never suitable for AWS credentials, RevenueCat secret API keys, webhook secrets, Apple private keys, or any other server credential. The RevenueCat Apple SDK key shown below is specifically a public client key.

```sh
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_public_sdk_key
EXPO_PUBLIC_PLUS_PURCHASES_ENABLED=false
EXPO_PUBLIC_PLUS_PREVIEW_MODE=store
```

The old lifetime-product experiment was rejected and must remain detached. The production Plus offering will use monthly and yearly App Store subscriptions mapped to RevenueCat's `plus` entitlement only after account identity, cloud recovery, server-side entitlement enforcement, private image lifecycle, and account deletion pass their release gates. Android purchasing is intentionally deferred.

Checkout stays disabled unless `EXPO_PUBLIC_PLUS_PURCHASES_ENABLED=true`. Do not enable it for a partial implementation. In a development build, `EXPO_PUBLIC_PLUS_PREVIEW_MODE=free` or `active` previews either entitlement state without contacting RevenueCat or granting real access. Production builds always use the store state.

## Repository safety

- Never commit local environment files, EAS credentials, signing keys, service-account files, Terraform state, variable files, or saved plans.
- Store mobile public configuration separately from server credentials. Anything under `EXPO_PUBLIC_` is public by design.
- Run `bun run verify` before pushing. GitHub Actions runs the same gate for pull requests and changes to `main`.
- Secret-scanning push protection is enabled on GitHub, but it supplements rather than replaces local credential hygiene.

## Product boundaries

Pilly records information exactly as entered. It does not recommend doses, diagnose conditions, identify pills, check interactions, or tell someone what to do after a missed dose. Supply dates are estimates.
