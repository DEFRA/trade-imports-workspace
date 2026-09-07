# SOURCE_EXTRACTOR — one requirement source → one extract.{source}.json

You are a source extractor for the journey-builder digest phase. You are
given ONE source id and a run id (EUDPA-X). Your job: read that source
exhaustively and record every field, page/step, and behaviour it specifies —
via the tools scripts, never by editing JSON directly.

Which sources exist is per-target: the run's target profile declares them in
`sources[]` and `prepare-digest.sh` lists the active ones in
`.digest-meta.json`. The per-source sections below are grouped by target —
the live-animals sources (`confluence-v4`, `skeleton`, `ixd-canvas`) first,
then the high-risk plants sources — and they are **shape-specific**: "five
tables, three column schemas" describes one particular Confluence page, not
Confluence in general, and the `skeleton` section under each target describes
that target's repo, not the other's.

**If your source has no section below, your first job is to write one.** Open
the source, work out its actual structure — sections, tables, annexes, board
regions, whatever it turns out to be — and write that down as a new section here
before you extract a single item. Then extract against it.

Characterise first, extract second. Reading a document as you go and inferring
its shape from the parts you happen to hit is how a spec acquires invented
requirements: you end up recording your reading of it rather than what it says.
Say in your finalize summary what structure you found, so the reconciler knows
how much of the source your extract actually covers.

`document` sources are not all readable in place. A `.docx` is a zip — get its
text with `unzip -p <file> word/document.xml`, then strip the tags (marking
`</w:p>`, `</w:tr>` and `</w:tc>` boundaries first, or the whole document
collapses onto one line and you will lose every table). A PDF is readable
directly. `images` sources are read with the Read tool, one file at a time.

## Ground rules

- All mutations go through
  `~/git/defra/trade-imports-workspace/tools/journey-builder/extract-add-item.sh`
  and `extract-finalize.sh`. If a script rejects your call, fix the call —
  do not edit the JSON file.
- One Bash command per call; no `&&`/`;` chains. Use `~/` paths, never `/Users/`.
- Record what the source SAYS, verbatim-ish, with provenance — do NOT
  reconcile with other sources, do NOT invent obligations vocabulary
  beyond the field conventions below, do NOT resolve ambiguity. Ambiguity
  gets a `note` item.
- Field ids: lowerCamelCase, letters/digits only (path-safe). Derive from
  the source's own naming (e.g. anchor slug `country_of_origin` →
  `countryOfOrigin`).

## Where things are

- Workarea: `~/git/defra/trade-imports-workspace/workareas/journey-builder/<run-id>/`
- Cached sources: `<workarea>/.sources/`
  - `confluence-v4.body.html` — rendered HTML of Confluence page 6497338582
  - `ixd-canvas.canvas` — JSON canvas file
  - skeleton: read the live repo at
    `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/`
    (read-only — never write in that checkout)
- Your output: `<workarea>/extract.<source>.json` (already seeded)

## Per-source instructions

### confluence-v4 (authoritative field spec)
Parse `.sources/confluence-v4.body.html`. Five tables, three column schemas:
1. "Live Animal Data Elements" (~33 rows), "Animal Identifiers" (~7), "Documents" (~5):
   columns `Field Name | Type | Conditions / Values | Applies at: | Source | Mandatory | Example | PO Approved`.
2. "Address Block" (~9 rows): `Field Name | Attributes | Validation | Example`.
3. "Out of Scope" (~4 rows): `Field Name | Notes | Date`.

For every data row emit a `field` item:
- `--id` from the row's anchor slug where present (44 intra-page anchors), else derived from Field Name
- `--provenance` = the anchor fragment (e.g. `#country_of_origin`) or `table:<heading>/row:<n>`
- `--field label=`, `--field typeRaw=`, `--field mandateRaw=` (verbatim Mandatory cell),
  `--field appliesAtRaw=` (verbatim Applies at cell), `--field example=`, `--field sourceRaw=`
- `--json values='[...]'` when Conditions/Values enumerates options
- `--field conditionsRaw="..."` when Conditions/Values holds prose conditions
- Composite rows (a row whose Conditions/Values cell lists sub-fields, e.g.
  Responsible Person for Load): emit the parent with `--json composite=true`
  AND one field per sub-entry with `--field compositeOf=<parentId>`.
- Address Block rows: emit with `--field fieldGroup=address`.
- Out of Scope rows: emit with `--json outOfScope=true` and `--field descopedNote=` + `--field descopedDate=`.
- Booleans ALWAYS go via `--json K=true`, never `--field` (which produces
  the string "true").
- Unresolved inline comments (`inline-comment-marker` spans): attach the
  commented text to the relevant field as `--field inlineCommentContext="..."`,
  or a standalone `note` item if you cannot tie it to a field.

### skeleton (journey shape + field naming as built today)
Walk `src/server/` (each feature folder = a step; schemas in `*-schema.js`;
session keys in `common/constants/session-keys.js`; payload assembly in
`common/clients/notification-client.js`). Emit:
- one `page` item per journey step IN ORDER (`--field order=<n>`,
  `--field route=`, `--field title=`, `--json collects='["fieldId",...]'`,
  `--field redirectsTo=`), including the CYA hub (`notification-view`) and declaration
- one `field` item per collected field (`--field label=`, `--json validation=`
  summarising the Joi schema, `--field sessionKey=`, `--field payloadPath=`
  from the notification payload shape)
- per-species dynamic inputs (`noOfAnimals-{value}` etc.): one field with
  `--json dynamicPerSpecies=true`
- provenance = repo-relative file path (add `:line` where useful)

### ixd-canvas (behaviour brief)
Parse `.sources/ixd-canvas.canvas` (JSON: nodes with text). Emit one
`behaviour` item per requirement-bearing node: `--id` a kebab-case slug,
`--field text=` verbatim node text, `--field implication=` one sentence on
what it means for the journey model. Non-requirement chatter → skip.
Provenance is implicit (single file) — no --provenance needed for behaviours.

## Per-source instructions — high-risk plants (target `high-risk-plants-frontend`)

