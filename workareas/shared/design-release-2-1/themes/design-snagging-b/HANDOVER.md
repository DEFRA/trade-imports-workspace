# Design snagging B: laptop B builds nothing (21 October 2026)

**The split was reversed on 21 October. Laptop B builds nothing. Do not run the build loop here.**

- Laptop B is out of action and landed nothing: no commits on its branch in the animals frontend, the plants frontend
  or the tests repo.
- Its six rows went back to design snagging with `tim backlog split --rows --back-from design-snagging-b`: inc-210,
  inc-212, inc-213, inc-214, inc-217 and inc-219. Laptop A builds them, on
  `feat/EUDPA-720-design-release-2-1-design-snagging`.
- This backlog has no rows left. Its `movedBack` pointer names them, so no machine builds them twice. `tim backlog
  next` here prints NONE, and design snagging B has left the landing order in `themes.json`.
- Laptop B tried inc-210 once and failed the ladder. The note on inc-210 in laptop A's backlog says what went wrong.
  Its stashes and patches stayed on laptop B.
- Laptop B's draft pull requests, the `feat/EUDPA-720-design-release-2-1-design-snagging-b` branches and the
  workspace branch `feat/NO_JIRA-design-release-2-1-snagging-b` are still in place. Sam decides whether to close them.

Laptop A's handover: [`../design-snagging/HANDOVER.md`](../design-snagging/HANDOVER.md).
