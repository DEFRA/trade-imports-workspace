# Ruling: Paul, 5 November 2026

On what the address book stores for an address's type and uses (EUDPA-711), after reviewing address types,
roles and categories:

> Agree that "Role" is better terminology than "use".

> I think meanwhile we can proceed with the renaming as discussed, and for now keep category out of the api. If it
> ends up as a first class public concept, we can always add it back to the api later.

> Code changes to add new roles makes sense.

On the ticket's acceptance criteria, which still described a stored type and uses:

> yes change the AC on the ticket. The correct change was made.

On the addresses saved before the change:

> We can delete the entire collection on the 2 shared environments (dev, test) using CDP tooling, so that is the
> simplest thing to do there. None of ther addresses has any value.

1. An address holds the roles it can play on a notification: place of origin, consignor, consignee, importer, place
   of destination and branch address. "Use" is renamed "role" everywhere: the record, the API, the code, the copy
   keys, the tests and the spec. New.
2. The address book stores roles only and requires at least one. It does not store an address type, and ignores one
   a client sends. The address type is the INS front door's grouping of roles (the add flow's first step, the tabs,
   the United Kingdom-only country), worked out from the roles. New; replaces the stored, required type of inc-059
   and inc-070.
3. The grouping of roles into sending, receiving and branch is the address book's internal rule, not part of its
   API. It refuses roles from more than one group, and a consignee, importer or place of destination outside the
   United Kingdom. If the grouping becomes a public concept, it is added to the API then. New.
4. The address book list takes `role` (repeatable, any of) and `searchRole`, in place of `addressType`, `use` and
   `searchUse`. New.
5. A role a new notification type needs is added in code, each role in exactly one group. New.
6. EUDPA-711's description and acceptance criteria say roles, not a stored type and uses. Done 5 November.
7. Addresses saved before the change are not migrated. After release, the `addresses` collection is dropped in dev
   and test with CDP tooling and the address book restarted; locally, the stack is restarted. New.