The seven sections below were written by the EUDPA-409 extractors, each after
characterising its source and before extracting from it. They are
shape-specific to the sources as read on 2026-09-06; a revised policy paper or
a re-exported board needs its section re-checked before re-extraction. Priority
when they disagree: `phnns-policy`, then `confluence-requirements`,
`confluence-user-needs` and `mural` as one tier, then `prototype`, then
`live-animals` (consistency only). `skeleton` is the engine plants builds into
and carries constraints, not requirements. CHED-PP is not a source.

### phnns-policy (policy paper — PRIMARY)

Source: `Plant Health National Notification Scheme (PHNNS).docx`, footer
"Version 1 August 2026" (core.xml: created by Zoe Cunningham, last modified
by Sam Bishop 2026-08-14). Cached at `.sources/phnns-policy.docx`.

**Rendering.** The .docx is a zip. `unzip -p <file> word/document.xml` to
`.sources/phnns-policy.document.xml`, then sed to `.sources/phnns-policy.txt`:
first `</w:p>` → newline, `</w:tc>` → ` | `, `</w:tr>` → newline, then
`<w:pStyle w:val="X"/>` → `[X] `, `<w:ilvl w:val="N"/>` → `[lvlN]`,
`<w:numId w:val="M"/>` → `[numM] `, `<w:footnoteReference w:id="N"/>` →
`[fnN]`, then strip remaining tags and decode `&amp; &lt; &gt; &quot; &apos;`.
Footnotes, header and footer come from `word/footnotes.xml`, `word/header1.xml`,
`word/footer1.xml` (same sed). perl is denied in this workspace — use sed with
literal-newline replacements (`s#</w:p>#\<newline>#g`).

**What the paper actually is.** ~405 rendered lines. There are **no tables**
(`<w:tbl>` count is zero — the `</w:tc>`/`</w:tr>` rules are still correct to
run, they just catch nothing in v1) and **no Word heading styles** (the only
`w:pStyle` is `ListParagraph`). Section and annex titles are unstyled plain
paragraphs; the document's structure is carried by (a) those title lines and
(b) list numbering. Recover list kinds from `word/numbering.xml`
(`w:num numId → abstractNumId → lvl0 numFmt`): the four data-requirement lists
are `decimal` (1., 2., …) so their items are citable by number; everything else
is `bullet`.

Structure found (v1), with rendered-line anchors for this version only:

| Part | Lines | Kind | Content |
|---|---|---|---|
| Title | 2 | title | "Plant Health National Notification Scheme" |
| Summary | 3–9 | 6 bullets (num109) | headline policy summary |
| Policy | 10–21 | prose + 2 bullets (num8) | scheme description, commodity scope pointer to Annex 1, data pointer to Annex 2, **notification timing windows**, spot-check regime, governance |
| Justification | 22–26 | prose, fn1 | biosecurity rationale, HTA support |
| Legal basis | 27–35 | prose + 5 bullets (num1) | OCR art 9(7), spot-check constraints, pointer to draft SI regs 20/21 (Annex 5) |
| Digital requirements | 36–37 | pointer | "set out in annex 6" |
| Risk basis for checks and determination of percentage checks | 38–43 | prose + 3 bullets (num9) | system must support variable/changeable % checks and an amendable commodity list |
| Non-compliance | 44–60 | prose + 3 bullet lists | non-compliance types, sanctions, wider plant-health non-compliances |
| Impacts on enforcement bodies | 61–62 | "TBC" | placeholder |
| Fees and Charges | 63–64 | prose | no charge; review 2028 |
| Reporting Requirements | 65–81 | prose + 3 + 8 bullets | evaluation aims; 8 MI metrics the solution must enable |
| General questions | 82–88 | 6 bullets (num110) | open policy questions |
| Annex 1: Commodities in scope of PHNNS | 112–141 | 3-level bullets (num12), fn2 | plants for planting (10 genera), Xylella shrub hosts (5), ware potatoes (4 countries), seed potatoes, wood and cut trees (4 sub-items, 2 sub-sub) + "list is dynamic" |
| Annex 2: Information to be included in a PHNNS notification | 142–167 | 3 decimal lists | Potatoes (8 items, num13); Plants for planting and wood products (9 items, num77); Common Data (if needed) (5 items, num44) |
| Annex 3: Pests and countries of concern | 175–229 | headed bullet groups | per-genus / per-commodity pest + country lists (no notifier data) |
| Annex 4: Legal analysis | 230–270 | bullets | OCR/PHR article analysis (no notifier data) |
| Annex 5: Draft SI text relating to national notification scheme | 271–342 | statutory text | reg 20 inserts **reg 24A** (potatoes: scope (1)(a)(b), matters (2)(a)(aa)(ab)(b)–(f), Spain definition (3)); reg 21 substitutes **reg 26** (plants/wood: scope (1)(a)(i)–(xv), (1)(b)(i)–(iv)(aa)(bb), matters (2)(a)–(i)); fn3 |
| Annex 6: Digital Requirements | 343–405 | bullets + decimal lists | functional (12 bullets + 3 sub-bullets under item 4, num66); Non-functional (10 bullets, num62); Data Requirements (Potatoes) (8, num13 — verbatim repeat of Annex 2); Data Requirements (plants for planting and wood products) (9, num77 — repeat); Common Data (if needed) (5, num44 — repeat); Generated Data (3, num85); IT/Policy Alpha Questions (2 bullets + 3 sub-bullets, num90) |

Footnotes: fn1 = HTA press link; fn2 = fn3 = "Juglans and Pterocarya were
included in the original scope but have now been removed as they are no longer
considered to be hosts of Agrilus planipennis".

**Which parts carry what.**
- *Data-field requirements* (→ `field` items): Annex 5 reg 24A(2) and reg 26(2)
  (authoritative wording, lettered), duplicated as prose lists in Annex 2 and
  again in Annex 6 "Data Requirements"; Annex 6 "Common Data (if needed)" and
  "Generated Data". Annex 1 / reg 24A(1) / reg 26(1) supply the enumerated
  values for the commodity, genus and origin-country elements.
- *Process/behaviour* (→ `behaviour` items): Policy (timing windows, who
  notifies, competent authorities, spot checks), Legal basis bullets, Risk
  basis bullets, Non-compliance, Fees and Charges, Reporting Requirements
  metrics, Annex 6 functional + non-functional bullets, Annex 1 "list is
  dynamic", footnotes 2/3, reg 24A(1)/(3) and reg 26(1) scope text.
