# trade-imports-schemas

**Repo:** DEFRA/trade-imports-schemas

## Purpose

Artefacts-only repository of JSON Schema and JSON-LD context files for Defra trade-import payloads, aligned to UN/CEFACT Buy-Ship-Pay D23B (UNVTD vocabulary-first). There is no application to build or deploy; the only executables are validation and generation scripts.

## Responsibilities

**Owns:**
- The canonical payload contract: core building blocks (`schemas/core`), JSON-LD contexts (`schemas/contexts`), and journey profiles under `schemas/profiles/imports` (GBN-AG in `gb/`, INTRA and DOCOM in `eu/`, CHED in `international/`).
- The notification event schemas (`gbn-ag-event-notification-*-v1.schema.json`), the shared `event-envelope-v1`, and the GBN-AG PIMS schema (`gbn-ag-pims-v0.1.0`).
- Reference-data response schemas (`schemas/reference-data`), a notification status codelist, worked samples, and the GBN-AG data dictionary, state-transition and PIMS mapping notes.
- Versioning by file suffix (`-v1`); breaking changes mint a new file.

**Does NOT own:**
- Any runtime behaviour, service, database or API. It is not published as an npm or Maven package.
- Enforcement of the schemas in consuming services. Consumers hand-write matching classes and reference schema URLs (see Integrations).
- Codelist values: codelist-bearing properties are open strings, not enums, so reference-data changes do not force schema releases.

## Integrations

| Direction | System | Mechanism | Purpose |
|---|---|---|---|
| Outbound | trade-imports-animals-backend | Schema URL strings (`OutboxEventType.schemaUrl`, pointing at `github.com/DEFRA/trade-imports-schemas/blob/main/.../gb/events/`) carried in outbox event metadata | Backend's emitted events name their governing schema |
| Outbound | trade-imports-dynamics-gateway | Javadoc links only; Java classes (`OutboxEvent`, `PimsEventV1`, `gbnag` packages) mirror the schemas by hand | Gateway's input shape and PIMS output shape follow the event and PIMS schemas |
| Outbound | Downstream event consumers | `schemaUri` field in event samples and metadata | Discover and validate against a schema |
| Inbound | UN/CEFACT vocabulary (`unece-context-D23B.jsonld`, `UNECE-BasicComponents.json`) | HTTP fetch by validation scripts into gitignored `build/vendor/` | Vocabulary and validation dependencies |

Consumers found by searching `repos/`: only the two above. No consumer imports it as a package (no `package.json` or `pom.xml` dependency found in other repos). Other repos, such as the reference-data service, may align to its reference-data schemas: Unclear from code.

## Stack

- **Runtime:** Node.js >= 24 (ES modules, `private: true`)
- **Formats:** JSON Schema (2020-12; `event-envelope-v1` uses draft-07), JSON-LD
- **Validation:** AJV 8 with ajv-formats; `fast-xml-parser` for the TRACES converter
- **Tests:** `node --test` on the scripts only
- **CI:** No `.github` directory in the repo

## Infrastructure dependencies

None at runtime. Validation needs network access on first run to fetch the vendored UN/CEFACT files.

## How to run

```bash
npm ci
npm run validate-schemas     # compile every *.schema.json with AJV
npm run validate-samples     # validate samples against their declared $schema
npm run validate-coherence   # cross-artefact coherence check
npm test                     # tests for the scripts
```

Other scripts: `npm run convert:traces`, `npm run build-dictionary:gbn-ag`.

Known caveat: some `$id`/`$ref` values are transitional legacy paths after a rename; treat the on-disk location as the source of truth (see `CLAUDE.md`).
