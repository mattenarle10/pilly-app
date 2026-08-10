# Pilly product knowledge

Last updated: 2026-08-10

This is the versioned product and architecture reference for the current Expo app. `AGENTS.md` remains the binding instruction file. The earlier Swift prototype and its local planning files are archived context, not the implementation source of truth.

## Product boundary

Pilly is a local-first medicine tracker. The free core must work without an account or network connection: medicine setup, schedules, Today, Week, Taken and Skipped records, corrections, reminders, and supply estimates.

Pilly records what a person enters. It does not recommend doses, diagnose conditions, identify pills, check interactions, or tell someone what to do after a missed dose. Supply dates are estimates.

## Code boundaries

| Area            | Responsibility                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `app/`          | Expo Router pages. Each route owns its screen UI, page composition, and navigation.               |
| `src/<area>/`   | Larger reusable product modules only when one route has several substantial units, such as Today. |
| `src/screens/`  | Legacy page wrappers. Remove these as each route is reviewed; do not add new screen wrappers.     |
| `src/hooks/`    | Shared hooks and small route-facing data orchestration hooks. No screen UI.                       |
| `src/core/`     | App runtime wiring such as SQLite and TanStack Query initialization.                              |
| `src/design/`   | Shared controls, icons, illustrations, type, spacing, color, radius, and motion rules.            |
| `src/domain/`   | Deterministic business rules and Zod schemas. No React Native or persistence imports.             |
| `src/data/`     | SQLite schema, migrations, and repository operations.                                             |
| `src/platform/` | Native capabilities such as local notifications, purchases, and profile-photo file access.        |
| `src/config/`   | Parsed environment configuration.                                                                 |

The route may coordinate a use case, but it should not know SQLite queries, file paths, native picker details, RevenueCat calls, or notification scheduling internals.

## Local data storage

Medication data is stored in an on-device SQLite database through Expo SQLite and Drizzle. The database uses WAL mode, foreign keys, and explicit versioned migrations.

| Table           | Stored data                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `medications`   | Name, instructions, optional supply count, saved appearance, timezone, created/updated time, and archive time.                   |
| `schedules`     | Medication link, local time, selected weekdays, reminder choice, effective start/end dates, and ordering.                        |
| `dose_records`  | Current Taken or Skipped state for a stable scheduled occurrence, plus scheduled and recorded times. Absence means Not recorded. |
| `dose_events`   | Audit trail of dose corrections and undo operations.                                                                             |
| `supply_events` | Manual counts and supply changes caused by dose records or corrections.                                                          |
| `settings`      | Small local preferences such as onboarding, reminder notices, profile name/photo URI, and cached Plus entitlement.               |

The current database schema version is 5. Migrations live in `src/data/database/migrate-database.ts`. New schema changes must increment the version and preserve existing medication history. Version 4 adds shape, size, and a primary tone. Version 5 adds a secondary capsule tone with a safe matching-color default for existing medicines.

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

Recommended visual review order: Today, Medicine detail, Edit medicine, Add medicine, Medicines, Week, Profile, Pilly Plus, Welcome, Start Small, then Dose history.

### Design review checklist

| Screen                  | Status                 | Next review                                                             |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Today                   | 90%, checkpoint review | Large text, VoiceOver order, empty/error states, and final device pass  |
| Medicine detail         | Complete               | Release QA only: physical device and accessibility extremes             |
| Add medicine            | In progress            | Complete end-to-end default and accessibility-size review               |
| Edit medicine           | Complete               | Release QA only: keyboard, VoiceOver, large text, and physical device   |
| Medicines               | In progress            | Empty, error, archived, varied-appearance, large-text, and VoiceOver QA |
| Week                    | Pending                | Day selection, status consistency, and dense schedules                  |
| Profile                 | Pending                | Identity card, local photo, privacy, and manage links                   |
| Pilly Plus              | Pending                | Honest value, purchase, restore, and offline entitlement                |
| Welcome and Start Small | Pending                | First-run composition and local-first explanation                       |
| Dose history            | Pending                | Correction clarity and audit readability                                |

Medicine appearance is local, optional recognition data. Shape, size, and curated soft tones are stored on the medicine and drive the code-native silhouette on Medicine Detail, the Add/Edit preview, the Medicines list, and a quieter cue beside each Today dose. Capsules support independently selected colors for each half; round and oval pills use one color. Add/Edit keeps only a compact preview row in the form and opens a dedicated editor sheet for the controls. The name remains the primary identifier. A future pattern or user photo should ship only if it improves recognition, remains legible without motion, and has an explicit privacy and storage model.

