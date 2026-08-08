# Pilly product knowledge

Last updated: 2026-08-08

This is the versioned product and architecture reference for the current Expo app. `AGENTS.md` remains the binding instruction file. The earlier Swift prototype and its local planning files are archived context, not the implementation source of truth.

## Product boundary

Pilly is a local-first medicine tracker. The free core must work without an account or network connection: medicine setup, schedules, Today, Week, Taken and Skipped records, corrections, reminders, and supply estimates.

Pilly records what a person enters. It does not recommend doses, diagnose conditions, identify pills, check interactions, or tell someone what to do after a missed dose. Supply dates are estimates.

## Code boundaries

| Area            | Responsibility                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `app/`          | Expo Router pages. Each route owns its page composition and navigation.                                  |
| `src/<area>/`   | Small product-area modules such as `src/today/`, containing extracted UI, data hooks, and derived state. |
| `src/screens/`  | Legacy page wrappers. Remove these as each route is reviewed; do not add new screen wrappers.            |
| `src/hooks/`    | Hooks reused by multiple routes or product areas.                                                        |
| `src/core/`     | App runtime wiring such as SQLite and TanStack Query initialization.                                     |
| `src/design/`   | Shared controls, icons, illustrations, type, spacing, color, radius, and motion rules.                   |
| `src/domain/`   | Deterministic business rules and Zod schemas. No React Native or persistence imports.                    |
| `src/data/`     | SQLite schema, migrations, and repository operations.                                                    |
| `src/platform/` | Native capabilities such as local notifications, purchases, and profile-photo file access.               |
| `src/config/`   | Parsed environment configuration.                                                                        |

The route may coordinate a use case, but it should not know SQLite queries, file paths, native picker details, RevenueCat calls, or notification scheduling internals.

## Local data storage

Medication data is stored in an on-device SQLite database through Expo SQLite and Drizzle. The database uses WAL mode, foreign keys, and explicit versioned migrations.

| Table           | Stored data                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `medications`   | Name, instructions, optional supply count, timezone, created/updated time, and archive time.                                     |
| `schedules`     | Medication link, local time, selected weekdays, reminder choice, effective start/end dates, and ordering.                        |
| `dose_records`  | Current Taken or Skipped state for a stable scheduled occurrence, plus scheduled and recorded times. Absence means Not recorded. |
| `dose_events`   | Audit trail of dose corrections and undo operations.                                                                             |
| `supply_events` | Manual counts and supply changes caused by dose records or corrections.                                                          |
| `settings`      | Small local preferences such as onboarding, reminder notices, profile name/photo URI, and cached Plus entitlement.               |

The current database schema version is 3. Migrations live in `src/data/database/migrate-database.ts`. New schema changes must increment the version and preserve existing medication history.

### Profile photo

The selected image is copied into the app's private document directory. SQLite stores only its local URI. Replacing or removing the photo deletes the app-owned old file after the setting is safely updated. Pilly does not upload the image.

Profile name validation and setting keys live in `src/domain/profile`. Native picker and file operations live in `src/platform/profile-photo`. The Profile screen only coordinates those modules.

### Notifications and purchases

Local reminders are scheduled with the operating system and reconciled from SQLite schedule data. Private notification copy remains the default.

RevenueCat stores purchase and entitlement records outside the medication database. Pilly caches the current Plus entitlement locally so an existing customer can keep access while temporarily offline. Medication data is never sent to RevenueCat.

### Backup status

There is no cloud sync, account, or finished export/import flow yet. App deletion can therefore remove local data. A user-controlled export is part of the roadmap and must not require a subscription for basic data access.

## Screen inventory

1. Welcome
2. Start Small
3. Today
4. Week
5. Medicines
6. Add medicine
7. Medicine detail
8. Edit medicine
9. Dose history
10. Profile
11. Pilly Plus

`/settings` is a compatibility route to Profile, not a separate screen.

Recommended visual review order: Today, Medicine detail, Add medicine, Edit medicine, Medicines, Week, Profile, Pilly Plus, Welcome, Start Small, then Dose history.

## Profile decision

The MVP has one optional local profile with a first name, optional last name, and optional on-device photo. The photo is free because basic identity and recognition are not premium safety features.

Multiple people or caregiver profiles are deferred. They require explicit ownership of medicines, dose history, notifications, export, and deletion before the UI presents them as a feature.

## Pilly Plus boundary

Free:

- Complete medication and schedule CRUD
- Today and Week views
- Taken, Skipped, correction, undo, and dose history
- Local reminders
- Supply count and run-out estimate
- Basic profile and photo
- A basic way to export personal data when export ships

Possible Plus value:

- Themes and alternate app icons
- Additional widgets
- Print layouts and advanced export formats
- Optional visual profile frames
- Future household organization after its privacy model is complete

The current price is a product hypothesis. Do not enable purchasing until a real premium feature is available and App Store/RevenueCat configuration has been tested on a device.

## Surface and motion rules

Liquid glass is an enhancement, not the base layout system. Use it for floating navigation, compact icon controls, short action groups, and optional promotional surfaces. Keep medication names, dose state, forms, errors, and supply estimates on opaque high-contrast surfaces.

Glass must fall back to a normal View when unsupported and respect Reduce Transparency. Motion should explain a state change: selected tab movement, a dose changing state, a saved confirmation, or a schedule selection. Avoid ambient motion that competes with medicine status.

## MVP status

Implemented:

- Local SQLite medication and schedule CRUD
- Today and seven-day schedule views
- Taken, Skipped, correction, undo, and history
- Local reminders with private copy
- Manual supply count and approximate run-out estimate
- Archive and restore
- RevenueCat adapter and offline entitlement cache

In progress:

- Cross-screen visual hierarchy and shared control cleanup
- Profile name, local photo, and medicine deletion
- Empty, error, and destructive-action states
- Native glass enhancement with accessible fallbacks

Before release:

- Finish an honest Pilly Plus feature and purchase/restore configuration
- Add user-controlled backup/export
- Test reminders and purchases on a physical device
- Test default and accessibility text sizes with VoiceOver
- Confirm privacy copy, license, store assets, demo video, and current Shipaton rules

## Decision log

- 2026-08-08: The active app is Expo SDK 57 with TypeScript. The older Swift direction is archived.
- 2026-08-08: The MVP remains local-first with no required account or cloud medication storage.
- 2026-08-08: A basic local profile photo is free. Multiple profiles are deferred.
- 2026-08-08: Liquid glass is progressive enhancement and never carries safety-critical readability alone.
- 2026-08-08: Route files are the actual pages. Remove duplicate `src/screens/` wrappers one page at a time and keep extracted code in flat product-area modules such as `src/today/`.
- 2026-08-08: Replace custom provider nesting with one `AppRuntime`; derive the stateless repository through `useRepository()` from Expo SQLite context.
