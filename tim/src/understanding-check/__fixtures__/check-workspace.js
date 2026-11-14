import { readFileSync } from 'node:fs'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const BASH_SCRIPT_FOR = {
  counts: 'tools/understanding-check/counts.sh',
  finalize: 'tools/understanding-check/finalize-verdict.sh',
  verify: 'tools/understanding-check/verify-coverage.sh',
  'add-finding': 'tools/understanding-check/analysis-add-finding.sh',
  complete: 'tools/understanding-check/analysis-set-verdict.sh'
}

/**
 * The tim arguments that run the same step as a Bash script.
 */
export const TIM_COMMAND_FOR = {
  counts: ['counts'],
  finalize: ['finalize'],
  verify: ['verify'],
  'add-finding': ['analysis', 'add-finding'],
  complete: ['analysis', 'complete']
}

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {{counts: object[], finalize: object[], verify: object[], analysis: object[]}}
 */
export const readCheckGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/understanding-check-scripts.json', import.meta.url),
      'utf8'
    )
  )

const checkFolder = (ticket) => `workareas/understanding-checks/${ticket}`

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const question = (id, category) => ({
  id,
  category,
  prompt: `Why does ${id} matter?`
})

const scored = (questionId, verdict) => ({
  question_id: questionId,
  answer: `Answer to ${questionId}.`,
  score: verdict === null ? null : { verdict, rubric_match: 'names X' }
})

const emptyAnalysis = (repo) => ({
  repo,
  changeSummary: null,
  whyItChanged: null,
  keyDesignDecisions: [],
  edgeCases: [],
  failureModes: [],
  securityRisks: [],
  dataOrApiChanges: [],
  testCoverageNotes: [],
  aiSuspectedRegions: [],
  verdict: null
})

const evidenced = (id, file, lines) => ({
  id,
  note: `Finding ${id}`,
  evidence: { file, lines }
})

const completeAnalysis = (repo) => ({
  ...emptyAnalysis(repo),
  changeSummary: 'Adds a thing.',
  whyItChanged: 'Because.',
  edgeCases: [evidenced(1, 'src/a.js', '1-4')],
  verdict: 'complete',
  completed_at: '2026-11-01T10:00:00Z'
})

const meta = ({ repos = ['trade-imports-stub'], gaps = [] } = {}) => ({
  ticket: 'placeholder',
  prs: repos.map((repo, index) => ({ repo, number: index + 1 })),
  coverage_gaps: gaps,
  started_at: '2026-11-01T09:00:00Z'
})

/**
 * The files of one check folder, keyed by workspace-relative path. A file
 * set to undefined is left out.
 */
const checkFiles = (
  ticket,
  { questions, transcript, interviewMeta, analyses = {} }
) =>
  Object.fromEntries(
    [
      ['questions.json', questions && { questions }],
      ['transcript.json', transcript && { entries: transcript }],
      ['.interview-meta.json', interviewMeta && { ...interviewMeta, ticket }],
      ...Object.entries(analyses).map(([repo, analysis]) => [
        `analysis.${repo}.json`,
        analysis
      ])
    ]
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [
        `${checkFolder(ticket)}/${name}`,
        jsonText(value)
      ])
  )

const SIX_QUESTIONS = [
  question('Q1', 'design'),
  question('Q2', 'security'),
  question('Q3', 'testing'),
  question('Q4', 'design'),
  question('Q5', 'security'),
  question('Q6', 'edge-cases')
]

const verdictsFor = (verdicts) =>
  verdicts.map((verdict, index) => scored(`Q${index + 1}`, verdict))