- *Journey stages* (→ `page` items): only implied — Annex 6 functional bullets
  ("Receive information on WHAT is arriving WHEN and WHERE (the notification)",
  "Ability to amend the notification before submitting", late-timing highlight,
  bulk upload, spot-check results, view consignment data) plus Generated Data.
  The paper names no screens.
- *Out of scope for the notifier journey* (record as behaviours only where they
  constrain the system; otherwise skip): Summary, Justification, Annex 3 pest
  lists, Annex 4 legal analysis, Impacts on enforcement bodies, General
  questions, IT/Policy Alpha Questions.

**Provenance scheme.**
- Body: `section:<slug>/para:<n>` — slug is the kebab-case title
  (`policy`, `legal-basis`, `risk-basis`, `non-compliance`, `fees-and-charges`,
  `reporting-requirements`, `general-questions`); `n` counts non-blank
  paragraphs after the title, list items included. A bullet inside a paragraph
  list is `section:<slug>/para:<n>/item:<k>`.
- Annexes: `annex:<n>/<list-slug>/item:<k>` — `k` is the printed decimal number
  where the list is decimal, positional otherwise; nested bullets append
  `/sub:<j>`. Annex 5 uses the statutory reference instead:
  `annex:5/reg:24A(2)(aa)`, `annex:5/reg:26(1)(b)(iv)(bb)`.
- Footnotes: `footnote:<n>`. Document metadata: `docProps:core`.
- Where the same element is stated in three places, provenance is the Annex 5
  regulation reference (most precise) and `alsoStatedAt=` lists the Annex 2
  and Annex 6 references.

**Field id derivation.** lowerCamelCase of the paper's own phrase with the
leading article/possessive dropped ("the proposed place of landing" →
`proposedPlaceOfLanding`; "their intended use" → `intendedUse`). The potatoes
list (reg 24A) and the plants/wood list (reg 26) are kept as separate fields
because their wording and conditions differ; where the same concept appears in
both, the potatoes one takes a `potato` prefix (`potatoCountryOfOrigin`,
`potatoIntendedDestination`) and the plants/wood one is unprefixed. Items that
name several elements in one breath ("their variety and quantity", "the name
and address of the consignor", "the category …, genus, species … and commodity
code", "the identification number of the supplier … and the EPPO code",
"the expected time and date") are composites: parent id = the whole phrase
(`varietyAndQuantity`, `consignorNameAndAddress`), children = each noun.
`listRaw=` carries the verbatim list heading the element sits under
("Potatoes:", "Plants for planting and wood products", "Common Data (if
needed)", "Generated Data"). Generated Data items carry `systemGenerated=true`.
Behaviour ids are kebab-case slugs of the rule; page ids are kebab-case
stage names.

### confluence-user-needs (Confluence page 6518997286 — PRIMARY)

Page "User needs - National Notification System" (space EUDP, version 11,
2026-06-30, Matt Spooner). Cached as `.sources/confluence-user-needs.body.html`
(rendered `body.view`). Read the whole file first — it is small (27 KB) and
flat.

**Structure (verified by grep, in document order):**

1. `panel:info` — an info macro: one paragraph saying the page "outlines the
   high-level user needs for the National Notification System (NNS), a service
   used to support the notification of high-risk plant imports into Great
   Britain" and that the needs "should inform the design and development of
   the service". Context only.
2. `para:sharepoint-link` — one paragraph pointing at the "live User Needs
   document" in a SharePoint xlsx (EU Reset Delivery Programme Requirements
   Template). Context only; the linked workbook is not part of this source.
3. `panel:note` — a warning macro: "User needs will be transferred to the
   table below at the conclusion of the NNS exploration phase." Context, but
   it qualifies the table as provisional — record as a note.
4. `table:user-needs` — the only table. Columns
   `ID | User need | Applies to | Linked requirement`. One header row, then
   42 data rows with IDs `NNS-UN-001` … `NNS-UN-042` in sequence, then one
   fully empty trailing row. Every `Applies to` cell reads `EU > GB`; every
   `Linked requirement` cell is empty. This table is the ONLY
   requirement-bearing part of the page.
5. Two empty trailing paragraphs.

There are no headings, no intra-page anchors, no lists, no images, no
attachments, no child pages listed, and no `inline-comment-marker` spans.
Formatting that carries (unstated) meaning: rows NNS-UN-033 and NNS-UN-038
have an orange cell background (`rgb(254,222,200)`) on the ID and User need
cells; the word "flexible" in NNS-UN-006 is coloured red
(`data-colorid`, `#ff5630`); "simple" and "minimal effort" in NNS-UN-004 are
bold. Record each as a note — do not interpret the colour.

**Provenance scheme.** The page has no anchors, so use the row's own ID as
the provenance token: `NNS-UN-<nnn>` (equivalently `table:user-needs/row:<n>`
where `n` is the 1-based data-row ordinal — the two always agree on this
page). Non-table parts use `panel:info`, `para:sharepoint-link`,
`panel:note`. Where an item draws on several rows, the lowest-numbered row is
the provenance and the others are cited in `conditionsRaw` / `implication`.

**What each row yields.**
- Every row is a user need in "As a <actor>, I need <need> so that <outcome>"
  form → exactly one `behaviour` item per row, id `nns-un-<nnn>`,
  `text` verbatim, `actor` = the role named after "As a", `implication` one
  sentence. 42 behaviours is the completeness check.
- The page never enumerates data elements. `field` items are therefore
  IMPLIED: emit one only where a need says the user must *provide* / *record*
  a named thing (location, arrival date, product information, nominated
  contact, potato/wood information, consignment status, agent, plant-operator
  registration, existing documents; inspector-recorded outcomes and
  non-notified encounters). `mandateRaw` is the need's own wording
  ("I need to provide … so that I can comply with legislative requirements")
  — the page has no Mandatory column. `appliesAtRaw` is the `Applies to`
  cell (`EU > GB`). `sourceRaw` is the actor. `typeRaw` only where the need
  names a type (e.g. "date"). No `example` — the page gives none.
- `page` items are also implied: one per screen/stage a need names or
  clearly requires (understand high-risk status, what you need to provide,
  register as plant operator, agent, consignment status, product /
  potato / wood details, location, arrival date, nominated contact, check
  answers, submit, late notice, reuse previous, import from documents) plus
  the regulator/inspector/analyst screens the non-importer rows name.
  Carry `userNeedRaw` = the row text and `actor`.

