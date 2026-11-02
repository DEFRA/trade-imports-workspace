# Ruling: Sam, 7 October 2026

> Goal: wherever the real services differ from Design Release 2.1, they
> change to match it. Work out from the evidence which frontends, backends
> and other repos that touches.
>
> The DR1 parity backlog. [...] It is not a source of requirements. Use it only when the real
> frontend and the prototype clash: if DR1 already made a judgement on that
> difference, follow it and cite the row.
>
> Precedence: the prototype wins by default. Only a DR1 judgement or a real
> constraint the prototype can't express (persistence, validation, auth,
> cross-service behaviour) overrides it.
>
> Decisions: keep questions for people to a minimum. Raise one only when a
> difference is truly exceptional and neither the default nor DR1 settles
> it.
>
> Themes: group the increments into themes based on the evidence. Draw the
> boundaries by the code each one touches, so themes can be built in
> parallel on separate machines without conflicting PRs.

1. Wherever a real service differs from Design Release 2.1 of the GB notification service prototype, the real service changes to match Design Release 2.1. New.
2. The repos that change are worked out from the evidence, across frontends, backends and other repos. New.
3. The DR1 parity backlog is not a source of requirements. Nothing is built because DR1 parity says so on its own. New.
4. The DR1 parity backlog is used only where the real frontend and the prototype clash. Where DR1 already made a judgement on that same difference, the judgement is followed and its row is cited. New.
5. The prototype wins by default over what the real services do today. New.
6. Only two things override the prototype: a DR1 judgement on the same difference, or a real constraint the prototype cannot express, such as persistence, validation, authentication or cross-service behaviour. New.
7. Questions for people are kept to a minimum. One is raised only when a difference is truly exceptional and neither the prototype default nor a DR1 judgement settles it. New.
8. Increments are grouped into themes drawn from the evidence, with boundaries set by the code each theme touches, so themes can be built in parallel on separate machines without conflicting pull requests. New.