const ticketsByName = {
  'EUDPA-100': {
    questions: SIX_QUESTIONS,
    transcript: [
      scored('Q1', 'PASS'),
      scored('Q2', 'PASS'),
      scored('Q3', 'PARTIAL'),
      scored('Q4', 'FAIL'),
      scored('Q5', null),
      { question_id: 'Q6', answer: 'No score verdict.', score: {} }
    ],
    interviewMeta: meta({ gaps: ['gap one', 'gap two'] })
  },
  'EUDPA-101': {
    questions: SIX_QUESTIONS,
    transcript: [],
    interviewMeta: meta()
  },
  'EUDPA-102': {
    questions: SIX_QUESTIONS,
    transcript: [scored('Q9', 'PASS')],
    interviewMeta: meta()
  },
  'EUDPA-103': {
    transcript: [],
    interviewMeta: meta()
  },
  'EUDPA-104': {
    questions: SIX_QUESTIONS,
    interviewMeta: meta()
  },
  'EUDPA-105': {
    questions: SIX_QUESTIONS,
    transcript: []
  },
  'EUDPA-106': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['PASS', 'PASS']),
    interviewMeta: { prs: [] }
  },
  'EUDPA-110': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['FAIL', 'FAIL', 'FAIL', 'PASS']),
    interviewMeta: meta({ gaps: ['gap'] })
  },
  'EUDPA-111': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['FAIL', 'PASS', 'FAIL', 'FAIL', 'PASS', 'PASS']),
    interviewMeta: meta()
  },
  'EUDPA-112': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['FAIL', 'PARTIAL', 'PARTIAL', 'PARTIAL']),
    interviewMeta: meta()
  },
  'EUDPA-113': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['PARTIAL', 'PASS', 'PARTIAL', 'PARTIAL']),
    interviewMeta: meta()
  },
  'EUDPA-114': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['PASS', 'PASS', 'PARTIAL', 'PARTIAL']),
    interviewMeta: meta({ gaps: ['Q3: unscorable', 'Q4: unscorable'] })
  },
  'EUDPA-115': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['PASS', 'PASS', 'PARTIAL', 'PARTIAL']),
    interviewMeta: meta()
  },
  'EUDPA-116': {
    questions: SIX_QUESTIONS,
    transcript: verdictsFor(['FAIL', 'PASS', 'FAIL', 'PASS', 'PASS']),
    interviewMeta: meta()
  },
  'EUDPA-117': {
    questions: SIX_QUESTIONS,
    interviewMeta: meta()
  },
  'EUDPA-120': {
    questions: SIX_QUESTIONS.slice(0, 2),
    transcript: verdictsFor(['PASS', 'PASS']),
    interviewMeta: meta({
      repos: ['trade-imports-stub', 'trade-imports-schemas']
    }),
    analyses: {
      'trade-imports-stub': completeAnalysis('trade-imports-stub'),
      'trade-imports-schemas': completeAnalysis('trade-imports-schemas')
    }
  },
  'EUDPA-121': {},
  'EUDPA-122': {
    questions: SIX_QUESTIONS.slice(0, 2),
    interviewMeta: meta()
  },
  'EUDPA-123': {
    questions: SIX_QUESTIONS.slice(0, 4),
    transcript: [
      scored('Q1', 'PASS'),
      scored('Q3', null),
      scored('Q2', 'FAIL')
    ],
    interviewMeta: meta({
      repos: [
        'trade-imports-stub',
        'trade-imports-schemas',
        'trade-imports-animals-backend',
        'trade-imports-animals-frontend'
      ]
    }),
    analyses: {
      'trade-imports-stub': {
        ...completeAnalysis('trade-imports-stub'),
        edgeCases: [
          evidenced(1, 'src/a.js', '1-4'),
          evidenced(2, 'src/a.js', ''),
          { id: 3, note: 'No evidence at all' }
        ],
        securityRisks: [evidenced(1, '', '9')]
      },
      'trade-imports-schemas': emptyAnalysis('trade-imports-schemas'),
      'trade-imports-animals-backend': (() => {
        const { failureModes: _dropped, ...rest } = completeAnalysis(
          'trade-imports-animals-backend'
        )
        return rest
      })()
    }
  },
  'EUDPA-130': {
    questions: SIX_QUESTIONS,
    transcript: [],
    interviewMeta: meta(),
    analyses: {
      'trade-imports-stub': {
        ...emptyAnalysis('trade-imports-stub'),
        edgeCases: [
          evidenced(2, 'src/old.js', '3'),
          evidenced(5, 'src/old.js', '8')
        ]
      }
    }
  }
}

