## What broke

Increment inc-083 (EUDPA-480) on the frontend drops the character rule on the
origin page's internal reference field and moves the surviving 58-character
limit into the hint. The hint now reads:

> Enter any internal reference you want to use to identify this consignment,
> or leave blank. It can be up to 58 characters.

That extra sentence changes the rendered page, so the committed visual
regression baselines for the origin page no longer match. The E2E visual spec
failed on frontend PR
[261](https://github.com/DEFRA/trade-imports-animals-frontend/pull/261),
run 34148358157, shard 3:

```
Error: expect(page).toHaveScreenshot(expected) failed
  388 pixels (ratio 0.01 of all image pixels) are different.
  Snapshot: origin-of-import.png
```

The diff image from that run shows the only changed region is the new hint
sentence. The rendered page is correct; the baselines were stale.

## What changed

Regenerated both platform baselines against a stack serving the branch's
frontend:

- `origin-of-import-e2e-linux.png` via `npm run test:visual:update:linux` —
  the container-rendered image CI compares against
- `origin-of-import-e2e-darwin.png` via `npm run test:visual:update:macos` —
  the host-rendered image local runs compare against

Both then re-run without `--update-snapshots` and pass: 1 passed on linux in
the Playwright container, 1 passed on darwin on the host.

No spec, mask or threshold was changed. No test was weakened, skipped or
deleted.

## Where it belongs

- Increment: inc-083 (dr1-parity-union backlog)
- Ticket: EUDPA-480
- Paired frontend PR: DEFRA/trade-imports-animals-frontend#261

Branch name matches the frontend branch so the E2E job picks up the
branch-tagged tests image alongside the branch-tagged frontend image.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
