# EUDPA-617 re-review: brief for every file reviewer

This is a re-review. Local review state from earlier rounds is gone, so it runs in
FRESH mode, but a full round already happened on the PRs on 29 Oct and the author
has answered it. These instructions come from the user and win over
FILE_REVIEWER.md where the two disagree.

## Scope

The PR set is five open follow-up PRs, all on `fix/EUDPA-617-review-followups`:
animals-frontend#449, ins-tests#73, reference-data#39, stub#29, workspace#188.
Backend#114 is another ticket (EUDPA-296) and is not part of this review.

**Stick to issues in the PRs.** Raise only what these PRs add or change, or what
their diff makes untrue. Do not raise problems in code the PRs do not touch, and
do not widen into wider code-quality sweeps of untouched lines. This narrows the
"wherever they sit in the file" widening in FILE_REVIEWER.md. The commits merged
in from main (EUDPA-751, EUDPA-743, EUDPA-749 and others) are not in the PR diff.

## ami-nav's comments

Read `author-decisions/{repo}.md` in the review directory. It holds the 29 Oct
review (posted by amieljemei) and ami-nav's walk notes that answer it, in order.
Also read the ticket comments in `ticket.md`, in particular:

- 14 Oct decisions (line identity, rule keys, no chapter fallback, /search only)
- 15 Oct fallback decisions and the "one page of up to 100" decision
- 23 Oct: `commodity.name` carries the CN code until EUDPA-669
- 28 Oct: stub codes with no saved species page, dev and Docker only
- 29 Oct: Monica's answers on when species are validated, and on amendments

Treat them like this:

1. **Won't Fix with a reason:** a decision. Do not raise that item again. The rule
   in FILE_REVIEWER.md that "an earlier review or decision kept it" is no reason to
   drop a finding does not apply to these. The one exception: if the stated reason
   is factually wrong at this commit (for example "617 did not change these lines"
   when this PR's diff did), raise it, quote the code and say which claim fails.
2. **Fix:** check the fix is really in the code at this commit, with its tests. If
   it is missing, partial or brought a new problem, raise that. If it is fine, say
   nothing about it.
3. **A numbered item from the 29 Oct review with no walk note:** check whether it
   is still true at this commit. Raise it only if it is, and only if it is on a
   line this PR touches.
4. **A ticket decision:** the code and specs must follow it. Anything that follows
   a decision is not a finding. Where a later comment replaces an earlier one, the
   later one holds. Where a note in a PR rests on something the ticket has since
   answered, or says an answer is still awaited when the ticket has one, raise
   that against the file it affects.

## Writing findings

- Say what is wrong in plain words. Item numbers such as #403 come from an earlier
  round and mean nothing to a reader now; do not use them.
- Do not post to GitHub, edit a repo or commit. Your only output is the
  `file-review-*.sh` helpers.
- One command per Bash call. Read from the pinned clone under `repos/{repo}/`.
