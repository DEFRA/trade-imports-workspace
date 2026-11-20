# Ruling: Sam, 19 November 2026

Given in the overview-and-review build session, answering the theme's engineering review
(review:engineering-2026-11-19, https://claude.ai/artifact/TrAdrBupdoyCP4YJmXjuJL), which listed what the theme does
differently from the service's existing patterns.

1. **Plants shows the notification task list heading visibly**, as live animals does. The copy is **"Notification
   task list"** ("task list" as two words, the GOV.UK spelling) in both services.
2. **Each header button gets its own form**, as every other posting button in the service does: Amend, Copy as new
   and Delete on the notification view header, in both the live animals and plants frontends.
3. **Tests find live animals review cards the way plants does**, by GOV.UK structure and role, so no test depends on
   the words "2. Description of the goods". The review page's test page object gets a single `heading` again, and the
   overloads that grew on the two shared helpers (resume in the UI, the save and continue walk) come out.
4. **Every other atypical item the review found is fixed**, except these, which stay as they are:
   - the local stack's automatic restart of the file uploader (keep);
   - the plants journey spec ruling that was deleted rather than superseded (don't care);
   - the tests repo's deleted docs note on why Cancel amend waits on the URL (don't care);
   - the animals backend unit tests that build a real DocumentService on stubbed repositories (keep: they follow the
     house rule of not mocking the service's own modules).
5. **As few increments as sensible**, not one per item.

Orchestrator's calls applying it, which Sam accepted ("crack on"):

- The animals backend stops storing the outstanding items list (the health-certificate-owed list nothing reads), and
  the rule that works it out comes off the OutstandingItem enum. Both are re-added with the future outstanding-actions
  banner. This replaces the 16 November ruling's "what stays: submitting records ... the outstanding items" (claim 2);
  the submitted date is still recorded.
- "Answers differ from submitted" is a non-null yes/no flag.
- The animals frontend's local stub takes "answers changed" from the backend's shape (a stored flag, kept as the
  backend keeps it) rather than working it out itself.
- "Identification details" on the review gets a real GOV.UK heading class, not bold body text, in a sensible
  hierarchy under the species heading.
- Review cards get their accessible names the way the rest of the service does.
- A missing notification on the review page shows the standard page not found, like every other page.
- The plants notification lifecycle spec gets the missing blank line before its first scenario.
- Delete on the header opens the delete confirmation page (a link, not a post). Applying claim 2, it stays a link
  outside the Amend and Copy as new forms, so no action shares another's form.
