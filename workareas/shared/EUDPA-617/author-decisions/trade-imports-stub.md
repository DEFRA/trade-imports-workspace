### amieljemei 2026-10-29T09:25:19Z

## EUDPA-617 re-review of the follow-ups (head `8401da3`)

**Verdict: needs attention (test-only, low risk).** The `ProductController` log now sits in the branch that decides, and all 18 MockMvc call sites go through `mdmGet`.

1. **`MdmStubRequests.java:15`: #19 and #27 are only partly fixed.** `FaultsIT.java:149` and `LatencyProfilesIT.java:32,79` still build their own headers with the literal `"Ocp-Apim-Subscription-Key"` and a second value, `"stub-key"`. `mdmGet` sends `"any-value-at-all"`. Add `MdmStubRequests.mdmCallerHeaders()`, use it in `mdmGet` and both ITs, and drop the literal.
2. **`MdmStubRequests.java:18`: #26 is only partly fixed.** The class is named for request builders but still holds the response matcher `carriesTheStubTraceHeader()`. Move it to an `MdmStubResponseMatchers` helper, or give the class a name that covers both.
3. **`PortsOfEntryControllerTest.java:35`: #28 isn't addressed.** `getPortsOfEntry_shouldCarryEveryPortsTraffic` still asserts only Rail and Airport, so the 59 Port records go unchecked. Add `hasSize(59)` for Port and `hasSize(1)` for Rail. On line 23, `shouldAnswerMdmsPortRecordsWholeInMdmOrder` checks the count and four fields of the first row only. Retitle it to what it checks, or assert the order and whole record.
4. **`CountriesControllerTest.java:79` / `:26`: titles claim more than they check.** `getCountries_shouldServeFieldsNoStubModelNames` checks that two fields exist but nothing about stub names being absent. `..._InMdmOrder_...` checks only that row 0 is AW. Rename both, or add the missing assertions (for example, the first and last alpha2 codes).

**Still open from the second pass:**
- **#13:** the `fish` and `010` searches still offer codes with no species response file (0301, 0103, 010410, …).
- **Unanswered question:** Rhyss asked on #26 about `mdmProductCommoditiesResponses.json:5`: is this becoming an object, as David said? There's no reply yet.

Note: these PRs cite `workareas/reviews/EUDPA-617/walk-second-pass/decisions.md`, but I couldn't find it. If any of the above was put off on purpose, please point me to the decision.


### ami-nav 2026-10-29T18:14:47Z

**Walk note on (3) — #28 ports titles vs asserts: Won’t fix on 617.**

Same as the second-pass W34. Both tests are EUDPA-692’s (`0b130c0`). This PR only switched them onto `mdmGet`. Port/Rail sizes and a title that matches the first-row check are a later chore, not this ticket.

### ami-nav 2026-10-29T18:16:20Z

**Walk note on (4) — country titles vs asserts: Won’t fix on 617.**

Both tests are EUDPA-692’s (`0b130c0`). This PR only switched them onto `mdmGet`. Honest titles, or asserting the last-row alpha2, are a later chore, not this ticket.

### ami-nav 2026-10-29T18:17:50Z

**Walk note on still-open #13 — codes with no species page: Won’t fix on 617.**

Same as the second-pass W36. `fish` and `010` still list codes that have no saved species page. That only bites local Docker Continue. Every species ins-tests uses already has a page. Adding the rest is a later chore, not this ticket.