/**
 * A staged workspace holding every fixture check folder, with the named
 * Bash scripts copied in. HOME points at it for a recorded Bash run, and
 * tim reaches it with `--workspace`.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.scripts]
 */
export const stageCheckWorkspace = ({ scripts = [] } = {}) =>
  stageBashWorkspace({
    scripts,
    files: {
      'repos.json': '{}\n',
      'docs/best-practices/README.md': '# Best practices\n',
      ...Object.entries(ticketsByName).reduce(
        (files, [ticket, parts]) => ({
          ...files,
          ...checkFiles(ticket, parts)
        }),
        {}
      )
    }
  })

export const watchedFolder = checkFolder

export const countsCases = [
  { name: 'mixed verdicts, text', args: ['EUDPA-100'] },
  { name: 'mixed verdicts, json', args: ['EUDPA-100', '--json'] },
  { name: 'no answers yet', args: ['EUDPA-101'] },
  { name: 'meta with no coverage_gaps key', args: ['EUDPA-106'] },
  { name: 'answer to a question not in questions.json', args: ['EUDPA-102'] },
  { name: 'questions.json missing', args: ['EUDPA-103'] },
  { name: 'transcript.json missing', args: ['EUDPA-104'] },
  { name: 'meta missing', args: ['EUDPA-105'] },
  { name: 'no ticket', args: [] },
  { name: 'ticket not EUDPA', args: ['ABC-1'] }
]

export const finalizeCases = [
  { name: 'security FAIL beats FAIL count', args: ['EUDPA-110'] },
  { name: 'FAIL count 3', args: ['EUDPA-111'] },
  { name: 'FAIL count 1 beats PARTIAL count', args: ['EUDPA-112'] },
  { name: 'PARTIAL count 3', args: ['EUDPA-113'] },
  { name: 'coverage gaps only', args: ['EUDPA-114'] },
  { name: 'clean pass', args: ['EUDPA-115'] },
  { name: 'FAIL count 2 needs review', args: ['EUDPA-116'] },
  { name: 'json, high risk', args: ['EUDPA-111', '--json'] },
  { name: 'json, pass', args: ['EUDPA-115', '--json'] },
  { name: 'meta missing', args: ['EUDPA-105'] },
  { name: 'transcript missing under a meta', args: ['EUDPA-117'] },
  { name: 'no ticket', args: [] }
]

export const verifyCases = [
  { name: 'all good', args: ['EUDPA-120'] },
  { name: 'all good, json', args: ['EUDPA-120', '--json'] },
  { name: 'every file missing', args: ['EUDPA-121'] },
  { name: 'transcript missing', args: ['EUDPA-122'] },
  {
    name: 'missing analysis, incomplete analysis, missing evidence, missing section, unanswered and unscored',
    args: ['EUDPA-123']
  },
  { name: 'gaps, json', args: ['EUDPA-123', '--json'] },
  { name: 'no ticket', args: [] }
]

const longText = 'x'.repeat(301)

/**
 * Steps run one after another on one staged workspace, so each finding
 * lands on the file the step before left.
 */
