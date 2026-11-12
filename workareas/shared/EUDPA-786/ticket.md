# EUDPA-786: Bring the stub and tests in line with MDM's GBNAG product API changes

## Metadata
- **Type:** Task
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-87
- **Assignee:** Amir Naveed

## Description

<p><b>We need to</b> bring the MDM product stub and our test docs in line with the GBNAG product API release MDM has put in TST.<br/>
<b>So that</b> local and CI runs answer what MDM answers today, and MDM hears about the data problems we found.</p>

<p><b>Background</b><br/>
MDM has released changes to <tt>/trade/product</tt> for the GBNAG dataset: <tt>productTypes</tt> on commodities, <tt>speciesId</tt> on species, <tt>taxonomy.order</tt> filled in, and removals now show up straight away. They say nothing breaks the contract. Their change note is attached. A later release will change a commodity's <tt>id</tt> from the CN code to a unique identifier.</p>

<p><tt>trade-imports-reference-data</tt> reads only <tt>code</tt>, <tt>commodityCnCode</tt>, <tt>isGerminal</tt>, <tt>speciesName</tt> and <tt>commonName</tt>, and ignores unknown fields. It needs no code change, and is already ready for the <tt>id</tt> change.</p>

<p>The data has changed too. Commodities <tt>05111000</tt> (Bovine semen) and <tt>05119985</tt> (Other) are now flagged <tt>isGerminal: true</tt>, so our germinal filter now leaves them out of searches such as "cattle", "Bos taurus" and "dog". Goat (<tt>010420</tt>) has no species any more.</p>

<p><b>Recommendation</b><br/>
Recapture the stub's MDM product responses from TST, chicken's species included, and commit them. Update the docs that describe the old search results. Report the data problems to MDM.</p>

<div class='table-wrap'>
<table class='confluenceTable'><tbody>
<tr>
<th class='confluenceTh'>What needs fixing</th>
<th class='confluenceTh'>Where</th>
</tr>
<tr>
<td class='confluenceTd'>Saved MDM product responses are from before the release</td>
<td class='confluenceTd'><tt>trade-imports-stub</tt></td>
</tr>
<tr>
<td class='confluenceTd'>The recapture must include chicken (<tt>01051111</tt>) species, or <tt>ProductControllerTest</tt> fails</td>
<td class='confluenceTd'><tt>trade-imports-stub</tt></td>
</tr>
<tr>
<td class='confluenceTd'>Commodities fixture still lists goat (<tt>010420</tt>), which the stub's <tt>010</tt> search no longer returns</td>
<td class='confluenceTd'><tt>trade-imports-animals-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>README says the Bos taurus search also lists it under <tt>05111000</tt></td>
<td class='confluenceTd'><tt>trade-imports-performance-tests</tt></td>
</tr>
<tr>
<td class='confluenceTd'>Pangolins (Pholidota) has <tt>taxonomy.order</tt> "Asparagales", a plant order</td>
<td class='confluenceTd'>MDM data</td>
</tr>
<tr>
<td class='confluenceTd'>Goat (<tt>010420</tt>) lists no species</td>
<td class='confluenceTd'>MDM data</td>
</tr>
</tbody></table>
</div>


<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-stub</tt> - commit the recaptured responses</li>
	<li><tt>trade-imports-animals-frontend</tt> - <tt>services/_capture/fixtures/commodities.json</tt> matches the recaptured stub's <tt>010</tt> search</li>
	<li><tt>trade-imports-performance-tests</tt> - README matches the Bos taurus search as MDM answers it now</li>
	<li>Out of scope: filtering germinal codes by <tt>productTypes</tt> instead of <tt>isGerminal</tt>. MDM will add <tt>productTypes</tt> to germinal commodities once policy settles the categories, and <tt>isGerminal</tt> gives the right answer today.</li>
	<li>Out of scope: removing <tt>GOAT_CODE</tt> from the frontend, unless MDM confirms goat is gone for good.</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>The stub's saved MDM product responses are captured from TST after the GBNAG release</li>
	<li>The stub answers <tt>/commodities/01051111/species</tt> with Gallus gallus (Chicken), and <tt>ProductControllerTest</tt> passes</li>
	<li>The frontend's commodities fixture lists the same codes, Latin names and common names as the recaptured stub's <tt>010</tt> search, and the frontend unit and fit tests pass</li>
	<li>The full animals e2e suite passes against the stack running the recaptured stub</li>
	<li>The performance-tests README describes the Bos taurus search as MDM answers it now</li>
	<li>MDM has been told about the Pholidota taxonomy order and asked whether goat (<tt>010420</tt>) was removed on purpose, and the answers are noted on this ticket</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>
<ul>
	<li>A first recapture is already in the local stub checkout. Of 11 <tt>ProductControllerTest</tt> tests, only the chicken one fails (<tt>totalElements</tt> expected 1, was 0), because the recapture has no <tt>01051111</tt> species.</li>
	<li>The ins-tests e2e specs read the commodity groups from reference-data, not from a copy of MDM's rows, so the germinal change should not need spec changes.</li>
	<li>The frontend fixture is derived from the stub's saved MDM response by hand, not captured through the stack. The frontend's <tt>live-animals/docs/services.md</tt> explains why.</li>
	<li>JDK 25.0.5 fails to compile the stub (Lombok <tt>ExceptionInInitializerError</tt>). Use 25.0.3 locally.</li>
	<li>MDM contacts while David is on leave: Sameet Dingankar and Dale Harrison.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


