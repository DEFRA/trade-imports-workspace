/**
 * Exit codes DESIGN 4.3 reserves for the shared writer core's write-safety
 * checks (`write.js`'s `commitWrite`, and `ingest.js`'s `runIngest` on top
 * of it): a lost update, and a lock still held after every retry. Both
 * `tim backlog *` and `tim parity ingest` call through this core, so both
 * exit 3 or 4 on these. Kept in their own file rather than `exitCodes.js`
 * so `exitCodes.test.js`'s every-constant-is-distinct check is not asked
 * to reconcile two commands' number spaces.
 *
 * `tim auth` still exits 3 for a missing dependency (`exitCodes.js`'s
 * `MISSING_DEP`), and neither `tim backlog *` nor `tim parity ingest`
 * raises `MISSING_DEP` or `USER_ABORT`, so the number means one thing
 * within whichever command exits with it.
 */
export const LOST_UPDATE = 3
export const LOCKED = 4
