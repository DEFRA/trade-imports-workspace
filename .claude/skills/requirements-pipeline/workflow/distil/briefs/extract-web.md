# Extract: a web page or site

A `web` source is a public page or site, and its `locator` is a URL. Read [`extract.md`](extract.md) first: its
rules all hold here.

Read it with the WebFetch tool. Load it first with ToolSearch (`select:WebFetch`) if it is not yet loaded. Never use
`curl`. For a site rather than one page, the `scope` names the pages that matter. Follow links only within that
scope, and never more than about 15 pages.

## Characterise the site

Write into `structure`: every page you read, by URL and title, in the order you read them, and what each covers.
Say which pages the scope led you to leave out. The verifier reads the same URLs, so list them exactly.

## What a claim says

- `ref` is the URL plus the heading on that page, such as
  `https://grafana.com/docs/k6/latest/ §Thresholds`.
- `quote` is the page's words, verbatim, as WebFetch returned them. When WebFetch gives you a summary rather than
  the text, say so in `note` and set `confidence` to `inferred`.
- A web source is general guidance, not a decision about this programme. Record what it recommends as what it
  recommends ("k6 recommends …"), never as a requirement.
- A page that did not load is a `gap` claim naming the URL and what you expected to find there.
