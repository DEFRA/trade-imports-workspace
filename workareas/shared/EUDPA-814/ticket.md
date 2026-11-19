# EUDPA-814: Add hidden Defra ID sign-in to the INS frontend, keeping stub sign-in unchanged

## Metadata
- **Type:** Task
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-59
- **Assignee:** Amir Naveed

## Description

<p><b>We need to</b> add a sign-in to the INS frontend that goes through the real Defra ID (IDM), alongside the existing stub sign-in.<br/>
<b>So that</b> we can test that IDM behaves as specified, without changing how the stack and E2E tests sign in.</p>

<p><b>Background</b><br/>
The INS frontend is the front door: it starts sign-in for INS. IDM has registered it in CP-Dev with the redirect URL <tt>/auth/callback</tt> and the post-logout URL <tt>/auth/signed-out</tt>, on <tt>localhost:3002</tt> and on the deployed dev and test URLs. The frontend today serves stub sign-in at <tt>/auth/sign-in-oidc</tt>, which IDM does not know. The routing proxy has already proved a real CP-Dev sign-in from localhost (
    <span class="jira-issue-macro" data-jira-key="EUDPA-806" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-806" class="jira-issue-macro-key issue-link"  title="Sign in through IDM on trade-imports-routing-proxy from localhost" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-806
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
).</p>

<p><b>Recommendation</b><br/>
Add a second, hidden sign-in with its own config, next to the stub one. Nothing in the service links to it; the team reaches it by URL. On success it shows the returned token information exactly as the routing proxy's signed-in page does.</p>

<div class='table-wrap'>
<table class='confluenceTable'><tbody>
<tr>
<th class='confluenceTh'>What needs adding</th>
<th class='confluenceTh'>Where</th>
</tr>
<tr>
<td class='confluenceTd'>A second Defra ID sign-in setup with its own config (discovery URL, client ID, client secret, service ID, policy, redirect URL)</td>
<td class='confluenceTd'><tt>trade-imports-ins-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>An unlinked sign-in start page, for example <tt>/auth/idm/sign-in</tt></td>
<td class='confluenceTd'><tt>trade-imports-ins-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>The callback at the registered <tt>/auth/callback</tt></td>
<td class='confluenceTd'><tt>trade-imports-ins-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>A signed-in page showing the token information, as the routing proxy does</td>
<td class='confluenceTd'><tt>trade-imports-ins-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>A signed-out page at the registered <tt>/auth/signed-out</tt></td>
<td class='confluenceTd'><tt>trade-imports-ins-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>The client ID, client secret and service ID as CDP secrets in dev and test</td>
<td class='confluenceTd'>CDP portal</td>
</tr>
</tbody></table>
</div>


<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-ins-frontend</tt> - the hidden sign-in, its config and pages</li>
	<li>Out of scope: changing the stub sign-in, the workspace stack or the E2E tests; running the hidden sign-in inside the workspace stack; linking to it from the service; production</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>Going to the hidden sign-in start page on <tt>localhost:3002</tt> signs the user in through Defra ID in CP-Dev and returns them to <tt>/auth/callback</tt></li>
	<li>After a successful sign-in, a page shows the ID token claims, the access token claims (or says the access token is the ID token) and the token response, laid out exactly as on the routing proxy's signed-in page</li>
	<li>The same journey works on the deployed INS frontend in CDP dev and test</li>
	<li>An error from Defra ID is logged in full, and the user sees a generic error page with a link to try again</li>
	<li><tt>/auth/signed-out</tt> shows a signed-out page</li>
	<li>Nothing in the INS frontend links to the hidden sign-in pages</li>
	<li>Stub sign-in (<tt>/auth/sign-in</tt>, <tt>/auth/sign-in-oidc</tt>), the workspace stack and the E2E tests work as they do now</li>
	<li>The Defra ID client ID, client secret and service ID come from CDP secrets in dev and test, and from environment variables locally; none are committed</li>
	<li>The README lists the names of the new settings, without values</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>
<ul>
	<li>CP-Dev discovery URL: <tt><a href="https://your-account.cpdev.cui.defra.gov.uk/idphub/b2c/b2c_1a_cui_cpdev_signupsignin/.well-known/openid-configuration" class="external-link" rel="nofollow noreferrer">https://your-account.cpdev.cui.defra.gov.uk/idphub/b2c/b2c_1a_cui_cpdev_signupsignin/.well-known/openid-configuration</a></tt>. The policy must be <tt>b2c_1a_cui_cpdev_signupsignin</tt>; the stub's policy name causes a redirect loop.</li>
	<li>The routing proxy's change on branch <tt>feat/EUDPA-806-sign-in-through-idm-from-localhost</tt> shows the pattern: the callback served at the path of the redirect URL, the signed-in page and the signed-out page.</li>
	<li>Locally, put the values in <tt>.env</tt> in the repo root. It is gitignored and <tt>npm run dev</tt> loads it.</li>
	<li>The IDM Technical Onboarding Guide (§15.3.3) says to log the detailed error and show the user a generic page with no error details.</li>
	<li>CDP secrets need a value per environment and a redeploy to take effect: <a href="https://github.com/DEFRA/cdp-documentation/blob/main/how-to/secrets.md" class="external-link" rel="nofollow noreferrer">Secrets in CDP services</a></li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


