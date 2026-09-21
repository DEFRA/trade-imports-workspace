# Deferred findings from the bootstrap build

A finding the judge ruled "defer" is real, but belongs to a later increment. Each one names that
increment, so its planner picks the finding up.

## From inc-003 (landed `e0f53cfa`)

### D1 for inc-017 (backlog-build.js): DESIGN 7.3's first lines are superseded

`DESIGN.md:1917` prescribes `const A = typeof args === 'string' ? JSON.parse(args) : args` as the
first lines of `backlog-build.js`. inc-003 made the args contract a block that every
`.claude/workflows/*.js` must carry byte for byte, and the contract test enforces it. An inc-017
implementer following the design literally would write a script the contract test rejects. The
name `A` also escapes the default check, which only looks at `CFG.`.

**How to apply in inc-017:** carry the args-contract block exactly as the contract test requires,
and name the parsed configuration `CFG`. Record the deviation from DESIGN 7.3 in the plan's
Decisions.

The judge deferred this rather than fixing it because inc-003's plan named DESIGN.md untouched,
and an increment never edits what its plan does not name.
