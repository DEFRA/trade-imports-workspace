# Migrating from the animals workspace

The workspace repo is now `DEFRA/trade-imports-workspace` and lives at
`~/git/defra/trade-imports-workspace`. It is a **clone, not a symlink** — the old
"symlink your checkout to the canonical path" step is gone.

Seven commands, in order:

```bash
# 1. Unlink the old tim. It is symlinked INTO the old checkout, so deleting that
#    later leaves a broken `tim` on your PATH with no obvious cause.
npm uninstall -g tim

# 2. Clone the new workspace to the canonical path.
git clone git@github.com:DEFRA/trade-imports-workspace.git ~/git/defra/trade-imports-workspace

# 3. Move your repos across. Keeps every local branch and saves re-cloning ~2GB.
mv ~/git/defra/trade-imports-animals-workspace/repos ~/git/defra/trade-imports-workspace/repos

# 4. Install tim from its new home.
cd ~/git/defra/trade-imports-workspace/tim && npm i -g .

# 5. Clone anything missing — including trade-imports-ins-backend, which the old
#    roster never listed, so you probably do not have it.
cd ~/git/defra/trade-imports-workspace && make setup

# 6. Check it. Every repo should be listed and on the branch you left it on.
tim workspace status

# 7. Bin the old one, and clear the orphaned containers. The compose project
#    renamed from `trade-imports-animals` to `trade-imports`, so the old stack
#    is invisible to the new one and will sit there consuming ports.
docker compose -p trade-imports-animals down --remove-orphans
rm -rf ~/git/defra/trade-imports-animals-workspace
```

Step 7's `rm -rf` deletes a real directory. If your old checkout was somewhere else
and `trade-imports-animals-workspace` was a symlink to it, `rm` the symlink and
delete the real directory separately. Check first with
`ls -ld ~/git/defra/trade-imports-animals-workspace` — a leading `l` means symlink.

## What did not change

Sub-repo names. `trade-imports-animals-frontend`, the docker service names, the
`TRADE_IMPORTS_ANIMALS_*` env vars and the S3 bucket are all still correct — those
are real repos and real values. Only the workspace itself was renamed.

## If something still points at the old path

Nothing in the repo does, but machine-local files are not covered by the migration:
`~/.claude/settings.local.json`, shell aliases, and your IDE's project config. Grep
for `trade-imports-animals-workspace` and repoint anything you find.