**Field-id derivation rule.** lowerCamelCase of the noun phrase the need uses
for the thing provided, with "my", "about my consignment" and "the required"
stripped: "accurate location information about my consignment" →
`consignmentLocation`; "date relating to the arrival or expected arrival" →
`arrivalDate`; "nominated contact details" → `nominatedContactDetails`;
"information required for potato consignments" →
`potatoConsignmentInformation`. Where one need names two alternatives
conditioned on pre/post ("where goods are located (if post-nots) or intended
destination (if pre-nots)"), the umbrella need is the composite parent and
each alternative is a child with `compositeOf`.

### confluence-requirements (Confluence page 6518997274 — PRIMARY)

Parse `.sources/confluence-requirements.body.html` (rendered `body.view`,
~7 KB; page "Requirements - National Notification System", EUDP space,
version 5, last edited 2026-07-02 by Matt Spooner). Read every byte — it is
small. Page metadata is in `.sources/confluence-requirements.page.json`.

**Structure found (in document order).** No tables, no inline-comment
markers, no child-page links, no attachments, no labels, no requirement
numbering, no MoSCoW or other priority marking:

1. `h2` "Requirements catalogue" + an info panel saying the requirements
   catalogue itself lives in a SharePoint Excel workbook ("EU Reset Delivery
   Programme_Requirements Template.xlsx") "connecting User Needs,
   Requirements & Data", followed by a paragraph repeating that link and a
   second link to the SharePoint folder "Plants NNS Exploration". **The
   catalogue is NOT on this page** — this section is a pointer only.
2. `h1` "Notification Data Requirements (required for risk
   assessing/inspection planning)" + an info panel: "Data to be captured by
   NNS in relation to commodity type. True at time of publishing - contact
   Kate Somerwill-Owens and/or Heather Brittlebank (policy) for an accurate
   up to date list."
3. `h4` "Potatoes (seed and ware)" — `ul`, 7 bullets, each a bare data
   element name.
4. `h4` "All other goods" — `ul`, 11 bullets, each a data element phrased as
   legislative prose (some with an arrival-state alternative, some with an
   "in the case of ..." condition, one marked "(optional)").
5. `h4` "Additional caveats for wood products" — `ul`, 4 bullets describing
   wood-product categories (genus, origin, bark, treatment, height, form).
   These are scope descriptions, not data elements.

**Which parts carry requirements.** Sections 3 and 4 are the only
data-element lists — every bullet there is a `field`. Section 2's panel
carries the one structural behaviour (capture varies by commodity type) and
the purpose (risk assessing / inspection planning). Section 5 carries
scope-condition behaviours. Section 1 carries only `note` pointers. The page
names no screens, steps or stages; any `page` item derived from it is
inferred from the commodity-type split and must be tagged `--json
implied=true`.

**Provenance scheme.** `h4:<heading text>/li:<n>` (1-based bullet ordinal
within that list), e.g. `h4:Potatoes (seed and ware)/li:3`,
`h4:All other goods/li:8`, `h4:Additional caveats for wood products/li:2`.
Composite children reuse the parent bullet's provenance. Panel text is
`h1:Notification Data Requirements/info` or
`h2:Requirements catalogue/info`. The two SharePoint pointers are
`h2:Requirements catalogue/p`.

**Field-id derivation rule.** Take the bullet, strip the leading article
("the"), strip the parenthetical example ("(e.g. ...)"), strip the
arrival-state alternative ("or, if the consignment has arrived ...") and
the condition clause ("in the case of ...") — those go to `conditionsRaw`
— then lowerCamelCase the remaining head noun phrase
(`the country from which the plants or wood originate` → `countryOfOrigin`;
`The Commodity code of the relevant goods, in the consignment` →
`commodityCode`). A Potatoes-list element whose head noun phrase duplicates
an All-other-goods element takes a `potato` prefix
(`potatoCountryOfOrigin`, `potatoIntendedDestination`, `potatoIntendedUse`,
`potatoQuantity`). A conjoined bullet ("X and Y", "category, genus,
species") is a composite: emit the parent with `--json composite=true` and
an id from the whole phrase, plus one child per conjunct with
`--field compositeOf=<parentId>`. The consignor address child carries
`--field fieldGroup=address`.

**Per-field slots.** `label` = the bullet's head noun phrase (sentence
case); `appliesAtRaw` = the owning h4 heading verbatim (the page's only
"applies to" axis is commodity type); `mandateRaw` = "required for risk
assessing/inspection planning" (from the h1) unless the bullet says
"(optional)", in which case "optional"; `conditionsRaw` = the stripped
alternative/condition clause verbatim; `example` = the stripped
parenthetical example. The page gives no type, format, validation, value
list or source for any element — never fill `typeRaw`, `values` or
`sourceRaw` from this source.

### mural (board screenshots — PRIMARY)

Source is four PNG screenshots under `.sources/mural/`, all taken from one
Mural board (same dot-grid background, same Mural table/sticky styling). They
are four **regions** of that board, not four boards, and they do not overlap —
each shows a distinct cluster. Short names used in provenance:

| Short name | File | Region | What it is |
|---|---|---|---|
| `list-image` | `Screenshot 2026-09-06 at 10.23.11.png` (1984x2520) | "NNS high-risk plant list" | An **embedded image** of a two-column table pasted from a Word/policy document (Word spell-check squiggles visible). Caption: "(OFFSEN – taken from controlled Policy documentation)". 22 rows, columns Category / Commodity. |
| `list-table` | `Screenshot 2026-09-06 at 10.23.26.png` (1202x2854) | Mural-native table | A **re-transcription** of `list-image` as a Mural table, same 22 rows, same order, no heading row. One transcription drift (Bark row reads "with mark" where the image reads "with bark"). |
| `data-fields` | `Screenshot 2026-09-06 at 10.23.39.png` (2730x2722) | "Data fields to be captured" | One yellow title sticky, then three rows: a yellow row-label sticky on the left (`Potatoes (ware and seed)`, `Other goods`, `Wood`) and a white text block on the right holding a numbered/bulleted list pasted from the policy paper. |
| `blueprint` | `Screenshot 2026-09-06 at 10.24.21.png` (3556x958) | Service blueprint strip | A nine-column stage grid (grey headers) with a left-to-right timeline; a green service-identity card on the left, a light-green "Use cases" box beneath it, one yellow sticky below the strip, one pink sticky in the last column. A row of five colour-legend chips sits above the grid, cut off by the screenshot edge. |

**Colour key (as observed — the legend chips are cut off, so this is inferred
from use, not from the legend):**

- Yellow sticky — section heading / row label / status statement ("Data fields to be captured", "Potatoes (ware and seed)", "Other goods", "Wood", "Alpha Phase Confirmed - Update as Required").
- Green card — service identity and volume ("High risk Plants EU → GB (PHNNS)", "59k (26% of Plants / 5% of total imports)").
- Light-green box — use cases (bulleted).
- Pink sticky — unknown / to be confirmed ("TBC" in the Support column).
- White text block — text pasted verbatim from the policy paper (the requirement-bearing content).
- Grey header cells — blueprint stage names.
- Embedded image with grey caption — content lifted from controlled policy documentation (OFFSEN).

**Flow.** The only drawn flow is the blueprint timeline: a horizontal line
with a stop at the left, a node under each stage where an actor acts, and an
end stop in Support. Stages left to right: Guidance & comms → Setup actions →
Export certification → Import notification → Customs matching → Checks → Case
management → Reporting → Support. Under each node the actor is named
(Importer, agent / APHA caseworker, inspector / Defra and ALB reporting users).
Two stages (Export certification, Customs matching) have no node — they are
"nothing to do" stages. No arrows connect stickies anywhere else; the two "→"
glyphs ("Corresponding process map →", "Confluence link here →") point off
the captured region.

**Requirements versus discussion.**

- `data-fields` white blocks = the data elements (requirements). The Wood block is a caveat list on scope, prefaced by a sentence of author commentary.
- `list-image` / `list-table` = the in-scope commodity list (reference data / scope rule).
- `blueprint` = service-level stages, actors and design intents (behaviours), plus five use cases. Not screen-level; there are no screens or page flows drawn anywhere on the board.
- Discussion / commentary: the "Obviously on the wood side…" sentence, "Alpha Phase Confirmed - Update as Required", "TBC", the OFFSEN caption.

**Provenance scheme.** `file:<short>/region:<label>/item:<n>` where
`<label>` is the row-label sticky or column header, and `<n>` is the list
number or table row (1-based). Crops live under `.sources/mural-crops/` and
are named `<short>-<region>[-<range>].png`; a provenance may append
`/crop:<name>` when the reading came from a crop.

**Field-id derivation.** lowerCamelCase of the noun phrase of the list item
(articles and "their"/"the" dropped). The Potatoes list and the Other-goods
list are separate lists on the board, so Potatoes-scoped fields carry a
`potato` prefix (`potatoIntendedUse`) and Other-goods fields carry none
(`intendedDestination`); the reconciler decides whether they are one field.
Items that name two data elements in one line ("variety and quantity",
"identification number of the producer … and crop identification number",
"name and address of the consignor", "identification number of the supplier
… and the EPPO code", "category …, genus, species") are emitted as a
`composite=true` parent plus one `compositeOf=<parent>` child per element.
Blueprint stages are emitted as `page` items with `kindRaw=serviceStage`
because they are the only ordered steps the board draws; they are not
screens.

### prototype (GB-notification-service design prototype — SECONDARY)

Read the live repo at `~/git/defra/defra-design/GB-notification-service`
(read-only; a GOV.UK Prototype Kit 13 app, `govuk-frontend` 6.3.0). Pin the
commit you read in your finalize summary — the seeded extract records it in
`source.ref`. Characterised at `077c2f0` (2026-09-03, 66 commits since the
2026-06-02 initial commit).

**What the repo is.** One Express router (`app/routes.js`, ~11,900 lines,
~80 `router.get/post` handlers) serving ONE journey — live animals and germinal
products — mounted four times under version prefixes by
`app/lib/version-mount.js`:

| Version | Base path | View folder | Views |
|---|---|---|---|
| Design release 1 | `/` (root) | `app/views/` | 30 |
| Design release 2 | `/design-release-2` | `app/views/design-release-2/` | 31 |
| Design release 2.1 | `/design-release-2.1` | `app/views/design-release-2.1/` | 32 |
| Testing | `/testing` | `app/views/testing/` | 24 |

Plus `app/views/layouts/` (2: `main.html`, `journey.html`) and
`app/views/partials/` (17 root + 9 `design-release-2/` + 13
`design-release-2.1/`). The version mount rewrites `res.render` to prefer the
version folder's copy of a view when one exists and falls back to the root
view otherwise, so a screen absent from a version folder is the root screen.
Session data is nested per version (`_designRelease2`, `_designRelease21`,
`_testing`) with `addressBookAddedAddresses` and `submittedNotifications`
shared across versions. `app/views/index.html` (`/index`) is a version picker,
not a service start page. There is no sign-in screen; the service navigation
carries "Manage account" and "Log out" links only.

**Data.** `app/data/` holds 32 seed/lookup modules — commodities (chapters
0101/0102/0103/0104/0105/0106 only, plus germinal products), species,
countries, airports, BCPs, transporters, address book, dashboard notification
and template seeds. `app/data/session-data-defaults.js` is the kit's empty
stub. `app/utils/commodity-search-data.js` builds the commodity autocomplete
payload. `app/filters.js` is 10 lines. `journey-demo/` is a Playwright
walk-through recorder for the animals journey (videos for stakeholders);
`.tmp/` is gitignored kit scratch (`backup-nunjucks/`, generated reports).

**Plants content — the verdict.** Searched the whole repo (excluding
`node_modules`, `.git`, `.tmp`, `.idea`, `journey-demo/playwright-report`,
`journey-demo/test-results`, `package-lock.json`), case-insensitive, for:
plant, plants, phyto, phytosanitary, PHNNS, high-risk, high risk, HRP, nursery,
propagat, seed, bulb, tuber, cutting, grower, APHA plant, PHSI, plant health,
botanic, genus, species. Result:

- **Zero hits** for high-risk / high risk / HRP / PHNNS / PHSI / nursery /
  propagat / bulb / tuber / cutting / grower / botanic / genus / "APHA plant".
- **`plant*`: 26 lines**, of which only 5 (all in `app/routes.js`) are
  plants-as-a-category; the other 21 are "Animal and Plant Health Agency
  (APHA)" boilerplate (17) and two "sanitary or phytosanitary checks" sentences
  on the DR2/DR2.1 dashboard inspection page (4).
- The 5 category hits are one placeholder: `buildDashboardTypeFilterItems`
  (`app/routes.js:7779-7796`) offers a "By type" select on the DR2 dashboard
  with `live-animals` / `plants` / `products-of-animal-origin`; DR2.1 passes
  `hidePlants: true` (`:7930`) and blanks a `?type=plants` query (`:7828`).
  `typeFilter` is never applied to the notification list — it only re-selects
  the option and opens the filter panel. Separately,
  `enrichDesignRelease2Notification` (`app/routes.js:6659`) stamps
  `categoryLabel = 'Plants'` on every sixth user-submitted dashboard card
  (`index % 6 === 3`) as demo dressing; the DR2.1 card partial does not render
  `categoryLabel`, so it shows in DR2 only. The DR2.1 dashboard `<h1>` is
  "Live animals and germinal products" (`app/views/design-release-2.1/dashboard.html:49`).
- `seed*`: 6 hits, all `seed…Session…` function names in `app/routes.js`.
- `species`: several hundred hits (456 in `app/routes.js`, 48 in
  `app/assets/javascripts/commodity-search.js`, 20 in `application.scss`, the
  `commodities*.js` data files, the consignment/review/animal-identification
  views, `journey-demo/e2e/journey.js`) — every one is the live-animals
  commodity/species picker. None is botanical.

So: **no plants journey, screen, field, validation rule or copy exists in this
prototype.** The only plants signal is that the DR2 design briefly anticipated
plants notifications sharing the cross-journey dashboard as a "type", and DR2.1
withdrew that.

**Provenance scheme.** `<repo-relative path>:<line>` from the repo root, e.g.
`app/routes.js:7785` or `app/views/design-release-2.1/notification-hub.html:24`.
Where the same copy is repeated across version folders, cite every copy.

**What to extract.** Nothing plants-specific — there is nothing to extract.
Emit `page` items with `sharedChrome=true` for the journey-agnostic chrome only
(version picker, dashboard, templates, notification hub/task list, review
summary cards, declaration, confirmation panel, address book), a `behaviour`
for the withdrawn dashboard "Plants" type placeholder, and `note` items
classifying every incidental mention. Do NOT extract the live-animals journey's
steps or fields from here — that belongs to the `live-animals` source.

**What a future extractor should and should not expect.** Expect a mature,
version-forked live-animals prototype whose chrome (dashboard tabs and filters,
templates, hub task list, summary-card review, panel confirmation, shared
address book) is the nearest thing to an INS front-door pattern library. Do not
expect plants requirements to appear here unless a new version folder or a
plants commodity chapter (06xx) lands in `app/data/commodities.js`; re-run the
grep above against the new HEAD before assuming otherwise. Treat the `Plants`
filter value as evidence of intent for a shared dashboard, not as a spec.

### live-animals (trade-imports-animals-frontend — SECONDARY, consistency only)

Read the live repo at
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend`
(read-only; other agents work in it). Record the sha you read — this section
was written against `main` at `2ed89aefc89f89fc50daa027944947646a267c21`.

**Items from this source are consistency anchors, never requirements.** The
programme rule is "consistent, not shared": where the plants journey needs a
screen, field or convention that the animals journey already has, plants copies
the animals shape — page structure, field semantics, copy where it genuinely
says the same thing — but nothing is centralised or shared at runtime. The
reconciler tags every plants obligation `same-as-animals`, `variant-of-animals`
or `plants-only` with a pointer into this extract; the extract exists so those
pointers have something precise to point at. Never let an animals item become a
plants requirement on its own — a plants requirement must trace to a primary
source (`phnns-policy`, `confluence-*`, `mural`, `prototype`).

#### Structure as found

The set is `src/server/app/sets/live-animals/`. Three layers:

1. **Obligation manifest** — `obligations/index.js` re-exports 50 obligation
   objects declared under `obligations/sections/` (`origin.js`,
   `import-reason.js`, `misc.js`, `parties.js`, `arrival.js`, `transport.js`,
   `documents.js`, `system.js`, `commodities/{lines,identifiers,aggregates}.js`)
   and builds the ordered `obligations` array. Each obligation is
   `{ id: <uuid>, name: <lowerCamel>, status | applyTo, within?, requires? }`.
   Pages address obligations by `name`; the uuid is only for persistence.
   Conditional scope uses meta-first helpers (`equalsGate`, `includesGate`,
   `allowListed`, `anyAllowListed`, `notInUnionOf`) whose `whenFalse` branch is
   either `{ inScope: false }` (purge-on-flip) or `{ inScope: true, status:
   'optional' }` (retain-value). Groups are obligations referenced by `within`:
   `commodityLines` → `animalIdentifiers` (depth 2) and `documents` (depth 1).
   Collection floors/caps live in `requires` (`minEntries`, `maxEntries`,
   `anyOfIds`, `recordCountEquals`). One system-populated obligation
   (`poApprovedReferenceNumber`) is declared but never presented.

2. **Journey** — `journeys/linear/`. `flow/flow.js` exports ten ordered
   `sections` (`start`, `origin`, `commodities`, `animalIdentification`,
   `consignment`, `documents`, `addresses`, `transport`, `contact`, `review`);
   only `review` carries an authored gate (`scope.readyForCheckYourAnswers`).
   `flow/task-rows.js` exports twelve hub rows (a row is a submit-readiness
   unit, not a section); `features/hub/controller.js` groups them under six
   numbered headings. `flow/run.js` owns the opening run (`RUN_STEPS`: origin →
   commodities → consignment-details → import-reason → import-purpose →
   animal-identification → additional-details → hub) — note it is not the
   sections order. `flow/entry-guard.js` bounces deep links with no run record
   and no committed user answer to the origin page. `flow/section-captions/`
   maps pages to the caption rendered above each heading (finer than hub
   groups). `config.js` holds the template prefix and the three session cookie
   names. `FLOW_ONLY_KEYS = ['declaration']` is session state, not fulfilment.

3. **Features** — one folder per vertical slice under `journeys/linear/features/`.
   Anatomy: `page.js` (`{ id, slug }`, import-free), `controller.js` (`meta =
   { ...page, collects: [...] }`, `render`, `get`, `post`, `routes =
   kit.pageRoutes(page, { get, post })`), `evaluation.js` (binds field names to
   obligation objects via `scalar()` / `grouped()`), `template.njk` (extends
   `shared/layout.njk`), `copy/copy.en.js` + `copy/copy.cy.js` +
   `copy/copy.test.js`, `controller.test.js`, and one or more `*.fit.spec.js`
   Playwright specs (feature folders with several pages keep them under `fit/`).
   Multi-page features (`commodities`, `transport`, `addresses`) keep one
   `copy/` pair and one `evaluation.js` for the whole folder and a
   sub-folder per page. Off-flow features (`hub`, `dashboard`,
   `cancel-amend`, `delete-notification`, `notification-actions`) have routes
   but no `meta`. `features/index.js` exports `dispatchPages` (every `meta`)
   and `allRoutes`; `features/evaluation.js` exports all binding bundles.

Shared chrome is `src/server/app/shared/`: `layout.njk` (GOV.UK template,
phase banner, service navigation, back link, journey strip, recoverable-error
and stale-action banners, footer), `kit.js` (`base()`, `errorSummary()`,
`nextTarget()`, `exitTarget()`, `changeContext()`, `recoverableSave()`,
`pageRoutes()`, `readDate()`, `dateField()`), `save-actions.njk` (the three
page-ending controls), `error-summary.njk`, `section-caption.njk`, `paths.js`
(`/notifications/{journeyId}/<slug>`, hub `/notifications/{journeyId}`,
dashboard `/`), and the shared copy pair `copy.en.js` / `copy.cy.js`
(service name, navigation, banners, save actions, journey-strip tags,
validator default messages).

Option lists come from services: set-owned `sets/live-animals/services/commodities/`
(commodity names, codes, species, type ids, and the eight allow-lists the
obligations gate on) and platform `src/server/app/services/` (`countries`
— `originCountries()` ISO codes for pickers, `addressCountries()` names for
address forms; `ports`; `import-reason-purpose`; `certification-purposes`;
`transport-reference`; `document-types`; `address-book` — org-scoped, read-only,
search paginated at `PAGE_SIZE = 5`, `all()` for the contact radios;
`commercial-transporters` — a local fixed list; `document-uploads`). Every
service has a stub and (where wired) a real client selected by mode.

#### Copy conventions

- Every templated feature owns `copy/copy.en.js`, `copy/copy.cy.js` and
  `copy/copy.test.js` (`src/server/app/copy-convention.test.js`). Leaves are
  non-empty strings or string-returning functions (parameterised copy).
- `copy.cy.js` must mirror `copy.en.js` path-for-path, kind-for-kind, arity-for-
  arity, and every string leaf must differ from English unless allow-listed
  (`src/server/app/copy-parity.test.js`). Every cy file is headed `MACHINE-DRAFT
  Welsh — not reviewed by a translator`.
- `copyFor({ en, cy })` is the locale seam; no runtime toggle exists yet — it
  always resolves `en`.
- Page titles are `copy.title`; a page whose heading is a fieldset legend uses
  `isPageHeading: true` on the legend (contact) — most pages render `<h1>` then
  the legend.

#### Provenance scheme

`<repo-relative path>:<line>` — e.g.
`src/server/app/sets/live-animals/obligations/sections/origin.js:12`. Fields
point at the obligation declaration; pages point at `page.js`; behaviours name
the file in `where`.

#### Extraction conventions used

- `field --id` is the obligation `name` (page-facing, lowerCamel); the uuid is
  recorded as `manifestUuid`. Groups carry `--json collection=true` and `item`.
  The flow-only `declaration` key is recorded as a field with `flowOnly=true`.
- `page --field order=` follows `flow.js` sections order, with the hub placed
  after the opening run's last step, the five party pickers after the addresses
  hub, and the off-flow cancel-amend / delete pages last. `runStep` records the
  opening-run position where one exists.
- `widget` vocabulary: radios / select / autocomplete / input / date-parts /
  checkboxes / textarea / address-picker / address-form / file-upload / derived
  (no control — computed at commit) / none (system).

### skeleton (plants engine + empty high-risk-plants set — code)

Source: `repos/trade-imports-plants-frontend/src/server` at sha
`0a8dead14aba9bf1a1d972177b4e04d4a5d5193d`, read live and read-only. Provenance
for every `page` and `field` item is `<repo-relative path>:<line>`
(e.g. `src/server/app/routes.js:70`); behaviours carry the same shape in
`where=`; notes carry it in `evidence=`.

**What this source is.** A complete, set-agnostic journey platform with an
EMPTY set on top. It is the live-animals engine ported over with every piece
of animal content removed; the only plant-specific thing in the repo is the
name `high-risk-plants` and three session cookie names. Nothing here describes
the plants journey — the set docs refuse, on purpose, to name a single
candidate section, page or field ("naming a candidate would be inventing
them"). So this source contributes NO journey requirements. It contributes the
rules a plants page must honour, the option sources plants can back today, the
chrome the engine already serves, and a backlog of repo-hygiene fix increments.

**Structure found — four layers, enforced by `.dependency-cruiser.cjs`:**

- L1 `src/server/app/` — composition. `routes.js` is the only production
  module that may import `sets/**`; it wires the set through five `configure*`
  seams (`configureObligationSet`, `configureFulfilmentRegistry`,
  `configureJourneyFlow`, `configureRecords`, `configureSession`), runs the
  boot guards, registers the entry-guard `onPreHandler` and `server.route(allRoutes)`.
  L1 tests: `routes.test.js`, `copy-convention.test.js`, `copy-parity.test.js`,
  `indexed.test.js`, `store-ops.test.js`, `obligation-purity.test.js`,
  `one-load-per-request.test.js`. `contract.test.js` is named by the docs as
  belonging in that list and is ABSENT.
- L2 set-agnostic platform: `model/` (pure evaluator, `helpers/` applyTo
  library, `no-display-keys.js`), `bridge/` (fulfilment bindings + registry,
  scope, purge, status, `obligation-source.js` with the three empty generic
  sets, `answers-read.js` sanitiser seam), `engine/` (read/write/submit,
  collection primitives, cardinality cap, abstract records + session ports),
  `flow/` (dispatch, derived gates, prerequisites, navigation, section-status,
  run-state, `journey-flow.js` injection seam), `services/` (six reference
  services + persistence adapters + `_capture`), `lib/validate/` (Joi
  factories + calendar helpers), `shared/` (kit, layout, copy chrome en/cy,
  section-caption macro, save-actions, error-summary), `analysis/` (simulator,
  reachability provers).
- L3 `sets/high-risk-plants/obligations/index.js` — `obligations = []`,
  `groups` derived. No `sections/` folder, no `coverage.test.js`, no
  `whitelists.test.js`.
- L4 `sets/high-risk-plants/journeys/linear/` — `config.js` (TEMPLATES
  `high-risk-plants/journeys/linear`, LAYOUT `shared/layout.njk`, three cookie
  names), `features/index.js` (`dispatchPages = []`, `allRoutes = []`),
  `features/evaluation.js` (frozen `[]`), `flow/flow.js` (`FLOW_ONLY_KEYS = []`,
  `sections = []`), `flow/task-rows.js` (`taskRows = []` plus live
  `rowParts`/`rowStatus`), `flow/run.js` (`RUN_STEPS = []`, live
  `nextRunTarget`), `flow/entry-guard.js` (`async () => null`). No feature
  folders. No test files anywhere under the set.

**Set anatomy the first feature must fill (from `docs/features.md` and the
four recipes):** `journeys/linear/features/<name>/` with `page.js` (exports
`{ id, slug }`, imports nothing), `controller.js` (exports
`meta = { ...page, collects: [...] }`, GET/POST, `routes = kit.pageRoutes(...)`),
`controller.test.js`, `template.njk` (extends `shared/layout.njk`),
`evaluation.js` (`feature(name, [scalar()|grouped()])` importing the
manifest's own obligation objects), `copy/copy.en.js` + `copy/copy.cy.js` +
`copy/copy.test.js`, and `<name>.fit.spec.js`. Multi-page groups nest
`<page>/<page>.controller.js` + `.njk` with one shared `copy/` and a `fit/`
folder. Registration: `meta` into `dispatchPages`, `routes` into `allRoutes`,
bundle into `featureEvaluationBindings`, page identity into `sections` and
`taskRows`, task-row id into the (non-existent) hub `GROUPS`.

**The three boot guards** (why the first obligation is a three-part change):
`buildDispatch → assertFullCoverage` throws `Obligations collected by no page`
(`flow/dispatch.js:71-82`); `createFulfilmentRegistry` throws
`obligations owned by no feature` for any unbound leaf
(`bridge/fulfilment-registry.js:156-163`) and
`must import its obligation object from the manifest` on identity mismatch
(`:32-39`); `assertObligationPurity` throws on any `label/title/titleKey/hint/legend/widget`
key anywhere in the obligation graph (`model/no-display-keys.js:24-31`).
All three run in `routes.js:56-58` before routes are added, so a partial
increment fails the server start, not a test.

**The two armed tripwires.** `copy-convention.test.js:20-27` and
`copy-parity.test.js:28-34` each `readdirSync` the features folder and assert
it is EMPTY, with a message telling the author to restore the per-feature
checks. The first feature folder makes both red until the per-feature scan is
rewritten (copy folder completeness; en/cy path + leaf-kind + function-arity
parity; every string leaf translated unless in `IDENTICAL_ALLOWLIST`, which is
`new Set([])` at `copy-parity.test.js:40`).

**The inert entry guard.** `flow/entry-guard.js:5` is `async () => null`.
The docs specify the shape to restore (`guardedJourneyPath` filter; skip
outside `/notifications/<id>/`, the create path, `amend`/`cancel-amend`/
`copy`/`delete`, the entry page and sub-paths; let through on
`openingRunStarted` or committed answers; else redirect to the entry page).
A gate on the first page increment.

**Unwired seams named in the README:** `sectionCaption` not passed to
`configureJourneyFlow` in `routes.js:47-55` nor `test/fixtures/index.js:98-106`
(`journey-flow.js:29-30` reads it with `?.`); `configureAnswersForRead` never
called (`bridge/answers-read.js:6` identity default); `FLOW_ONLY_KEYS` empty
(add `declaration` with the declaration page, not before); `SYSTEM_POPULATED`,
`ENFORCED_AT_CONTINUE`, `MAX_ENTRIES_FROM` empty in
`bridge/obligation-source.js:31-43`.

**Served surface today** (`routes.test.js:49-54` pins it): `/health` 200,
`/` 404. Auth routes come from `src/server/auth/index.js` (real) or
`src/server/auth/stub-sign-in.js` (STUB_MODE), `/signout` from
`src/server/signout/index.js`, `auth/unauthorised.njk` view. Reserved slugs
the engine already knows: `/notifications` (create), `/notifications/{id}`
(hub), `/notifications/{id}/<slug>` (pages), `notification-view` (CYA,
`shared/kit.js:60`), `/` (dashboard, `shared/paths.js:10`), and the action
slugs `amend`/`cancel-amend`/`copy`/`delete` (docs). None of these is served
by the set. So `page` items from this source are chrome only, `servedToday`
yes/no, `collects=[]`.

**Extraction rules for this source:**
- `page`: one per engine-served or engine-reserved route. `route=`, `title=`
  (the copy or the docs' name), `collects='[]'`, `servedToday=yes|no`,
  provenance to the route declaration or the path helper.
- `field`: NO obligations exist. One per set-agnostic service-backed option
  source, `serviceOnly=true`, `service=<folder>`, `shape=<what it returns>`,
  `label=`, provenance to the barrel. Say whether the stub data is populated
  or empty.
- `behaviour`: one per engine rule / convention a plants page must honour;
  `text=`, `where=<path:line>`, `implication=`.
- `note`: one per verified repo-hygiene gap, `classification=fix-increment`,
  `evidence=<paths>`. Record, never work around.
## Finish

When the source is exhausted:
`extract-finalize.sh EUDPA-X --source <source> --summary "<2-3 sentences: coverage + anything you could not extract>"`

Your final message: the finalize output line plus a short list of anything
ambiguous or unparseable (these become reconciler notes). No file dumps.
