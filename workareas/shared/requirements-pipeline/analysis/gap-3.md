# Gap-fill 3: evidence drift detection and HEAD pinning already exist

Read-only analysis for 18 September 2026. It checks the synthesis claim that "citations record the SHA they were read at" and "a moved citation means re-derive, not defect" are still open design work (synthesis §7.5, last bullet; H §6.5). It also checks the recipe-rot evidence in synthesis §5.1 ("the loop had to list a citation whose line has moved on").

## 0. The verdict

The synthesis understates what exists. The parity pipeline in `tim/src/parity/` already has five tested mechanisms that together make up most of the provenance-and-drift layer the distiller and implementor need:

| # | Mechanism | Where | What it does | Tests |
|---|---|---|---|---|
| 1 | **Run heads** | `tim/src/parity/heads.js:1-245`; `tim parity heads <run> [--write]` (`tim/src/commands/parity/index.js:686-706`); phase row `tools/parity/phase.sh:31` | Records `{sha, branch, dirty, path}` for **every** repo the run reads when the run starts. It re-reads them later and gives each repo one of four verdicts: `same`, `moved`, `dirty` or `unrecorded` | `heads.test.js`, 17 tests |
| 2 | **Corpus pins** | `tim/src/parity/meta.js:25-140` (`resolvePin`, `buildCorpusMeta`), stored in `.corpus-meta.json` `pins` | One pinned commit per repo, which every citation resolves against: full 40-character `sha`, `ref`, `why`, `pushed`, `subject` and `committedAt`. Pins are kept separate from `captures[side].sha`, and the file records `matchesPin` | `meta.test.js`, 9 tests |
| 3 | **Evidence at the pin, and evidence-pin drift** | `citations/evidence.js:75-193` (`readSource` and `resolveCitation` read the file with `git show <pinSha>:<path>`, never from the working tree); `evidence.json.generatedFrom.pins` (`:291-298`); `check-evidence.js:21-36` `pinDrift`; `:525-535` `blockers` | Every resolved citation carries `sha`, `blob` (the git blob id of the file at the pin), `pushed`, `urls` and a `snippet`. If a pin moves after `evidence.json` was built, the build is **blocked** and prints the exact commands to regenerate | `check-evidence.test.js`, 11 tests |
| 4 | **Anchor drift classification** (the "re-derive, not defect" rule, already written in code) | `citations/anchor-check.js:1-221` `classifyAnchors`; `check-evidence.js:158-195` `citationHealth`, `:467-481` render, `:515-523` `blockers` doc | Sorts each quoted identifier a citation makes into one of six classes: `inRange`, `outOfRange` (widen the range), `inSibling`, `interpolated`, `rendered` (all three correct) and `missingFromFile` ("re-verify the finding, do not nudge the lines"). Anchor drift **deliberately does not block**: "that is a finding to re-verify, and it is the expected yield of pinning to HEAD rather than a fault in the pipeline" (`check-evidence.js:518-521`) | `anchor-check.test.js`, 15 tests |
| 5 | **Seals** (what a reader was last shown, compared on every rebuild) | `tim/src/parity/seals.js:18-271`; wired at `render/run.js:307-322`; `--reseal` at `commands/parity/index.js:403-414`; store at `<workarea>/evidence/seals.json` (`corpus-profile.js:214-216`) | Content-hash seals with a typed drift diff (`frame-changed`, `content-changed`, `pixels-changed`, `image-changed`). Writes are additive, so drift keeps its own evidence. Clearing is a deliberate act (`--reseal`). A disappearance counts as drift, not silence | `seals.test.js`, 25 tests |

Two more pieces are relevant: the repoint preview (`repoint.js:17-244`), and the hand-resolution carry-forward (`citations/carry-forward.js:1-188`), which keeps a person's judgement across a re-derivation.

These are in real use:

- `run-heads.json` exists for `dr1b-parity` and `dr1c-parity`.
- `seals.json` exists for `dr1-parity`, `dr1b-parity`, `dr1c-parity` and `dr21-parity`.
- The parity skill uses heads as "Phase 0.5 — hold the applications still" (`.claude/skills/parity/SKILL.md:168-176`), re-reads them before ingest (`:269`), and lists them among the pipeline's guarantees (`:874-878`).

