# Cursor skills in this workspace

Cursor Agent loads skills from `.cursor/skills/` and (for compatibility)
`.claude/skills/`. **Prefer the Cursor copy** when both match a trigger —
it applies the [host map](../.cursor/skills/HOST.md) (Shell not Bash,
parallel `generalPurpose` Task fan-out, one command per Shell call).

## Persistent Cursor adapters (local only)

Host `SKILL.md` files and `HOST.md` live outside the workspace so a
`git checkout main` or branch switch does not delete them:

| What | Default path |
|---|---|
| Cursor adapters (commit here) | `~/.cursor/skills/trade-imports-workspace/` |
| Workspace link | `~/git/defra/trade-imports-workspace/.cursor/skills` → that directory |
| Canonical workflows + workers | `~/git/defra/trade-imports-workspace/.claude/skills/` |

**First time or after resetting the workspace:**

```bash
bash ~/git/defra/trade-imports-workspace/tools/cursor/install-cursor-skills.sh --sync
```

That migrates any in-repo `.cursor/skills` directory into the personal
store, creates the symlink, and runs `sync-cursor-skills.sh`.

**After editing Claude `references/` or `assets/`:**

```bash
bash ~/git/defra/trade-imports-workspace/tools/skill-creator/sync-cursor-skills.sh
```

Commit adapter changes in the personal store (`git -C ~/.cursor/skills/trade-imports-workspace …`).
Workspace tooling (`tools/cursor/`, `sync-cursor-skills.sh`) can be committed in the workspace repo separately.

Override the store: `TRADE_IMPORTS_CURSOR_SKILLS=/your/path`.

## How to get Claude-parity output

1. Open the workspace at `~/git/defra/trade-imports-workspace` (canonical
   path — `tools/*.sh` assume it).
2. Invoke by trigger phrase or `@review` / `@ticket` / etc.
3. Let the agent run the skill’s **`start-*.sh`** script before reviewing
   or implementing — do not accept a quick diff skim as a full review.
4. For PR work after human review (Paul/Martyn/Hamid themes), use
   **`@review`** with “fix review comments” or point at the GitHub thread;
   calibration lives in
   `.claude/skills/review/references/TEAM_CALIBRATION.md` (symlinked from
   `.cursor/skills/review/references/`). After **`implement review`**, post
   replies with **`REVIEW_PR_RESPONSE.md`** (reviewer row #s, not compressed walker items).

Full catalogue, workers, and tools: [`.cursor/skills/README.md`](../.cursor/skills/README.md).

Cross-host conventions (paths, hygiene, workareas): [agent-skills.md](agent-skills.md).

Claude Code onboarding (auth, subdirectory launches): [agent-onboarding.md](agent-onboarding.md).
