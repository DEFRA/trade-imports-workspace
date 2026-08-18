# EUDPA-328 — what changed under you on 2026-08-18

Paste the block below into a fresh agent session working on `feat/EUDPA-328-dr21-parity`.

---

The workspace repo moved and was genericised while this branch was parked. Read this before
running anything, because three of the scripts the ticket tells you to run are currently broken.

**What moved**

- The workspace repo is now `DEFRA/trade-imports-workspace` (was `trade-imports-animals-workspace`).
  Full history came across; `gh-pages` did not.
- The canonical path is now `~/git/defra/trade-imports-workspace`, and it is a **real clone, not a
  symlink**. Both old symlinks are gone. Work there. The old checkout
  `~/git/defra/trade-imports-animals` is stale — if it still exists, ignore it, and note that `tim`
  picks a workspace by walking up from your cwd, so run from inside the new one.
- The docker compose project is now `trade-imports` (was `trade-imports-animals`). If you find
  containers named `trade-imports-animals-*`, they are orphans from before the move:
  `docker compose -p trade-imports-animals down --remove-orphans`.
- Sub-repo names did **not** change. `repos/trade-imports-animals-frontend` is still correct, as are
  the service names, images, `TRADE_IMPORTS_ANIMALS_*` env vars and the S3 bucket. Do not "tidy"
  those — the KEEP set and the reasoning is at
  `workareas/shared/workspace-genericisation/PLAN.md`.

**Do this first — the parity decision walker is broken**

`tools/parity/decision-counts.sh`, `next-decision.sh` and `rule-decision.sh` are new on this branch,
so `main`'s rename sweep never saw them. All three hardcode
`WORKSPACE="$HOME/git/defra/trade-imports-animals-workspace"`, a directory that no longer exists.
They will fail the moment you run the walker the ticket points you at. Fix:

```bash
sed -i '' 's|trade-imports-animals-workspace|trade-imports-workspace|g' \
  ~/git/defra/trade-imports-workspace/tools/parity/*.sh
```

`tools/journey-builder/target-profile.sh` and `targets.json` are also new on this branch — check
them too.

**Rebasing onto the new main**

The branch forked before the genericisation, so it will reintroduce the old canonical path in every
file it touches. 13 files collide with what `main` changed:

- `.claude/skills/frontend-change/SKILL.md`
- `.claude/skills/journey-builder/SKILL.md`, `references/INCREMENT_IMPLEMENTOR.md`
- `.claude/skills/prototype-element/SKILL.md` + all four `references/*_ADDER.md`
- `tools/journey-builder/{commit,rollback,verify}-increment.sh`, `prepare-digest.sh`
- `.gitignore`

**Resolve these by taking main's side and re-applying this branch's semantic change**, not the other
way round — main's version carries the new canonical path in ~196 files, and losing that silently is
the failure mode here. Then sweep and confirm zero:

```bash
git -C ~/git/defra/trade-imports-workspace grep -c 'trade-imports-animals-workspace' -- . ':!workareas' ':!docs/adr'
```

(The two `docs/adr/0001` hits are deliberate — an amendment note recording the old path as history.)

**One thing to keep, and one that changed under you**

- `tools/journey-builder/targets.json` on this branch is **the right design** and main has nothing
  competing with it. Its own comment — "the loop scripts know nothing about any particular codebase;
  adding a target is a data edit, not a script change" — is now the precedent cited elsewhere. Keep it.
- On main, `frontend-change`, `journey-builder` and `prototype-element` were reframed as **frontend-repo
  scoped, not commodity scoped**. Sam's ruling: they are frontend-repo skills, there may be new frontend
  repos, and live-animals is the current target rather than the skill's identity. If your branch's
  version of those files reads as "deliberately scoped to that one commodity line", that wording is
  superseded — take main's.

Nothing about the EUDPA-328 work itself changed: 97 backlog items, 49 still blocked on Sam's rulings,
25 in M1 buildable now. `workareas/shared/dr21-parity/HANDOVER.md` is still the entry point.
