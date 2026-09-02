## EUDPA-372 — one rule for the foot of a journey page

Increment `inc-161` of the DR1 parity backlog. Frontend only — no sibling repo, so this PR stands alone and there is no cross-repo merge order to observe.

### The problem

What a user was offered at the foot of a journey page followed no single rule. On 41 of the 67 captured frontend screens the page ended with three controls — a primary button, a secondary **Save and return to hub** button and a **Cancel and return to hub** link. On the other 26 it offered no way to save what had been entered and leave.

Which pages got them was decided by nothing a user could see. The shared `saveActions` macro built all three controls unconditionally and took no argument that would drop any of them, so the split fell out of which templates happened to call the macro. Sibling pages disagreed: the CPH number page and the party pickers are both reached from rows on the consignment addresses page, yet CPH offered all three controls while the party pickers offered only a primary. A trader who wanted to stop halfway could do it on one and not the other.

### The rule this PR introduces

- A page **the hub links to directly** ends with all three controls, so a trader can stop and leave from where the hub sent them.
- A page **reached from another page** ends with the primary alone, and the trader leaves the way they came in.

### Changes

- `src/server/app/shared/save-actions.njk` takes a `showReturnControls` argument (default `true`), with the rule stated in a comment above the macro.
- Seven second- and third-in-row pages now pass `showReturnControls = false`: CPH number, consignment details, import purpose, port of exit, exit date, transporters select and private transporter details.
- The address party picker renders its ending through the shared macro instead of its own `govukButton`, and drops the duplicated `saveAndContinue` copy key in favour of the shared one (en and cy).
- New unit tests for the macro's two endings, plus updated component and FIT specs for the pages whose endings changed, and a new FIT assertion in `fit/live-animals-journey.js`.

### Verification

Unit, component and FIT suites run green on the branch.
