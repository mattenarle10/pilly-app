# Pilly internal TestFlight runbook

Use one normal iOS production build for the first core-only beta. Do not submit it for public App Store review and do not attach the draft lifetime purchase.

## What this build contains

- Local medicine setup, schedules, Today, Week, history, supply, export, and local reminders.
- Privacy-safe small and medium iOS Next dose Home Screen widgets.
- Pilly Plus purchase entry points hidden because the production profile has no RevenueCat key and explicitly disables checkout.
- No remote push-token registration or server-sent push notifications. Medicine reminders are scheduled locally by iOS.

## Before creating the build

1. Run `bun run verify`.
2. Install Maestro and run `bun run test:flows`.
3. From a native local build, add Pilly's small and medium Next dose widgets and verify:
   - empty, upcoming, ready-now, and all-clear states use the expected hierarchy;
   - medicine names and instructions never appear;
   - recording or correcting a dose refreshes the widget after returning to Pilly;
   - tapping either family opens Today.
4. On a physical iPhone, create a reminder a few minutes ahead and verify:
   - the permission prompt appears once;
   - the banner says “Time for your medicine” and “Open Pilly to see what’s due.”;
   - the standard Pilly app icon and default sound appear;
   - the same alert appears while Pilly is foregrounded, and remains available in Notification Center;
   - medicines sharing an exact reminder time produce one alert;
   - editing, disabling, archiving, and deleting a medicine reconcile its pending reminders;
   - delivery still behaves correctly after backgrounding the app and changing time zone.
5. Confirm the App Store Connect app uses bundle ID `dev.sidequests.pilly` and Apple ID `6801063230`.
6. Confirm the EAS `production` environment does not define `EXPO_PUBLIC_REVENUECAT_IOS_KEY`; the committed production profile separately forces `EXPO_PUBLIC_PLUS_PURCHASES_ENABLED=false`.
7. Confirm the export-compliance answer in the TestFlight wizard. Apple says `ITSAppUsesNonExemptEncryption` should be `NO` only when the app uses no encryption or only exempt encryption; do not guess if the dependency set changes.

## Create and submit exactly one beta build

From the repository root, run:

```bash
npx testflight
```

The official Expo command initializes or reuses the EAS project, confirms the bundle ID and encryption answer, manages signing credentials, creates one production `.ipa`, uploads it to App Store Connect, and enables it for an internal TestFlight group.

Use these answers when prompted:

- Platform: iOS
- Bundle identifier: `dev.sidequests.pilly`
- Build profile: `production`
- Existing App Store Connect app: Pilly: Medicine Tracker (`6801063230`)
- Distribution: internal TestFlight only for this checkpoint

Do not run a second build merely because Apple is processing the first one. Wait for its TestFlight status.

## App Store Connect

1. Open Pilly → TestFlight.
2. Wait until build `1.0.0` finishes processing and resolve export compliance if Apple asks.
3. Create an Internal Testing group named `Core beta`.
4. Add the processed build and your App Store Connect test users.
5. Enter this What to Test text:

   > Test first-run onboarding, adding and editing medicines, multiple daily schedules, local reminders, Today recording and corrections, Week, Dose History, supply changes, archive/restore/delete, and JSON export. Pilly Plus purchases are intentionally unavailable in this beta.

6. Install from TestFlight on a physical iPhone and complete the physical-device checklist below.

## One-build acceptance checklist

- [ ] Fresh install reaches onboarding and can start empty.
- [ ] A medicine can be added, edited, archived, restored, and deleted.
- [ ] Taken, Skipped, correction history, Week, and supply remain correct across relaunch.
- [ ] Local reminders pass the physical-iPhone checks above.
- [ ] Small and medium Next dose widgets pass the local-build and physical-iPhone checks above.
- [ ] Appearance presets and Custom colors persist, including split capsule colors.
- [ ] JSON export opens the iOS share sheet and contains the expected local data.
- [ ] Pilly Plus entry points and checkout are absent from the production beta.
- [ ] Largest standard text, VoiceOver order, Reduce Motion, and Reduce Transparency are reviewed.
- [ ] No launch crash or migration failure appears in TestFlight metrics.

## First-party references

- Expo: <https://docs.expo.dev/build-reference/npx-testflight/>
- Expo EAS app versions: <https://docs.expo.dev/build-reference/app-versions/>
- Expo SDK 57 notifications: <https://docs.expo.dev/versions/v57.0.0/sdk/notifications/>
- Expo SDK 57 widgets: <https://docs.expo.dev/versions/v57.0.0/sdk/widgets/>
- Expo native widget example: <https://github.com/expo/examples/tree/master/with-widgets>
- Apple TestFlight overview: <https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/>
- Apple internal testers: <https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/>
- Apple export compliance: <https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/>