Medicine Detail design and architecture checkpoint completed on 2026-08-10:

- [x] Screen composition lives in `app/medicine/[id]/index.tsx`.
- [x] Route-facing repository and mutation coordination lives in `src/hooks/use-medicine-detail.ts`.
- [x] The legacy `src/screens/medicine-detail/` wrapper is removed.
- [x] The temporary `src/medicine-detail/` area is removed.
- [x] Supply editing, archive, restore, delete, loading, missing, and retry paths are represented.
- [x] TypeScript, ESLint, formatting, and focused Jest checks pass.
- [x] First default-size review: compact supply actions, reminder toggles, Manage rows, and confirmation copy.
- [x] Review the default-size composition on the simulator.
- [x] Review a long medicine name and long instruction at the app's large text setting.
- [x] Review tracked and not-tracked supply states, debounced auto-save, persistence, and retry handling.
- [x] Review archive and delete confirmation copy, pending wiring, error surfaces, and destructive separation.
- [x] Review VoiceOver labels/order and dynamic type at default and the largest standard size. Accessibility extremes remain part of release QA.
- [x] Replace transient supply-saving copy with quiet autosave and visible failure recovery only.
- [x] Add a persisted, data-driven medicine appearance with safe migration defaults.
- [x] Move appearance controls into a dedicated sheet and support split capsule colors.

Add Medicine architecture checkpoint completed on 2026-08-10:

- [x] Own the page composition in `app/medicine/new.tsx`.
- [x] Remove the legacy `src/screens/new-medication/` wrapper.
- [x] Keep reusable Add/Edit fields in `src/medicine-form/`.
- [x] Preserve draft restoration, validation, medicine creation, reminder reconciliation, and leave-draft behavior during the move.
- [x] Keep Back and Add in a quiet navigation lane so a large sticky action never covers the form.
- [ ] Complete the separate design and behavior review on the simulator; the architecture checkpoint does not mark the screen design complete.

Multiple daily schedule checkpoint completed on 2026-08-10:

- [x] Reuse the existing schedule-row model and repository transaction; no database migration is required.
- [x] Let Add and Edit store up to eight exact local times under one shared weekday pattern.
- [x] Keep reminders attached to their exact time instead of presenting one ambiguous medicine-level switch.
- [x] Use contextual labels such as Morning and Evening only as derived orientation; the editable exact time remains the source of truth.
- [x] Keep all times in one purposeful schedule surface with separators, quiet removal, and one Add another time continuation.
- [x] Restore all active schedule rows in Edit and migrate legacy one-time Add drafts without losing their reminder choice.
- [x] Sort saved times chronologically and reject invalid or duplicate exact times.
- [x] Add focused validation, draft-migration, form-interaction, and edit-orchestration tests.
- [x] Review one-time and three-time density at the default iOS content size in the simulator.
- [ ] Complete release QA for VoiceOver order, accessibility text extremes, and physical-device notification delivery.

Medicines recognition checkpoint started on 2026-08-10:

- [x] Own the page composition in `app/(tabs)/medicines.tsx`; remove the legacy Medicines screen wrapper.
- [x] Replace generic decorative medicine tiles with each medicine's saved code-native silhouette.
- [x] Use one list surface with separators instead of a separate card for every medicine.
- [x] Keep long names to two list lines while preserving the full name on Medicine Detail.
- [x] Reuse a smaller version of the same silhouette beside the medicine name on Today.
- [x] Remove the duplicate Pilly Plus promotion from Medicines; Profile remains the Plus entry point.
- [x] Review populated Medicines and Today states with long-name data on the simulator.
- [ ] Review empty, error, archived, varied-appearance, large-text, and VoiceOver states before completing the Medicines checkpoint.

Today action-timing checkpoint completed on 2026-08-10:

- [x] Keep future unrecorded doses visible as schedule information without presenting Taken or Skip early.
- [x] Reveal Taken and Skip at the exact local scheduled time and refresh the resting screen at minute boundaries.
- [x] Keep already recorded future states correctable for resilient existing data.
- [x] Present recorded-dose correction as a quiet, explicit Change action instead of a repeated decorative edit bubble.
- [x] Distinguish doses ready to record from doses later today in the progress summary.
- [x] Add focused boundary and rendering tests for upcoming and available states.
- [ ] Confirm background-to-foreground minute refresh and time-zone changes during physical-device release QA.

