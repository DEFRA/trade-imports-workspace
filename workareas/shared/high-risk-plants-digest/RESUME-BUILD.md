# Resume the high-risk plants build

Paste the block below into a fresh session. Written 2026-09-06 after inc-001 landed.

---

Resume the high-risk plants build with the build-orchestrator skill. Read
`~/git/defra/trade-imports-workspace/.claude/skills/build-orchestrator/SKILL.md` in full first,
then `workareas/journey-builder/EUDPA-409/PROGRAMME-NOTES.md`, then start.

workarea     journey-builder/EUDPA-409
branch       main
scope        high-risk-plants
executor     claude
lifecycle    full
jiraProject  EUDPA
epic         EUDPA-407
inProgress   In Progress
doneStatus   Done
board        13780
repos        {"frontend":{"path":"repos/trade-imports-plants-frontend","github":"DEFRA/trade-imports-plants-frontend"},"backend":{"path":"repos/trade-imports-plants-backend","github":"DEFRA/trade-imports-plants-backend"},"tests":{"path":"repos/trade-imports-animals-tests","github":"DEFRA/trade-imports-animals-tests"}}
models       {"heavy":"opus","light":"sonnet"}
requireApproval  false — Sam ruled on 2026-09-06 that an increment merges when its pipeline
             goes green; the run never waits for a human approval. Write it into every
             run copy's FALLBACK and pass it in args.
stopAfter    all

Stopped: count-reached after 1 (a deliberate handover). Last landed inc-001
(https://github.com/DEFRA/trade-imports-plants-frontend/pull/7, EUDPA-411).
57 todo remain, 3 blocked (the three gated extras at the end of the chain), 0 dropped.
Next buildable: inc-002.
Owed to a human: none.

Before the first increment:
- `git -C ~/git/defra/trade-imports-workspace pull --ff-only`. backlog.json is the state.
- Raise Dynamic workflow size in /config; one increment is 22 to 46 agents.
- The stack must be up for fit and e2e rungs: `tim docker dev`. It was up at handover.
- Every repo checkout under repos/ must be clean and on main. They were at handover.

What to expect:
- Increments inc-002 to inc-011 change only CI YAML under .github/. Their PR checks are
  the proof. A red check on one of them is usually a platform question (a CDP build role,
  the SONAR_TOKEN secret, GitHub Pages) rather than a code fix; stop with ci-red and say so.
- The dashboard (inc-018) is the first feature and rewrites both copy tripwires in the
  same commit (d-084). Every rung must be green there; do not weaken the tripwires.
- The three gated extras (inc-059 to inc-061) are born blocked and halt the run for Sam.
- The opus session window tripped once today under load. A 429 mid-run kills the
  workflow's in-flight agents; it is not a failure. Wait for the reset, then
  `Workflow({scriptPath, resumeFromRunId, args})` with the same args — finished stages
  replay from cache.
- Per increment, report one line: id, landed, title, PR, ticket. Then derive the next.
  Push backlog.json at every stop.
