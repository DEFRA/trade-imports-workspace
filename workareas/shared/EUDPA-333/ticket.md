# EUDPA-333: Delegate address creation to the INS address book service

## Metadata
- **Type:** Story
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** COMMON-CAP-04.1
- **Parent:** EUDPA-107
- **Assignee:** TarunKumar Palisetty

## Description

<p><b>As</b> a Trader,<br/>
<b>I want</b> to add an address without leaving the notification I am working on,<br/>
<b>So that</b> I can use an address that is not in my address book yet, and only ever learn one address form</p>

<p><b>Description</b></p>

<p><tt>trade-imports-ins-frontend</tt> owns the address book — add, edit, delete, list and view, a single Joi schema in <tt>address-book/address-schema.js</tt>, a country list drawn from MDM, and writes through <tt>addressBookClient</tt> to the address book API. It is the only writer.</p>

<p>
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-294" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-294" class="jira-issue-macro-key issue-link"  title="Link notifications to addresses from the address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-294
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 pointed the live-animals journey at that same book. The journey's pickers now search and select real records and resolve them by id, and the journey's own address form was removed.</p>

<p>What is missing is the way back: the pickers are select-only, so a Trader whose address is not yet in their book has nowhere to go.</p>

<p>Add that route. The journey sends the Trader to the INS form and brings them back with the record they just saved selected. Keep the handshake journey-agnostic so other INS journeys can reuse it, and keep the form in one place so validation cannot drift.</p>

<p>Changing an address stays in the book itself. The journey only needs to add what is missing and pick from what is there.</p>

<p><ins><b>Acceptance Criteria</b></ins></p>

<p><b>Adding an address</b></p>

<p><b>Given</b> a Trader is choosing an address for any consignment party<br/>
<b>When</b> they choose to add a new address<br/>
<b>Then</b> they are taken to the INS address book form, which supplies the field labels, validation and country list<br/>
<b>And</b> the journey and the party they came from are carried across so they can be returned to</p>

<p><b>Given</b> a Trader has completed the INS address form<br/>
<b>When</b> they save it<br/>
<b>Then</b> the address is written to the address book API by the INS service, and appears in their address book for any later notification<br/>
<b>And</b> they are returned to the page they started from, with the new address selected for the party they were completing</p>

<ul>
	<li>The return carries the identifier of the saved record only, not the address fields. The originating journey reads the record back from the address book API.</li>
</ul>


<p><b>Leaving without saving</b></p>

<p><b>Given</b> a Trader is on the INS address form having arrived from a journey<br/>
<b>When</b> they cancel<br/>
<b>Then</b> they are returned to the page they started from<br/>
<b>And</b> no address is created or changed, and their journey answers are unchanged</p>

<p><b>Contract and safety</b></p>

<ul>
	<li>The service never redirects to a web address supplied on the request. A Trader is returned only to a registered journey, so a crafted link cannot send them to another site.</li>
	<li>An unrecognised journey type is refused rather than followed.</li>
	<li>INS knows where the live-animals journey lives, and animals knows where the INS address book lives. Both locations are set per environment, so the same build works locally and on each CDP environment.</li>
	<li>Each service fails to start when the location it needs is missing or malformed, rather than accepting the request and failing once a Trader is part-way through.</li>
	<li>The animals frontend's address book location is declared and validated the same way, so the rule above covers all three of its service locations. Today it is read straight from the environment and would not fail fast.</li>
	<li>The local stack is configured so the handshake works end to end without anyone setting it up by hand.</li>
	<li>The Trader's sign-in should carry across both services — they won't be asked to sign in again mid-journey. We haven't actually implemented authentication properly yet, so if the user isn't signed in on both services don't handle that case or pass across a cookie as part of this ticket.</li>
	<li>If the INS service or the address book API cannot be reached, the Trader sees an error and their existing journey answers are preserved.</li>
	<li>A return carrying an address saved for a different organisation than the session coming back shows the Trader an error. It is never treated as no selection, which would leave the party silently empty. This is two signed-in sessions disagreeing, not the unsigned-in case ruled out above.</li>
	<li>A returned address that no longer resolves shows the Trader an error, rather than a party that looks untouched. A record that cannot be found and a service that cannot be reached are different cases; handle both.</li>
	<li>Back-link and browser-back behaviour returns the Trader to the originating page, not into a partly-completed form.</li>
</ul>


<p><b>Reuse</b></p>

