# Extract: a web page or site

A `web` source is a public page or site, and its `locator` is a URL. Read [`extract.md`](extract.md) first: its
rules all hold here.

Read it with the WebFetch tool. Load it first with ToolSearch (`select:WebFetch`) if it is not yet loaded. Never use
`curl`. For a site rather than one page, the `scope` names the pages that matter. Follow links only within that
scope, and never more than about 15 pages.

## Characterise the site

The characterise step writes into the partition's `structure` every page in scope, by URL and title, and what each
covers, says which pages the scope led it to leave out, and cuts them into parts of one or a few pages.

An extract part reads every URL its `read` names, and its part file's `structure` lists them exactly: the verifier
reads the same URLs.

## What a claim says

- `ref` is the URL plus the heading on that page, such as
  `https://grafana.com/docs/k6/latest/ §Thresholds`.
- `quote` is the page's words, verbatim, as WebFetch returned them. When WebFetch gives you a summary rather than
  the text, say so in `note` and set `confidence` to `inferred`.
- A web source is general guidance, not a decision about this programme. Record what it recommends as what it
  recommends ("k6 recommends …"), never as a requirement.
- A page that did not load is a `gap` claim naming the URL and what you expected to find there.
