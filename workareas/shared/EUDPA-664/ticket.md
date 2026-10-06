# EUDPA-664: Carry date-only fields as LocalDate and store them as strings in Mongo

## Metadata
- **Type:** Task
- **Status:** Deskcheck
- **Priority:** Lowest
- **Labels:** technicalImprovement
- **Parent:** EUDPA-144
- **Assignee:** Hamid Jemei

## Description


<p><b>We need to</b> carry date-only fields as a calendar date (<tt>LocalDate</tt>, <tt>YYYY-MM-DD</tt>) from the frontend to the backend, and store them in Mongo as strings.<br/>
<b>So that</b> a date the trader chose is never given a time or a zone, and cannot shift by a day.</p>

<p><b>Background</b><br/>

    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-565" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-565" class="jira-issue-macro-key issue-link"  title="Use Instant for every date on the animals API — persisted, inbound and on the wire" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-565
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
, now merged, made every date on the animals API an <tt>Instant</tt>. For date-only fields that means the frontend labels the chosen day as UTC midnight, and the backend truncates it to UTC midnight on save.</p>

<p>That works, but it models a calendar date as a moment. It needs truncation to stay correct, it needs zone guards in tests, and it overrides the <tt>date</tt> form in the REST guide.</p>

<p>This ticket changes date-only fields only. True moments (<tt>created</tt>, <tt>updated</tt>, <tt>submittedAt</tt> and similar timestamps) stay as <tt>Instant</tt>, as 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-565" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-565" class="jira-issue-macro-key issue-link"  title="Use Instant for every date on the animals API — persisted, inbound and on the wire" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-565
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 left them.</p>

<p>The date-only fields are:</p>
<ul>
	<li><tt>Transport.arrivalDate</tt></li>
	<li><tt>NotificationBase.exitDate</tt></li>
	<li><tt>DocumentUploadRequest.dateOfIssue</tt> and <tt>AccompanyingDocument.dateOfIssue</tt></li>
</ul>


<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-animals-frontend</tt> - send date-only fields as <tt>YYYY-MM-DD</tt>. Replace <tt>instantFromDateParts</tt> for these fields in <tt>src/server/app/lib/validate/calendar.js</tt>, the <tt>mapper-a</tt> sections (<tt>direct-fields.js</tt>, <tt>transport.js</tt>), the document upload service and the stub marshal (<tt>list-item.js</tt>). Keep the service-zone rendering of moments on the dashboard.</li>
	<li><tt>trade-imports-animals-backend</tt> - type the date-only fields as <tt>LocalDate</tt> on the request, the domain model and the response. Register a <tt>LocalDate</tt> to <tt>String</tt> converter pair in <tt>MongoConfig</tt>, replacing <tt>UtcLocalDateConverters</tt>. Remove the UTC-midnight truncation in <tt>NotificationService</tt> and <tt>DocumentService</tt>. Update the GBN-AG mapping (<tt>TransportEvent</tt>) to convert the <tt>LocalDate</tt> to an <tt>Instant</tt>, because PIMS still receives an instant.</li>
	<li><tt>trade-imports-ins-tests</tt> - update specs and fixtures that send or assert date-only fields.</li>
	<li><tt>trade-imports-workspace</tt> - rewrite the date guidance to the new design and remove the 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-565" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-565" class="jira-issue-macro-key issue-link"  title="Use Instant for every date on the animals API — persisted, inbound and on the wire" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-565
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 approach for date-only fields.</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>The frontend sends <tt>arrivalDate</tt>, <tt>exitDate</tt> and <tt>dateOfIssue</tt> as <tt>YYYY-MM-DD</tt>, with no time and no offset.</li>
	<li>The frontend does not send a date-only field when the trader leaves the day, month and year blank.</li>
	<li>The backend returns 400 when a date-only field carries a time or an offset, for example <tt>2026-07-21T00:00:00Z</tt>.</li>
	<li>The backend returns date-only fields as <tt>YYYY-MM-DD</tt> in every response that carries them.</li>
	<li>Mongo stores each date-only field as a string in <tt>YYYY-MM-DD</tt> form, not as a BSON date. An integration test reads the raw document and asserts this.</li>
	<li>A stored date-only field reads back as the same calendar date whatever the JVM default zone.</li>
	<li>The backend has no UTC-midnight truncation for date-only fields, and <tt>UtcLocalDateConverters</tt> is deleted.</li>
	<li>The GBN-AG message to PIMS still sends an instant. The backend converts the stored <tt>LocalDate</tt> to an <tt>Instant</tt> at UTC midnight, so <tt>scheduledOccurrenceDateTime</tt> is the same string for a given arrival date as it is today, for example <tt>2026-07-21T00:00:00Z</tt>.</li>
	<li><tt>created</tt>, <tt>updated</tt> and <tt>submittedAt</tt> are still <tt>Instant</tt> and still carry a <tt>Z</tt> suffix on the wire.</li>
	<li>The OpenAPI schema shows date-only fields as <tt>format: date</tt> and moments as <tt>format: date-time</tt>.</li>
	<li><tt>docs/best-practices/java/spring-data-mongodb.md</tt> section 4 describes the new design: <tt>LocalDate</tt> for date-only fields, stored as a string through the converter pair, and <tt>Instant</tt> for moments.</li>
	<li><tt>docs/best-practices/rest-api/rest-api.md</tt> no longer carries the note that instants override its <tt>date</tt> form.</li>
	<li>No doc, Javadoc, <tt>@Schema</tt> description or code comment in the affected repos describes date-only fields as instants or as UTC midnight. This includes the static-block comment in <tt>Application.java</tt>.</li>
	<li>Unit, integration and end-to-end tests pass in all affected repos.</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>
