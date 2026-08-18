module.exports = [
  // ===== Session 2 — ticket =====
  {
    n: 2, skill: "ticket", file: "02-ticket",
    oneLiner: "Take one existing EUDPA ticket through plan, implement and refactor — in the workspace.",
    whyTitle: "Plan, implement, refactor — one ticket",
    why: [
      "A ticket rarely lives in one repo. Before you write a line you're piecing together its Jira description and comments, any Confluence design notes, which repos and which stacks it touches, and the conventions each repo expects. That context-gathering is slow, easy to get wrong, and different every time.",
      "The ticket skill does that legwork and turns it into a written plan you can challenge before any code exists — then implements against the plan, repo by repo, keeping the tests green the whole way. You stay the decision-maker; it removes the grind around the decisions.",
    ],
    benefits: [
      ["Context, gathered", "Jira, comments, Confluence and the right best-practices, pulled in for you"],
      ["A plan you can argue with", "decisions surfaced as text before code, not buried in a diff"],
      ["Green all the way", "baseline checked, tests re-run each step, CI driven to green"],
    ],
    triggers: '"plan EUDPA-1234" · "implement EUDPA-1234" · "refactor" / "tidy up"',
    demo: [
      ["Plan", "\"plan EUDPA-1234\" — it reads the ticket, comments and Confluence refs, works out the affected repos and their stacks, and bakes in the matching best-practice guides."],
      ["Read & challenge", "plan.md lays out a summary, a repos/stack table, numbered steps, the testing strategy and risks — with [ASSUMPTION] and [NEEDS VERIFICATION] flags for you to settle."],
      ["Implement", "\"implement EUDPA-1234\" — it confirms the baseline tests pass, cuts a feature branch per repo, then works the plan step by step: smallest change, re-run tests, add tests."],
      ["Stay in control", "it follows the plan you approved rather than a free hand, so the change matches what you agreed and nothing wanders off-scope."],
      ["Verify & hand off", "it triggers CI, waits for green, and reports the repos, files and tests it touched — ready for you to open the PR."],
    ],
    outputsLead: "Everything lands under workareas/ticket-planning/EUDPA-X/ (gitignored).",
    outputs: [
      ["plan.md", "the artifact you actually review and amend — steps, risks, assumptions"],
      ["ticket.md", "a readable dump of the Jira metadata, description and comments"],
      ["best-practices/<repo>.md", "the per-repo guidance it cites while coding"],
      ["feature/EUDPA-X-<slug>", "a branch per repo, with a green CI run"],
    ],
    usage: [
      ["Reach for it when", "you're picking up a refined EUDPA ticket and about to start the work"],
      ["Where you decide", "you resolve the plan's open questions, and review the diff and PR — it never merges for you"],
      ["How it fits", "it hands off to review and code-style once the PR is up"],
    ],
    liveView: [
      ["plan / implement / refactor EUDPA-X", "how you launch each phase"],
      [".claude/skills/ticket/SKILL.md", "what it does — straight from source"],
      ["workareas/ticket-planning/EUDPA-X/", "where the plan and context land"],
    ],
    note: "Run `~/git/defra/trade-imports-workspace/tools/auth.sh` first — the skill fetches Jira and GitHub.",
    tryIt: "Pick a real ticket you know and run just the plan phase: \"plan EUDPA-XXXX\". No code is written, so it is a safe first run. Open plan.md and read the steps, the risks table and the [NEEDS VERIFICATION] markers.",
    next: "Next: Session 3 — the review skill",
    nextMd: "Next: [Session 3 — the `review` skill](03-review.md).",
  },

  // ===== Session 3 — review =====
  {
    n: 3, skill: "review", file: "03-review",
    oneLiner: "Review a ticket's PRs across every repo and language, and triage the findings to merge-ready.",
    whyTitle: "Every PR, every repo, triaged",
    why: [
      "A single ticket can land as several PRs — a Java backend change, a Node frontend tweak, an update to the tests repo — and a good review has to hold all of them at once: correctness, security, and whether the tests actually cover the change. Doing that by hand, across repos and two languages, is slow and uneven.",
      "review reads every changed file in parallel, checks the repos stay consistent with each other, and records each finding so nothing slips between \"looks fine\" and merge. When more commits land it re-reviews only what changed and carries your earlier decisions forward.",
    ],
    benefits: [
      ["Nothing unread", "every changed file reviewed, behind a hard 100% coverage gate"],
      ["One verdict, all repos", "correctness, security and test gaps in a single index"],
      ["Decisions that stick", "findings tracked and carried across re-reviews"],
    ],
    triggers: '"review EUDPA-1234" · "re-review" · "walk review EUDPA-1234" · "implement review"',
    demo: [
      ["Kick off", "\"review EUDPA-1234\" — it works out fresh vs refresh, clones the repos and sets up the review workspace."],
      ["Fan out", "a per-file reviewer runs across every changed file in parallel; it won't proceed until 100% of files are covered."],
      ["Consistency & write-up", "it runs a per-repo consistency check, then writes a review doc per repo plus a top-level index — verdict, acceptance-criteria check and a risk matrix."],
      ["Triage", "\"walk review EUDPA-1234\" steps you through findings one at a time: Fix, Won't-fix or Discuss."],
      ["Apply or hand off", "\"implement review\" applies the queued fixes; on someone else's PR it can push a branch and post the findings as inline comments."],
    ],
    outputsLead: "All under workareas/reviews/EUDPA-X/.",
    outputs: [
      ["review-index.md", "start here — verdict (PASS / NOTES / CONCERNS / FAIL), AC check, risk matrix"],
      ["review.<repo>.md", "per repo — file-analysis table, coverage, and the Items findings table"],
      ["items.<repo>.json", "the canonical state behind the table — don't hand-edit; it's regenerated"],
    ],
    usage: [
      ["Reach for it when", "a ticket's PRs are up and you want a thorough pass before approving"],
      ["Where you decide", "you set each finding's disposition and own the merge — it advises, you approve"],
      ["How it fits", "pairs with code-style (the JS guide) and understanding-check (author grasp)"],
    ],
    liveView: [
      ["review · re-review · walk review", "fresh pass, refresh, or interactive triage"],
      [".claude/skills/review/SKILL.md", "the trigger table and scripts cheat-sheet"],
      ["review-items.sh EUDPA-X --json", "the live findings mid-review"],
    ],
    tryIt: "Pick a ticket whose PR you have already merged, run \"review EUDPA-XXXX\", open review-index.md, then \"walk review EUDPA-XXXX\" and rattle through a few findings with F / W / D to feel the triage loop.",
    next: "Next: Session 4 — the code-style skill",
    nextMd: "Next: [Session 4 — the `code-style` skill](04-code-style.md).",
  },

  // ===== Session 4 — code-style =====
  {
    n: 4, skill: "code-style", file: "04-code-style",
    oneLiner: "Lint a PR's JavaScript against the team's 17-rule style guide, then triage and apply the fixes.",
    whyTitle: "One rule set, applied consistently",
    why: [
      "Plain linters miss the things this team actually cares about: project-specific conventions, and JSDoc that has quietly drifted out of sync with the code. Catching those by eye across a multi-repo PR is dull, slow work — and the kind that gets skipped under pressure.",
      "code-style reviews every .js file in a ticket's PRs against one agreed 17-rule guide, lets you triage the findings, then applies the ones you accept — editing, testing and committing each file for you, and backing out anything that breaks a test.",
    ],
    benefits: [
      ["One agreed standard", "the same 17-rule guide applied to every file, every time"],
      ["Catches JSDoc drift", "the doc-vs-code mismatches a plain linter won't"],
      ["Fixes, not just flags", "accepted fixes applied, tested and committed for you"],
    ],
    triggers: '"style review EUDPA-1234" · "walk style EUDPA-1234" · "fix style EUDPA-1234"',
    demo: [
      ["Review", "\"style review EUDPA-1234\" pulls the PRs, finds every .js file, and reviews each one in parallel against the baked rule bundle."],
      ["Aggregate", "it gates on 100% coverage, then rolls findings up per repo with a verdict: COMPLIANT, MINOR ISSUES or NEEDS WORK."],
      ["Walk", "\"walk style EUDPA-1234\" steps through the findings so you mark each one Fix, Won't-fix or Discuss."],
      ["Fix", "\"fix style EUDPA-1234\" applies the agreed fixes a file at a time — edit, test, commit — reverting anything that breaks rather than forcing it through."],
    ],
    outputsLead: "Per-repo under workareas/code-style-reviews/EUDPA-X/.",
    outputs: [
      ["style-review.<repo>.md", "verdict, file-by-file summary, and the Items table"],
      ["Items table", "each row: the rule, severity (FAIL / WARN), the issue, and the suggested fix"],
      ["style-rules.<repo>.md", "the baked rule bundle it checks against (the 17 rules + JSDoc)"],
      ["commits", "applied fixes land as real commits; broken tests are reverted, not forced"],
    ],
    usage: [
      ["Reach for it when", "a JS-touching PR is up and you want it clean before review"],
      ["Where you decide", "you triage every finding; nothing changes until you say Fix"],
      ["How it fits", "runs alongside review — review for the logic, code-style for the JS guide"],
    ],
    liveView: [
      ["style review · walk · fix style", "review, triage, then apply fixes"],
      [".claude/skills/code-style/SKILL.md", "the modes and triggers"],
      ["workareas/code-style-reviews/EUDPA-X/", "the per-repo summaries and rule bundle"],
    ],
    tryIt: "Pick a ticket with a JS-touching PR, run \"style review EUDPA-XXXX\", then \"walk style EUDPA-XXXX\" to triage. Read style-review.<repo>.md for the verdict and the Items table.",
    next: "Next: Session 5 — the understanding-check skill",
    nextMd: "Next: [Session 5 — the `understanding-check` skill](05-understanding-check.md).",
  },

  // ===== Session 5 — understanding-check =====
  {
    n: 5, skill: "understanding-check", file: "05-understanding-check",
    oneLiner: "Interview the author of an AI-assisted PR to check they understand the change before it merges.",
    whyTitle: "Do you understand what you shipped?",
    why: [
      "AI assistance lets you ship code faster than you can build a mental model of it. That's fine until someone asks how it works in a month, or a subtle bug lands in a part you never really read. The risk isn't the code — it's the gap between what you merged and what you understand.",
      "understanding-check finds the parts of a diff most likely to be under-understood, asks you evidence-anchored questions about them, and scores your answers against a rubric. It's a coaching signal to close that gap — advisory, never a merge gate.",
    ],
    benefits: [
      ["Surfaces the gap", "targets the riskiest-to-understand parts of your own diff"],
      ["Evidence-anchored", "every question tied to specific lines; every score quotes the rubric"],
      ["Coaching, not gating", "an advisory verdict — a human still owns the merge"],
    ],
    triggers: '"interview EUDPA-1234" · "check understanding EUDPA-1234"',
    demo: [
      ["Analyse", "point it at a ticket; it pulls the PRs and analyses each repo's diff against the ticket to find the areas most worth probing."],
      ["Question set", "it drafts 8-12 questions, each anchored to specific file lines, and shows them for you to approve or edit — the plan gate."],
      ["Interview", "a terminal Q&A: one question at a time, showing where in the code it is about but never the answer."],
      ["Score", "it grades each answer pass / partial / fail, quoting the exact rubric clause that decided it."],
      ["Verdict & comment", "it rolls the scores into pass / needs-review / high-risk and writes a report with a paste-ready PR comment."],
    ],
    outputsLead: "A question set, a transcript, per-question scores, a verdict, and a report.",
    outputs: [
      ["verdict", "pass / needs-review / high-risk — read this line first"],
      ["per-question table", "which areas were weak, with the rubric clause that fired"],
      ["paste-ready PR comment", "the last section of the report — drop it straight onto the PR"],
    ],
    usage: [
      ["Reach for it when", "you're about to merge an AI-assisted PR and want a gut-check on your grasp"],
      ["Where you decide", "you approve the questions, answer honestly, and decide what to do with the verdict"],
      ["How it fits", "a self-check before or alongside review — for understanding, not correctness"],
    ],
    liveView: [
      ["interview / check understanding EUDPA-X", "how you launch it"],
      [".claude/skills/understanding-check/SKILL.md", "workflow, verdict rules, scripts"],
      ["the plan gate", "you approve the questions before the interview starts"],
    ],
    tryIt: "Take a PR you wrote recently with AI help and run \"interview EUDPA-XXXX\". Approve the question set, answer honestly without peeking at the diff, and see whether the verdict matches how well you thought you understood the change.",
    next: "Next: Session 6 — the npm-upgrade skill",
    nextMd: "Next: [Session 6 — the `npm-upgrade` skill](06-npm-upgrade.md).",
  },

  // ===== Session 6 — npm-upgrade =====
  {
    n: 6, skill: "npm-upgrade", file: "06-npm-upgrade",
    oneLiner: "Bring non-govuk npm dependencies up to date across the repos — safe bumps automated, breaking ones walked.",
    whyTitle: "Safe bumps automated, breaking ones walked",
    why: [
      "Keeping dependencies current is one of those jobs that's individually small and collectively miserable: find what's outdated across the repos, work out which bumps are safe and which will break, run the tests, and don't lose your place when one of them blows up halfway.",
      "npm-upgrade does the safe, mechanical bumps for you — install, test, commit, roll back on failure — and triages the rest, so the only upgrades that reach your desk are the ones that genuinely need a human. Everything stays local until you're happy.",
    ],
    benefits: [
      ["The boring bumps, automated", "safe upgrades installed, tested and committed for you"],
      ["Breaking ones triaged", "you only handle what actually needs judgment"],
      ["Nothing lost or pushed", "failures roll back; commits stay local for your review"],
    ],
    triggers: '"upgrade npm deps" · "walk upgrade EUDPA-1234" · "implement upgrade EUDPA-1234"',
    demo: [
      ["Phase 1 — discover & classify", "on a ticket branch it finds every outdated package and classifies each as auto (no code change) or manual (breaking). It stops at a gate for you to approve."],
      ["Phase 2 — auto upgrades", "for each auto package: baseline test, bump, re-test, commit if green, roll back if not. Anything that breaks is demoted to manual. Another gate."],
      ["Phase 3 — handoff", "it produces a single list of everything left for a human — the manual ones plus any auto that failed."],
      ["Walk the manual ones", "one keystroke-driven table: I to implement (a worker edits, tests, commits), D to defer to a follow-up, S to skip."],
    ],
    outputsLead: "Per-repo state plus real (unpushed) commits.",
    outputs: [
      ["packages.<repo>.json", "one row per package — classification, risk, status, commit SHA"],
      ["feature/EUDPA-X-npm-...", "a branch per repo, one commit per successful upgrade"],
      ["the gate reports", "presented verbatim at each phase boundary for you to approve"],
    ],
    usage: [
      ["Reach for it when", "you're on a dependency-refresh ticket and want the safe bumps off your plate"],
      ["Where you decide", "two phase gates plus the manual walk — you approve before anything proceeds"],
      ["How it fits", "use govuk-upgrade for govuk-frontend; this covers everything else"],
    ],
    liveView: [
      ["upgrade npm deps · walk upgrade", "start the run, or walk the manual ones"],
      [".claude/skills/npm-upgrade/SKILL.md", "the phase and walker detail"],
      ["the counts / list view", "state at a glance: classification x status x risk"],
    ],
    note: "Two gates (Phase 1 to 2, Phase 2 to 3) plus the manual walk keep you in control. Nothing is pushed — commits stay local for review.",
    tryIt: "On a repo checked out to a ticket branch, say \"upgrade npm deps\" and stop at the Phase 1 gate to inspect the auto-vs-manual split before it touches anything.",
    next: "Next: Session 7 — the govuk-upgrade skill",
    nextMd: "Next: [Session 7 — the `govuk-upgrade` skill](07-govuk-upgrade.md).",
  },

  // ===== Session 7 — govuk-upgrade =====
  {
    n: 7, skill: "govuk-upgrade", file: "07-govuk-upgrade",
    oneLiner: "Upgrade govuk-frontend across the Node repos one semver version at a time, each step driven by its CHANGELOG.",
    whyTitle: "One version at a time, CHANGELOG-driven",
    why: [
      "govuk-frontend moves fast, and skipping several versions at once hides the breaking changes inside it — a renamed Nunjucks macro here, a dropped utility class there, altered component markup somewhere else — scattered across every Node repo that uses it. Big-bang upgrades turn into a day of whack-a-mole.",
      "govuk-upgrade walks the versions one at a time. For each release it reads the CHANGELOG, plans the exact per-repo edits, and applies them in order — so every step is small, reviewable, and tied back to the change that caused it.",
    ],
    benefits: [
      ["No skipped breakage", "every intermediate version handled, not just the target"],
      ["CHANGELOG-driven", "each edit traces back to the release note that caused it"],
      ["Bisectable history", "one commit per version — easy to review and to revert"],
    ],
    triggers: '"upgrade govuk-frontend" · "walk govuk EUDPA-1234" · "implement govuk EUDPA-1234"',
    demo: [
      ["Discover", "\"upgrade govuk-frontend EUDPA-1234\" finds every repo using it, branches them, and lays out the ladder of versions between current and target."],
      ["Plan per version", "for each release it reads the CHANGELOG and writes a plan — which files change in each repo and why, or marks the version a no-op."],
      ["Walk the plans", "optionally, \"walk govuk EUDPA-1234\" shows every pending plan in one table to Apply, Skip, Discuss or Quarantine."],
      ["Apply in order", "\"implement govuk EUDPA-1234\" works strictly version by version — bump, install, test, commit — never jumping ahead."],
      ["Verify", "the end-to-end tests run once at the end, then it writes a final report."],
    ],
    outputsLead: "Per-run plans and a clean, bisectable history.",
    outputs: [
      ["versions.<repo>.json", "the version ladder and planned changes per repo"],
      ["per-version plans", "rendered markdown — file-by-file changes and rationale"],
      ["one commit per version", "the upgrade reads as a clean, bisectable branch history"],
    ],
    usage: [
      ["Reach for it when", "govuk-frontend is several versions behind and you want a safe upgrade"],
      ["Where you decide", "you review the per-version plans before applying, and can skip or quarantine any"],
      ["How it fits", "the govuk-only counterpart to npm-upgrade"],
    ],
    liveView: [
      ["upgrade govuk-frontend · walk govuk", "plan, review, then apply"],
      [".claude/skills/govuk-upgrade/SKILL.md", "the current surface and triggers"],
      ["govuk status EUDPA-X", "live state on a real run"],
    ],
    tryIt: "On a throwaway branch, run \"upgrade govuk-frontend\" and let it finish discovery and planning only. Read one rendered version plan to see the CHANGELOG-derived, per-repo changes before applying anything.",
    next: "Next: Session 8 — the skill-creator skill",
    nextMd: "Next: [Session 8 — the `skill-creator` skill](08-skill-creator.md).",
  },

  // ===== Session 8 — skill-creator =====
  {
    n: 8, skill: "skill-creator", file: "08-skill-creator",
    oneLiner: "Scaffold a new workspace skill end to end (CREATE), or audit existing ones against the pattern checklist (AUDIT).",
    whyTitle: "Scaffold and audit skills",
    why: [
      "The harness is only useful if it's easy to extend — but a correct skill has a lot of moving parts: SKILL.md frontmatter that doubles as the trigger spec, worker prose in references/, shared scripts in tools/, runtime state in workareas/, and allowlist entries in settings. Hand-rolling all that from memory is how skills drift apart.",
      "skill-creator scaffolds a new skill end to end from a short interview, so every skill starts from the same shape — or audits the skills you already have against the team's pattern checklist and tells you where they've drifted. It's the meta-skill: it builds and maintains the others.",
    ],
    benefits: [
      ["Consistent by construction", "every new skill starts from the same correct shape"],
      ["No boilerplate from memory", "frontmatter, workers, tool stubs and allowlist, generated"],
      ["Health-checks the rest", "audit mode flags where existing skills have drifted"],
    ],
    triggers: '"scaffold skill <name>" (CREATE) · "audit skill <name>" / "audit skills" (AUDIT)',
    demo: [
      ["Dispatch", "run the trigger; the Step 0 dispatcher prints MODE: CREATE or AUDIT and branches accordingly."],
      ["Interview (CREATE)", "it walks an 8-question interview — name, triggers, fan-out vs single-shot, JSON state — one question at a time."],
      ["Scaffold (CREATE)", "it writes SKILL.md, references/ workers, tools/<name>/ stubs and the allowlist entries, then lists the TODO markers for you to fill in."],
      ["Audit (mode 2)", "\"audit skill <name>\" instead fans out a worker per skill against the 8-pattern checklist and writes a plan doc you act on."],
    ],
    outputsLead: "CREATE writes a scaffold; AUDIT writes plans.",
    outputs: [
      [".claude/skills/<name>/", "new SKILL.md (with TODOs), references/, assets/ + tools/<name>/ stubs"],
      ["workareas/skills-audit/<name>.md", "an audit plan per skill — pattern gaps and open questions"],
      ["structure, not logic", "the scaffold is the shape; you fill in the TODO markers afterwards"],
    ],
    anatomy: [
      ["SKILL.md", "the entry point — name + description (the trigger spec) frontmatter, plus the body that dispatches"],
      ["references/", "worker prose spawned as subagents for fan-out — each self-contained"],
      ["tools/", "deterministic shared shell helpers the skill shells out to"],
      ["workareas/", "per-run, gitignored state held between steps"],
    ],
    usage: [
      ["Reach for it when", "you're adding a new repeatable workflow, or spring-cleaning the harness"],
      ["Where you decide", "you answer the interview and fill the scaffold's TODOs — it's structure, not logic"],
      ["How it fits", "the meta-skill — it builds and maintains all the others"],
    ],
    liveView: [
      ["scaffold skill X · audit skill X", "CREATE or AUDIT mode"],
      [".claude/skills/skill-creator/SKILL.md", "the when-to-use table and scripts"],
      ["docs/agent-skills.md", "the conventions every skill follows"],
    ],
    tryIt: "Try a no-write demo: \"audit skill review\", then open workareas/skills-audit/review.md to read the pattern gaps. Or \"scaffold skill release-notes\" and walk the interview to see the placeholders.",
    next: "That's the programme — you can now drive the harness.",
    nextMd: "That's the programme — back to the [index](README.md).",
  },

  // ===== Session 9 — ticket-creator (ticketing track, BAs + engineers) =====
  {
    n: 9, skill: "ticket-creator", file: "09-ticket-creator",
    oneLiner: "Create a well-formed EUDPA Jira ticket from a plain-English conversation — drafted for you to approve before anything lands in Jira.",
    whyTitle: "A good ticket, without the blank page",
    why: [
      "A ticket that's ready to pick up needs a clear summary, the reason it's needed, testable acceptance criteria, the right type and priority, a parent epic, and the team's labels and house style. Getting all of that right from a blank Jira form is fiddly and easy to do unevenly — especially if Jira isn't where you spend your day.",
      "ticket-creator turns a short back-and-forth in plain English into a drafted ticket that already follows the team's conventions. It asks one question at a time, writes the draft to a file you can read and refine, and only creates the ticket in Jira once you say so. You stay the author; it removes the formatting and the remembering.",
    ],
    benefits: [
      ["Plain-English interview", "it asks one question at a time — no Jira form to wrestle"],
      ["Conventions baked in", "type, priority, epic, labels and AC style applied for you"],
      ["Nothing lands until you approve", "it drafts to a file first; creating in Jira is the last step"],
    ],
    triggers: '"create a ticket" · "raise a ticket" · "file a bug" · "log a story"',
    demo: [
      ["Start", "say \"create a ticket\" — it pulls the current EUDPA epics and capability codes so it can slot your work into the right place."],
      ["Answer a few questions", "one at a time: is this a bug, story or task? a one-line summary, why it's needed, the acceptance criteria, and which epic it belongs to."],
      ["Read the draft", "it writes the full ticket to a draft file and shows you — summary, a description in the team's house style, AC, type, priority and labels."],
      ["Refine in plain English", "tell it what to change — \"make the AC testable\", \"drop the priority\" — and it edits the draft in place. Nothing is in Jira yet."],
      ["Create it", "say \"create it\" and it raises the ticket in Jira, then hands you back the key and the link."],
    ],
    outputsLead: "A draft you can iterate on, then a real Jira ticket.",
    outputs: [
      ["draft.md", "the full ticket as text — you review and refine this before it's created"],
      ["the conventions", "type, priority, epic, labels and AC style, applied to the draft for you"],
      ["EUDPA-XXXXX", "the created Jira ticket and its link, once you say \"create it\""],
    ],
    usage: [
      ["Reach for it when", "you need to raise a new ticket and want it refinement-ready from the start"],
      ["Where you decide", "you answer the questions and approve the draft — it never creates without your go-ahead"],
      ["How it fits", "hand the new ticket to ticket-refiner (Session 10) to check it's ready for the team"],
    ],
    liveView: [
      ["create a ticket", "how you start — just say it in plain English"],
      [".claude/skills/ticket-creator/SKILL.md", "what it does — straight from source"],
      ["workareas/ticket-creation/<slug>/draft.md", "where your draft lives while you refine it"],
    ],
    note: "Run `~/git/defra/trade-imports-workspace/tools/auth.sh` first — it reads and writes Jira. An engineer sets this up with you once (see [Getting started](00-getting-started.md)).",
    tryIt: "Think of a small piece of work you'd raise anyway. Say \"create a ticket\", answer the questions, and read the draft it writes — then stop there. Nothing reaches Jira until you say \"create it\", so it's a safe first run.",
    next: "Next: Session 10 — the ticket-refiner skill",
    nextMd: "Next: [Session 10 — the `ticket-refiner` skill](10-ticket-refiner.md).",
  },

  // ===== Session 10 — ticket-refiner (ticketing track, BAs + engineers) =====
  {
    n: 10, skill: "ticket-refiner", file: "10-ticket-refiner",
    oneLiner: "Check a ticket is ready for refinement before the team sees it — and get a READY / NEEDS WORK / SPIKE REQUIRED verdict with the reasons.",
    whyTitle: "Is this ticket ready for the team?",
    why: [
      "Refinement sessions stall on tickets that aren't ready — vague acceptance criteria, unclear scope, no sense of which repos are touched, or work too big to estimate. Catching that ahead of time saves the whole team a meeting, but it means holding each ticket up against a standard and checking the code, every time.",
      "ticket-refiner reads the ticket against the same conventions ticket-creator writes to, peeks at the affected repos, and gives a clear verdict — READY, NEEDS WORK or SPIKE REQUIRED — with the specific gaps and the questions to take into refinement. It's a second pair of eyes before the team spends theirs.",
    ],
    benefits: [
      ["One clear verdict", "READY, NEEDS WORK or SPIKE REQUIRED — with the reasons"],
      ["Same standard as creation", "judged against the conventions ticket-creator writes to"],
      ["Questions, ready to take in", "the specific gaps to close before the refinement session"],
    ],
    triggers: '"is EUDPA-1234 ready?" · "refinement check EUDPA-1234" · "pre-refinement EUDPA-1234"',
    demo: [
      ["Point it at a ticket", "say \"is EUDPA-1234 ready?\" — it fetches the ticket, its comments and any linked Confluence design notes."],
      ["Check the code", "it reads the affected repos to confirm the work is understood and the scope is real, not just on paper."],
      ["Assess", "it judges description clarity, acceptance criteria, technical clarity, and whether the team could actually estimate it."],
      ["Write the review", "it fills in a review with the findings, suggested improvements and questions for refinement."],
      ["Verdict", "it stamps READY, NEEDS WORK or SPIKE REQUIRED — and spells out the next step for each."],
    ],
    outputsLead: "A written review and a recorded verdict.",
    outputs: [
      ["review.md", "the findings, suggested improvements and questions for refinement"],
      ["the verdict", "READY / NEEDS WORK / SPIKE REQUIRED, with the reason"],
      ["the next step", "READY: plan it · NEEDS WORK: what to fix · SPIKE: the unknowns to investigate"],
    ],
    usage: [
      ["Reach for it when", "a ticket is about to go into refinement and you want to catch gaps first"],
      ["Where you decide", "you act on the verdict — tidy the ticket, book a spike, or take it to the team"],
      ["How it fits", "follows ticket-creator (Session 9); a READY ticket goes to the ticket skill to be planned"],
    ],
    liveView: [
      ["is EUDPA-X ready?", "how you start it"],
      [".claude/skills/ticket-refiner/SKILL.md", "what it does — straight from source"],
      ["workareas/ticket-refinement/EUDPA-X/review.md", "where the review and verdict land"],
    ],
    note: "Run `~/git/defra/trade-imports-workspace/tools/auth.sh` first — it reads Jira and Confluence. An engineer sets this up with you once (see [Getting started](00-getting-started.md)).",
    tryIt: "Pick a ticket heading into your next refinement and say \"is EUDPA-XXXX ready?\". Read the verdict and the questions-for-refinement list — then take those questions into the session, or back to whoever wrote the ticket.",
    next: "That's the ticketing track — you can now create and refine tickets with Claude.",
    nextMd: "That's the ticketing track — back to the [index](README.md).",
  },
];
