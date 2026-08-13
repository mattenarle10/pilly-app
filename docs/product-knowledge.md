# Pilly product knowledge

Last updated: 2026-08-13

This is the versioned product and architecture reference for the current Expo app. `AGENTS.md` remains the binding instruction file. The earlier Swift prototype and its local planning files are archived context, not the implementation source of truth.

## Product boundary

Pilly is a local-first medicine tracker. The free core must work without an account or network connection: medicine setup, schedules, Today, Week, Taken and Skipped records, corrections, reminders, and supply estimates.

Pilly records what a person enters. It does not recommend doses, diagnose conditions, identify pills, check interactions, or tell someone what to do after a missed dose. Supply dates are estimates.

## Code boundaries

| Area             | Responsibility                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `app/`           | Expo Router pages. Each route owns its screen UI, page composition, and navigation.                  |
| `src/hooks/`     | One flat set of shared and route-facing orchestration hooks. No screen UI or nested feature folders. |
| `src/models/`    | App-facing types, deterministic product rules, and Zod validation. No persistence or UI imports.     |
| `src/providers/` | Root provider composition and app-wide synchronization mounted by the Router layout.                 |
| `src/services/`  | External/native integrations such as local notifications and RevenueCat purchases.                   |
| `src/storage/`   | SQLite schema, migrations, and repository implementation.                                            |
| `src/ui/`        | Shared components, icons, illustrations, typography, spacing, color, radius, and motion rules.       |
| `tests/`         | One flat top-level Jest suite that imports implementation through explicit `@/` source aliases.      |

The route may coordinate a use case, but it should not know SQLite queries, file paths, native picker details, RevenueCat calls, or notification scheduling internals.

Every page is Router-owned, including Welcome, Start Small, and Dose History. `src/screens/` and `src/features/` are removed and must not return. Reusable rendered controls live under `src/ui/`, deterministic product rules live under `src/models/`, and route-facing orchestration hooks remain flat in `src/hooks/`.

## Local data storage

Medication data is stored in an on-device SQLite database through Expo SQLite and Drizzle. The database uses WAL mode, foreign keys, and explicit versioned migrations.

| Table           | Stored data                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `medications`   | Name, instructions, optional supply count, saved appearance, timezone, created/updated time, and archive time.                   |
| `schedules`     | Medication link, local time, selected weekdays, reminder choice, effective start/end dates, and ordering.                        |
| `dose_records`  | Current Taken or Skipped state for a stable scheduled occurrence, plus scheduled and recorded times. Absence means Not recorded. |
| `dose_events`   | Audit trail of dose corrections and undo operations.                                                                             |
| `supply_events` | Manual counts and supply changes caused by dose records or corrections.                                                          |
| `settings`      | Small local preferences such as onboarding, reminder notices, profile name, and cached Plus entitlement.                         |

The current database schema version is 5. Migrations live in `src/storage/migrate-database.ts`. New schema changes must increment the version and preserve existing medication history. Version 4 adds shape, size, and a primary tone. Version 5 adds a secondary capsule tone with a safe matching-color default for existing medicines.

### Profile identity

The current profile is a local first and optional last name. There is no account or profile-photo feature in the current product. Name validation and setting keys live in `src/models/profile.ts`; the Router-owned Profile page coordinates the local setting queries through `useProfile()`.

### Notifications and purchases

Local reminders are scheduled with the operating system and reconciled from SQLite schedule data. Private notification copy remains the default.

RevenueCat stores purchase and entitlement records outside the medication database. Pilly caches the current Plus entitlement locally so an existing customer can keep access while temporarily offline. Medication data is never sent to RevenueCat.

### Backup status

There is no cloud sync, account, or import flow yet. App deletion can therefore remove local data. A complete readable JSON export is free; Plus adds presentation formats without restricting access to the underlying records.

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
12. Export data

`/settings` is a compatibility route to Profile, not a separate screen.

Recommended visual review order: Today, Medicine detail, Edit medicine, Add medicine, Medicines, Week, Profile, Export data, Pilly Plus, Welcome, Start Small, then Dose history.

Next active visual checkpoint: Dose History. VoiceOver remains deferred to release QA.

### Design review checklist