**Correction to the synthesis:**

- **§7.5, last bullet.** This should not be listed as unmet design work. "Record the SHA evidence was read at" and "a moved citation means re-verify, not defect" are both implemented and tested in the parity toolchain.
- **H §6.5.** Same correction. What is actually missing is narrower, and §4 below lists it: per-citation (rather than per-corpus) pins, a blob comparison across pins, seals for non-code sources, gating, and generalisation out of the parity schema.
- **§5.1.** Add a nuance. The loop's `readIncrement` (`.claude/workflows/increment-build-loop.js:676-677`) treats "a citation whose line has moved on" as **a defect worth reporting**. That is not only evidence that recipes rot. It is a *policy conflict* with parity's rule (`check-evidence.js:518-521`, `:474`), and the new implementor should adopt parity's side.

---

## 1. Run heads: `heads.js`

### 1.1 What it records

`headOf(path)` (`heads.js:27-61`) returns `{found, sha, branch, dirty, why?}`:

- It uses `git rev-parse HEAD`, `git rev-parse --abbrev-ref HEAD` and `git status --porcelain`.
- A dirty worktree is **recorded, not refused**. The reason is at `:17-22`: "what matters is that the report can say the pictures and the citations describe different trees, not that a tool stopped somebody working". That is the right stance for a distiller that reads live checkouts.

`currentHeads(profile)` (`:73-81`) covers **every** repo in the profile, not just the two being compared. The reason is at `:66-69`: "A finding on the implementation side routinely cites the backend, and a citation resolving against a repo that moved is as wrong as a picture of one that did." For a distiller with several sources this is exactly the right scope: record every repo any source or citation touches.

### 1.2 The four verdicts (`compareHeads`, `:97-133`)

`same`, `moved`, `dirty` and `unrecorded`. The doc comment at `:86-91` explains why they are not one boolean:

- `moved` invalidates the comparison between pictures and citations.
- `dirty` does not invalidate anything yet, "but will the moment somebody commits".
- `unrecorded` cannot be judged, and "saying so beats reporting it as unchanged".

That last point is the same honesty rule the synthesis wants for requirement provenance.

### 1.3 A guard against erasing evidence (`runHeads`, `:149-205`)

- A second `--write` throws `USAGE` unless `--force` is passed (`:155-162`). The message: "Re-recording would erase the only evidence that anything moved since."
- A read before any write returns `neverRecorded: true` (`:181-192`), and the text renderer says "the captures and the citations may already describe different trees" (`:223-231`).
- The renderer's closing advice is the re-derive policy in words (`:239-243`): "A moved application is not a reason to re-run everything — it is a reason to know which findings rest on the part that moved."

### 1.4 Weaknesses to fix before reuse

1. **Advisory only.**
   - `runHeads` returns `exitNonZero: false` in every branch (`:177, 190, 203`), even when `moved` is non-empty.
   - In `phase.sh` no phase depends on `heads`: `enumerate` needs only `setup` (`tools/parity/phase.sh:32`), and `ingest` needs `verify,dedupe` (`:42`).
   - So a run can reach `report` without heads ever being recorded, and nothing fails if they moved. The only enforcement is skill prose (`SKILL.md:172-174, 269`).
   - For the implementor this has to be a hard stop at the Plan stage. FA's Plan stage already says "if a checkout has moved, stop and report" (synthesis §5.2).
2. **Dirty at the start is never flagged.** `compareHeads` only reports `dirty` when `now.dirty && !then.dirty` (`:123`). The real `dr1c-parity/run-heads.json` records `prototype: {dirty: true}` at the start. The recorded SHA therefore does not describe the tree that was read, and nothing says so. A distiller should record a `dirty` flag on every citation read from a dirty tree, or refuse to cite one.
3. **Absolute paths in state.** `run-heads.json` stores `path: "/Users/samfarrington/..."` per repo (`heads.js:77`, visible in `dr1c-parity/run-heads.json`). This breaks the workspace portability rule (synthesis §6.4 lists hardcoded identities to drop). Store the repo key and let the profile resolve the path.
4. **Keyed by run.** The file is one per corpus workarea (`HEADS_FILE = 'run-heads.json'`, `:8, 14`). A backlog that lives across many builds needs one heads record per **phase**: one for distillation, then one per Plan stage. It should not have one clock per programme.

