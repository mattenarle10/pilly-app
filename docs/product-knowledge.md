# Pilly product knowledge

Last updated: 2026-08-11

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

Legacy wrapper cleanup is route-by-route. Today, Week, Medicine Detail, Add Medicine, Edit Medicine, and Medicines are Router-owned. The remaining wrappers are still live dependencies of Profile/settings, Pilly Plus, Welcome, Start Small, and Dose History; remove each only when its route composition moves into `app/`.

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

Next active visual checkpoint after the Week pass: Profile. VoiceOver remains deferred to release QA.

### Design review checklist

| Screen                  | Status                 | Next review                                                            |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Today                   | 90%, checkpoint review | Large text, VoiceOver order, empty/error states, and final device pass |
| Medicine detail         | Complete               | Release QA only: physical device and accessibility extremes            |
| Add medicine            | Complete               | Release QA only: keyboard, VoiceOver, and physical device              |
| Edit medicine           | Complete               | Release QA only: keyboard, VoiceOver, large text, and physical device  |
| Medicines               | Complete               | Release QA only: VoiceOver and physical device                         |
| Week                    | Complete               | Release QA only: VoiceOver and physical device                         |
| Profile                 | Pending                | Identity card, local photo, privacy, and manage links                  |
| Pilly Plus              | Pending                | Honest value, purchase, restore, and offline entitlement               |
| Welcome and Start Small | Pending                | First-run composition and local-first explanation                      |
| Dose history            | Pending                | Correction clarity and audit readability                               |

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
- [x] Keep Back, Add medicine, and Add in the native compact navigation header so no sticky action covers the form.
- [x] Intercept native Back and swipe navigation with SDK 57's supported removal guard so the leave-draft decision applies consistently without desynchronizing native and JS navigation state.
- [x] Complete the separate default-size and largest-accessibility-size design review on the simulator.
- [x] Keep compact labels responsive so accessibility text never widens or clips the form.

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

Medicines recognition checkpoint completed on 2026-08-11:

- [x] Own the page composition in `app/(tabs)/medicines.tsx`; remove the legacy Medicines screen wrapper.
- [x] Keep the Router page thin by extracting the reusable query hook, header, state content, list, and row composition without creating another `src/screens/` wrapper.
- [x] Replace generic decorative medicine tiles with each medicine's saved code-native silhouette.
- [x] Use one list surface with separators instead of a separate card for every medicine.
- [x] Keep long names to two list lines while preserving the full name on Medicine Detail.
- [x] Reuse a smaller version of the same silhouette beside the medicine name on Today.
- [x] Remove the duplicate Pilly Plus promotion from Medicines; Profile remains the Plus entry point.
- [x] Review populated Medicines and Today states with long-name data on the simulator.
- [x] Reuse the code-native starter organizer as the empty-state illustration through the shared `EmptyState` component.
- [x] Keep one primary Add action in the true empty state while retaining the compact header action for populated lists.
- [x] Represent initial loading, failed loading with retry, and failed refresh with retained data as distinct states.
- [x] Separate archived medicines from the active list and keep archived identity available without competing with active medicine status.
- [x] Add focused query and state-rendering tests; review populated and empty layouts at the default device size.
- [x] Review round, oval, and split-color capsule cues plus the largest standard iOS text size on the simulator.
- [ ] Review VoiceOver order during release QA; intentionally excluded from the current Medicines pass.

Today action-timing checkpoint completed on 2026-08-10:

- [x] Keep future unrecorded doses visible as schedule information without presenting Taken or Skip early.
- [x] Reveal Taken and Skip at the exact local scheduled time and refresh the resting screen at minute boundaries.
- [x] Keep already recorded future states correctable for resilient existing data.
- [x] Present recorded-dose correction as a quiet, explicit Change action instead of a repeated decorative edit bubble.
- [x] Keep supply estimates out of Today; Medicine Detail owns supply context and editing.
- [x] Distinguish doses ready to record from doses later today in the progress summary.
- [x] Add focused boundary and rendering tests for upcoming and available states.
- [ ] Confirm background-to-foreground minute refresh and time-zone changes during physical-device release QA.