| Screen                  | Status                 | Next review                                                            |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Today                   | 90%, checkpoint review | Large text, VoiceOver order, empty/error states, and final device pass |
| Medicine detail         | Complete               | Release QA only: physical device and accessibility extremes            |
| Add medicine            | Complete               | Release QA only: keyboard, VoiceOver, and physical device              |
| Edit medicine           | Complete               | Release QA only: keyboard, VoiceOver, large text, and physical device  |
| Medicines               | Complete               | Release QA only: VoiceOver and physical device                         |
| Week                    | Complete               | Release QA only: VoiceOver and physical device                         |
| Profile                 | Complete               | Release QA only: VoiceOver, keyboard, and physical device              |
| Export data             | Complete               | Release QA only: real-file share destinations and accessibility        |
| Pilly Plus              | Feature complete       | Store products, device purchase/restore, and release copy              |
| Welcome and Start Small | Complete               | Release QA only: VoiceOver, Reduce Motion, and physical device         |
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
- [x] Keep reusable Add/Edit fields in `src/ui/components/` and deterministic form rules in `src/models/`.
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
- [x] Remove the duplicate Pilly Plus promotion from Medicines; Profile remains the in-app Plus entry point on iOS.
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
- [x] Lead the progress summary with the current action state (`ready now`, `later today`, or `all done`) and keep completion counts as quiet supporting context; dose rows remain the only recording controls.
- [x] Add focused boundary and rendering tests for upcoming and available states.
- [ ] Confirm background-to-foreground minute refresh and time-zone changes during physical-device release QA.

Edit Medicine implementation checkpoint completed on 2026-08-10:

- [x] Keep appearance as one compact preview row in the form.
- [x] Put shape, size, and curated color choices in a dedicated sheet.
- [x] Persist independent capsule-half colors while keeping round and oval pills single-color.
- [x] Own the page composition in `app/medicine/[id]/edit.tsx`; remove the legacy Edit screen wrapper.
- [x] Share reusable Add/Edit fields from `src/ui/components/` without creating another route UI layer.
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
- [x] Keep the remaining legacy wrappers only until their importing routes own the composition.
- [x] Transfer Week composition into `app/(tabs)/week.tsx`, then remove `src/screens/week/`.
- [x] Transfer Profile composition into `app/profile/index.tsx`, redirect `/settings`, and remove the Profile wrapper after its imports are gone.
- [x] Transfer Pilly Plus composition into `app/plus/index.tsx` and remove its wrapper after its imports are gone.
- [x] Transfer Welcome, Start Small, and Dose History into their Router files and remove `src/screens/` after all imports are gone.
- [x] Remove the residual `src/features/` catch-all: route composition stays in `app/`, reusable rendered controls and illustrations live in `src/ui/`, and reusable product rules live in `src/models/`.
- [x] Keep all app-owned React hooks as flat files in one `src/hooks/` directory while the set remains small.
- [x] Keep RevenueCat environment parsing private inside its purchase service and remove the one-file `src/config/` root.
- [x] Rename the remaining architecture roots to plain ownership names: `models`, `providers`, `services`, `storage`, and `ui`.
- [x] Flatten the small models, services, and storage folders while retaining subfolders only for substantial feature and UI groups.
- [x] Move app-facing dose and medicine-detail types out of the repository so routes, models, and UI do not depend on storage contracts.
- [x] Move Today, Week, and medicine-validation hooks into the shared flat hooks folder and keep UI modules free of hook-folder dependencies.
- [x] Move the 17 unit and component suites into one flat top-level `tests/` folder and restrict Jest discovery to that root.

Week architecture and design checkpoint completed on 2026-08-11:

- [x] Own the page composition in `app/(tabs)/week.tsx` and remove the legacy Week screen wrapper.
- [x] Treat Week as a read-only seven-day outlook; Today remains the focused place for recording and corrections, while Dose History owns retrospective review.
- [x] Use a local date route parameter so Today and the Week calendar select the same day without relying on a fragile numeric index.
- [x] Centralize empty, upcoming, due, taken, and skipped day-state derivation so Today and Week use the same semantics.
- [x] Make the adaptive seven-day calendar the signature visual and keep color tied to selection or medicine state.
- [x] Group dense schedules by exact time inside one agenda surface with saved medicine silhouettes, quiet separators, and read-only statuses.
- [x] Distinguish a selected rest day from a completely empty outlook; keep the reusable Pilly companion in `src/ui/illustrations/` and reserve it for the full empty state.
- [x] Add focused state and agenda tests; complete live default-size and largest-standard-text reviews without clipping or broken containers.
- [x] Keep active-only Today/Week medicine data on a distinct cache key from the Medicines screen's include-archived list while retaining prefix invalidation after mutations.
- [ ] Review VoiceOver order and physical-device behavior during release QA.

