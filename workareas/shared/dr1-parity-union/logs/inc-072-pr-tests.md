## What broke

`trade-imports-animals-frontend` PR
[#263](https://github.com/DEFRA/trade-imports-animals-frontend/pull/263)
(EUDPA-485, increment inc-072) makes the internal-market purpose required
where it is asked: choosing **Internal market** and leaving the revealed
purpose blank now returns the reason page with **There is a problem** and
"Select a purpose in the internal market", instead of walking the user on
to the next page with nothing said.

Two E2E specs in this repo still described the old permissive behaviour, so
the frontend PR's E2E run went red:

- `tests/e2e/pages/import-reason.spec.ts:22` — *accepts a valid import
  reason* chose **Internal market**, submitted nothing else and asserted no
  error summary. That is exactly the case the frontend now refuses.
- `tests/e2e/features/reason-purpose-scope.spec.ts:4` — *purpose is owed
  only for the internal market and is wiped when the reason changes* saved a
  blank purpose and expected to land on **Additional details** with the task
  row left open.

## What changed

Specs only — no production code and no coverage removed.

- *accepts a valid import reason* now picks **Re-entry**, the reason that
  opens no reveal and so submits with nothing else owed. That is the same
  choice `change-from-cya.spec.ts` already makes.
- A new case, *refuses an unanswered purpose under the internal market
  reason*, asserts the error summary, the message link and that the journey
  stays on the reason page — so the behaviour the old test was accidentally
  asserting against is now covered deliberately.
- `reason-purpose-scope.spec.ts` asserts the error on the blank save, then
  answers the purpose and checks the task row reads **Completed** again, so
  the wipe-and-re-ask walk it exists to prove is still walked end to end.

Verified locally: `npm run typecheck`, `npm run lint` and
`npm run format:check` all clean in this repo, and the duplicated frontend
fit specs (`import-reason.fit.spec.js`, 19 tests including *refuses an
unanswered internal-market purpose*) pass against the frontend branch.

## Where it belongs

- Increment `inc-072`, ticket **EUDPA-485**.
- Same branch name as the frontend PR (cross-repo branch parity).
- Merge alongside
  [DEFRA/trade-imports-animals-frontend#263](https://github.com/DEFRA/trade-imports-animals-frontend/pull/263).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