<ul>
	<li>All six entry points offer it — the five consignment parties and the consignment contact.</li>
	<li>The handshake takes the journey type and the notification and fulfilment ids identifying where in that journey the Trader was, and holds no live-animals-specific logic, so another journey can adopt it without changing the INS service.</li>
	<li>There is still only one address form, in INS. The journey gains a way to reach it, not a second copy of it.</li>
</ul>


<div class="panel" style="background-color: #deebff;border-width: 1px;"><div class="panelContent" style="background-color: #deebff;">
<p><b>Tech Notes</b></p>

<p><span class="image-wrap" style=""><a id="479943_thumb" href="/rest/api/3/attachment/content/479943" title="happy-path.png" file-preview-type="image" file-preview-id="479943" file-preview-title="happy-path.png"><jira-attachment-thumbnail url="https://eaflood.atlassian.net/rest/api/3/attachment/thumbnail/479943?default=false" jira-url="https://eaflood.atlassian.net/rest/api/3/attachment/thumbnail/479943" filename="happy-path.png"><img src="https://eaflood.atlassian.net/rest/api/3/attachment/thumbnail/479943" data-attachment-name="happy-path.png" data-attachment-type="thumbnail" data-media-services-id="1895a35e-c615-406b-80bc-84812b229157" data-media-services-type="file" style="border: 0px solid black" /></jira-attachment-thumbnail></a></span></p>

<p>The whole handshake, end to end. Rendered from <tt>happy-path.mmd</tt> in <tt>workareas/shared/eudpa-333-address-add-handshake/</tt> in the workspace repo, which also carries the cancel and guard diagrams and the regenerate command. Edit the source there and re-attach rather than redrawing — an image on a ticket goes stale silently. PNG rather than SVG because Jira will not generate a preview for an SVG attachment; the repo keeps the SVG, which GitHub renders.</p>

<p><b>Return destination — register journeys, never accept a URL</b></p>

<p>INS does not take a return URL, or any part of one, from the request. Animals sends a journey type and the ids identifying the page the Trader came from:</p>

<div class="preformatted panel" style="border-width: 1px;"><div class="preformattedContent panelContent">
<pre>/trade-imports-ins-frontend.{env}.cdp-int.defra.cloud/address-book/add?journey-type=gbn-ag&amp;notification-id=GBN-AG-26-4F7K2P&amp;fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d</pre>
</div></div>

<p>Both ids are real shapes, not placeholders:</p>

<ul>
	<li><tt>notification-id</tt> is the notification's reference number, the same value the journey carries as <tt>journeyId</tt> in its own routes. Format {{GBN-AG-
<div class="error"><span class="error">Unknown macro: {YY}</span> </div>
<p>-</p>
<div class="error"><span class="error">Unknown macro: {XXXXXX}</span> </div>
<p>}}, Crockford base32 body (<tt>ReferenceNumberGenerator</tt>, backend).</p></li>
	<li><tt>fulfilment-id</tt> identifies the answer slot the Trader was filling — the key the journey stores that answer under. For a scalar answer like a consignment party it is the obligation's own id, a UUID; the example is the consignor obligation from <tt>obligations/sections/parties.js</tt>. For an answer inside a collection it is a composite of ids and indices (<tt>formatFulfilmentId</tt> in <tt>bridge/fulfilment-id.js</tt>), which is why the fulfilment id is the right thing to send and an obligation id alone is not: it says <b>which</b> instance, not merely which obligation.</li>
</ul>


<p>INS looks the journey type up in its own registry and builds the whole return URL itself: origin and route shape from the registry entry, the two ids substituted as opaque values it never parses, splits or resolves. Only the journey knows how to read them — a composite fulfilment id contains a <tt>/</tt> and still is not a path. Nothing path-like crosses the wire, so there is no open redirect to defend against and no sanitiser to write: the class of bug is designed out rather than filtered. An unrecognised journey type is refused.</p>

<p><b>One registry entry per journey type, not one per return destination.</b> The entry is a single URL template, and INS holds no map from a fulfilment to a page — that belongs to the journey. Onboarding another journey is one line.</p>

<div class="preformatted panel" style="border-width: 1px;"><div class="preformattedContent panelContent">
<pre>gbn-ag → {animalsUrl}/notifications/{notification-id}/address-return?fulfilment-id={fulfilment-id}</pre>
</div></div>

