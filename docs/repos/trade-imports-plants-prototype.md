# trade-imports-plants-prototype

**Repo:** DEFRA/trade-imports-plants-prototype

## Purpose

A prototype copy of the plants frontend. Per the workspace `CLAUDE.md` its `upstream` remote is `trade-imports-plants-frontend`; keep it in step with `git fetch upstream` then `git merge upstream/main`. `repos.json` lists it as a Node repo with no Docker stack service and no npm-upgrade default.

State: the repo is NOT cloned under `repos/` at the time of writing (`repos/trade-imports-plants-prototype` does not exist), so nothing below is verified against its code. Its README, `package.json` and routes were not read. Anything beyond the above is Unclear from code.

## Responsibilities

Owns: Unclear from code. Presumably prototype-only experiments on the plants journey, but this is not confirmed.

Does NOT own: it is not part of the workspace Docker stack (`dockerStack: null`), so no other stack service depends on it. It is not a system of record for anything known.

## Integrations

| Direction | System | Mechanism | Purpose |
|-----------|--------|-----------|---------|
| Inbound | trade-imports-plants-frontend | Git `upstream` remote, merge from `upstream/main` | Source code sync (development-time only) |
| Runtime | Unclear from code | Unclear from code | Not inspected; it may share the plants frontend's backend, reference-data, address-book and Defra ID dependencies if it is an unmodified copy |

## Stack

Node.js (per `repos.json`). Framework and tooling Unclear from code; likely the same as the plants frontend if it is a straight copy.

## Infrastructure dependencies

Unclear from code.

## How to run

It runs on stubs alone, with no backend, Defra ID, Redis or reference data. From the repo:

```bash
npx --yes npm@11.6.2 ci   # the repo pins npm 11.6.2; ambient npm rejects the lockfile
npm start
```

It serves on port 3103, its real twin's (`trade-imports-plants-frontend`, 3003) plus 100, with a chooser at `/` listing every mounted prototype set. `PORT`, `STUB_MODE` and `SESSION_CACHE_ENGINE` still win when set.