<ul>
	<li>Example converter pair, as a starting point and not a mandated shape:
<div class="code panel" style="border-width: 1px;"><div class="codeContent panelContent">
<pre class="code-java">@Configuration
<span class="code-keyword">class </span>MongoConfig {

    @Bean
    MongoCustomConversions mongoCustomConversions() {
        <span class="code-keyword">return</span> <span class="code-keyword">new</span> MongoCustomConversions(List.of(
            <span class="code-keyword">new</span> LocalDateToString(), <span class="code-keyword">new</span> StringToLocalDate()));
    }

    @WritingConverter
    <span class="code-keyword">static</span> <span class="code-keyword">class </span>LocalDateToString <span class="code-keyword">implements</span> Converter&lt;LocalDate, <span class="code-object">String</span>&gt; {
        <span class="code-keyword">public</span> <span class="code-object">String</span> convert(LocalDate source) { <span class="code-keyword">return</span> source.toString(); }
    }

    @ReadingConverter
    <span class="code-keyword">static</span> <span class="code-keyword">class </span>StringToLocalDate <span class="code-keyword">implements</span> Converter&lt;<span class="code-object">String</span>, LocalDate&gt; {
        <span class="code-keyword">public</span> LocalDate convert(<span class="code-object">String</span> source) { <span class="code-keyword">return</span> LocalDate.parse(source); }
    }
}
</pre>
</div></div></li>
	<li>A global <tt>String</tt> to <tt>LocalDate</tt> reading converter applies to every <tt>LocalDate</tt> field. Check it does not affect any <tt>String</tt> field.</li>
	<li><tt>YYYY-MM-DD</tt> strings sort in date order, so sorting and range queries on these fields still work as string comparisons.</li>
	<li>Before 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-565" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-565" class="jira-issue-macro-key issue-link"  title="Use Instant for every date on the animals API — persisted, inbound and on the wire" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-565
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
, <tt>TransportEvent</tt> built <tt>scheduledOccurrenceDateTime</tt> with <tt>atStartOfDay(ZoneOffset.UTC)</tt> on a <tt>LocalDate</tt>. Restoring that conversion keeps the PIMS instant unchanged.</li>
	<li>No data migration is needed. The services are not live, so there are no stored documents to convert.</li>
	<li>This ticket covers the animals services only. Other services get their own tickets.</li>
	<li><tt>AccompanyingDocument.dateOfIssue</tt> was an <tt>Instant</tt> in Mongo before 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-565" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-565" class="jira-issue-macro-key issue-link"  title="Use Instant for every date on the animals API — persisted, inbound and on the wire" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-565
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 too, so its stored type changes for the first time here.</li>
	<li>Tests to rework: <tt>PersistedTimestampZoneIT</tt>, <tt>DocumentServiceTest</tt>, <tt>NotificationServiceTest</tt>, <tt>NotificationControllerTest</tt>, <tt>DocumentControllerTest</tt>, <tt>GbnAgMapperTest</tt>, the frontend <tt>calendar.test.js</tt> and mapper tests, and <tt>arrival-details.spec.ts</tt> in ins-tests.</li>
	<li>
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-565" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-565" class="jira-issue-macro-key issue-link"  title="Use Instant for every date on the animals API — persisted, inbound and on the wire" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-565
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 PRs for reference: animals-backend #99, animals-frontend #376, ins-tests #7, workspace #82.</li>
	<li>Use the same branch name in every affected repo.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