---

## 2. Pins and evidence: `meta.js`, `citations/*`, `check-evidence.js`

### 2.1 Design points worth keeping

- **Read at a commit, never from the working tree.** `listTrackedPaths` (`citations/resolve.js:6-30`): "repos/ checkouts are routinely mid-spike, and a citation must resolve against the code the finding was written about." It uses `git ls-tree -r <sha>`. `readSource` (`evidence.js:75-93`) reads `git show <sha>:<path>`. This matches the memories `feedback_explore_main_not_working_checkout` and `feedback_repo_checkouts_move_mid_session`, and it makes a distiller immune to a checkout moving mid-read.
- **Full SHA only.** `resolvePin` (`meta.js:28-52`): "a short sha in a permalink is a link with a shelf life". `permalink` (`github-url.js:17-23`) says the same.
- **`pushed` is recorded** (`meta.js:25-26, 48`) because an unpushed commit's permalink 404s. `citationHealth.notPushed` (`check-evidence.js:179-181`) surfaces it.
- **Pins are kept apart from captures, and the file says when they diverge.** See `meta.js:69-72`: "A pin is the commit the report cites code at; a capture is the commit the pixels were actually taken at. They are equal after a fresh capture and they diverge the moment a repo moves, and saying so is the difference between a stale picture and a lie." `matchesPin` is at `:116-118`. For requirements, the general form is "the commit a claim was *read* at" against "the commit it is being *built* against".
- **A blob id per citation.** `blobId(repoPath, sha, path)` (`github-url.js:49-71`) runs `git rev-parse <sha>:<path>`. The file's own words: "Two citations with the same blob are the same bytes, which is how the report knows a stored snippet is still exactly what the permalink shows." It is stored on every resolved citation (`evidence.js:186`).
- **`generatedFrom.pins`** (`evidence.js:294-298`) stamps the derived file with the inputs it was built from. `pinDrift` (`check-evidence.js:21-36`) compares that stamp with the current pins and returns `{repo, was, now}`. `blockers` (`:525-535`) fails the check on a moved pin. `regenerationCommands` (`:371-386`) prints the exact commands to recover.
- **A `dead` state.** `resolveCitation` returns `state: 'dead'` when `git cat-file -e <sha>:<path>` fails (`evidence.js:138-151`), with the reason "The citation is stale, or the file moved." This is the file-level form of "the premise has moved".

### 2.2 The re-derive rule, as already written

`check-evidence.js:515-523`:

> A moved pin and a missing capture invalidate the page. A citation whose anchor has drifted does not: that is a finding to re-verify, and it is the expected yield of pinning to HEAD rather than a fault in the pipeline.

The text renderer turns this into instructions for each class (`:467-481`):

- `outOfRange`: "widen the range".
- `missingFromFile`: "re-verify the finding, do not nudge the lines".
- `inSibling`, `interpolated` and `rendered`: "None of the three is a fault."

`anchor-check.js:1-28` records why the six classes exist. The old single rule "reported all 53 of the DR1 corpus's anchors as drifted when every one of them was correct". This is a tested answer to H §6.5, and it is a better-graded policy than the loop's binary "wrong is not [fine]" (`increment-build-loop.js:676-677`).

`resolve.js:176-188` handles a related case. A path whose explicit root "names a file the repo does not have is a stale pointer, not a resolution. Fall through and let the suffix narrowing find where the file moved to." This is automatic re-location of a moved file, which is exactly what a planned item's evidence needs after a rename.

### 2.3 Its limits