<p><b>Why <tt>gbn-ag</tt>.</b> It is the prefix every live-animals notification reference carries, denoting the live animals import from the EU — a domain term that outlives any renaming of the frontend serving it, which a service-derived name would not. It therefore overlaps the reference number sent alongside it, but <b>INS must not derive one from the other:</b> parsing the reference would couple INS to a format the animals backend owns and can change. <tt>gbn-ag</tt> is the only journey type to register for now.</p>

<p><b>Where the registry lives</b> — split it:</p>

<ul>
	<li><b>The journey list is code.</b> Which journeys exist, their journey types and their route shapes are known ahead of time and change only when a journey is onboarded. No configuration.</li>
	<li><b>Each journey's base URL is configuration.</b> The frontends are separate services on separate origins — animals on 3000, INS on 3002 locally, different hostnames per CDP environment.</li>
</ul>


<p><b>Three convict entries, not two.</b> INS does not know where the animals frontend lives; animals does not know where INS lives and needs it to send the Trader out — one new entry each. The third is overdue: animals reads its address book location straight from <tt>process.env</tt> with a hardcoded fallback (<tt>services/address-book/client.js</tt>), the one service location convict never sees and <tt>config.validate()</tt> never checks, so a typo in the variable name starts the service cleanly, points it at <tt>localhost:8089</tt>, and fails only when a Trader opens a picker — the late failure the AC rules out.</p>

<p>All three follow the <tt>TRADE_IMPORTS_*_URL</tt> pattern and are validated at boot. Name the animals one <tt>tradeImportsAddressBookApi.baseUrl</tt>, beside <tt>tradeImportsAnimalsBackendApi</tt> and <tt>tradeImportsReferenceDataApi</tt>, and read it through <tt>config.get</tt>. INS already declares it that way, so this copies a local example rather than inventing a pattern.</p>

<p><b>These are browser redirects, not service-to-service calls</b> — so both location values must be browser-reachable (<tt><a href="http://localhost:3000" class="external-link" rel="nofollow noreferrer">http://localhost:3000</a></tt>, <tt><a href="http://localhost:3002" class="external-link" rel="nofollow noreferrer">http://localhost:3002</a></tt> locally), <b>not</b> container-internal <tt>host.docker.internal</tt>. Every other <tt>TRADE_IMPORTS_*_URL</tt> in the stack is server-to-server and does use the internal form. Get this wrong and the redirect passes a container health check but breaks in a browser.</p>

<p><b>Files</b> — <tt>src/config/config.js</tt> in each frontend, plus the service environment blocks in <tt>docker/stack/frontend.compose.yml</tt> in the workspace repo so the local stack works without hand-configuration.</p>

<p><b>Most of the animals side already exists — reuse it, do not rebuild it</b></p>

<p>
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-294" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-294" class="jira-issue-macro-key issue-link"  title="Link notifications to addresses from the address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-294
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 left the journey ready for an identifier coming back:</p>

<ul>
	<li><tt>services/address-book/index.js</tt> → <tt>party(orgId, id)</tt> resolves one record by id against the API. That is the whole of "read the record back".</li>
	<li><tt>party-picker/selection.js</tt> → <tt>answerFor(party, chosen)</tt> builds the answer to commit from a chosen record; <tt>committedId</tt> reads the committed <tt>addressId</tt> back to pre-tick the row.</li>
	<li><tt>resolve-parties.js</tt> → <tt>resolveParties</tt> resolves references on read; <tt>withoutUnresolvedPartyRefs</tt> clears ones that no longer resolve.</li>
</ul>


<p>The return handler should land on the same path a normal pick takes: resolve the returned id, then commit through <tt>answerFor</tt>. Anything that writes a party answer by hand will diverge from the picker.</p>

<p><b>One return route, not six.</b> Animals gains a single <tt>address-return</tt> route that resolves the <tt>fulfilment-id</tt> to its party, then does the work. The six entry points share no route shape — five parties at <tt>consignors/select</tt>, <tt>destinations/select</tt> and so on, the consignment contact at <tt>consignment/contact/select</tt>. One route absorbs that; six would repeat the resolve, the organisation check and the commit six times over, and push the fulfilment-to-page mapping into INS where it does not belong. Two things to get right:</p>

<ul>
	<li><b>Derive the reverse map from the existing bindings.</b> <tt>features/addresses/evaluation.js</tt> binds each party's answers key to its obligation ({{scalar(
<div class="error"><span class="error">Unknown macro: { field}</span> </div>
<p>)}}); <tt>features/contact/evaluation.js</tt> does the same for the contact. Reverse the bindings to get the field, then <tt>partyOf</tt> in <tt>parties.js</tt> gives the party record. Deriving beats hand-listing six UUIDs — a seventh party cannot then be added without appearing here. Note <tt>addScalar</tt> stores a scalar under its obligation's id (<tt>bridge/fulfilment-bindings.js</tt>), so for these six the fulfilment id and the obligation id are the same value: resolve through the fulfilment id anyway, because that equivalence holds only for scalars and breaks the first time a journey returns into a collection.</p></li>
	<li><b>Beware an existing misnomer.</b> The parameter named <tt>obligationId</tt> in <tt>check-answers/view-model/rows/party-row.js</tt> and <tt>rows/change-link.js</tt> holds neither an obligation id nor a fulfilment id — callers pass the obligation's <tt>name</tt> (<tt>'consignor'</tt>) and the lookup is by name-path. Three things in this repo are called some form of "id" and mean different things; do not copy that spelling into the return route.</li>