Native tab navigation checkpoint completed on 2026-08-11:

- [x] Use Expo Router's shared native tab bar for Today, Week, and Medicines instead of route-specific navigation treatments.
- [x] Minimize the tab bar while scrolling down and expand it when scrolling up on supported iOS versions.
- [x] Keep the shared safe-area wrapper non-collapsible so Expo Router can reliably discover each route's nested scroll view.
- [x] Preserve the platform fallback on systems that do not support native tab-bar minimization.
- [ ] Confirm scroll-direction behavior, Reduce Transparency, and VoiceOver on a physical device during release QA.

Profile architecture and design checkpoint completed on 2026-08-11:

- [x] Own the page composition in `app/profile/index.tsx` and remove the legacy Profile screen wrapper.
- [x] Make `/settings` a compatibility redirect to the canonical Profile route instead of rendering a second Profile instance.
- [x] Let the native stack header own the compact Profile title, top safe-area spacing, and scroll-edge behavior; keep an explicit Back control that falls back to Today when Profile has no navigation history.
- [x] Keep profile queries, legacy-name fallback, archived count, cache updates, and normalized name saving in `useProfile()`.
- [x] Use the saved name as the signature typographic moment and keep management links in quiet shared surfaces.
- [x] Remove the pre-release profile-photo feature, its platform module, setting key, image-picker package, direct file-system dependency, and native permission plugin rather than leaving dormant code.
- [x] Represent loading, retryable load failure, name-save failure, missing website configuration, and website-open failure.
- [x] Add focused hook tests and complete TypeScript, ESLint, formatting, and Jest verification.
- [x] Review the final default-size header spacing, identity hierarchy, management surfaces, and long-name composition on the simulator.
- [x] Hide the Manage section when there are no archived medicines; reveal the existing Archived medicines destination only when it has content.
- [ ] Review largest-standard text, modal keyboard behavior, and physical-device navigation before release.

## Profile decision

The MVP has one optional local profile with a first name and optional last name. It has no account or profile photo. A future account identity or visual customization feature requires a separate privacy, storage, and product-boundary decision; the current app does not retain dormant photo infrastructure or advertise photo access as Plus value.

Multiple people or caregiver profiles are deferred. They require explicit ownership of medicines, dose history, notifications, export, and deletion before the UI presents them as a feature.

Welcome, Name, and Start Small architecture and design checkpoint completed on 2026-08-11:

- [x] Keep onboarding pages composed directly in their Expo Router route files; do not recreate a screen-wrapper or onboarding feature folder.
- [x] Replace the reused Week illustration and equal icon-tile row with one onboarding-specific, code-native SVG story.
- [x] Use a one-shot staged entrance to connect medicine identity, selected days, and exact time without looping, confetti, or decorative motion.
- [x] Respect the system Reduce Motion setting by rendering the same complete SVG state without animation.
- [x] Keep Welcome’s hierarchy to one accessible title, one textured capsule mascot, concise product copy, a local-data promise, and one primary action. Do not invent an in-page wordmark before Pilly has an approved logo; launch branding belongs to the native splash.
- [x] Let the native stack own Back on Start Small; keep the primary continuation and quiet opt-out inside the illustration-and-copy composition instead of docking actions to the bottom edge or creating an oversized native header item.
- [x] Persist onboarding locally before either destination, disable duplicate actions while pending, and show a visible local retry state if persistence fails.
- [x] Add focused route and illustration tests and review both default-size compositions in the iOS simulator.
- [x] Review the shared actions and both onboarding compositions at the largest standard Dynamic Type size, then stress-check the accessibility extreme without clipped controls.
- [x] Hand the native launch screen directly to Welcome; do not invent a second in-app splash or temporary wordmark route.
- [x] Offer Pilly Plus as a quiet, optional iOS branch from Welcome without blocking the free onboarding path or marking onboarding complete.
- [x] Ask for a first name only when the local profile is empty, allow the step to be skipped, and reuse the same normalized profile settings as Profile.
- [x] Anchor the Name composition from the top and keep its focused field above the keyboard so focus and dismissal cannot leave the entire page at a different vertical offset; use one small medicine appearance as its only visual cue.
- [x] End onboarding at Start Small with two explicit outcomes: add the first medicine or enter the app with an empty medicine list.
- [x] Complete a post-push code review: prevent the existing-name guard from issuing a second route replacement after a successful save, remove unused onboarding route state, and replace negative-margin spacing with explicit action and intro groups.
- [x] Verify a precise Pilly-only reset recreates zero settings, medicines, schedules, and dose records and renders Welcome and the conditional Name state.
- [ ] Complete a manual tap-through of Welcome → optional Plus return → Name → Start Small → both empty/Add outcomes.
- [ ] Review VoiceOver order, Reduce Motion on-device behavior, and physical-device motion during release QA.