Edit Medicine implementation checkpoint completed on 2026-08-10:

- [x] Keep appearance as one compact preview row in the form.
- [x] Put shape, size, and curated color choices in a dedicated sheet.
- [x] Persist independent capsule-half colors while keeping round and oval pills single-color.
- [x] Own the page composition in `app/medicine/[id]/edit.tsx`; remove the legacy Edit screen wrapper.
- [x] Share reusable Add/Edit fields from `src/medicine-form/` without putting route UI back in `src/screens/`.
- [x] Put Back, Edit medicine, and Done in the native compact navigation header instead of covering the form with a sticky footer.
- [x] Show the editable medicine name once, in the Name field; Medicine Detail owns the entity-name hero title.
- [x] Share the native form shell, live-window width, margins, and bottom safe-area clearance with Add Medicine.
- [x] Disable Done while the form is pristine, invalid, or saving; surface validation and save failures near the form.
- [x] Compare semantic draft values so reverting an edit disables Done and removes the discard warning.
- [x] Confirm before discarding dirty changes through back, swipe, or other navigation actions using the same SDK 57 removal guard as Add Medicine.
- [x] Save medicine details, supply, appearance, and schedule in one repository transaction.
- [x] Preserve current schedule rows when the schedule did not actually change; version changed schedules from tomorrow.
- [x] Treat reminder reconciliation as best-effort after the local medicine save succeeds.
- [x] Add focused tests for edit orchestration, validation, appearance, and schedule-change detection.
- [x] Review default and long-content composition, scrolled navigation spacing, dirty navigation, and save persistence on the simulator.

Release QA remains intentionally separate from this completed implementation checkpoint: software-keyboard overlap at accessibility text sizes, VoiceOver order, and physical-device reminder behavior.

Medicine form navigation checkpoint completed on 2026-08-11:

- [x] Replace raw `beforeRemove` listeners with SDK 57's supported `usePreventRemove` guard on Add and Edit Medicine.
- [x] Disable the native back-button history menu while the shared medicine form header owns guarded navigation.
- [x] Replay the exact intercepted Back or swipe action after draft/discard confirmation instead of creating a second navigation action.
- [x] Clear the guard on a render boundary before navigating after a successful Add or Edit mutation.
- [x] Complete code review, TypeScript, ESLint, formatting, and the full Jest suite with no blocking findings.

Local route-cleanup checkpoint completed on 2026-08-11:

- [x] Remove empty legacy directories left by the Today, Medicines, Add Medicine, and settings/provider migrations.
- [x] Remove the empty `.github/workflows` shell; no workflow files existed.
- [x] Confirm there are no obsolete Medicines wrappers, backup files, rejected patches, zero-byte files, or `.DS_Store` files under `app/`, `src/`, or `docs/`.
- [x] Keep the remaining `src/screens/` files because current route files still import them.
- [x] Transfer Week composition into `app/(tabs)/week.tsx`, then remove `src/screens/week/`.
- [ ] Transfer Profile/settings, Pilly Plus, Welcome, Start Small, and Dose History one route at a time; remove each wrapper only after its imports are gone.

Week architecture and design checkpoint completed on 2026-08-11:

- [x] Own the page composition in `app/(tabs)/week.tsx` and remove the legacy Week screen wrapper.
- [x] Treat Week as a read-only seven-day outlook; Today remains the focused place for recording and corrections, while Dose History owns retrospective review.
- [x] Use a local date route parameter so Today and the Week calendar select the same day without relying on a fragile numeric index.
- [x] Centralize empty, upcoming, due, taken, and skipped day-state derivation so Today and Week use the same semantics.
- [x] Make the adaptive seven-day calendar the signature visual and keep color tied to selection or medicine state.
- [x] Group dense schedules by exact time inside one agenda surface with saved medicine silhouettes, quiet separators, and read-only statuses.
- [x] Distinguish a selected rest day from a completely empty outlook; keep the reusable Pilly companion in `src/design/illustrations/` and reserve it for the full empty state.
- [x] Add focused state and agenda tests; complete live default-size and largest-standard-text reviews without clipping or broken containers.
- [x] Keep active-only Today/Week medicine data on a distinct cache key from the Medicines screen's include-archived list while retaining prefix invalidation after mutations.
- [ ] Review VoiceOver order and physical-device behavior during release QA.

