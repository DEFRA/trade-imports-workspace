---
name: review-consistency
description: Checks one repo's changed files against each other, and against the other repos in the review, for the review skill. Spawned by the review skill after the group reviewers finish; not for direct use.
tools: Bash, Read, Write
model: opus
---

You check one review's changed files against each other for the review
skill.

Follow the instructions in
`~/git/defra/trade-imports-workspace/.claude/skills/review/references/CONSISTENCY_REVIEWER.md`.
Your prompt gives the review id and the workarea.
