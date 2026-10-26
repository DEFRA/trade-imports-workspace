# Ruling: Sam, 9 October 2026 (templates and the dashboard)

9 October, on the INS front door theme (answers-2026-10-09-pm.md point 8):

> INS front door: overall dashboard, drill-downs and the notification lists. Here, the dashboard stuff is really
> early. The INS dashboard requirements are still really early days. That stuff's blocked. We can't be making changes.
> Something we could potentially do, maybe as a separate theme, is changes to the animals dashboard, so the animals
> dashboard looks more like the animals dashboard on the prototype. That'd be good.

Then, on what "the dashboard" means and on templates (point 8a):

> I block the dashboard, as in the fucking dashboardy bit. Not a button on there to create a template. Do I need to be
> that explicit? The dashboard, as in the summary information that you have this many notifications or this many
> status changes. That's all massive stuff. Has not been sort of bounced off anyone. "Create a template" is fucking
> crud. That's simple. About template mode, walking through the journey, and this changing that. Guess what? There are
> going to be changes again in the future. You can't be fucking implementing something in such a way that it can't
> handle journey changes. Mate, this needs to be another way of walking through the same pages, maybe capturing the
> same data with different validation. I don't know, but you can't fucking go, "Right, we're just going to finish
> development forever, and then we'll take a coffee."

On plants (point 7b):

> On what to do about [plants], it's massive overkill to double the number of increments to see if there's an
> [plants] equivalent. A workflow: go through and identify common pages, common behaviour, and where it's required.
> [Plants] and animals get that change at the same time. The overhead of adding an increment is relatively expensive,
> so we don't want to be needlessly separating things.

Sam wants the templates theme split off and built on a second machine while the rest of the backlog is still being
ruled on. This ruling covers only what that needs. Claims marked "applied by the orchestrator from Sam's principle"
are the orchestrator's calls, not Sam's own words. The plants evidence is `plants-common-mapping-2026-10-09.json`.

## (a) The dashboard

1. Sam (point 8a): the INS dashboard's summary information is blocked until its requirements firm up. This covers the
   counts of notifications, the status-change cards and the drill-downs from them. Those rows stay in the backlog,
   blocked, and the area is re-distilled once requirements exist. New.
2. Sam (point 8a): nothing else on the INS home is blocked by claim 1. Its "Create new" and "Use template" buttons,
   the "What are you importing?" question before a notification is created, and the Templates navigation item go
   ahead. A row that depends on the home page depends only on those controls existing, not on the summary
   information. New.
3. Sam (point 8): the live animals notification list stays in the animals frontend. It is not moved to the INS
   frontend in this programme. A new theme makes the animals frontend's own dashboard look like the prototype's
   animals dashboard. Applied by the orchestrator from Sam's principle (point 7b): plants' own notification list is
   reframed in the same increments (`plants-common-mapping`, point 7c). Replaces, for this programme, the move of the
   list to the INS frontend that claim 22 of ruling:sam-2026-10-09 kept from DR1. New.

## (b) Templates

4. Sam (point 8a): templates are create, read, update and delete work and go ahead now. This covers:
   - Manage templates
   - starting, saving, viewing, changing, using, discarding and deleting a template
   - the Templates navigation item
   - the "What are you importing?" question before a notification is created

   New.
5. Sam (point 8a): template mode is another way of walking through the same journey pages, capturing the same data,
   perhaps with different validation. It is built so later changes to those pages carry into template mode without
   rework. It must not copy pages or fork the journey for templates. New.
6. Sam (point 8a): template rows do not wait for other themes' changes to the pages they walk through. They work on the
   pages as they stand when built, and later page changes carry over under claim 5.
   - A template row keeps a dependency on another theme's row only where it needs something that row creates and that
     doesn't exist today, such as a page, a field or a stored value.
   - A dependency that exists only because a page's look or order will change is dropped. Examples are the overview's
     new regions, the review's new headings, and the reordered opening run.

   Applied by the orchestrator from Sam's principle: the transporter list's buttons in template mode follow today's
   transporter list. Transporter management is blocked separately (answers point 5). New.
7. Applied by the orchestrator from Sam's principle (point 7b): where a templates row changes something plants also
   has, the same increment changes plants.
   - **Starting from the INS type question:** gives plants the same entry, creating a plants draft and landing on
     plants' first page.
   - **The Templates navigation item:** added to plants' navigation too, linking across to Manage templates.
   - **Back links:** follow the context a page was opened in, in plants as in animals, using plants' own step order.
   - **Animals only:** Back from the first page to the type question, because plants' first page is its own type
     question. Template mode on plants pages is also animals only, because templates cover the animals sets.

   New.
