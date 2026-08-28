# EUDPA-349: URL-safe fulfilment ids

## Metadata
- **Type:** Task
- **Status:** Deskcheck
- **Priority:** Lowest
- **Labels:** technicalImprovement
- **Parent:** EUDPA-107
- **Assignee:** Paul Hodgson

## Description

<p><b>Background</b><br/>
Within the obligations model:</p>

<p>An <tt>obligation</tt> is a static model-level entity identified by a <tt>UUID</tt> <tt>obligationId</tt>. Some <tt>obligations</tt> are indexed, and the indexing can be dynamic, but there’s still one <tt>obligation</tt> of that kind modelled per journey.</p>

<p>A <tt>fulfilment</tt> is dynamic and <tt>notification</tt> level. It identifies the instance of an indexed <tt>obligation</tt> uniquely. <tt>Fulfilments</tt> are double-keyed, first by <tt>obligationId</tt> and then by an optional <tt>fulfilment index</tt>.</p>

<ul>
	<li>Scalar: <tt>9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d</tt> (just the obligation id - this obligation is scalar not nested)</li>
	<li>Depth-1: <tt>9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d</tt> and <tt>line0</tt></li>
	<li>Depth-2: <tt>9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d</tt> and <tt>line0/unit1</tt></li>
</ul>




<p><b>Naming</b></p>

<p>Historically, <tt>fulfilments</tt> were mapped with a single flat <tt>fulfilmentId</tt> which contained both the <tt>obligationId</tt> and any <tt>fulfilment index</tt>. </p>

<p>It seems that there is some confusing wording and naming within the code, and <tt>fulfilmentId</tt> can refer either to the <tt>fulfilment index</tt> element OR to the combination of <tt>obligationId</tt> and the <tt>fulfilment index</tt>.</p>

<p>We would like to resolve this confusion as part of this ticket. </p>



<p><b>Desired properties of a fulfilment id</b></p>

<ul>
	<li>A <tt>fulfilmentId</tt> is the public, shareable id represented using a single string.</li>
	<li>For boundaries that expect a single string handle (URL params, API path segments, log correlation keys, admin tooling), we want a canonical, URL-safe, stateless encoding of the fulfilment id.</li>
	<li>It should be possible to map a single <tt>fulfilmentId</tt> to an individual <tt>fulfilment</tt> regardless of nesting.</li>
	<li>Therefore it must contain the <tt>obligationId</tt> at least, and a <tt>fulfilment index</tt> where necessary.</li>
</ul>


<p>The proposed shape is <tt>&lt;obligationId&gt;</tt> for scalar <tt>fulfilments</tt>, and <tt>&lt;obligationId&gt;:&lt;fulfilment.index&gt;</tt> for indexed <tt>obligations</tt>. The outer <tt>:</tt> marks the obligation/fulfilment boundary and the inner separator (post-swap) handles path segments. Both delimiters are RFC 3986 characters that no library encodes and no WAF rule flags. Round-trips losslessly with no server-side state.</p>

<p>Examples:</p>

<ul>
	<li>Scalar: <tt>9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d</tt> (just the <tt>obligationId</tt> - this <tt>obligation</tt> is scalar not nested)</li>
	<li>Depth-1: <tt>9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d:line0</tt></li>
	<li>Depth-2: <tt>9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d:line0.unit1</tt></li>
</ul>




<p><ins><b>Acceptance Criteria</b></ins></p>

<ul>
	<li><tt>fulfilment index</tt> strings use <tt>.</tt> (or agreed alternative) as the segment separator throughout the frontend. Example: <tt>line0.unit1</tt>, not <tt>line0/unit1</tt>.</li>
	<li>Ensure that nested path tokens do not contain the delimiters <tt>:</tt> or <tt>.</tt> (update the <tt>PATH_UNSAFE</tt> token-validation regex).</li>
	<li>Resolve the naming confusion. Ensure that the code consistently and correctly refers to <tt>fulfilment index</tt> (e.g. <tt>line0.unit1</tt>) and <tt>fulfilmentIds</tt> (e.g. <tt>9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d:line0.unit1</tt>)</li>
</ul>




<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>

<ul>
	<li>We <em>ruled out some delimiters to keep the boundary unambiguous against the inner separator. `-` and `</em>` inside tokens are already allowed by the token regex, so those are out for both roles.</li>
	<li>Two-delimiter rationale: keeping the outer delimiter distinct from <tt>PATH_DELIMITER</tt> means a future internal delimiter swap doesn't ripple into the public-token shape — the boundary marker stays stable across separator revisions.</li>
	<li>Blocks 
    <span class="jira-issue-macro" data-jira-key="EUDPA-333" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-333" class="jira-issue-macro-key issue-link"  title="Delegate address creation to the INS address book service" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-333
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-complete jira-macro-single-issue-export-pdf">To Do</span>
            </span>
: we need a single shareable web-friendly `fulfilmentId` before we start the dependent ticket.</li>
	<li><b>Consider not letting AI do all of this work</b>. IntelliJ SSR / a workspace-wide safe-refactor is likely cleaner than sed — the sites are small in number but the test fixtures span several directories with different surrounding syntax.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


