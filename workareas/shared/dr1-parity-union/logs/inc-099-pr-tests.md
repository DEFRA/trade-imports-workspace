## EUDPA-404 — point the identifier getters at the renamed labels

Increment `inc-099` of the DR1 parity backlog. This is the tests-repo half of a two-repo increment.

### Why

The frontend now labels the two cattle identifier entry fields "Ear tag" and "Passport" (short forms), matching the saved-animals column headings Design release 1 uses and the frontend's own summary labels. The animal-identification page object still looked for "Ear tag number" and "Passport number", so both getters would have missed.

### What changed

- Repointed the `earTagNumber` and `passportNumber` getters in `page-objects/notification/animal-identification-page.ts` at the new labels.
- `getByLabel` substring-matches by default, so each getter takes `{ exact: true }` — the same choice the frontend's own FIT specs make for these controls.
- The `passportNumber` accessor name and its call sites are left alone; only the label text the getter resolves has changed.

### Cross-repo

The sibling change is in **DEFRA/trade-imports-animals-frontend** on the same branch name (PR #252), which renames the labels themselves.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this suite against the deployed frontend, so merging the frontend ahead of its own test fixes would exercise the new labels with stale page objects and turn CDP red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