Native splash and app identity checkpoint completed on iOS on 2026-08-12:

- [x] Approve the dot-free frosted capsule as the production app identity: warm peach above deep berry, joined by one translucent seam. Do not reuse an onboarding illustration or add a check, wordmark, mascot, or decorative dose dot to the icon.
- [x] Export and configure distinct production assets: 1024-pixel iOS light and dark icons, an isolated native splash mark, Android adaptive foreground and warm background, Android themed monochrome artwork, and the web favicon.
- [x] Configure the `expo-splash-screen` SDK 57 config plugin with the approved isolated mark, Pilly background colors, contained 220-point image width, and deliberate dark-mode treatment. Do not add an in-app splash route or hold the native splash without a real resource gate.
- [x] Rebuild, install, and review the native splash handoff and Home Screen icon in an iOS Release simulator build; Expo Go and development builds do not reproduce the final native splash faithfully.
- [ ] Rebuild and review the native splash and adaptive icon in an Android release build.

## Pilly Plus boundary

Free:

- Complete medication and schedule CRUD
- Today and Week views
- Taken, Skipped, correction, undo, and dose history
- Local reminders
- Supply count and run-out estimate
- Basic local profile
- A complete readable JSON export of personal data

Current Plus value:

- Print-ready medicine-plan PDF
- Dose-history CSV for sorting and analysis

Possible future Plus value:

- Themes and alternate app icons
- Additional widgets
- Additional print layouts and export presentation formats
- Optional visual profile frames
- Future household organization after its privacy model is complete

The current price remains a product hypothesis. The first premium export formats now exist, but purchasing must stay disabled until App Store and RevenueCat configuration has been tested on a physical iPhone. Android purchasing is intentionally deferred.

Pilly Plus architecture and design checkpoint completed on 2026-08-11:

- [x] Own the custom paywall composition in `app/plus/index.tsx` and remove the legacy Plus wrapper.
- [x] Keep RevenueCat access behind a typed platform adapter and route-facing `usePlus()` hook.
- [x] Select the current offering's lifetime package explicitly and render its localized store price.
- [x] Treat purchase cancellation as a quiet outcome rather than an error.
- [x] Subscribe once at app runtime to entitlement changes and retain the local entitlement only as an offline fallback.
- [x] Provide development-only free and active previews that never contact RevenueCat or grant production access.
- [x] Keep production checkout behind an explicit launch gate and represent loading, unavailable, retry, restore, active, and offline-active states.
- [x] Describe only implemented Plus value and state clearly that medication essentials and full JSON data access remain free.
- [x] Remove the unused generic RevenueCat paywall UI dependency; Pilly owns the visual hierarchy while RevenueCat owns store state.
- [x] Use one dedicated code-native Pilly companion as the paywall's signature visual without adding a decorative backdrop or bitmap asset.
- [x] Keep one benefits surface, one quiet free-core promise, and an inline transaction area instead of stacking promotional and status cards.
- [x] Reserve alert banners for failures and transaction feedback; preview and active states use calm inline status treatments.
- [x] Move the entitlement listener into a focused core bridge and centralize the shared query and cached-setting keys.
- [x] Add focused entitlement-state tests and complete static and full-suite verification.
- [x] Review the redesigned store-unavailable state at default and largest-standard text sizes on the iPhone 17 Pro simulator without clipped copy or broken containers.
- [x] Build the first real Plus value: a print-ready medicine-plan PDF and dose-history CSV, while keeping a complete readable JSON export free.
- [x] Use the public iOS RevenueCat key, the `plus` entitlement, the current lifetime package, and the App Store-localized price.
- [x] Review the real-feature paywall and free/locked export composition at default size on the iPhone 17 Pro simulator.
- [x] Reduce the paywall to two concrete benefits, remove duplicate heart/support messaging, and keep unavailable-store copy user-facing rather than exposing RevenueCat setup instructions.
- [x] Keep RevenueCat purchases intentionally iOS-only for this release and ignore cached iOS entitlement on unsupported platforms.
- [x] Hide optional Plus entry points on unsupported platforms and prevent locked export rows from opening an Apple-only paywall.
- [x] Keep cached lifetime access unlocked while the App Store refreshes, including temporary offline and unconfigured states.
- [x] Delete temporary JSON, CSV, and PDF files after the iOS share sheet closes or fails, without replacing the original share result when cache cleanup itself fails.
- [x] Keep export assembly and organizer state models independent of `src/ui/`; illustrations consume model types rather than defining product contracts.
- [x] Cover complete export aggregation, spreadsheet/HTML sanitization, native file cleanup, entitlement gating, and cached-access refresh with focused tests.
- [ ] Configure the App Store lifetime product, then validate purchase and restore on a physical iPhone before enabling checkout.

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
- Router-owned first-run onboarding with an optional local name and a true empty start
- Production iOS app icon and native splash identity
- RevenueCat adapter and offline entitlement cache
- Free JSON export plus Plus PDF and CSV export tools

Next implementation pass:

- [x] Add a free, user-controlled data export destination from Profile with a versioned readable JSON file, device share sheet, loading/error states, and sensitive-data guidance.
- [x] Verify both Start Small outcomes route correctly and only after onboarding persistence; the empty Today destination is also reviewed live in the iOS simulator.
- [ ] Review the Android adaptive icon and native splash in an Android release build.

Before release:

- [ ] Configure the real App Store lifetime product and validate RevenueCat purchase/restore on a physical iPhone before enabling checkout.
- [ ] Test reminders, time-zone/background refresh, native tab behavior, and purchases on a physical device.
- [ ] Test the complete app at default and accessibility text sizes with VoiceOver, Reduce Motion, and Reduce Transparency.
- [ ] Confirm privacy copy, license, store assets, screenshots or demo video, and current submission rules.

## Decision log

