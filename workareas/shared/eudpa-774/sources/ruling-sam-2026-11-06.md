# Ruling: Sam, 6 November 2026

Sam's answers in the EUDPA-774 session, given before the build started. The questions came from a review of the first plan for the ticket. Each quote is verbatim; where Sam chose one of the options offered, the option is quoted with the question it answered.

> Question: "On a page opened while amending, should Save and return to overview still show? The AC says amend pages show 'Save and continue only'; the ticket's Out list says Save and return to overview is 'unchanged'."
> Answer: "Keep save and return to overview - the pages should be consistent whether its first run, or an amendment"

> "To be clear, the amend on stave and continue should go to the next page in the journey and save and return to overview should go to the task list page yea just like first run"

> Question: "On a brand-new plants notification with nothing saved there's no Overview yet, so Cancel on the first page has to go to the dashboard. What should the link say?"
> Answer (option chosen): "Keep the copy (Recommended)": "It still reads 'Cancel and return to overview' but goes to the dashboard until something is saved. No copy change."

> Question: "After adding an address through the INS address book, the Back trail is lost: the INS return URL is fixed and carries no query, as with `change` today. Back on roles and addresses then goes to Overview. How should I handle it?"
> Answer (option chosen): "Accept, spec the exception (Recommended)": "Write the exception into the spec (SCN-FLOW-018-F) and leave INS alone. Save and continue is unaffected. You can raise an INS ticket later."

> Question: "Which lifecycle should the loop run?"
> Answer (option chosen): "Branch, onto EUDPA-774 (Recommended)": "Same as EUDPA-690. The loop builds onto feat/EUDPA-774-save-and-continue-through-journey in each repo, with no Jira calls and no merges. I open one draft PR per repo first, cross-linked and naming EUDPA-774; you merge when you're happy."

> "increment build loop not a random workflow"

> "Distill it but make sure it goes heavy on the consolidate step dont make this massive it shouldnt be. i want the structured loop benefits not for it to be needless sharded"

1. While a notification is being amended, every journey page ends with the same buttons and links it shows on a draft: Save and continue, plus Save and return to overview and Cancel and return to overview wherever the same page shows them on a draft. Pages look the same on a first run and on an amendment. This replaces the ticket's acceptance criterion "Amend journey pages show Save and continue only" and its tech note that the Save and return to the review button "go[es], leaving Save and continue". New.
2. While amending, there is no button that goes straight back to the review page. Save and return to the review goes, and so does the `change` return to the review. Follows from claim 1 and the ticket. New.
3. While amending, Save and continue goes to the next page in the journey that applies, and after the last page to the review page, just as on a first run. New.
4. While amending, Save and return to overview goes to Overview (the task list), just as on a first run. New.
5. On a brand-new high-risk plants notification with nothing saved, the first page's "Cancel and return to overview" link goes to the dashboard, because there is no Overview yet. Its words stay "Cancel and return to overview". New.
6. After a trader adds an address through the Import Notification Service address book and comes back, Back on that journey page goes to Overview. This is an accepted exception to "Back goes to wherever the trader came from", because the address book returns to a fixed address that carries nothing about where the trader came from. The Import Notification Service frontend is not changed by this work; a ticket for it may be raised later. Save and continue there still goes on through the journey. New.
7. The work is built by the increment build loop (requirements-pipeline BUILD), branch lifecycle, onto `feat/EUDPA-774-save-and-continue-through-journey` in every repo it changes, with no Jira calls and no merges. Sam merges the pull requests. This replaces the brief's "Orchestrate it as a Workflow". New.
8. The backlog is small. Consolidate hard: as few increments as the change allows, each a full-stack slice across the animals frontend, the plants frontend, the tests repo and the behaviour spec wherever the same behaviour lands in all of them. Never split an increment because it is large, or by page, layer or repo; split only where one increment must be proven before the next can be built on it (the animals frontend as the canary before plants is one such split, if the consolidator judges it worth a row). New.
