# EUDPA-635: Add HMRC accessible-autocomplete wrapper

## Metadata
- **Type:** Story
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** COMMON-CAP-02.1
- **Parent:** EUDPA-328
- **Assignee:** TarunKumar Palisetty

## Description

<p><b>As</b> a trader completing a live animals import notification,<br/>
<b>I want</b> to search by typing instead of scanning a long dropdown wherever the journey asks for a country or a port,<br/>
<b>So that</b> I can find the right one quickly, everywhere the journey asks for one</p>

<p><b>Description</b><br/>
The journey already has a shared, reusable searchable-list component — <tt>appAccessibleAutocomplete</tt> (<tt>src/client/javascripts/components/accessible-autocomplete.js</tt> + <tt>src/server/common/components/accessible-autocomplete</tt> macro). It is already in use on three pages:</p>
<ul>
	<li>Country of origin (<tt>countryOfOrigin</tt>, origin page)</li>
	<li>Port of entry (<tt>portOfEntry</tt>, arrival details page)</li>
	<li>Enter a country (<tt>transitedCountry</tt>, Movement section — which countries will the consignment travel through)</li>
</ul>


<p>Three further fields, all on the "Main reason for import" page (<tt>import-reason/template.njk</tt>), still render as plain <tt>govukSelect</tt> dropdowns rather than the shared component:</p>
<ul>
	<li>Port of exit for the transit reason (<tt>transitPortOfExit</tt>)</li>
	<li>Destination country for the transit reason (<tt>transitDestinationCountry</tt>)</li>
	<li>Port of exit for the temporary admission (horses) reason (<tt>temporaryAdmissionPortOfExit</tt>)</li>
</ul>


<p>This ticket brings those three in line with the rest of the journey, and confirms the three already-converted fields still behave the same way.</p>

<p><ins><b>Acceptance Criteria</b></ins></p>

<p><b>AC1 - Matching countries or ports appear as you type (verify — no change expected)</b></p>

<p><b>Given</b> I am on the origin of the import, arrival details, or "which countries will the consignment travel through" page<br/>
<b>When</b> I type part of a country or port name into the country of origin, port of entry, or transit countries field<br/>
<b>Then</b> the matching option is offered</p>


<p><b>AC2 - Select a country or port (verify — no change expected)</b></p>

<p><b>Given</b> matching countries or ports are displayed<br/>
<b>When</b> I select one<br/>
<b>Then</b> the selected name and code should be displayed in the field<br/>
<b>And</b> I should be able to change the selection</p>


<p><b>AC3 - No matching country or port (verify — no change expected)</b></p>

<p><b>Given</b> I am on one of those pages<br/>
<b>When</b> I enter 1 or more characters<br/>
<b>And</b> no country or port matches the search term<br/>
<b>Then</b> I should see a "No results found" message<br/>
<b>And</b> I should be able to change or clear the search term</p>


<p><b>AC4 - Whole list shown before typing (verify — no change expected)</b></p>

<p><b>Given</b> I open the country of origin, port of entry, or transit countries field<br/>
<b>When</b> I have not typed anything<br/>
<b>Then</b> the whole list is offered</p>


<p><b>AC5 - Works without JavaScript (verify — no change expected)</b></p>

<p><b>Given</b> JavaScript is not available<br/>
<b>When</b> I use the country of origin, port of entry, or transit countries field<br/>
<b>Then</b> it still works via its underlying ordinary list<br/>
<b>And</b> the same code is submitted</p>


<p><b>AC6 - Matching ports appear as you type (transit / temporary admission)</b></p>

<p><b>Given</b> I have selected "transit" or "temporary admission (horses)" as my reason for import<br/>
<b>When</b> I type part of a port name into the port of exit field<br/>
<b>Then</b> the matching port is offered</p>


<p><b>AC7 - Select a port (transit / temporary admission)</b></p>

<p><b>Given</b> matching ports are displayed<br/>
<b>When</b> I select a port<br/>
<b>Then</b> the selected port name and port code should be displayed in the field<br/>
<b>And</b> I should be able to change the selection</p>


<p><b>AC8 - No matching ports (transit / temporary admission)</b></p>

<p><b>Given</b> I am on the "Main reason for import" page with "transit" or "temporary admission (horses)" selected<br/>
<b>When</b> I enter 1 or more characters<br/>
<b>And</b> no ports match the search term<br/>
<b>Then</b> I should see the message "No ports found"<br/>
<b>And</b> I should be able to change or clear the search term</p>


<p><b>AC9 - Matching countries appear as you type (transit destination country)</b></p>

<p><b>Given</b> I have selected "transit" as my reason for import<br/>
<b>When</b> I type part of a country name into the destination country field<br/>
<b>Then</b> the matching country is offered</p>


