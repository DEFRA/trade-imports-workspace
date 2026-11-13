export const meta = {
  name: 'bash-to-tim-loop',
  description: 'Work the bash-to-tim backlog one row at a time: build, adversarially verify, fix up to twice, record and push. No E2E until the backlog has landed.',
  whenToUse: 'Launched from the bash-to-tim HANDOVER.md, by scriptPath, to remove the workspace Bash scripts row by row.',
  phases: [
    { title: 'Preflight', detail: 'branch, clean tree, own tim, green baseline, draft PR' },
    { title: 'Build', detail: 'one row: build, verify, fix up to twice, record and push' },
    { title: 'Land', detail: 'when every loop row is done: one CI E2E run, then hand back' },
  ],
}

const WS = args?.workspace ?? '~/git/defra/trade-imports-workspace'
const BRANCH = args?.branch ?? 'chore/NO_JIRA-bash-to-tim'
const MAX_ROWS = args?.maxRows ?? 10
const FIX_ATTEMPTS = 2
const DIR = `${WS}/workareas/shared/bash-to-tim`
const BRIEF = `${DIR}/BRIEF.md`
const BACKLOG = `${DIR}/backlog.json`

const PREFLIGHT = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    prUrl: { type: 'string' },
    problems: { type: 'array', items: { type: 'string' } },
  },
  required: ['ok', 'problems'],
}
const STATUSES = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'status', 'dependsOn'],
      },
    },
  },
  required: ['rows'],
}
const BUILD = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['built', 'blocked'] },
    startShas: { type: 'array', items: { type: 'object', properties: { repo: { type: 'string' }, sha: { type: 'string' } }, required: ['repo', 'sha'] } },
    commits: { type: 'array', items: { type: 'object', properties: { repo: { type: 'string' }, sha: { type: 'string' } }, required: ['repo', 'sha'] } },
    checks: { type: 'array', items: { type: 'string' } },
    deviations: { type: 'array', items: { type: 'string' } },
    blockedReason: { type: 'string' },
  },
  required: ['status', 'startShas', 'commits', 'checks'],
}
const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    problems: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'problems'],
}
const RECORD = {
  type: 'object',
  properties: {
    pushed: { type: 'boolean' },
    done: { type: 'integer' },
    total: { type: 'integer' },
    notes: { type: 'string' },
  },
  required: ['pushed', 'done', 'total'],
}

const nextRow = (rows) => {
  const done = new Set(rows.filter((r) => r.status === 'done').map((r) => r.id))
  return rows.find((r) => r.status === 'todo' && r.dependsOn.every((d) => done.has(d)))
}

phase('Preflight')
const pre = await agent(
  `Get the workspace ready for the bash-to-tim loop. Workspace: ${WS}. Branch: ${BRANCH}.
1. In the workspace, fetch. Check out ${BRANCH} in place, creating it from origin/main if it does not exist, then pull --ff-only. No worktrees.
2. Tracked files must have no changes (\`git status --untracked-files=no\` is clean). Leave untracked files alone. A tracked change is a problem: report it and change nothing.
3. \`readlink -f "$(which tim)"\` must resolve inside ${WS}. If it does not, run \`npm --prefix ${WS}/tim link\`.
4. Run \`npm --prefix ${WS}/tim test\` and \`npm --prefix ${WS}/tim run lint\`. Red on a clean checkout is a problem: report the failing tests.
5. If no pull request exists for ${BRANCH} in DEFRA/trade-imports-workspace, push the branch and open a DRAFT pull request against main. Title: "chore(NO_JIRA): replace the workspace Bash scripts with tim". Body: what workareas/shared/bash-to-tim/HANDOVER.md says the work is, ending with "🤖 Generated with [Claude Code](https://claude.com/claude-code)". Draft keeps the E2E workflow from running on every push.
Return ok=false with the problems if any step fails.`,
  { label: 'preflight', phase: 'Preflight', schema: PREFLIGHT, effort: 'low' },
)
if (!pre?.ok) {
  log(`Preflight stopped the loop: ${(pre?.problems ?? ['no answer']).join('; ')}`)
  return { stopped: 'preflight', problems: pre?.problems ?? [] }
}

const landed = []
const blocked = []
let blockedInARow = 0
let stopReason = `reached maxRows (${MAX_ROWS})`
let onlyPersonRowsLeft = false