- 2026-08-08: The active app is Expo SDK 57 with TypeScript. The older Swift direction is archived.
- 2026-08-08: The MVP remains local-first with no required account or cloud medication storage.
- 2026-08-08: A basic local profile photo is free. Multiple profiles are deferred.
- 2026-08-08: Liquid glass is progressive enhancement and never carries safety-critical readability alone.
- 2026-08-09: Route files are the actual screens. Keep route-only composition in `app/`, route-facing data hooks in `src/hooks/`, reusable rendered controls in `src/ui/`, and product rules in `src/models/`; do not recreate screen wrappers or a generic feature catch-all.
- 2026-08-10: Add Medicine page composition now lives in `app/medicine/new.tsx`; reusable Add/Edit controls live in `src/ui/components/` and form rules live in `src/models/`. Do not reintroduce a page-wrapper layer for this route.
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
- 2026-08-11: Welcome, Start Small, and Dose History now own their page composition in `app/`; the last `src/screens/` wrappers are removed. Hooks remain one flat source folder, and purchase environment parsing stays private inside the service that owns it.
- 2026-08-11: Source boundaries use plain ownership names: `models` for app-facing types and rules, `providers` for root composition and synchronization, `services` for external/native integrations, `storage` for SQLite implementation, and `ui` for shared visual infrastructure. Small boundaries stay flat; only substantial feature and UI groups add subfolders. UI-facing models do not originate from the repository.
- 2026-08-11: Tests live outside implementation in one flat top-level `tests/` folder while the suite remains small. Tests use explicit source aliases instead of location-dependent relative imports, and Jest discovery is restricted to the test root.
- 2026-08-11: Week is a rolling seven-day outlook rather than a second recording surface. Its functional calendar is the single signature visual, Today remains the action surface, and Dose History remains the retrospective surface. Dense selected-day schedules share one time-grouped agenda; the Pilly companion appears only when the complete outlook is empty.
- 2026-08-11: The shared native tab bar minimizes on scroll down and expands on scroll up on iOS 26. It does not fully hide. All tab routes use the same shared scroll surface, whose safe-area wrapper remains non-collapsible so Expo Router can reliably discover the nested scroll view.
- 2026-08-11: Profile is Router-owned and `/settings` redirects to it. The local name is the identity moment; management and product links use quiet shared surfaces under a native header. The pre-release profile-photo code is removed completely and can return only through a future feature with a new privacy and storage decision.
- 2026-08-11: Native-header routes opt out of automatic ScrollView top-inset adjustment when the stack already owns that space. Profile presents local identity, privacy context, and its quiet Edit action as one compact text-first composition, removing the large empty header gap, duplicate privacy block, and non-semantic route tint. Profile keeps Back visible even when opened without stack history and falls back to Today instead of leaving the user stranded.
- 2026-08-11: Pilly Plus uses a custom, Router-owned one-time-purchase presentation. RevenueCat remains the entitlement and offering source, the current lifetime package supplies the localized price, and an explicit launch gate prevents checkout before a real paid feature and physical-device purchase pass exist. Development can preview free or active UI states, but production always follows the store entitlement. Core medicine tracking and basic personal-data export remain free.
- 2026-08-11: Today progress leads with what matters now instead of repeating a sentence about every bucket. It presents ready-now, later, or complete status and keeps completion counts secondary; recording remains in the medicine dose rows rather than adding a duplicate summary CTA. Profile omits empty management destinations and reveals Archived medicines only when archived content exists.
- 2026-08-11: Onboarding uses one shared code-native SVG story to explain Pilly rather than borrowing a functional Week control or presenting three equal setup tiles. The scenes use layered gradients, highlights, and restrained pattern texture instead of a stick-figure treatment. Motion is a short, one-shot entrance with a complete reduced-motion fallback; Router pages retain navigation and local completion ownership, and Start Small never navigates before its setting write succeeds. The primary action belongs to the story composition rather than a persistent bottom dock. Three.js is intentionally excluded: one onboarding illustration does not justify a GL render loop, extra native dependencies, or a second accessibility fallback.
- 2026-08-11: First run is a Router-owned decision path, not a carousel: native launch screen → Welcome, with an optional iOS Pilly Plus branch → conditional local first-name prompt → Start Small. Plus never completes or blocks onboarding. Name is optional and uses the same profile settings as Profile. Start Small is the only completion boundary and lets the user add a medicine or begin with a true empty state.
- 2026-08-12: Pilly's production identity is the dot-free frosted capsule: warm peach above deep berry with one translucent seam. The native splash uses only that isolated mark on the app background and hands directly to Router-owned onboarding or Today. The iOS Release build and installed Home Screen icon are verified; Android release rendering remains a separate checkpoint.
- 2026-08-13: The next product screen is a free local data-export destination reached from Profile. Export is a user-ownership feature, not a paywall hook; Plus may later add richer formats only after the basic readable export exists.
- 2026-08-13: Export now provides a complete versioned JSON file to every user. Plus adds two real local tools—dose-history CSV and a print-ready medicine-plan PDF—so the RevenueCat paywall describes shipped value rather than planned promises. Checkout remains gated until the iOS lifetime product, `plus` entitlement, and physical-iPhone purchase/restore pass are complete; Android purchasing is deferred.
- 2026-08-13: Export files are ephemeral cache artifacts: create them only for an explicit share action and remove them after the share sheet resolves or fails. Export assembly stays in hooks/models, native file work stays in services, and product models never import UI-owned types.
- 2026-08-08: Replace custom provider nesting with one `AppProviders`; derive the stateless repository through `useRepository()` from Expo SQLite context.