Edit Medicine implementation checkpoint completed on 2026-08-10:

- [x] Keep appearance as one compact preview row in the form.
- [x] Put shape, size, and curated color choices in a dedicated sheet.
- [x] Persist independent capsule-half colors while keeping round and oval pills single-color.
- [x] Own the page composition in `app/medicine/[id]/edit.tsx`; remove the legacy Edit screen wrapper.
- [x] Share reusable Add/Edit fields from `src/medicine-form/` without putting route UI back in `src/screens/`.
- [x] Put a compact Done action in the navigation hierarchy instead of covering the form with a sticky footer.
- [x] Keep Back and Done transparent in a fixed 44-point navigation lane; do not add per-control glass when it reads as pasted-on bubbles.
- [x] Disable Done while the form is pristine, invalid, or saving; surface validation and save failures near the form.
- [x] Compare semantic draft values so reverting an edit disables Done and removes the discard warning.
- [x] Confirm before discarding dirty changes through back, swipe, or other navigation actions.
- [x] Save medicine details, supply, appearance, and schedule in one repository transaction.
- [x] Preserve current schedule rows when the schedule did not actually change; version changed schedules from tomorrow.
- [x] Treat reminder reconciliation as best-effort after the local medicine save succeeds.
- [x] Add focused tests for edit orchestration, validation, appearance, and schedule-change detection.
- [x] Review default and long-content composition, scrolled navigation spacing, dirty navigation, and save persistence on the simulator.

Release QA remains intentionally separate from this completed implementation checkpoint: software-keyboard overlap at accessibility text sizes, VoiceOver order, and physical-device reminder behavior.

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
- 2026-08-09: Route files are the actual screens. Keep route-only UI in `app/`, route-facing data hooks in `src/hooks/`, and remove duplicate `src/screens/` wrappers one page at a time. Create a product-area module only when several substantial reusable units justify it, as Today currently does.
- 2026-08-10: Add Medicine page composition now lives in `app/medicine/new.tsx`; reusable Add/Edit fields remain in `src/medicine-form/`. Do not reintroduce a `src/screens/` page wrapper for this route.
- 2026-08-10: Detail screens use a calm, text-first hierarchy. Medicine Detail uses the medicine name as its single signature typographic moment, groups Schedule and Supply in one Overview surface, keeps setup presets in Add/Edit, and auto-saves reversible supply changes with visible failure recovery.
- 2026-08-10: Visual richness comes from hierarchy, composition, typography, material, and interaction before color. New color meanings require an explicit design-direction and decision-log update; polish passes do not invent route-specific tint mappings.
- 2026-08-10: Medicine appearance is recognition data, not decoration. A saved shape, size, and person-selected soft tone drive one code-native silhouette on Detail, a focused preview in Add/Edit, a compact Medicines-list cue, and a quieter Today cue. Existing medicines migrate to a medium rose capsule.
- 2026-08-10: Add/Edit show appearance as one compact preview row. A dedicated sheet owns shape, size, and curated color choices; capsules persist separate colors for their two halves.
- 2026-08-10: Edit Medicine uses transparent Back and Done actions in a fixed 44-point navigation lane because saving the full form is consequential. The lane never overlays fields, Done stays disabled until the draft is valid and semantically changed, and dirty navigation requires an explicit discard decision. Per-control Liquid Glass was rejected after simulator review because it read as two pasted-on bubbles.
- 2026-08-10: Add Medicine mirrors the quiet Back/action navigation lane and keeps its page title below it. Add validates on press and remains reachable without a full-width sticky footer covering form content at large text sizes.
- 2026-08-10: Add/Edit schedules use one shared weekday pattern with one or more exact local times. Each time owns its reminder state; Morning, Midday, Afternoon, Evening, and Night are derived context rather than saved meal semantics. One schedule surface and quiet separators scale the form without turning each time into another card.
- 2026-08-10: Today treats a future dose as schedule information, not an available action. An unrecorded dose shows a quiet Later today state until its exact local time; Taken and Skip appear at that time. Recorded states remain visible and correctable, and the summary separates ready doses from later doses.
- 2026-08-08: Replace custom provider nesting with one `AppRuntime`; derive the stateless repository through `useRepository()` from Expo SQLite context.
