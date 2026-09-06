## EUDPA-404 — label the animal identifier fields "Passport" and "Ear tag"

Increment `inc-099` of the DR1 parity backlog.

### The finding

> Frontend labels the animal identifier fields "Passport number" and "Ear tag number"; Design release 1 labels them "Passport" and "Ear tag".

The entry labels for two identifier fields were longer than the signed-off design uses, and longer than the frontend's own saved-animal summary labels. A trader saw one name while entering a value and a different name after saving it.

### What changed

- Changed the passport and ear tag **entry labels** in the live-animals commodities copy (English and Welsh) to the short forms "Passport" and "Ear tag" — matching Design release 1 and the summary labels the entered-records list and the check-answers identifier card already use.
- "Tattoo" and "Horse name" were already correct and are unchanged. The worked-example hints are out of scope for this finding and remain as they are.
- Updated the copy tests, the identification controller test, and the identification and journey-smoke FIT specs to assert the new labels.

### Cross-repo

This increment also touches **DEFRA/trade-imports-animals-tests** on the same branch name, where the animal-identification page object's `getByLabel` getters are repointed at the renamed labels.

**Merge order: tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so merging the frontend ahead of its own test fixes would exercise the new labels with stale page objects and turn CDP red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
