# CDP change for the prototype password (draft for Sam)

Nothing here has been done. No `cdp-*` repository has been touched. These are
the steps for Sam to take once the prototype-password change
(`feat/NO_JIRA-prototype-password`) is merged to `main` and deployed.

## 1. Add the secret (CDP portal, dev only)

- Service: `trade-imports-plants-prototype`
- Environment: `dev`
- Where: CDP portal, the service's page, **Secrets**, environment `dev`,
  "Create secret".
- Key: `PROTOTYPE_PASSWORD`
- Value: the shared password. Pick something long and easy to say out loud
  (three or four random words works well), since it will be read to research
  participants.

It is a secret, not a plain variable in `cdp-app-config`, because it is a
credential and can then be changed in the portal without a commit anywhere.
The service reads it as the environment variable `PROTOTYPE_PASSWORD`
(`src/server/prototype-password/config.js`, `sensitive: true`, never logged).

## 2. Check the session secret while you are there

The cookie that remembers the password is signed with a key derived from
both `PROTOTYPE_PASSWORD` and `SESSION_COOKIE_PASSWORD`. If
`SESSION_COOKIE_PASSWORD` is not already a secret on the service in dev, add
one (at least 32 random characters). Without it the service falls back to the
public default in `src/config/config.js`: the password gate still holds (a
cookie still cannot be made without knowing the password), but the stub
sign-in session cookie is then signed with a well-known key, which is worth
fixing regardless.

## 3. Redeploy

Secrets are read at start-up, so redeploy `trade-imports-plants-prototype` to
dev from the CDP portal (same image version is fine). Redeploying restarts the
process, which resets every set back to its examples, as every deploy does.

## 4. Check it

- The start-up log should say `Prototype password: on. Every page but
  /health needs the password`. Before the secret, it says
  `Prototype password: PROTOTYPE_PASSWORD is not set, so the prototype is
  open to anyone who reaches it`.
- Opening the prototype's address shows "This is a prototype" and asks for
  the password; the right one lands on the prototypes page.
- The service stays healthy (`/health` is never behind the password).

## Changing or removing it later

- Change the secret's value and redeploy: everyone is asked for the new
  password on their next page.
- Delete the secret and redeploy: the prototype is open to anyone again.

## Sharing it

One shared password for everyone for now. Send the prototype's address and
the password separately (link in the invitation, password on the day), and
never put the password in a pull request, ticket, research sheet or anything
committed. The GitHub Pages demo page is not behind the password.
