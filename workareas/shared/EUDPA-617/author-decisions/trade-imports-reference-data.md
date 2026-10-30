### amieljemei 2026-10-29T09:25:18Z

## EUDPA-617 re-review of the follow-ups (head `b920ba5`)

**Verdict: needs attention.** Fixed: #46, #49 and #55 to #60. The routing of 502/503/504 to 503 and everything else to 500 is right, and the new ITs fail if either direction breaks.

1. **`GlobalExceptionHandler.java:120`: the 503 handler catches failures from every Feign client, not only MDM (#54 and #61 are only partly fixed).** `MdmClientInterceptor.getToken()` calls the trade-auth token endpoint inside every MDM call. So a token endpoint that is down, times out or drops the connection logs "MDM sent no usable answer", and support would look in the wrong place. "Sent no usable answer" is also untrue for a dropped connection or a 504, where MDM sent nothing. The exception (`MdmUnusableResponseException`) and the handler (`handleNoUsableMdmAnswer`) still name the case two ways.
   *Suggested:* in `MdmService` (or an MDM-client `ErrorDecoder`), wrap MDM-client 5xx responses and `RetryableException` in the MDM exception, so the handler catches only that. Give token-endpoint failures their own exception and log line. Add an IT that stubs the token endpoint at 503. Use one name across the exception, handler, log line and `@ApiResponse`.
2. **`README.md:95` is out of date.** It still says only an MDM answer with no body, content or total gives a 503. It should say the full split: an answer with no body, content or total, MDM 502/503/504, or MDM not reachable gives a 503. Any other MDM error gives a 500.
3. **`CommoditiesControllerIT.java:269`: the test title is wrong for one case.** `searchCommodities_answersInternalServerError_whenMdmRefusesTheCall` runs for 400, 401 and 500, but an MDM 500 is MDM failing, not refusing. Rename it to something like `..._forAnMdmStatusOtherThanUnavailable`, or split the 500 case out.
4. **`CommoditiesControllerIT.java:243`: duplication.** The three new failure tests each copy the MDM search matcher and the `getForEntity("/commodities?q=fox")` call, beside the existing `stubSearch` helper. Extract `searchRequest(term)` and `stubSearchAnswering(term, status)`.

**Still open from the second pass:**
- **#15:** `CommoditySearchService.java:42,50,55` still sends `page`/`size` to MDM, cuts species to `limit(size)`, and sets `total` from that one MDM page. So `total` and the paging still disagree with the frontend stub after the first MDM page.

Note: these PRs cite `workareas/reviews/EUDPA-617/walk-second-pass/decisions.md`, but I couldn't find it. If any of the above was put off on purpose, please point me to the decision.


### ami-nav 2026-10-29T18:10:03Z

**Walk note on still-open #15 — paging/`total`: Won’t fix on 617.**

Same as the second-pass W30. Ticket 15 Oct decision 5 keeps one page of up to 100 for now. True paging, and a `total` that means all matches rather than this MDM page, wait on the open design question (more results vs refine). That is a further ticket, not this one.

