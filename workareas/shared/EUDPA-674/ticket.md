# EUDPA-674: Add custom metrics, alerts, Grafana dashboards and logging to the remaining INS services

## Metadata
- **Type:** Task
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-144
- **Assignee:** Hamid Jemei

## Description

<p><b>We need to</b> add custom metrics, custom Grafana dashboards, custom alerts and dependency logging to the 9 remaining INS services, using the observability skill from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
.<br/>
<b>So that</b> we can see how every service behaves in prod and trust our deploys before the final release.</p>

<p><b>Background</b><br/>

    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 was a spike on <tt>trade-imports-reference-data</tt>. It worked out which custom metrics we need, how to log dependency call times, and how to build, promote and test dashboards and alerts on CDP. It also produced a workspace skill that walks through these steps.</p>

<p>This ticket uses that skill on the other services. Most of the metrics should already be agreed from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
, for example the common metrics for outbound HTTP calls. Each service will only need extra metrics for behaviour reference-data does not have. For example, <tt>trade-imports-dynamics-gateway</tt> reads events from SQS and sends them to the PIMS Azure Service Bus over AMQP over WebSockets. A failed send never reaches a user's HTTP request, so it needs its own metrics:</p>
<ul>
	<li>Service Bus sends that succeed, are retried or fail</li>
	<li>how long each Service Bus send takes</li>
	<li>SQS messages that are retried or sent to the dead-letter queue</li>
</ul>


<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-animals-frontend</tt></li>
	<li><tt>trade-imports-animals-backend</tt></li>
	<li><tt>trade-imports-animals-admin</tt></li>
	<li><tt>trade-imports-dynamics-gateway</tt></li>
	<li><tt>trade-imports-address-book</tt></li>
	<li><tt>trade-imports-ins-frontend</tt></li>
	<li><tt>trade-imports-ins-backend</tt></li>
	<li><tt>trade-imports-plants-frontend</tt></li>
	<li><tt>trade-imports-plants-backend</tt></li>
</ul>


<p>Out of scope: <tt>trade-imports-reference-data</tt> (done in 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
), <tt>trade-imports-stub</tt> and <tt>trade-imports-defra-id-stub</tt>.</p>

<p><ins><b>Acceptance Criteria</b></ins></p>

<p><em>For each service in scope:</em></p>

<p><em>Working out what to measure</em></p>
<ul>
	<li>The service uses the common metrics agreed in 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
, for example call counts, errors and times for outbound HTTP calls.</li>
	<li>We have listed the service's dependencies and agreed any extra metrics it needs beyond the common set, and why. For example, the Service Bus and SQS metrics for <tt>trade-imports-dynamics-gateway</tt> listed above. The extra metrics are recorded on this ticket.</li>
	<li>We have checked in Grafana that the service has the CDP default dashboard and default alerts.</li>
</ul>


<p><em>Metrics, logging and dashboard</em></p>
<ul>
	<li>The service publishes the common and extra metrics.</li>
	<li>The service records whether each of its dependencies is available as a metric.</li>
	<li>For each call to an external dependency, the service logs how long the call took, with the dependency name, outcome and trace.id, so we can search call times in OpenSearch.</li>
	<li>The service has a custom Grafana dashboard showing its metrics, dependency status and, where it helps, dependency call times.</li>
	<li>The service's /health endpoint is not changed.</li>
</ul>


<p><em>Alerts</em></p>
<ul>
	<li>The service has custom alerts, including one that fires when a dependency is unavailable. They are built in the dev playground and promoted to test and prod through #cdp-support.</li>
	<li>Default and custom alerts reach the INS dev team in the Slack channels agreed in 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
.</li>
	<li>We have tested in dev and test that each custom alert fires and reaches the team.</li>
</ul>


<p><em>Across all services:</em></p>
<ul>
	<li>We can follow a request across services in OpenSearch using its trace.id, from the frontend through to the backends and the dynamics gateway.</li>
	<li>Anything the skill got wrong or missed is fixed in the skill as we go, so it stays ready for new services.</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>
<ul>
	<li>Use the observability skill from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 for each service.</li>
	<li>Do not start until 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 is done.</li>
	<li>We can split this into one PR per service repo. Branch names follow the cross-repo rule: the same branch name in every repo.</li>
	<li>Services deployed to prod early (
    <span class="jira-issue-macro" data-jira-key="EUDPA-633" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-633" class="jira-issue-macro-key issue-link"  title="Work out which microservices can safely deploy to prod, then deploy them" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-633
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-complete jira-macro-single-issue-export-pdf">To Do</span>
            </span>
) can check their alerts and dashboard against real traffic.</li>
	<li>Try to play this before 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-673" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-673" class="jira-issue-macro-key issue-link"  title="Deploy microservices to the CDP perf-test environment for the first time" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-673
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 (first deploy to the CDP perf-test environment). It is not blocked by this ticket, but having the dashboards, metrics and dependency call times in place makes the perf-test results much easier to read.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


