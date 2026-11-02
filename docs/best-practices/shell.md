# Shell on this workspace

This workspace is macOS, so `sed`, `grep` and `awk` are the BSD builds, not GNU. Several patterns that
work on a Linux CI runner fail here — and the ones below fail **open**: they match nothing, exit 0, and
print no warning, so a script that reads the exit code reports success having done nothing at all.

## A bulk edit is verified by counting, not by its exit code

`sed` exits 0 when its expression matched nothing. That is not an error: an expression that matches no
line has done its job. So an exit code says the command ran, never that it changed anything.

Count the thing you expected to change, before and after:

```bash
grep -c 'OLD_NAME' path/to/file          # before
sed -i '' 's/OLD_NAME/NEW_NAME/g' path/to/file
grep -c 'OLD_NAME' path/to/file          # must be 0
grep -c 'NEW_NAME' path/to/file          # must be the first count
```

This matters most in the middle of a multi-step edit. A rename done as "delete the binding, then
substitute its uses" leaves a file full of references to an identifier that no longer exists if the
second step quietly matches nothing — and both steps report success.

## `\b` does not exist in BSD `sed`

```bash
sed 's/\bFOO\b/BAR/g' file     # matches NOTHING on macOS. Exit 0.
sed 's/[[:<:]]FOO[[:>:]]/BAR/g' file   # the BSD word-boundary form
```

## BSD `grep` and BSD `sed` disagree about `[[:<:]]`

`sed` accepts the bracket word-boundary classes; `grep` does not accept them in its default mode. So
the obvious way to verify a word-boundary rename is itself broken:

```bash
grep -c '[[:<:]]FOO[[:>:]]' file   # 0, even where grep -c FOO returns 55
```

Verify a rename by listing the tokens that share the substring instead, which also shows you the
near-misses you must not touch:

```bash
grep -on '[A-Za-z_]*FOO[A-Za-z_]*' file | sort | uniq -c
```

That is how you find out that `AREA_PLANNED` shares a substring with `PLANNED` and was never at risk,
or that it was.

## Prefer a tool that cannot fail open

For a rename across a file or a tree, an editor's exact-string replace, or `node`/`python` with an
explicit count of replacements made, fails loudly when it matches nothing. Reach for `sed` when the
edit is a stream transform, not when it is a refactor you need to be sure of.
