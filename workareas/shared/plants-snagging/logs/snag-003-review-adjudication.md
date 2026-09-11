# snag-003 review adjudication

## Accepted and fixed

- The plan said the page rendered a section caption, while the journey's
  explicit caption policy names the contact page as deliberately bare. The
  user ruled that it remains bare. The acceptance criterion and FIT coverage
  now say so; the product caption policy is unchanged.
- Static server-rendered pagination links could carry only the selection known
  when the page rendered, so a new browser tick was lost on paging. A small,
  generic progressive enhancement now adds the live radio value to each GET
  pagination link. A unit test and a real-browser FIT case pin the behaviour.
- The invalid-id FIT assertion ran on a fresh page instead of the 400 response
  it claimed to inspect. It now asserts on the actual refusal response and the
  orphan test is gone.
- CSS/id Playwright locators with accessible alternatives were replaced with
  role or visible-text locators.
- Nunjucks macro imports now precede `extends`, in line with the workspace
  Nunjucks standard.
- The inline radio error is now associated with the radio controls through
  `aria-describedby`, with rendered-HTML coverage.
- The full FIT rung exposed four older journey setup helpers that still used
  the contact radio's former accessible name. They now use the required
  `Select {name}` label, matching the picker and its dedicated FIT coverage.

## Rejected after refutation

- Replacing the hand-written GOV.UK details markup with `govukDetails` was
  rejected. Both cited picker exemplars intentionally use the same dynamic
  markup; changing only this picker would reduce consistency and add no
  demonstrated correctness or accessibility benefit.
- Deleting E2E-created address-book records was rejected. The shared service is
  intentionally never wiped and its existing test-isolation convention is to
  mint UUID-tagged records and search by that token; this change follows it.

## Final review result

Code, style and whole-change consistency reviewers re-reviewed the staged
change. No findings survived. The four ladder-derived FIT edits were then sent
through focused code and style re-review before the rung was retried.