1. **The pin is per corpus, not per citation.** Citations in `backlog.json` carry `repo/path/lines/ranges/anchors/asWritten` (`citations/run.js:179-196`) but **no SHA**. The SHA lives once, in `.corpus-meta.json.pins[repo]`, and appears on the citation only in the derived `evidence.json`. For a parity corpus built in one sitting this is fine. For a requirement set gathered across days and sources (synthesis §7.8, two-pass distillation, combining after every ruling) it is not: a citation added in pass two was read at a different commit from one added in pass one. The distiller needs `readAt: {sha, blob, dirty}` **on each citation**. The corpus pin can remain as a default.
2. **`pinDrift` works per repo and treats any movement as a blocker.** It fails the whole check when any pin moved (`check-evidence.js:528-530`), even if none of the cited files changed. The blob id is stored, but **nothing compares blobs across pins**. That comparison is the cheap, precise test the implementor needs: for each citation, `git rev-parse <newHead>:<path>` against the stored `blob`.
   - Equal: the claim still holds byte for byte, and no work is needed even though HEAD moved.
   - Different: run `classifyAnchors` at the new HEAD. `outOfRange` means re-cite. `missingFromFile` or `dead` means **re-derive the requirement**.
   - About 20 lines of new code, on top of `blobId` and `classifyAnchors`.
3. **The key is the parity schema.** `runEvidence` and `runCitations` take a parity `profile` and `parseBacklog` (`evidence.js:208-212`, `run.js:318-322`). The functions underneath are pure or git-only and move easily: `permalink`, `existsAtCommit`, `blobId`, `classifyAnchors`, `containsAnchor`, `interpolatedFrom`, `pinDrift`, `resolvePin`, `headOf` and `compareHeads`. Profile coupling is limited to `profile.repos[key].absolutePath` and `owner/repo`.

---

## 3. Seals: `seals.js`

### 3.1 What is sealed

`sealOf(asset)` (`seals.js:52-62`) returns `{state, screen, anchor, sha256, content, volatile}`, and only for assets in state `crop` or `page`. It holds three signals (`:37-47`):

- `sha256`: the image bytes.
- `content`: the hash of the standardised rendered DOM.
- `volatile`: a fingerprint of the run-to-run values that were standardised.

The **frame** (state, screen and anchor) is part of the seal: "Swapping a page shot for a crop of one field changes what the reader is being asked about just as much as re-capturing the same frame would" (`:33-35`).

### 3.2 The drift types (`driftKind`, `:126-138`)

`null` means no drift. The other outcomes are `frame-changed`, `content-changed`, `pixels-changed` and `image-changed`. The function refuses to guess when the cause is ambiguous (`onlyGeneratedValuesMoved`, `:103-117`; the "cannot detect" paragraph at `:147-155`). It also admits a gap: "It also cannot see a page-model plate … its plate can change without a word."

### 3.3 Invariants to lift unchanged into requirement provenance

- **A finding nobody has seen cannot have drifted** (`diffSeals`, `:165-166`). A requirement with no ruling has nothing to invalidate.
- **Compare the union of sides, not the current ones** (`:167-170`). "A picture that has disappeared … leaves no entry to iterate, and silence is exactly what this must not produce." For requirements, a citation or source that has disappeared is drift, not an absence.
- **Additive writes and a deliberate reseal** (`writeSeals`, `:242-271`). "a finding that has moved keeps the seal it drifted from until someone clears it, so the drift panel does not erase its own evidence on the next rebuild." Adding facts to an unchanged seal (`annotate`, `:203-232`) is explicitly "not accepting anything".
- **A store of its own, apart from judgement and derived data** (`:12-16`). "It cannot be recomputed — it records what a person has already seen — so evidence.json is the wrong home; and it is written by the build rather than by a human, so backlog.json is too." This is the right answer to where a requirement's "ruled-against-evidence" record lives. It should not sit on the backlog item, where recorder writes have already corrupted `stages.json` (synthesis §4.6).
- **Emitting an artifact does not change what a person has seen** (`render/run.js:318-322`). Only a local build writes seals.
- **A repoint changes the evidence, never the claim** (`repoint.js:212-224`). Accepting a new capture rewrites one pointer and nothing else. The seals then show every moved screen in the next drift panel. The generalised rule: re-pinning a requirement set to a new HEAD must never rewrite a requirement. It surfaces which requirements now rest on moved evidence.

