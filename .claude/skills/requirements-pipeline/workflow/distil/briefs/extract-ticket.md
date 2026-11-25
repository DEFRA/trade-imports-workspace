# Extract: a Jira ticket

A `ticket` source is a Jira ticket the main session fetched at intake, with `tim backlog from-ticket <KEY>`. The
`locator` is the ticket file it wrote, `<workarea>/sources/ticket-<key in lower case>.md`. Read
[`extract.md`](extract.md) first: its rules all hold here.

Never fetch the ticket again yourself, and never use a Jira or Confluence tool. The file is the source, so the
verifier reads the same words you do.

## Reading the file

The ticket file holds, in order: the metadata, the description, then the parent, linked tickets and subtasks when
the ticket has them, the comments, the Confluence pages the description links to, and the attachments.

The ticket's acceptance criteria are in the `## Description` section, under the description's own acceptance
criteria heading. The file's `## Acceptance Criteria` section is an empty placeholder: ignore it.

Beside it, `sources/attachments/` holds each image and PDF attachment the ticket file lists as saved. An attachment
listed as not saved is not there to read.

## What a claim says

- **Each acceptance criterion is its own claim.** `quote` is the criterion's own words. `ref` cites its number: the
  ticket's own number where it has one, else its place in order, such as `acceptance criterion 3`.
- The description and background are claimed by the rules in `extract.md`.
- A comment that states or changes a requirement is a claim. Its `ref` names the comment's author and date, such as
  `comment by Pat Example, 2026-11-21`.
- **A comment that contradicts an acceptance criterion says so in `note`**, naming the criterion, such as
  `contradicts acceptance criterion 2`. The reconciler weighs it against the criterion.
- The parent, linked tickets and subtasks are context. Claim one only where it states a requirement for this ticket.
- A linked Confluence page in the file is claimed by [`extract-confluence.md`](extract-confluence.md)'s method, in
  its own part.
- An image attachment is read by [`extract-image.md`](extract-image.md)'s method, and a PDF by
  [`extract-document.md`](extract-document.md)'s.
- An attachment listed as not saved is a `gap` claim naming the attachment and why it is missing.