phase('Build')
while (landed.length < MAX_ROWS) {
  const state = await agent(
    `Read ${BACKLOG}. Return every row's id, status and dependsOn, in file order. Change nothing.`,
    { label: 'read-backlog', phase: 'Build', schema: STATUSES, effort: 'low' },
  )
  const row = state && nextRow(state.rows)
  if (!row) {
    const left = (state?.rows ?? []).filter((r) => r.status !== 'done')
    onlyPersonRowsLeft = Boolean(state) && left.every((r) => r.status === 'person')
    stopReason = left.length
      ? `no buildable row left: ${left.map((r) => `${r.id} ${r.status}`).join(', ')}`
      : 'every row is done'
    break
  }

  const label = row.id
  let build = await agent(
    `You are the BUILDER for row ${row.id} of ${BACKLOG}. Follow the Builder section of ${BRIEF}. Workspace: ${WS}. Branch: ${BRANCH}.`,
    { label: `build:${label}`, phase: 'Build', schema: BUILD },
  )

  let verdict = null
  if (build?.status === 'built') {
    const verifyPrompt = (b) =>
      `You are the VERIFIER for row ${row.id} of ${BACKLOG}. Follow the Verifier section of ${BRIEF}. Workspace: ${WS}. Branch: ${BRANCH}.
The builder reported: ${JSON.stringify(b)}`
    verdict = await agent(verifyPrompt(build), { label: `verify:${label}`, phase: 'Build', schema: VERDICT })
    for (let attempt = 1; attempt <= FIX_ATTEMPTS && verdict && !verdict.pass; attempt += 1) {
      build = await agent(
        `You are the FIXER for row ${row.id} of ${BACKLOG}. Follow the Fixer section of ${BRIEF}. Workspace: ${WS}. Branch: ${BRANCH}.
The builder reported: ${JSON.stringify(build)}
The verifier found: ${JSON.stringify(verdict.problems)}`,
        { label: `fix${attempt}:${label}`, phase: 'Build', schema: BUILD },
      )
      verdict = build?.status === 'built'
        ? await agent(verifyPrompt(build), { label: `reverify${attempt}:${label}`, phase: 'Build', schema: VERDICT })
        : null
    }
  }

  const passed = build?.status === 'built' && verdict?.pass
  const reason = passed
    ? ''
    : build?.status === 'blocked'
      ? build.blockedReason ?? 'builder reported blocked'
      : `verification failed: ${(verdict?.problems ?? ['no verdict']).join('; ')}`

  const record = await agent(
    passed
      ? `Row ${row.id} of ${BACKLOG} is built and verified. Workspace: ${WS}. Branch: ${BRANCH}.
1. In ${BACKLOG}, set row ${row.id} to status "done" and evidence to ${JSON.stringify({ commits: build.commits, checks: build.checks, deviations: build.deviations ?? [] })}. Keep the file's formatting (2-space JSON).
2. Commit it in the workspace: "chore(NO_JIRA): bash-to-tim: ${row.id} done", ending with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
3. Push ${BRANCH} in the workspace and in every service repo listed in the commits. The pre-push sonar gate may run; a failure there is a problem to report, not to bypass.
4. For a service repo with no pull request on ${BRANCH}, open a DRAFT one against main, linking the workspace pull request and ending with "🤖 Generated with [Claude Code](https://claude.com/claude-code)".
Return pushed, and done and total counted over rows whose status is not "person".`
      : `Row ${row.id} of ${BACKLOG} did not land: ${reason}. Workspace: ${WS}. Branch: ${BRANCH}.
1. In each repo it touched, list the row's commits, oldest first, with \`git log --reverse --format=%h <start>..HEAD\`. The starting SHAs: ${JSON.stringify(build?.startShas ?? [])}. Then put the repo back to its starting SHA. These are local, unpushed commits on ${BRANCH}, so \`git reset --hard <sha>\` is safe, and the reflog keeps them. Check \`git log origin/${BRANCH}..\` first, and if a commit is already pushed, revert it instead.
2. In ${BACKLOG}, set row ${row.id} to status "blocked" and evidence to {"blockedReason": <the reason in one plain sentence>, "recoverableCommits": "The blocked attempt is in the local reflog, unpushed: <repo: SHAs oldest first>. Cherry-pick them and fix only the reason, rather than rebuilding."}.
3. Commit ("chore(NO_JIRA): bash-to-tim: ${row.id} blocked", ending with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>") and push ${BRANCH} in the workspace.
Return pushed, and done and total counted over rows whose status is not "person".`,
    { label: `record:${label}`, phase: 'Build', schema: RECORD, effort: 'low' },
  )

  if (passed) {
    landed.push(row.id)
    blockedInARow = 0
  } else {
    blocked.push({ id: row.id, reason })
    blockedInARow += 1
  }
  if (record) {
    log(`${row.id} ${passed ? 'landed' : 'blocked'}. ${record.done} of ${record.total} (${Math.round((100 * record.done) / record.total)}%)`)
  }
  if (blockedInARow >= 2) {
    stopReason = 'two rows in a row were blocked, which points at something systemic'
    break
  }
}

phase('Land')
let landing = null
if (onlyPersonRowsLeft) {
  landing = await agent(
    `Every row of ${BACKLOG} that the loop can build is done. Only rows with status "person" are left. Workspace: ${WS}. Branch: ${BRANCH}.
1. Mark the workspace pull request for ${BRANCH} and every service repo pull request on ${BRANCH} ready for review (\`gh pr ready\`). This is the one point where E2E runs, in GitHub Actions.
2. Watch the checks in the background with \`gh pr checks <pr> --watch\` until each finishes. A red check is the branch's to fix (rule 6). Fix it on ${BRANCH}, push, and watch again.
3. Do not merge. Report each pull request's URL and final check state.`,
    { label: 'land', phase: 'Land', schema: { type: 'object', properties: { prs: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, checks: { type: 'string' } }, required: ['url', 'checks'] } }, notes: { type: 'string' } }, required: ['prs'] } },
  )
}

await agent(
  `Update the "State" section at the foot of ${DIR}/HANDOVER.md so the next session on any machine can pick up from it. Workspace: ${WS}. Branch: ${BRANCH}.
Write it in plain English, without time estimates:
- progress as "N of TOTAL (P%)", counted over rows whose status is not "person"
- landed this run: ${JSON.stringify(landed)}
- blocked this run, with reasons: ${JSON.stringify(blocked)}
- why the loop stopped: ${stopReason}
- the "person" rows still waiting for Sam
- landing result: ${JSON.stringify(landing)}
- the single next action
Commit ("chore(NO_JIRA): bash-to-tim: handover state", ending with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>") and push ${BRANCH}.`,
  { label: 'handover', phase: 'Land', effort: 'low' },
)

return { landed, blocked, stopReason, landing }