export const analysisSteps = [
  {
    name: 'first finding in an empty section',
    command: 'add-finding',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-stub',
      '--section',
      'keyDesignDecisions',
      '--evidence-file',
      'src/main.js',
      '--evidence-lines',
      '10-12',
      '--field',
      'decision=Use a=b split',
      '--field',
      'rationale=Café — naïve ✓'
    ]
  },
  {
    name: 'next id after the highest, not the count',
    command: 'add-finding',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-stub',
      '--section',
      'edgeCases',
      '--evidence-file',
      'src/old.js',
      '--evidence-lines',
      '20',
      '--field',
      'case=Empty list',
      '--field',
      'empty='
    ]
  },
  {
    name: 'a field may share a name with id and evidence',
    command: 'add-finding',
    args: [
      '--repo',
      'trade-imports-stub',
      'EUDPA-130',
      '--section',
      'securityRisks',
      '--evidence-file',
      'src/auth.js',
      '--evidence-lines',
      '1',
      '--field',
      'risk=first',
      '--field',
      'id=forty',
      '--field',
      'risk=second',
      '--field',
      'evidence=ignored'
    ]
  },
  {
    name: 'complete the analysis',
    command: 'complete',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-stub',
      '--change-summary',
      'Adds the café flow.',
      '--why-it-changed',
      'Users asked for it.'
    ]
  },
  {
    name: 'complete again overwrites',
    command: 'complete',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-stub',
      '--change-summary',
      'x'.repeat(300),
      '--why-it-changed',
      'Second pass.'
    ]
  }
]

const findingArgs = (overrides = {}) => {
  const base = {
    ticket: 'EUDPA-130',
    '--repo': 'trade-imports-stub',
    '--section': 'edgeCases',
    '--evidence-file': 'src/a.js',
    '--evidence-lines': '1',
    '--field': 'note=n',
    ...overrides
  }
  return Object.entries(base).flatMap(([flag, value]) => {
    if (value === undefined) return []
    return flag === 'ticket' ? [value] : [flag, value]
  })
}

export const analysisRefusals = [
  {
    name: 'invalid section',
    command: 'add-finding',
    args: findingArgs({ '--section': 'style' })
  },
  {
    name: 'no field',
    command: 'add-finding',
    args: findingArgs({ '--field': undefined })
  },
  {
    name: 'field without an equals sign',
    command: 'add-finding',
    args: findingArgs({ '--field': 'note' })
  },
  {
    name: 'field without an equals sign beats a missing repo',
    command: 'add-finding',
    args: findingArgs({ '--field': 'note', '--repo': undefined })
  },
  {
    name: 'missing repo',
    command: 'add-finding',
    args: findingArgs({ '--repo': undefined })
  },
  {
    name: 'missing evidence lines',
    command: 'add-finding',
    args: findingArgs({ '--evidence-lines': undefined })
  },
  {
    name: 'empty evidence file',
    command: 'add-finding',
    args: findingArgs({ '--evidence-file': '' })
  },
  {
    name: 'no ticket',
    command: 'add-finding',
    args: findingArgs({ ticket: undefined })
  },
  {
    name: 'no analysis file for the repo',
    command: 'add-finding',
    args: findingArgs({ '--repo': 'trade-imports-schemas' })
  },
  {
    name: 'summary over 300 characters',
    command: 'complete',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-stub',
      '--change-summary',
      longText,
      '--why-it-changed',
      'Why.'
    ]
  },
  {
    name: 'why over 300 characters',
    command: 'complete',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-stub',
      '--change-summary',
      'Summary.',
      '--why-it-changed',
      longText
    ]
  },
  {
    name: 'missing why',
    command: 'complete',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-stub',
      '--change-summary',
      'Summary.'
    ]
  },
  {
    name: 'no analysis file to complete',
    command: 'complete',
    args: [
      'EUDPA-130',
      '--repo',
      'trade-imports-schemas',
      '--change-summary',
      'Summary.',
      '--why-it-changed',
      'Why.'
    ]
  }
]

/**
 * A recorded message as tim gives it: the hint to prepare the check names
 * `tim understanding-check prepare`, not the retired script.
 *
 * @param {string} stderr
 * @returns {string}
 */
export const asTimNamesPrepare = (stderr) =>
  stderr.replace(
    ' — run prepare-check.sh first',
    ' — run tim understanding-check prepare first'
  )
