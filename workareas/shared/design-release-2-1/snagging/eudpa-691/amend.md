# Amend returns to the dashboard

Tester comment on the journey foundation ticket (EUDPA-691), in the CDP test environment:
"I couldnt get amend to work - kept looping back to dashboard?"

Investigated 20 Oct 2026 against `main`, using published `:latest` images on the local stack.

## Summary

| | |
|---|---|
| Reproduced | **Yes**, on `main`, first try |
| When it happens | Amend is chosen on a notification that **this browser session** has not opened yet |
| What the user sees | The dashboard reloads with no message. Pressing Amend again does the same thing |
| Same fault | **Copy as new** from the dashboard |
| Workaround | Choose **View** first, go back to the dashboard, then choose **Amend**. That works |
| Caused by the journey foundation? | **No.** The check dates from the Design Release 1 parity work (#321). The tester has just found it |
| Plants | **Same fault**, same code |

## Root cause

The dashboard and the Amend action disagree about which notifications the user may act on.

1. **The dashboard lists every notification the backend holds.**
   The real records adapter ignores the session's notification list and calls `GET /notifications` with no user filter.
   `repos/trade-imports-animals-frontend/src/server/app/services/persistence/records/real/lifecycle/read.js:21`
   (a unit test pins this: `real.amend-list.test.js:89`, "session-id-is-ignored-in-real-mode").
2. **Amend only acts on notifications this browser session already knows.**
   `amendJourney` returns nothing when the notification is not in the session's "known journeys" list.
   `repos/trade-imports-animals-frontend/src/server/app/engine/journey.js:165-168` (check at `:152-153`).
3. **The dashboard turns "nothing" into a silent redirect to itself.**
   `repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/dashboard/controller.js:115-118`.
   The backend is never called.
4. **Copy as new has the same check.**
   `engine/journey.js:192-195`, then `features/notification-actions/controller.js:37-39` redirects to the dashboard.

A notification joins the session's list only when it is created, copied or opened in that session (`engine/journey.js:113-115`, inside `currentJourney`).
That is why View, Delete and Cancel amend work and the workaround works: they load the notification first.

### Who hits it

Anyone who amends a notification they did not create or open in the same browser session. For example:

- a notification submitted in an earlier session (session cookie and Redis session last 4 hours)
- a different browser, device or private window
- cleared cookies
- another tester's notification: the list has no per-user scoping, so in CDP test everyone sees everyone's

Signing out does not clear the list (`yar` is never reset on logout), so the same browser within 4 hours works. That explains why the build loop's tests never caught it: every e2e amend test submits and amends in one session.

## Evidence

### Local reproduction

Throwaway capture spec, committed on the tests repo's local branch `feat/NO_JIRA-design-release-2-1-design-snagging` (not pushed):
`repos/trade-imports-ins-tests/tests/animals/capture/amend-loop.capture.spec.ts`.

Steps: submit a notification in session 1; sign in again in a fresh browser context (same user, new session); try Amend, Amend, Copy as new, View, then Amend.

| Screenshot | Step | Result |
|---|---|---|
| `screens/A00--submitted-in-session-1.png` | Submitted in session 1 | Confirmation page |
| `screens/A01--session-2-dashboard-offers-amend.png` | Session 2 dashboard | Amend is offered |
| `screens/A02--session-2-after-amend-1.png` | Amend | Back on the dashboard, still Submitted |
| `screens/A03--session-2-after-amend-2.png` | Amend again | Back on the dashboard |
| `screens/A04--session-2-after-copy.png` | Copy as new | Back on the dashboard, no copy made |
| `screens/A05--session-2-view-page-no-amend-control.png` | View | View page opens; it has no Amend control |
| `screens/A06--session-2-amend-works-after-view.png` | Amend after View | Overview, status bar "Amend" |

### Container logs

| Request | Frontend response | Backend `/amend` call |
|---|---|---|
| Amend 1 | 302 to `/live-animals` | none |
| Amend 2 | 302 to `/live-animals` | none |
| Amend after View | 302 to `/live-animals/notifications/GBN-AG-26-XJ61HD` | one, 200 |

## CDP test configuration

Read only. Nothing in the frontend config changes this path in CDP.

| Setting | Repo default (production) | Effect |
|---|---|---|
| Stub mode | Off in production (`common/services/mode.js`) | Real records and real session adapters, as on the local stack |
| Session store | Redis (`config.js:144-163`) | Shared across instances, so not a multi-instance problem |
| Session lifetime | 4 hours, cookie and cache | After 4 hours every older notification hits the fault |

## Proposed fix

Make Amend and Copy load the notification the same way View, Delete and Cancel amend already do, instead of refusing ones the session has not seen.

Simplest change: in `amendJourney` and `copyJourney`, replace the `isKnownJourney` refusal with a load that registers the notification (as `currentJourney` does).
Do not remove the check without a replacement: the session list is today's only notion of "yours".
The real fix for "yours" is per-user scoping in the backend list and actions, which is the open security finding (notifications are not scoped to a user). This fix does not make that worse: View and Delete already accept any notification id.

When Amend genuinely cannot start (notification gone, deleted, or the backend refuses), say so on the dashboard instead of reloading it silently.

## Backlog acceptance criteria

Applies to both `trade-imports-animals-frontend` and `trade-imports-plants-frontend` (plants: `engine/journey.js:148-151` and `:175-178`, `features/dashboard/controller.js:103-106`).

1. **Given** a submitted notification shown on the dashboard that was submitted in an earlier session
   **When** the user chooses Amend
   **Then** Overview opens with the status bar showing "Amend" and the reference.
2. **Given** the same notification
   **When** the user chooses Copy as new from the dashboard
   **Then** a new draft opens at Overview and the original is unchanged.
3. **Given** a notification that can no longer be amended (deleted, or no longer Submitted)
   **When** the user chooses Amend
   **Then** the dashboard shows a message saying the notification could not be amended, rather than reloading with no message.
4. Amend still refuses a notification id that does not exist (404 or the message above), and never calls the backend `/amend` for it.

## Tests to add

| Layer | Test |
|---|---|
| Unit (both frontends) | `amendJourney` and `copyJourney` act on a notification absent from the session's list, and register it |
| Unit (both frontends) | `amendPost` with no editable notification renders the dashboard message, not a bare redirect |
| e2e (tests repo, animals and plants) | Submit in one session, sign in fresh in a new browser context, Amend from the dashboard lands on Overview "Amend". The capture spec above is the template: its fresh-session helper keeps only the auth cookie |
| e2e | Same for Copy as new |
| Spec (`openspec/specs/live-animals/notification-lifecycle/spec.md`) | Add a scenario under REQ-LIFECYCLE-006: amendment can be started from the dashboard in a later session than the one that submitted |

## Related, not the cause

- The prototype offers **Amend** on the view page and asks "Amend this notification?" before starting (`GB-notification-service/app/routes.js:5906`, `:6476`). The live view page has no Amend control. That is a design difference, not this bug.
- SCN-LIFECYCLE-006-B ("Continue" on the view of a notification owed its health certificate) has no matching control on the live view page either. Worth a check when the design snagging theme reaches the view page.

## What we need from the tester

Nothing to reproduce it. To confirm it is the same fault, ask whether the notification was submitted in an earlier session or by someone else, and whether choosing View first then Amend works.
