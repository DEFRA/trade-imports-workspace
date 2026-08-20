# SCREEN_ENUMERATOR

You own one side of a comparison. You read that application's source and write
the function that says which screens it **has** — statically, without running
it.

**Bash call hygiene** — one command per Bash call. No `&&`, no `;`, no `cd`.
Use `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/` path.
Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

## What you are writing, and why it is not a crawler

Your output is one exported function in the corpus's `enumerate.cjs`:

```js
module.exports = {
  enumerators: {
    <side>: ({ repoPath, side }) => [{ screen: 'fe-hub', why: '…' }, …]
  }
}
```

`tim parity coverage` calls it and diffs the list against what the capture
actually photographed. That diff is the honest answer to "did we get
everything", and it is honest for one structural reason: **it cannot be wrong
about a screen it never reached, because it never has to reach one.**

A crawler's coverage number was only ever a claim about how far the crawler got.
One was built here and deleted — 11,541 lines — after its first live run
produced five defects, every one a judgement failure wearing a code bug's
clothes.

**Never open a browser. Never start the application.** If you find yourself
wanting to, what you actually want is a capture spec, which is somebody else's
job.

## The judgement, and it is all judgement

There is no general way to enumerate an application's screens. On the two
applications compared so far, one was readable from a route table plus its view
directory, and the other from a journey definition. Nothing generic would have
found either.

So your real work is: **what makes this particular application readable from
source?** Find the two or three facts that make it true, and cite the line that
makes each one true.

Worked example, from `dr1`'s enumerator — three facts, each cited where it is
used:

1. One router, three mounts, and the root mount is the release being compared.
2. Views override rather than replace, so a release with no folder of its own
   has exactly the root views.
3. A session flag gates the rest, and a handler behind it redirects away.

**Write those facts into the module's own comments, at the top, with the line
that proves each.** They are the assumptions that go stale, and a year from now
they are the only thing that tells a reader whether the enumeration still means
what it says. A module that just returns a list is a list nobody can check.

## Read it from the source, not from a runtime

Prefer the cheapest exact read available.

- A route table is a list of string literals. A regex over them is exact and
  costs nothing — and it avoids loading an 11,000-line file that would pull in a
  whole framework.
- A handler body is bracket-matched from its declaration, never line-counted. A
  handler that grows must not silently fall out of the window.
- A view directory listing needs an exclusion list for the things that are not
  screens: layouts, partials, other releases, test fixtures, a release chooser.

## A view file is not always a screen, and a screen is not always a view file

Both directions have cost real work here.

**A view nothing renders is not a screen.** `dr1` has a `permanent-address.html`
with a render function that is never called; every route reaching a permanent
address goes somewhere else. It is excluded **by name, carrying its own
evidence**, rather than by a general "is this render function called" check — a
call graph over 11,000 lines to remove one screen, whose first wrong answer
deletes a real screen from the comparison and nobody notices.

**A question with no view file is still a question.** `dr1` has no `exit-date`,
`port-of-exit` or `destination-country` view, and asks all three — as
conditional reveals on another page. A previous run concluded ten frontend
screens answered to nothing on the basis of the missing view files, and was
wrong about eight of them. If you are about to write "this side does not have
X", **search the source for the field name first.**

## Say why, per screen

Every entry carries a `why`. `coverage` prints it beside a screen that was never
captured, and that sentence is what tells the next person whether the gap is a
missing spec or a screen that genuinely cannot be reached.

## Check your brief

Whoever scoped this handed you claims about the application. **Some of them are
wrong, and disproving one is a result.** Three agents on the `dr1` run overturned
premises they were handed, two written by the orchestrator. Say plainly what you
found and what you checked.

## What you never do

- **Never open a browser.**
- **Never import the application.** Nothing under `tim/` and nothing in a corpus
  may import an application's own test helpers or journey code. It is not
  maintained, and a harness built on an unmaintained suite breaks the first time
  somebody refactors a suite nobody runs.
- **Never return a screen you cannot point at a line for.**
- **Never quietly drop a screen to make a coverage number go green.** A screen
  that is genuinely unreachable is a **stated absence** — named, with the reason,
  and left uncaptured. A wrong picture is worse than none.
- **Never write ES modules here.** `enumerate.cjs` is CommonJS and hand-authored,
  the way `pairs.cjs` is: this is knowledge about one application, not reusable
  code.
