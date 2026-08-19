# How big is DR1?

Derived statically from the prototype's source, with nothing running. This is
the cheap version of the coverage check the architecture note proposes, done by
hand to size the job before building it.

**Headline: DR1 is about two-thirds of DR2.1. Of the 70 screens the previous run
captured, 24 do not exist in DR1 at all.**

## How a release decides what it has

Three mechanisms, and all three are readable from source.

**One router, three mounts.** `app/routes.js` is a single 10,997-line router
with 48 unique routes. `version-mount.js` copies its whole stack under
`/design-release-2` and `/design-release-2.1`. The root mount **is** DR1, and
the route table is identical on all three.

**Views override, they do not replace.** `versionViewExists()`
(`version-mount.js:143-158`) renders `<release>/<name>.html` where one exists
and falls back to the root view where it does not. DR2.1 has 32 view files;
the root has 30, of which 5 are address book and one is the release chooser.
So DR2.1 overrides 24 root views and adds 8 of its own.

**A session flag gates the rest.** The mount middleware sets
`_isDesignRelease2Version` / `_isDesignRelease21Version` on the session. A
handler guarded by `isDesignRelease2SessionData()` (`routes.js:6207-6212`)
redirects to `/` when the flag is absent — which at the root mount it always
is. Those screens are unreachable in DR1 **by design**, not broken.

## What DR1 does not have

### Templates, amendment and the dashboard tabs — 16 screens

Every one of these is behind the DR2 session guard, so a DR1 user is redirected
to `/` on the way in.

| Screen | Gate |
|---|---|
| `create-template` | `renderCreateTemplatePage` `routes.js:7285` |
| `view-template` | `renderViewTemplatePage` `routes.js:7072` |
| `dashboard-templates` | `renderDashboardTemplatesPage` `routes.js:7274` |
| `use-template-landing` | inline, `routes.js:9576` |
| `dashboard-actions` | `renderDashboardActionsPage` `routes.js:7337` |
| `dashboard-changes` | `renderDashboardChangesPage` `routes.js:7355` |
| `dashboard-inspection` | `renderDashboardInspectionPage` `routes.js:7389` |
| `delete-notification`, `notifications-delete-bare` | `renderDeleteNotificationPage` `routes.js:5607` |
| `notifications-amend`, `-bare`, `amend-confirmation-modal` | inline, `routes.js:9617` |
| `notifications-cancel-amend`, `-bare` | inline, `routes.js:9652` |
| `notifications-copy-as-new`, `-bare` | inline, `routes.js:9593` |

The handover named the templates and the dashboard tabs. **It did not name
amendment, copy-as-new or delete** — those are gated the same way and go too.
There is no amend journey in DR1.

### Germinal products — 8 screens

`getSearchCommodities()` (`routes.js:65-75`) returns the plain commodity list
and adds `germinalProductCommodities` **only** for a DR2.1 session. A DR1 user
cannot select a germinal commodity, so none of the branches that follow from one
exist:

`what-are-you-importing-germinal`, `-germinal-catalogue`, `-germinal-mixed`,
`consignment-details-germinal`, `-germinal-errors`, `-germinal-mixed`,
`animal-identification-details-germinal`, `additional-animal-details-germinal`.

**This retires five findings from the previous run outright** — inc-004 and the
three it is the root of (inc-090, inc-092, inc-096), plus the backend half
inc-088. Germinal products are not part of the signed-off DR1 definition, so
"the frontend has no concept of germinal products" is not a gap against DR1.

## What DR1 does have

The remaining **46** of the 70: the notification spine (origin → commodity →
reason → consignment → identification → additional → arrival → transit →
transporter → documents → addresses → CPH → contact → review → declaration →
submitted), the hub in both states, the dashboard and its filter panel, the
five address-role pickers, permanent address, and the reason-for-import
reveals and error state.

Plus the address book. `/address-book*` is shared across all releases —
`isSharedExternalPath()`, `version-mount.js:43-51` — so those screens are
byte-identical in DR1 and DR2.1 and **the previous run's 13 address-book
findings carry over unchanged**. Check them rather than re-deriving them. The
DR2.1 harness never captured them as screens, so DR1 will be the first run that
photographs them.

## What this means for the work

- **The comparison is smaller than the last one**, and materially so: 46
  prototype screens against 70, with the two heaviest domains — templates and
  germinal — gone entirely.
- **A good number of the previous run's 97 findings do not apply.** Five die on
  germinal alone; the template findings (inc-021, inc-036, inc-038) go the same
  way, as does anything about amend or copy-as-new. That is worth a pass over
  the old backlog before authoring anything new — carrying a finding over is
  cheaper than re-deriving it, and striking one is cheaper still.
- **The frontend side is unchanged**: 33 screens captured last time, and the
  frontend has not moved since.

## Confidence

The gating is read from source and each claim above cites the line that makes
it. What a static read cannot tell you is whether a screen the route table
allows is actually *reachable* — a page can be live in the router and
unreachable because nothing links to it. That is what the capture answers, and
it is the reason the coverage check diffs the static enumeration against the
manifest rather than trusting either alone.