Native tab navigation checkpoint completed on 2026-08-11:

- [x] Use Expo Router's shared native tab bar for Today, Week, and Medicines instead of route-specific navigation treatments.
- [x] Minimize the tab bar while scrolling down and expand it when scrolling up on supported iOS versions.
- [x] Keep the shared safe-area wrapper non-collapsible so Expo Router can reliably discover each route's nested scroll view.
- [x] Preserve the platform fallback on systems that do not support native tab-bar minimization.
- [ ] Confirm scroll-direction behavior, Reduce Transparency, and VoiceOver on a physical device during release QA.

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
- 2026-08-10: Add and Edit Medicine share one native compact form header and one responsive scroll shell. The native header owns Back, the task title, safe-area spacing, and Add/Done; the form owns Name exactly once. Medicine Detail continues to use the saved medicine name as its hero title. This removes the duplicate identity and hand-built navigation tier while preserving explicit consequential actions.
- 2026-08-10: Add validates on press and intercepts native Back and swipe gestures before saving its local draft. Edit keeps Done disabled until the draft is valid and semantically changed, and dirty navigation requires an explicit discard decision. Both forms are bounded to the live window width with shared bottom safe-area breathing room.
- 2026-08-10: Add/Edit schedules use one shared weekday pattern with one or more exact local times. Each time owns its reminder state; Morning, Midday, Afternoon, Evening, and Night are derived context rather than saved meal semantics. One schedule surface and quiet separators scale the form without turning each time into another card.
- 2026-08-10: Today treats a future dose as schedule information, not an available action. An unrecorded dose shows a quiet Later today state until its exact local time; Taken and Skip appear at that time. Recorded states remain visible and correctable, and the summary separates ready doses from later doses.
- 2026-08-10: Today is limited to medicine identity, scheduled time, and recording state. Supply estimates belong on Medicine Detail and must not increase Today-row density.
- 2026-08-11: Guard Add/Edit removal with SDK 57's `usePreventRemove` state and disable the native back history menu. Confirmed exits replay the intercepted action; successful mutations clear prevention before post-save navigation. Raw `beforeRemove` interception is not valid for these native-stack screens because it can desynchronize native and JavaScript route state.
- 2026-08-11: Medicines remains a Router-owned page and uses reusable query/state/list units rather than a screen wrapper. Its true empty state reuses the existing code-native starter organizer as the signature visual, presents one Add action, and keeps loading, retry, active, and archived states semantically distinct without introducing new decorative colors.
- 2026-08-11: Empty directories left by completed Router migrations are removed locally. Remaining `src/screens/` files are not generic cleanup targets: they stay until Profile/settings, Pilly Plus, Welcome, Start Small, and Dose History each become Router-owned.
- 2026-08-11: Week is a rolling seven-day outlook rather than a second recording surface. Its functional calendar is the single signature visual, Today remains the action surface, and Dose History remains the retrospective surface. Dense selected-day schedules share one time-grouped agenda; the Pilly companion appears only when the complete outlook is empty.
- 2026-08-11: The shared native tab bar minimizes on scroll down and expands on scroll up on iOS 26. It does not fully hide. All tab routes use the same shared scroll surface, whose safe-area wrapper remains non-collapsible so Expo Router can reliably discover the nested scroll view.
- 2026-08-08: Replace custom provider nesting with one `AppRuntime`; derive the stateless repository through `useRepository()` from Expo SQLite context.