<p><b>AC10 - Select a country (transit destination country)</b></p>

<p><b>Given</b> matching countries are displayed<br/>
<b>When</b> I select a country<br/>
<b>Then</b> the selected country name and country code should be displayed in the field<br/>
<b>And</b> I should be able to change the selection</p>


<p><b>AC11 - No matching countries (transit destination country)</b></p>

<p><b>Given</b> I am on the "Main reason for import" page with "transit" selected<br/>
<b>When</b> I enter 1 or more characters<br/>
<b>And</b> no countries match the search term<br/>
<b>Then</b> I should see the message "No countries found"<br/>
<b>And</b> I should be able to change or clear the search term</p>


<p><b>AC12 - Whole list shown before typing (transit / temporary admission fields)</b></p>

<p><b>Given</b> I open the port of exit or transit destination country field<br/>
<b>When</b> I have not typed anything<br/>
<b>Then</b> the whole list is offered</p>


<p><b>AC13 - Works without JavaScript (transit / temporary admission fields)</b></p>

<p><b>Given</b> JavaScript is not available<br/>
<b>When</b> I use the port of exit or transit destination country field<br/>
<b>Then</b> it still works via an ordinary select<br/>
<b>And</b> the same code is submitted</p>


<p><b>AC14 - Import-reason tests are updated for the new control</b></p>

<p><b>Given</b> the import-reason Playwright and fit specs currently drive <tt>transitPortOfExit</tt>, <tt>transitDestinationCountry</tt> and <tt>temporaryAdmissionPortOfExit</tt> with <tt>.selectOption()</tt>, a native-select-only interaction<br/>
<b>When</b> those three fields become the shared accessible-autocomplete component<br/>
<b>Then</b> the JavaScript-enabled interactions are rewritten to <tt>.fill()</tt> against the visible input, matching the pattern already used in <tt>origin.fit.spec.js</tt><br/>
<b>And</b> the no-JS path, which is unchanged, continues to be covered without modification</p>


<p><b>AC15 - The field shows a search icon, not a dropdown triangle</b></p>

<p><b>Given</b> I open any field using the shared accessible-autocomplete component — country of origin, port of entry, transit countries, port of exit, or transit destination country<br/>
<b>When</b> JavaScript has enhanced the field<br/>
<b>Then</b> it shows a search (magnifying glass) icon, matching the prototype's country search field<br/>
<b>And</b> it does not show the component's default dropdown arrow</p>

<div class="panel" style="background-color: #deebff;border-width: 1px;"><div class="panelContent" style="background-color: #deebff;">
<p><b>Tech Notes</b></p>
<ul>
	<li><tt>transitPortOfExit</tt>, <tt>transitDestinationCountry</tt> and <tt>temporaryAdmissionPortOfExit</tt> already read from the same <tt>portItems</tt>/<tt>countryItems</tt> sources the converted fields use, so this is not a new data source — but it is not a template-only change either. <tt>import-reason/controller.js</tt>'s <tt>countryItems()</tt> and <tt>portItems()</tt> still build a <tt>DIVIDER_OPTION</tt> row under the placeholder; the converted fields' own item-builders (e.g. <tt>origin/controller.js</tt>) deliberately drop it, with the comment: "a scroll-only list needed a divider rule under the placeholder, a searchable one does not." Drop <tt>DIVIDER_OPTION</tt> from both functions as part of this ticket, alongside the template swap (<tt>govukSelect</tt> → <tt>appAccessibleAutocomplete</tt>)</li>
	<li>Follow the registration pattern already used by the three converted fields (<tt>data-module</tt> attribute + <tt>createAll</tt> in <tt>application.js</tt>) so no new webpack entry is needed</li>
	<li>Search behaviour (filter-as-you-type, whole list on focus, no-results message, code-not-text submission, no-JS fallback via the underlying list) mirrors the origin page's own agreed behaviour — see <tt>openspec/specs/live-animals/journey-pages/origin-of-import/spec.md</tt>, REQ-ORIGIN-002 through REQ-ORIGIN-006</li>
	<li>AC15 styling: the upstream component currently renders its own dropdown-arrow indicator (see the "upstream arrow" comment in <tt>accessible-autocomplete.scss</tt>). The prototype's country-of-origin search (captured at <tt>workareas/shared/dr21-parity/harness/capture/html/dr21-origin-of-the-import.html</tt>, and confirmed as a real gap in <tt>workareas/shared/dr1b-parity/findings/origin-and-reason--country-of-origin-search.json</tt>) uses a magnifying-glass SVG button instead (<tt>app-commodity-search__icon</tt>, viewBox <tt>0 0 20.3765 20</tt>) — reskin the component's indicator to match that icon, not the arrow, without changing its enhanced-select behaviour</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


