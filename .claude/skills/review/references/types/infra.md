## Reviewing configuration, build and infrastructure files

You may read only this brief. Whether a new dependency is used is the
consistency reviewer's check.

- **Config** (`application*.yml`, `.env`, `config.js`, JSON and YAML):
  new keys are correct and have safe defaults; no secret, token or
  password is committed; a value that differs per environment is not
  hard-coded. Do not flag missing comments.
- **Dependencies** (`package.json`, `pom.xml`): versions pinned the way
  the repo pins them; nothing added that the change does not need.
- **Removed entries:** list every line the diff removes from
  `overrides`, `resolutions`, `dependencyManagement`, an audit allowlist
  or a security setting. For each one, find in the brief why removing it
  is safe: the dependency is gone, or its new version already has the
  fix. When the brief does not show that, it is a finding. Removing an
  override that pinned a patched version is `security`, at least Major.
  The consistency reviewer checks whether a dependency is used, but that
  does not cover these removals: they are yours.
- **Dockerfiles and compose files:** follow the docker-compose guide when
  it is in this brief.
- **GitHub Actions workflows:** follow the github-actions guide when it is
  in this brief: pinned action versions, least-privilege permissions, no
  secrets echoed.
- **Shell scripts:** follow the shell guide when it is in this brief. This
  workspace runs on macOS, so BSD `sed` and `grep` rules apply.
