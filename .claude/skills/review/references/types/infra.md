## Reviewing configuration, build and infrastructure files

You may read only this brief. Whether a new dependency is used is the
consistency reviewer's check.

- **Config** (`application*.yml`, `.env`, `config.js`, JSON and YAML):
  new keys are correct and have safe defaults; no secret, token or
  password is committed; a value that differs per environment is not
  hard-coded. Do not flag missing comments.
- **Dependencies** (`package.json`, `pom.xml`): versions pinned the way
  the repo pins them; nothing added that the change does not need.
- **Dockerfiles and compose files:** follow the docker-compose guide when
  it is in this brief.
- **GitHub Actions workflows:** follow the github-actions guide when it is
  in this brief: pinned action versions, least-privilege permissions, no
  secrets echoed.
- **Shell scripts:** follow the shell guide when it is in this brief. This
  workspace runs on macOS, so BSD `sed` and `grep` rules apply.
