# EUDPA-616: Add a search type-ahead for choosing commodities, reusable across the journey

## Metadata
- **Type:** Story
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** COMMON-CAP-02.1
- **Parent:** EUDPA-328
- **Assignee:** Hamid Jemei

## Description

<p><b>As</b> a trader completing a live animals import notification,<br/>
<b>I want</b> to search for a commodity by name or code and pick it from live results,<br/>
<b>So that</b> I do not have to scan a full printed list of every species to find the one I am importing</p>

<p><b>Description</b><br/>
Today the "What are you importing?" page (search.njk) prints the whole commodity catalogue as fixed checkbox fieldsets on load — there is no search control at all. Design release 2.1 replaces this with a type-ahead: the trader types into a search box, matching commodities appear grouped under a heading with the matched text highlighted, and a live region announces the result count. Picked items build up in a summary panel the trader can clear.</p>

<p>This ticket builds a reusable multi-select search component for the frontend — a sibling to the existing shared <tt>AccessibleAutocomplete</tt> component (<tt>src/client/javascripts/components/accessible-autocomplete.js</tt> + <tt>src/server/common/components/accessible-autocomplete</tt> macro), which enhances a single <tt>&lt;select&gt;</tt> into a pick-one type-ahead. This new component follows the same progressive-enhancement shape but for picking <b>several</b> items by search instead of one, so it can be reused by any future multi-select search field in the journeys, not just commodities.</p>

<p><b>No-JS fallback ruling:</b> the prototype's search is JS-only (script-injected results, no server fallback to copy). This ticket keeps the existing server-rendered search-then-tick-boxes flow (<tt>search.njk</tt> / <tt>search.controller.js</tt>) unchanged as the no-JS fallback, and layers the new component on top as JS progressive enhancement.</p>

<p>Corresponds to <tt>inc-040</tt> in the 
    <span class="jira-issue-macro" data-jira-key="EUDPA-328" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-328" class="jira-issue-macro-key issue-link"  title="Catch up frontend with prototype" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10307?size=medium" />
            EUDPA-328
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
 parity backlog (<tt>workareas/journey-builder/EUDPA-328/backlog.json</tt>), previously blocked pending this design ruling.</p>

<p><b>Reference material</b></p>

<ul>
	<li>The prototype design, which should be followed as closely as possible - <a href="https://gb-notification-service-ca0bf4d22c75.herokuapp.com/what-are-you-importing" class="external-link" rel="nofollow noreferrer">Live Animals Prototype</a>. The password is <tt>notify123</tt></li>
	<li>Prototype markup: <tt>app/views/design-release-2.1/what-are-you-importing.html</tt></li>
	<li>Prototype behaviour: <tt>app/assets/javascripts/commodity-search.js</tt> (694 lines) — input<span class="error">&#91;type=search&#93;</span> named <tt>commoditySearch</tt>, <tt>aria-controls</tt> pointing at a live results list, a selected-items panel with "Clear all", hidden fields carrying selection across POST</li>
	<li>Captured evidence: <tt>workareas/shared/dr21-parity/harness/capture/html/dr21-what-are-you-importing*.html</tt></li>
	<li>Parity finding: <tt>workareas/shared/dr1b-parity/findings/commodities--commodity-search.json</tt></li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>

<ul>
	<li>With JavaScript enabled, typing in the commodity search box on the "What are you importing?" page shows matching commodities live, without a full page reload</li>
	<li>Matching results are grouped by commodity, with the matched text visually emphasised, same as the prototype</li>
	<li>A polite live region announces the number of results as the trader types</li>
	<li>The trader can select multiple commodities across repeated searches; selections persist and are shown in a summary panel with a way to clear all</li>
	<li>With JavaScript disabled, the page still works exactly as it does today: search box posts to the server, results render as checkbox fieldsets, selections carry across searches via hidden fields</li>
	<li>The new component lives outside the <tt>commodities</tt> feature (e.g. alongside <tt>accessible-autocomplete</tt> in <tt>src/client/javascripts/components/</tt> and its macro) so a second multi-select search field elsewhere in the journey can reuse it without duplicating the JS</li>
	<li>Existing commodity search Playwright/fit specs (<tt>commodities/fit/search.fit.spec.js</tt>) pass with JS enabled and continue to cover the no-JS path</li>
</ul>


<div class="panel" style="background-color: #deebff;border-width: 1px;"><div class="panelContent" style="background-color: #deebff;">
<p><b>Tech Notes</b></p>

<ul>
	<li>Client JS needs a webpack entry (see <tt>webpack.config.js</tt>) or the bundle 404s silently</li>
	<li>Follow the <tt>AccessibleAutocomplete</tt> module's registration pattern (<tt>data-module</tt> attribute + <tt>createAll</tt> in <tt>application.js</tt>) so it participates in the same progressive-enhancement boot sequence</li>
	<li>L2 (platform) stays set-agnostic — the shared component belongs in the set-agnostic client/common layer, not under <tt>sets/live-animals</tt>; only the commodities-specific wiring (fields, copy, matching) stays in the set</li>
	<li>This ticket builds the search against the existing (stub) commodity catalogue. A follow-up ticket is needed to pull commodity codes from MDM as the real data source, replacing the current static/stub list</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (2)

### Rhys Sharrem (2026-09-17)
Note: this ticket builds the search UI/component against the existing (stub) commodity catalogue. A follow-up ticket is needed to pull commodity codes from MDM as the real data source, rather than the current static/stub list.


### Rhys Sharrem (2026-11-09)
(flagoff) *Flag removed*

Commodities unblocked

## Confluence References