</ul>


<p><b>Referenced and inline parties behave differently</b> — <tt>placeOfOrigin</tt> and the consignment contact carry <tt>inline: true</tt>, so the notification keeps a copy of the details and a later edit in the book does not reach it. The other four hold the <tt>addressId</tt> alone and resolve on read. <tt>answerFor</tt> already handles both.</p>

<p><b>Organisation identity</b> — <tt>client.js</tt> sends <tt>Trade-Imports-Organisation-Id</tt> from the signed-in session and throws outright if there is none; INS has its own <tt>requireOrganisationId</tt>. Both sides must be acting for the <b>same</b> organisation, or the Trader is returned an id their own book cannot resolve. Check it explicitly on return rather than trusting it.</p>

<p><b>Stub mode</b> — <tt>isStubMode()</tt> runs the journey against <tt>STUB_BOOK</tt> with no dependent services and no Defra ID, so INS is not running either. The add link must be hidden or inert in that mode rather than sending a Trader to a service that is not there.</p>

<p><b>Out of scope</b></p>

<p><b>Changing an address from the journey.</b> Only creation is delegated; edits happen in the address book itself. The handshake could later point at the INS edit route, but no entry point is added here. Consequence for the four referenced parties: a Trader who picked the wrong address picks again rather than editing the record.</p>

<p><b>Welsh copy in INS</b> — 
    <span class="jira-issue-macro" data-jira-key="EUDPA-346" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-346" class="jira-issue-macro-key issue-link"  title="Give the INS address book a Welsh copy layer" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-346
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-complete jira-macro-single-issue-export-pdf">To Do</span>
            </span>
. INS has no copy layer, so this ticket knowingly sends a Trader to an English-only page mid-journey. Must land before any Welsh launch.</p>

<p><b>Field-name alignment</b> — 
    <span class="jira-issue-macro" data-jira-key="EUDPA-347" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-347" class="jira-issue-macro-key issue-link"  title="Decide whether the journey should adopt the address book API&#39;s field names" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-347
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-complete jira-macro-single-issue-export-pdf">To Do</span>
            </span>
. The journey and the API name the same fields differently. 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-294" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-294" class="jira-issue-macro-key issue-link"  title="Link notifications to addresses from the address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-294
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 deliberately mapped at the boundary rather than standardising, and that stands here.</p>

<p><b>Not required by this ticket</b> — <tt>transport/private-transporter-details/</tt> and <tt>commodities/animal-identification/address/fields.js</tt> use <tt>telephoneNumber</tt> and <tt>emailAddress</tt> too, but they are not address book records.</p>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (2)

### Rhys Sharrem (2026-08-20)
[~accountid:712020:d28dac84-8334-4615-b6fa-8c8cc11b3681] and [~accountid:712020:bfbdf0ce-5828-446d-ae8e-5bb791693a9f] to pair on creating a sequence diagram of the calls from each frontend and backend for the full flow.

### TarunKumar Palisetty (2026-09-09)
Hi [~accountid:712020:d28dac84-8334-4615-b6fa-8c8cc11b3681] [~accountid:712020:7116afd8-7125-4d89-9524-4ad5a6e736b2]  a confirmation is needed on the AC “Leaving without saving”
The ticket requires cancel to return the Trader to the journey picker, but the INS button always says “Cancel and return to address book” — should that label change when they arrived from a journey?

## Confluence References


