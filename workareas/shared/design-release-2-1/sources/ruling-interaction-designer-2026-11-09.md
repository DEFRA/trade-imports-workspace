# Ruling: the interaction designer, 9 November 2026

Answers to the design questions the waiting-on-design rows were blocked on, passed on by Sam the same day.

> **Search buttons (inc-188)**
> This has been picked up with the snagging list
>
> **Region code prefix (inc-190)**
> Same above
>
> **Amend pop-ups (inc-195)**
> These are no longer pop-ups, they are now proper pages which should remove the issue. Designs can be found in 2.1
>
> **Templates sort (inc-162)**
> Templates has been dropped for now, this unlocks this ticket.
>
> **CPH boxes — inc-093**
> No need to add the type behaviour on top, it should follow the gov.uk date input behaviour
>
> **Germinal date calendars (inc-192)**
> Keep the MOJ date picker.

## Decided

1. **Search buttons: already done.** Design question 1. The joined blue search button was built in design
   snagging inc-202 from the designers' snagging list, and inc-188 went with it. Nothing changes. Confirms.
2. **Region code prefix: already done.** Design question 2. Built in design snagging inc-204, which took in
   inc-190. Nothing changes. Confirms.
3. **Amend and cancel amendment are pages, not dialogs.** Design question 9. The Design Release 2.1 designs show
   them as their own pages, which inc-120 and inc-121 (manage-notifications) build, and inc-185 builds for
   germinal products. inc-195, the dialogs over the page, is dropped. New.
4. **No templates sort.** Design question 11. Templates are dropped for now, which `ruling:sam-2026-11-04` had
   already parked, so the sort question is settled by that. inc-162 and its copy in the parked templates
   theme, inc-248, are dropped. If templates come back, the sort comes back as a question with them. New.
5. **The county parish holding boxes take no JavaScript on top.** Design question 7. They behave as the GOV.UK
   date input does: separate labelled boxes, no digit filter, no paste spreading and no focus moving. That is
   what design snagging-b inc-219 built. inc-093 is dropped. New.
6. **The germinal dates keep the MOJ date picker.** Design question for c-283. Each germinal date gets the
   'Choose date' calendar, the Ministry of Justice date picker every other date in both frontends uses and
   design snagging inc-206 styled. It is not replaced by the three-part date input. inc-192 is released from
   blocked to todo. New.
