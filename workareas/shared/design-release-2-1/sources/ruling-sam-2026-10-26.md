# Ruling: Sam, 26 October 2026

On the BA's find that Save and return to overview skips the checks Save and continue makes (upload documents,
origin, main reason for import), and the BA's expected behaviour:

> When I select "Save and continue" or "Save and return to overview"
> Then I should see an error message for each answer that is missing or not valid
> And I should remain on the "xxxx" page

Sam, 23 October:

> dont assume my ruling from the other day is right, this is teh BA raising the issue

Sam, 26 October, on a documents-only fix:

> No, we don't want fucking documents behaving differently. He's given you the behaviour that we should have. It
> should be consistent.

1. Save and return to overview makes exactly the same checks as Save and continue, on every page that has both
   buttons, in live animals and high-risk plants. On any missing or invalid answer the trader stays on the page with
   an error for each one and what they entered is kept; with none, the answers are saved and the overview is shown.
   Replaces c-211 (the soft save) and c-313 (its plants counterpart), which let Save and return skip blank required
   answers. New.
2. No page is an exception. Upload documents follows the same rule: a part-filled document is refused on every save
   button with an error for each missing detail, and a complete document is saved, never dropped. Built as inc-232 in
   themes/design-snagging-followups. New.
