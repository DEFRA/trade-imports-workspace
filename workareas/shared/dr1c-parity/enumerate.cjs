//
// Which screens does each side of this comparison have?
//
// Read from each application's own source, never from a browser. That is the
// whole point: an answer that costs nothing, re-runs identically, and cannot be
// wrong about a screen it failed to reach — because it never has to reach one.
// What it cannot tell you is whether a page the router allows is linked to from
// anywhere. That is what the capture answers, and `tim parity coverage` diffs
// the two rather than trusting either alone.
//
// This file is an assembly point and nothing else. The judgement lives in the
// two modules beside it, each written by a different agent against a different
// application, each carrying its own cited facts and its own staleness alarm:
//
//   enumerate.frontend.cjs   31 screens
//   enumerate.prototype.cjs  28 screens
//
// ---------------------------------------------------------------------------
// ONE DECISION MADE HERE RATHER THAN IN EITHER MODULE: the address book is IN.
// ---------------------------------------------------------------------------
//
// The prototype enumerator returns five address-book screens. The corpora
// before this one had none, because their shared enumerator excluded everything
// starting `address-book` on the reasoning that it "is mounted outside every
// release ... so it is identical in DR1 and DR2.1 and carries no release
// prefix".
//
// That reasoning does not survive reading the code. `copyRouterStack` copies
// `/address-book` under every base like every other route, the later releases'
// navigation points explicitly at `${base}/address-book`, and
// `isSharedExternalPath` only suppresses automatic href prefixing. In DR1 the
// address book is reachable, linked from the service navigation, and is the
// route the party picker offers for adding an address it does not have.
//
// The cost of the old exclusion was not just five screens. It hid a defect in
// the same enumerator's gate detection: that code looked only for the session
// flag `isDesignRelease2SessionData` and never for `res.locals
// .isDesignRelease2Version`, so a view gated by the second would have been
// reported as a DR1 screen it does not have. Nothing caught it because the only
// view in that state is an address-book one, and the address book was excluded
// wholesale. The new prototype module handles both gates and excludes that view
// by name.
//
// So both previous corpora reported "23 of 23 pages captured, nothing missing"
// against a list that was short by five, and one of them carries a finding
// about the missing add-an-address route argued entirely from source, because
// nobody ever photographed the screens it is about.
//
// **This may still turn out to be out of scope**, and that is a separate
// question from whether it is part of DR1. The frontend has no address-book
// screen at all — its 31 are the notification journey and nothing else — and
// the address-book UI is being built in another service entirely. If the
// comparison decides these five belong to that other service, that is a stated
// decision with pictures behind it. It is not the same as inheriting an
// exclusion whose stated reason is wrong.
//
const frontend = require('./enumerate.frontend.cjs')
const prototype = require('./enumerate.prototype.cjs')

// The page-to-screen bridge the report groups findings by. This corpus reads
// the same frontend checkout as dr1 and dr1b, so it shares their module rather
// than restating a third copy of the same twenty-three names.
const journey = require('../live-animals-journey.cjs')

module.exports = {
  enumerators: { frontend, prototype },
  journey
}
