# Ruling: Ian, 25 November 2026

On pagination of the address book's lists and the party pickers, raised by the `manage-notifications` pre-flight:
registering `ruling:paul-2026-11-05` surfaced a conflict with `ruling:ian-2026-11-23` point 6 over `req-611`.

> Pagination should be kept. We want it. It was removed previously in error. We actually fixed that theme removing
> it with a bug EUDPA-827

## What was asked

Two rulings read `req-611` opposite ways:

- `ruling:paul-2026-11-05` point 8: the address book's list and every address picker keep pagination, the list API
  paging with `page` and `pageSize` of 1 to 100 defaulting to 25, and no requirement to list an organisation's
  addresses unpaginated (`req-611`'s 'unpaginated') is built.
- `ruling:ian-2026-11-23` point 6: `req-611` is unaffected, the address book's role-scoped list staying unpaginated
  "because the list endpoint takes no role, filters by role itself, and then pages what is left for display. Paging
  the API would make the role filter wrong."

## Decided

1. **Pagination is kept, and its removal was an error.** Every address book list and every address picker pages. No
   requirement says a list of an organisation's addresses is served or shown unpaginated.

2. **`req-611`'s 'unpaginated' clause is dropped, and `ruling:ian-2026-11-23` point 6 is superseded on that point
   alone.** Its reasoning rested on a premise that is no longer true of the service: the address book's list endpoint
   does take roles, and it does page.

   - `addressbook:src/main/java/uk/gov/defra/trade/imports/addressbook/address/RequestedListFilters.java` — a list
     request's filters are `searchTerm`, `countryCodes`, `roles` and `searchRoles`.
   - `addressbook:src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java` — the list
     "Lists the caller's live addresses, newest first, one page at a time", `page` 1-based defaulting to 1 and
     `pageSize` running from `ListPaging.MIN_PAGE_SIZE` to `MAX_PAGE_SIZE` defaulting to `DEFAULT_PAGE_SIZE`, taking
     `roles` and `searchRoles` alongside them.
   - `addressbook:src/main/java/uk/gov/defra/trade/imports/addressbook/ListPaging.java` — 1 to 100, default 25,
     exactly the bounds `ruling:paul-2026-11-05` point 8 names.

   The role filter therefore runs in the service, before the page is cut, so paging the API cannot make it wrong.
   "The list endpoint takes no role" described an earlier address book, not the one on `main`. Paul's point 8 stands
   in full and is the position to distil.

3. **The rest of `ruling:ian-2026-11-23` stands.** The party pickers page at eight, the one-page clause of `inc-087`'s
   acceptance criteria 7, 8 and 9 stays dropped, `req-594` and `req-595` stay dropped, and the "Selected address"
   restatement comes back with the paging. That ruling and this one agree that pages are paged; they differed only on
   whether the address book's own list API was one of them.

4. **EUDPA-827 is the fix, and it has landed.** `trade-imports-animals-frontend` `0d1d606d`, "fix(EUDPA-827): page the
   live animals party pickers at eight, naming the chosen address (#510)", merged to `main` on 24 November, with this
   workspace's `1ec8d9b7` for the behaviour spec. The live animals pickers need no further work.

5. **Conflict `c-292` is settled: the plants contact picker keeps its pagination.** It asked whether that picker drops
   its five-a-page pagination and 'Selected address' inset when `inc-087` drops them for the plants consignor and
   place of destination pickers. Nothing drops either, so it keeps both and takes the shared layout change
   (`req-1964`) as its default already said.

6. **The plants contact picker pages at eight**, not five, so every picker in both journeys pages at the one figure
   the INS address book list already uses
   (`insfrontend:src/server/app/features/address-book/list/list.controller.js:49`, `REQ-INS-ADDR-013`) and that
   `ruling:ian-2026-11-23` point 1 set for the other pickers. Asked as an orchestrator's call on the page size, since
   point 5 settles only that the picker pages, and confirmed by Ian the same day:

   > contact picker should be 8 yes

   Five-in-one-picker against eight-in-the-rest was a difference nothing recorded a reason for.
