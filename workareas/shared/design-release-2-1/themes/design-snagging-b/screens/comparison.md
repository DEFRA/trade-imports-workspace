# Design snagging B: shots retaken against the prototype (22 October 2026)

Retaken on laptop B after inc-217, inc-214 and inc-216 landed, from each frontend's own FIT specs with tracing on
(`test:fit:ci --workers=3 --trace=on`; animals: identification, check answers, confirmation and declaration specs, 95
passed; plants: declaration spec, 8 passed). Compared with `../../../snagging/screens/prototype/`. inc-219 named no
shots. Nothing here was fixed by hand.

On every page, and on the old `main` shots too, so not counted below: Arial in the trace render, not GDS Transport; a
"Log out" link and no "Templates"; the purple page maturity strip; no footer crest. Test data differs: the stub names
cattle "Cow", and the prototype's review has more answers filled in.

| Shot | Prototype | Verdict | What differs |
|---|---|---|---|
| `S38--declaration.png` | `S38--declaration.png` | Match | No Draft strip, small checkbox, bold date (the S38 row) |
| `S38--submitted.png` | `S38--submitted.png` | Intended, one spacing mismatch | "Before the consignment is imported" is test data. **Mismatch:** under Getting help, "Monday to Friday…" has a paragraph gap after the list; the prototype sets it straight under the Email bullet. The green panel is slightly wider (two-thirds column against about 600px) |
| `P-declaration.png` | none | Follows S38 | Small checkbox and bold date; plants wording in three bullets |
| `S15--one-animal-saved.png` | `S15--one-animal-saved.png` | Match on the snag | Species column present |
| `S16--one-animal-saved.png` | `S16--one-animal-saved.png` | Snag met, **mismatches** | The bordered grey-header card is the kept difference (`../prototype-differences.md`). **Mismatches:** (1) the "Cow (0102)" commodity heading is about heading-l, the prototype's is heading-m, with less space above; (2) "Enter details for Bos taurus 2 of 2" is about heading-s, the prototype's heading-m; (3) the inset says "all **animal** identification details", the prototype "all identification details"; (4) Ear tag and Passport inputs are about 390px wide against 315px; (5) the Draft line reads "Draft GBN-AG-…", the prototype "Draft Live animals - GBN-AG-…" |
| `S16--one-animal-saved--mobile.png` | same name | Intended | The summary table wraps inside the screen where the prototype's overflows (the kept S16 difference). Top of the page only |
| `S17--one-animal-saved.png` | `S17--one-animal-saved.png` | Match | Saved-animals table below the fields |
| `S17--one-animal-saved--nojs.png` | same name | Match on the snag | Form above the saved table. The S16 heading, inset and input-width mismatches show here too |
| `S18--all-animals-saved.png` | `S18--all-animals-saved.png` | Match | No completion message; full table and Remove links. S16's heading and inset mismatches apply |
| `S34--missing-answers.png` | `S34--missing-answers.png` | Match on the snag | Blank cells have no red bar; the red left border and "Complete …" message stay |
| `S34--refused-submit.png` | `S34--after-refused-continue.png` | Match on the snag | Same as missing answers: the error summary shows on first load, as in the prototype |

Review page, outside S34 (no row read covers them; possibly S32 or S35):
- Sub-headings above each card ("Where is this consignment coming from?", "Main import reason", …); the prototype has none.
- Card names: "Import details" / "Origin of import"; "4. Documents" / "4. Uploaded documents"; "5. Consignment parties" /
  "5. Consignment addresses"; "Roles and addresses" / "Addresses".
- The prototype has a red Delete button beside Continue; ours has none.
- The error link "Complete species details" has no species card to land on in this test data (no commodity line).

Not reached: the species card at phone width (the trace re-renders at 1280px and the screencast shows only the top of
the page; a full-page shot at 390px needs a spec that scrolls to the card); a plants declaration prototype (none
exists).
