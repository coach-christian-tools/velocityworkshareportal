# Velocity Workshare Portal

React and TypeScript portal for family volunteer shifts, guest registrations, earned hours, and administrator roster management. Firebase provides authentication, Firestore, Hosting, and Cloud Functions. Resend delivers login codes and shift reminders.

## Local setup

Use Node.js 20.20.2 or newer in the Node 20 release line.

```sh
npm ci
npm ci --prefix functions
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Firebase web app configuration. These variables are bundled into the frontend; do not put server credentials in them. The frontend uses the configured Firebase project directly, so local changes can affect that project's data.

Configure `RESEND_API_KEY` and optionally `RESEND_FROM_EMAIL` in the Functions environment. The default sender is `Velocity Workshare <noreply@velocityworkshare.com>` and requires a verified sender domain. Never commit server credentials. Enable the Firebase authentication providers used by the project and authorize the local and deployed frontend domains.

## Verification

```sh
npm run lint
npm test
npm run build
npm --prefix functions run build
```

To point the development frontend at emulators, set `VITE_USE_FIREBASE_EMULATORS=true` and use the project ID `demo-velocityworkshare` with emulator-only Firebase configuration. Emulator mode refuses real project IDs and is disabled in production builds.

Run `npm run test:emulators` with Java 21+ available to verify invitation authorization, Firestore rules, callable endpoints, and concurrent signup/cancellation against the isolated `demo-velocityworkshare` project. GitHub Actions runs all checks, including emulator tests, for pushes and pull requests. Regression tests cover hour accounting, historical shift snapshots, email normalization, and Pacific-time reminder windows across daylight saving transitions. They do not call production services.

## Deployment

Check `.firebaserc` points to the intended Firebase project before deploying.

```sh
npm run deploy
```

This builds the frontend before Firebase deployment. Firebase also builds Functions through its predeploy hook. `npm run deploy:functions` and `npm run deploy:rules` deploy only those resources.

## Data and behavior

- `families`: authorized emails, swimmer roster, division, and required hours. New and edited email lists are normalized to lowercase.
- `postings`: dated shifts and positions. Archiving removes a shift from the job board without deleting volunteer history.
- `registrations`: assignee, family, posting, and completion status. Completing a registration saves a `shiftSnapshot` so later posting edits cannot change awarded credit. Editing a posting also snapshots legacy completed registrations that do not yet have one.
- `manual_hours`: administrator-awarded adjustments.
- `work_descriptions`: reusable manual-hour descriptions.
- `admins`: administrator UID documents; the existing application also recognizes the team email domain.
- `_otp_codes`: server-only login verification state. Transactions enforce cooldowns, failed-attempt limits, and single consumption.
- `_shift_reminders`: server-only delivery markers for reminder deduplication.

A completed shift without explicit times earns one hour. Incomplete and pending registrations earn no hours. Daily reminders target shifts two calendar days ahead in `America/Los_Angeles`; email delivery uses Resend idempotency keys and stored delivery markers.

## Guest invitations

Family email membership and domain-based administrator access require verified email claims. Existing users can verify ownership through the OTP login flow. Explicit administrator UID records remain supported.

Guest links use `/guest#token=...`. Each token is random, stored only as a SHA-256 hash, scoped to one family and shift, and redeemable once. They expire after seven days or the shift's start, whichever comes first; untimed shifts use the end of their Pacific calendar date. Anyone holding the link can redeem it, so share it privately. Guest signup returns only the family display name and shift details, never family emails or children.

Families can manage invitations from their dashboard, revoke unused links, and create replacements. Invitation creation is limited to 20 per user per rolling hour and does not reserve capacity. Guest and family signups use the same server transaction, with capacity checks across all registration statuses and duplicate normalized assignee detection within each family and shift. Successful redemption retries return the original registration ID, including after cancellation; they do not create another signup.

`_guest_invitations` and `_invitation_limits` are server-only collections. Direct registration creation and deletion are blocked by Firestore rules. Administrators retain completion updates. Families can cancel pending registrations until 24 hours before shift start; administrators can remove registrations at any time.

Old links containing family/posting IDs are intentionally rejected. Existing registrations remain intact. Previously deleted postings cannot be recovered by these code changes.

### Coordinated release

Build and deploy the seven invitation/registration callable endpoints plus the OTP verification update first. Then build and deploy Hosting and Firestore rules together:

```sh
npm --prefix functions run build
firebase deploy --project velocityworkshareportal --only functions:createGuestInvitation,functions:getGuestInvitation,functions:redeemGuestInvitation,functions:listGuestInvitations,functions:revokeGuestInvitation,functions:registerForShift,functions:cancelShiftRegistration,functions:verifyOtp
npm run build
firebase deploy --project velocityworkshareportal --only hosting,firestore:rules
```

Verify one invitation and an ordinary family signup on the released frontend, with no automatic invitation messaging. Old open browser tabs will need a refresh after the rules change. Never log raw invitation tokens or include them in analytics events.

If the project's domain-restricted sharing policy rejects Firebase's `allUsers` invoker grant, use Google's [documented public Cloud Run configuration](https://docs.cloud.google.com/run/docs/authenticating/public). The seven callable handlers enforce Firebase authentication or invitation-token authorization themselves. `node scripts/configure-invitation-endpoints.mjs --production` targets only these seven services and masks its update to the public-invoker setting and pinned revision name. Clearing the pinned name permits Cloud Run to create a new revision; it does not submit container, environment, network, scaling, or traffic configuration. Run this step only with authorization to generate those revisions, and verify endpoint reachability before deploying Hosting and restrictive rules.

After the release, `node scripts/verify-live-invitations.mjs --production` verifies guest and family signup in the deployed browser plus private-data and direct-write restrictions. It uses explicitly tagged temporary Auth, family, posting, invitation, and registration fixtures, cleans them up in `finally`, and sends no email. It requires Firebase CLI login and the local frontend configuration for the production project. This script intentionally does not run in CI.