### 3.4 Why it cannot be reused as it stands

`sealOf` is tied to screenshots (`state ∈ {crop, page}`), and the store is keyed `increment id → side → row index`. The **algorithm** generalises. The **record shape** does not. A general seal is `{kind, locator, contentHash, contextHash?}`:

| Kind | Locator | Content hash |
|---|---|---|
| code | `repo:path:lines` | git blob plus a hash of the cited lines |
| Confluence | page id and version | hash of the page body |
| canvas or image | file | sha256 |
| document | file, heading and region | hash of that section |
| Jira | key and `updated` | hash of the description |

`driftKind`'s grading carries over directly:

| Seal drift type | Requirement meaning |
|---|---|
| frame-changed | locator changed |
| content-changed | the cited text changed, so re-derive |
| pixels-changed | whitespace or format only |
| image-changed | unknown, so re-verify |

---

## 4. What to build on this for the requirements pipeline

This is a proposal for the design panel, not a decision.

1. **The distiller records `readAt` on every citation**, using `resolvePin` and `blobId` at read time. The shape is `{sha, blob, dirty, pushed}`. A citation read from a dirty tree is flagged and cannot seal a requirement. This closes weakness 1.4.2.
2. **The distiller opens with `heads`** (a generalised `runHeads` keyed by repo, not absolute path), then re-reads heads before pass two (combine) and before the gate report. Movement between passes becomes a report section, not a silent inconsistency.
3. **Non-code sources are sealed too.** The source registry (synthesis §2.1 stage 0: "no shared registry with version pins") gets a content hash per acquired source, using the seal algorithm. The report's drift panel (synthesis §6.3 item 4, already present in `render/page.js`) then covers requirement sources as well as screenshots.
4. **Rulings record the seal they were made against.** This is the direct counterpart of "pixels must never move silently under a pending decision" (`seals.js:7-10`). A `decision{ruling, by, ruledAt}` (synthesis §6.1 item 22) gains `sealedEvidence`. When that evidence drifts, the decision gets a ribbon. It is not invalidated.
5. **The implementor's Plan stage runs a per-citation blob check** (§2.3.2) against the current HEAD before planning:
   - blob equal: proceed;
   - `outOfRange`: re-cite silently in the plan;
   - `missingFromFile`, `dead` or a changed section: the Plan stage **re-derives** how to meet the requirement and records what it derived. It is not a defect or a stop.
   - Only a requirement whose **claim** no longer holds (the behaviour already exists, or the premise is false) goes to the judge or the decisions ledger.
   - This replaces the wording at `increment-build-loop.js:676-677`.
6. **Heads becomes a gate.** A phase-ledger dependency (the `phase.sh` pattern with `heads` as a real prerequisite) and a non-zero exit on `moved` when the caller asks for strict mode. Today parity relies on prose for this (§1.4.1).
7. **Keep human judgement across re-derivation.** The combine pass must be re-derivable after every ruling (synthesis §7.8 item 2). `carry-forward.js` shows how to preserve a person's resolution across a full regeneration:
   - key on the stable content (`field + asWritten + ordinal`), never on positional ids (`:14-36`);
   - flag orphans and keep them, never drop them (`:38-54`).
   - The combiner should key `members` and `mergedFrom` in the same way, so a ruled atom keeps its ruling through a re-combine.

### What the synthesis should now say

- **§7.5, last bullet.** Replace it with: "Reuse parity's pinned-read, blob-id, anchor-class and seal machinery (`tim/src/parity/{heads,meta,seals}.js`, `citations/{evidence,anchor-check,github-url,carry-forward}.js`, `check-evidence.js`). Extend it with per-citation `readAt`, a blob comparison across pins, seals for non-code sources and a hard heads gate."
- **§6.1 (keep list, requirements side).** Add these items.
- **§5.1, third bullet.** Keep it as evidence that recipes rot, and note that the loop's "moved citation = defect" rule conflicts with parity's tested "re-verify, don't nudge; anchor drift never blocks" rule. The new implementor adopts parity's rule.
