# Ruling: Sam, 27 November 2026

Given while picking up the germinal products theme, after the Design Release 2.1 prototype moved on from
commit 04a073b (5 October) to c2078fb (26 November).

> defaults for the open questions, animals dashboard, just use whats already there for now I think. similarly the
> manage notification theme is in flight, so be mindful that might need catching up

The open questions are the seven in the 26 November report whose rows include germinal products.

1. Each chosen species keeps its own number of animals and number of packages, and the germinal set's per-species
   packages and total gross weight stay per species. Answers question 7, "Does one number of animals and one number
   of packages cover every species under a commodity?" (req-2135). Keep the default.
2. The germinal products set offers only Internal market and Transit, asks for no exit date and builds nothing for
   one. The live-animals set keeps its own exit date question. Answers question 9, "Does the germinal products set
   ask for an exit date?" (req-2141). Keep the default.
3. The germinal copy of the notification submitted page names a missing ITAHC on the same condition as the
   live-animals page. Plants' confirmation gains no outstanding-items list and no certificate item. Answers question
   15, "Does the notification submitted page's ITAHC rule reach germinal products and plants?" (req-929). Keep the
   default.
4. Both save buttons make the same checks: the page's own hard stops together with any answer the data
   specification marks mandatory to proceed, as the question's default sets out in full, in live animals, in the
   germinal copy and on plants' pages. Answers question 20, "How far do the checks on both save buttons reach?"
   (req-581, req-603, req-1625, req-1641). Keep the default.
5. Each service takes the other's address from its own configuration with no hard-coded host or port. The
   end-to-end suite proves the INS-to-journey hand-over in the local and CI Docker stacks, and no new check is built
   for CDP. Answers question 21, "Which environments must the INS-to-journey hand-over be proved in?" (req-2217).
   Keep the default.
6. Each party picker keeps reading the role-filtered list the address book returns and cuts its page of eight in the
   frontend, in the germinal copy too. Answers question 28, "Where is a party picker's page of eight cut?" (req-594,
   req-611, req-2303). Keep the default.
7. The question page, check your answers and the overview task list read "Arrival date at port of entry", while the
   notification card on the live animals, germinal products and plants lists reads "Arrival date". Answers question
   35, "Does the notification card's date label read 'Arrival date' or 'Arrival date at port of entry'?" (req-1072).
   Keep the default.
8. The germinal products set does not wait for the animals dashboard theme. Its own notification list, its cards
   and its delete message copy the live animals list as it is on main today. New.
9. The germinal products set's amend, cancel amendment, copy as new and delete still build on what the manage
   notifications theme lands, because that theme is in flight on its own branch. Where the prototype's changes since
   5 October reach manage notifications, they go to that theme's branch to catch up, not into germinal products.
   New.

Orchestrator's call applying it, flagged to Sam afterwards:

- Because the germinal list copies today's live animals list (claim 8), the animals dashboard theme's rows that
  later reframe the live animals list carry the germinal products list with them, so the two lists stay copies of
  each other.
