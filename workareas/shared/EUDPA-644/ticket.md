# EUDPA-644: Add 7-day TTL to addresses in non-prod environments

## Metadata
- **Type:** Task
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-144
- **Assignee:** Amir Naveed

## Description

<p><b>We need to</b> automatically expire addresses 7 days after creation, in every environment except prod.</p>

<p><b>So that</b> non-prod databases don't accumulate stale test and manual address-book data indefinitely, without risking any data loss in prod.</p>

<p><b>Background</b><br/>
The address-book service writes every address into the <tt>addresses</tt> MongoDB collection. Soft-delete marks records <tt>DELETED</tt> but leaves the document in place, and there is no expiry — documents persist forever in all environments, including dev/test/perf-test/ext-test. E2E tests currently soft-delete addresses they created at the end of each run to limit that growth; with a service-side TTL that cleanup is unnecessary. Same shape of problem as <a href="https://eaflood.atlassian.net/browse/EUDPA-273" class="external-link" rel="nofollow noreferrer">EUDPA-273</a> (notification TTL in animals-backend).</p>

<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-address-book</tt> — expire addresses 7 days after creation in every environment except prod. See Tech notes for a strawman — whoever picks this up may have a better approach.</li>
	<li><tt>trade-imports-ins-tests</tt> — stop soft-deleting addresses just to clean up after a test, and remove any related cleanup tooling that exists only because that teardown was needed. If a test deletes an address to check product behaviour (for example a linked address gone on review), leave that delete in place.</li>
</ul>


<p><b>Out of Scope</b></p>
<ul>
	<li>Changing the user-facing soft-delete behaviour in prod (or any environment) — this ticket only adds automatic expiry in non-prod.</li>
	<li>Changing how journeys react when a linked address is deleted.</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>An address created in dev/test/perf-test/ext-test is automatically removed roughly 7 days after creation.</li>
	<li>An address created in prod is never automatically removed, protected by two independent safeguards — a single misconfiguration alone cannot trigger deletion in prod.</li>
	<li>Existing addresses (pre-change) are not deleted immediately on deploy — the 7-day rule applies from the point this ships, going forward only.</li>
	<li>A test demonstrates that in a prod-configured environment, addresses are never marked for automatic removal, regardless of other config values.</li>
	<li>The TTL duration is set via a configuration property, not hardcoded, so it can be changed per environment without a code change.</li>
	<li>E2E tests stop soft-deleting addresses just to clean up after a test. Deletes that are part of what the test is checking stay.</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Strawman solution (not prescriptive — open to a better approach)</b></p>
<ul>
	<li>Mirror <a href="https://eaflood.atlassian.net/browse/EUDPA-273" class="external-link" rel="nofollow noreferrer">EUDPA-273</a>: <tt>expireAt</tt> on create only when <b>two independent checks</b> both pass — (1) TTL days configured (non-prod only), and (2) an explicit code-level check that the running <tt>environment</tt> is not <tt>prod</tt>.</li>
	<li>Scheduled sweeper following the same pattern as <tt>NotificationExpirySweeper</tt> (<tt>@ConditionalOnProperty</tt> + <tt>@Scheduled</tt> + shedlock if the service already uses it), enabled only where sweep config is true (non-prod only). Finds addresses where <tt>expireAt &lt;= now</tt> and removes the document (ACTIVE or DELETED tombstone).</li>
	<li>Two independent layers overall — a config mistake alone can't cause prod deletions, and a code bug alone can't either; both would need to fail together.</li>
</ul>
</div></div>

<p><b>Open Questions</b></p>
<ul>
	<li>RESOLVED — Should shared E2E seed addresses (globalSetup journey fixtures) also get <tt>expireAt</tt>, or stay exempt?<br/>
<b>Give them <tt>expireAt</tt> like any other create — do not exempt.</b><br/>
Reason: ensure is idempotent and re-creates when missing. After TTL removes them, the next run's <tt>globalSetup</tt> puts them back. Exemption would leave a permanent ~13-name set in non-prod forever, for little gain.<br/>
Practical caveat with a 7-day TTL is negligible (suite won't outlive remaining TTL after setup). Only odd case: very short TTL in an env someone is poking at — seeds vanish, next run reseeds.</li>
</ul>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


