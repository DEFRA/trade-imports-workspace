# theme-ticket skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Write and maintain the business-facing Jira tickets for a built theme: one ticket per service domain, with acceptance criteria copied from the openspec behaviour specification, for the BAs, POs and SMEs who validate the theme in a test environment.

## 2. State shape

**Choice:** prose
**Pattern reference:** docs/best-practices/skills/patterns.md §1

## 3. Dispatcher

**Choice:** true
**Pattern reference:** patterns.md §2

## 4. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 5. Worker fan-out

**Choice:** false
**Workers:** 
**Pattern reference:** patterns.md §5

## 6. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 7. Helpers introduced

- start-theme-ticket
- derive-scenarios
- check-stale
- push-description

## 8. Triggers

- "write the theme ticket"
- "theme ticket for EUDPA-X"
- "write the business tickets for <theme>"
- "split the theme ticket by domain"
- "regenerate the theme tickets"
- "which theme tickets are stale"

**Disambiguation:** None of the phrases match Claude Code built-in /init, which scaffolds CLAUDE.md. Against neighbouring workspace skills: ticket-creator raises a brand-new ticket by interviewing the user and drafting for iteration, whereas this derives a ticket from a theme that is already built and owns the per-domain split, with no interview. ticket-refiner judges whether a ticket is ready before refinement; this writes the ticket after the work is built. The ticket skill plans or implements an existing ticket code; this writes no code. spec-catchup and spec-cover change openspec itself; this only reads it. requirements-pipeline owns the backlog and the build loop; this reads the theme backlog for row titles and repos but never edits it.
