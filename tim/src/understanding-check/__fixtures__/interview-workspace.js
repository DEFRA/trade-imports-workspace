import { readFileSync } from 'node:fs'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const BASH_SCRIPT_FOR = {
  'question-add': 'tools/understanding-check/question-add.sh',
  'question-replace': 'tools/understanding-check/question-replace.sh',
  'question-remove': 'tools/understanding-check/question-remove.sh',
  answer: 'tools/understanding-check/transcript-record-answer.sh',
  score: 'tools/understanding-check/transcript-add-score.sh',
  report: 'tools/understanding-check/render-report.sh'
}

/**
 * The tim arguments that run the same step as a Bash script.
 */
export const TIM_COMMAND_FOR = {
  'question-add': ['question', 'add'],
  'question-replace': ['question', 'replace'],
  'question-remove': ['question', 'remove'],
  answer: ['answer'],
  score: ['score'],
  report: ['report']
}

/**
 * Stands for the staged workspace root in a case's arguments, so a
 * recording names an answer file the same way on every machine.
 */
export const ROOT_PLACEHOLDER = '<ROOT>'

/**
 * A case's arguments with {@link ROOT_PLACEHOLDER} swapped for a staged root.
 *
 * @param {string[]} args
 * @param {string} root
 * @returns {string[]}
 */
export const argsUnder = (args, root) =>
  args.map((arg) => arg.split(ROOT_PLACEHOLDER).join(root))

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {Record<string, object[]>}
 */
export const readInterviewGolden = () =>
  JSON.parse(
    readFileSync(
      new URL(
        './__golden__/understanding-check-interview.json',
        import.meta.url
      ),
      'utf8'
    )
  )

const checkFolder = (ticket) => `workareas/understanding-checks/${ticket}`

export const watchedFolder = checkFolder

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const rubricOf = (label) => ({
  PASS: `Names the ${label} reason and the budget it protects`,
  PARTIAL: `Names the ${label} reason but not the budget`,
  FAIL: `Conflates the ${label} reason with something else`
})

const question = (id, category, overrides = {}) => ({
  id,
  category,
  prompt: `Why does ${id} matter?`,
  anchorEvidence: { file: `src/${id.toLowerCase()}.js`, lines: '1-9' },
  expectedConcepts: [`${id}-concept`, 'shared-concept'],
  rubric: rubricOf(id),
  ...overrides
})

const THREE_QUESTIONS = [
  question('Q1', 'architecture'),
  question('Q2', 'security'),
  question('Q3', 'scenario')
]

const TWELVE_QUESTIONS = Array.from({ length: 12 }, (_, index) =>
  question(`Q${index + 1}`, 'implementation')
)

const answered = (questionId, answer, score = null) => ({
  question_id: questionId,
  answered_at: '2026-11-01T10:00:00Z',
  answer,
  skipped: answer === '',
  score
})

const scoreOf = (verdict, rubricMatch, missed, followUp = null) => ({
  verdict,
  rubric_match: rubricMatch,
  missed_concepts: missed,
  evidence_cited: [{ file: 'src/q1.js', lines: '2-3' }],
  follow_up: followUp,
  scored_at: '2026-11-01T11:00:00Z'
})

const baseMeta = (ticket) => ({
  ticket,
  summary: 'Adds a café | pipe check',
  type: 'Story',
  status: 'In Progress',
  created_at: '2026-11-01T09:00:00Z',
  prs: [
    {
      repo: 'trade-imports-animals-frontend',
      pr: 12,
      state: 'OPEN',
      commit: 'abcdef1234567890',
      url: 'https://github.com/DEFRA/trade-imports-animals-frontend/pull/12',
      truncated: false
    },
    {
      repo: 'trade-imports-animals-backend',
      pr: 3,
      state: 'MERGED',
      commit: '1234',
      url: 'https://github.com/DEFRA/trade-imports-animals-backend/pull/3',
      truncated: true
    }
  ],
  verdict: null,
  verdict_reason: null,
  completed_at: null,
  redaction_summary: { matches: 0, files: 0 },
  coverage_gaps: []
})

const finalisedMeta = (ticket) => ({
  ...baseMeta(ticket),
  verdict: 'needs-review',
  verdict_reason: '1 FAIL; 1 PARTIAL',
  exit_code: 1,
  completed_at: '2026-11-01T12:00:00Z',
  redaction_summary: { matches: 2, files: 1 },
  coverage_gaps: [
    {
      kind: 'oversized_diff',
      repo: 'trade-imports-animals-backend',
      note: 'diff truncated at --max-diff-bytes'
    },
    'a plain gap',
    { kind: 'unscorable', question_id: 'Q3' }
  ]
})

const fullAnalysis = (repo) => ({
  repo,
  changeSummary: `Adds the café check to ${repo}.`,
  whyItChanged: 'Short codes reached PIMS | and were refused.',
  keyDesignDecisions: [
    { id: 1, decision: 'a' },
    { id: 2, decision: 'b' }
  ],
  edgeCases: [{ id: 1, case: 'empty' }],
  failureModes: [],
  securityRisks: [],
  dataOrApiChanges: [{ id: 1 }, { id: 2 }, { id: 3 }],
  testCoverageNotes: [],
  aiSuspectedRegions: [],
  verdict: 'complete'
})

const sparseAnalysis = (repo) => ({
  repo,
  changeSummary: null,
  edgeCases: 'abc',
  failureModes: { one: 1, two: 2 }
})

const REPORT_QUESTIONS = [
  question('Q1', 'architecture', {
    expectedConcepts: ['retry budget', 'idempotency', null, 7]
  }),
  question('Q2', 'security'),
  question('Q3', 'scenario', {
    anchorEvidence: { file: 'src/a|b.js', lines: '40-52' }
  }),
  question('Q4', 'debugging'),
  question('Q5', 'operability')
]

const REPORT_TRANSCRIPT = [
  answered(
    'Q1',
    'Because 4xx is not transient.\n\nAnd the budget matters.',
    scoreOf('PASS', 'Names the Q1 | reason', [])
  ),
  answered(
    'Q2',
    'Partly.',
    scoreOf(
      'PARTIAL',
      'Names the Q2 reason but not the budget',
      ['retry budget', 'idempotency'],
      'Read the retry docs'
    )
  ),
  answered(
    'Q3',
    'No idea.',
    scoreOf(
      'FAIL',
      '<unscorable>',
      ['idempotency', 'Zeta', 'alpha', 'Éclair', 'a|b'],
      ''
    )
  ),
  answered('Q4', '', null),
  answered(
    'Q9',
    'An answer to a question that was removed.',
    scoreOf('FAIL', 'Conflates', ['unscorable'], 'Ask again')
  )
]

const TICKET_MARKDOWN = [
  '# EUDPA-204: Adds a café check',
  '',
  '**Status:** In Progress',
  '',
  '## Description',
  '',
  'Short codes reach PIMS and are refused.',
  '  Indented | line',
  '## Acceptance criteria',
  '',
  '- It works',
  '## Description, again',
  'Second description line',
  '### A sub-heading inside',
  'Last line without a newline'
].join('\n')

const LONG_TICKET_MARKDOWN = `## Description\n${Array.from(
  { length: 25 },
  (_, index) => `Line ${index + 1}`
).join('\n')}\n`

/**
 * The rubric each overlap case's question carries, and the match the
 * scorer quotes against it.
 */
const OVERLAP_PASS =
  'Names BOTH that 4xx is non-transient AND that retrying would exhaust the budget'
const OVERLAP_PARTIAL =
  'Names the 4xx-non-transient distinction but not the budget reasoning'
const OVERLAP_FAIL = 'Conflates 4xx with 5xx behaviour'

const overlapRubric = {
  PASS: OVERLAP_PASS,
  PARTIAL: OVERLAP_PARTIAL,
  FAIL: OVERLAP_FAIL
}

const ACCENTED_CLAUSE =
  'Décrit précisément le délai, la reprise et la file café'

export const overlapCases = [
  {
    name: 'the PASS clause exactly',
    rubricMatch: OVERLAP_PASS,
    verdict: 'PASS'
  },
  {
    name: 'the PARTIAL clause with tabs, newlines and doubled spaces',
    rubricMatch:
      '  Names the\t4xx-non-transient   distinction\nbut not the budget reasoning \n',
    verdict: 'PARTIAL'
  },
  {
    name: 'a 12-character part of a clause',
    rubricMatch: 'with 5xx beh',
    verdict: 'PARTIAL'
  },
  {
    name: 'an 11-character part of a clause',
    rubricMatch: 'with 5xx be',
    verdict: 'PARTIAL'
  },
  {
    name: 'a match that holds a whole clause and more',
    rubricMatch: `They said: ${OVERLAP_FAIL}, and moved on`,
    verdict: 'FAIL'
  },
  {
    name: 'a 24-character window at the start of a clause',
    rubricMatch: 'xx Names BOTH that 4xx is no yy',
    verdict: 'PASS'
  },
  {
    name: 'a 24-character window four characters in',
    rubricMatch: '-- s BOTH that 4xx is non-tra --',
    verdict: 'PASS'
  },
  {
    name: 'a 23-character run of a clause',
    rubricMatch: `-- ${OVERLAP_PASS.slice(0, 23)} --`,
    verdict: 'PASS'
  },
  {
    name: 'a 25-character run that starts one past a window step',
    rubricMatch: `-- ${OVERLAP_PASS.slice(5, 30)} --`,
    verdict: 'PASS'
  },
  {
    name: 'a 28-character run that covers the window four characters in',
    rubricMatch: `-- ${OVERLAP_PASS.slice(3, 31)} --`,
    verdict: 'PASS'
  },
  {
    name: 'the clause in another case',
    rubricMatch: OVERLAP_FAIL.toUpperCase(),
    verdict: 'FAIL'
  },
  { name: 'an empty match', rubricMatch: '', verdict: 'PASS' },
  {
    name: 'the unscorable marker',
    rubricMatch: '<unscorable>',
    verdict: 'PASS'
  },
  {
    name: 'the unscorable marker with spaces round it',
    rubricMatch: '  <unscorable>  ',
    verdict: 'PASS'
  },
  {
    name: 'a non-breaking space where the clause has a space',
    rubricMatch: 'Conflates 4xx\u00a0with 5xx',
    verdict: 'FAIL'
  },
  {
    name: 'a figure space and an ideographic space',
    rubricMatch: 'Conflates\u20074xx\u3000with 5xx',
    verdict: 'FAIL'
  },
  {
    name: 'a paragraph separator and an en quad',
    rubricMatch: 'Conflates\u20294xx\u2000with 5xx',
    verdict: 'FAIL'
  },
  {
    name: 'a next-line character where the clause has a space',
    rubricMatch: 'Conflates 4xx\u0085with 5xx',
    verdict: 'FAIL'
  },
  {
    name: 'a byte-order mark where the clause has a space',
    rubricMatch: 'Conflates 4xx\ufeffwith 5xx',
    verdict: 'FAIL'
  },
  {
    name: 'glob characters taken literally',
    rubricMatch: 'Conflates * with [5]xx?',
    verdict: 'FAIL'
  },
  {
    name: 'a backslash taken literally',
    rubricMatch: 'Conflates 4xx with 5xx\\n',
    verdict: 'FAIL'
  },
  {
    name: 'an echo option on its own',
    rubricMatch: '-neE',
    verdict: 'PASS'
  },
  {
    name: 'a PARTIAL verdict kept when the match overlaps',
    rubricMatch: 'distinction but not the budget',
    verdict: 'PARTIAL'
  }
]

const QUIRK_QUESTIONS = {
  multiLine: {
    PASS: 'line one is long enough\nline two also long enough',
    PARTIAL: 'Names something',
    FAIL: 'Fails'
  },
  blankLine: { PASS: 'Names first', PARTIAL: 'first\n   \nlast', FAIL: 'x' },
  numeric: { PASS: 42, PARTIAL: 'Names it', FAIL: 'zzz' },
  emptyClause: { PASS: '', PARTIAL: 'Names it', FAIL: 'zzz' },
  echoOption: { PASS: '-n', PARTIAL: 'Names it', FAIL: 'zzz' },
  accented: { PASS: ACCENTED_CLAUSE, PARTIAL: 'Names it', FAIL: 'zzz' },
  short: { PASS: 'Names a', PARTIAL: 'Names b', FAIL: 'c' }
}

export const quirkOverlapCases = [
  {
    name: 'a match that crosses two lines of one clause',
    rubric: 'multiLine',
    rubricMatch: 'one is long enough line two also'
  },
  {
    name: 'a match that holds one line of a clause',
    rubric: 'multiLine',
    rubricMatch: 'see: line one is long enough'
  },
  {
    name: 'a clause with a blank line overlaps anything long enough',
    rubric: 'blankLine',
    rubricMatch: 'nothing like the rubric at all'
  },
  {
    name: 'a numeric clause',
    rubric: 'numeric',
    rubricMatch: 'the answer is 42 and more'
  },
  {
    name: 'an empty clause is passed over',
    rubric: 'emptyClause',
    rubricMatch: 'nothing like the rubric at all'
  },
  {
    name: 'a clause that echo reads as an option overlaps anything long enough',
    rubric: 'echoOption',
    rubricMatch: 'nothing like the rubric at all'
  },
  {
    name: 'ten accented characters and a digit fall short of twelve',
    rubric: 'accented',
    rubricMatch: 'éééééééééé1'
  },
  {
    name: 'eleven accented-clause characters and a space trimmed away',
    rubric: 'accented',
    rubricMatch: 'précisément '
  },
  {
    name: 'a window of an accented clause found by characters',
    rubric: 'accented',
    rubricMatch: '>> t précisément le délai, la <<'
  },
  {
    name: 'a match that holds a clause shorter than a window',
    rubric: 'short',
    rubricMatch: 'Names a thing in the answer'
  },
  {
    name: 'clauses shorter than a window and not inside the match',
    rubric: 'short',
    rubricMatch: 'Names nothing in the answer here'
  },
  {
    name: 'a question with no rubric yields null clauses',
    rubric: 'missing',
    rubricMatch: 'the value is null here'
  },
  {
    name: 'a question with no rubric and a match without null',
    rubric: 'missing',
    rubricMatch: 'the value is empty here'
  },
  {
    name: 'a question that does not exist yields null clauses',
    rubric: 'absent',
    rubricMatch: 'the value is null here'
  }
]

const overlapQuestions = () => [
  ...overlapCases.map((_, index) =>
    question(`Q${index + 1}`, 'scenario', { rubric: overlapRubric })
  ),
  ...quirkOverlapCases
    .filter(({ rubric }) => rubric !== 'absent')
    .map(({ rubric }, index) => {
      const id = `Q${overlapCases.length + index + 1}`
      if (rubric === 'missing') {
        const { rubric: _none, ...rest } = question(id, 'scenario')
        return rest
      }
      return question(id, 'scenario', { rubric: QUIRK_QUESTIONS[rubric] })
    })
]

const scoreArgs = (ticket, questionId, verdict, rubricMatch) => [
  ticket,
  '--question-id',
  questionId,
  '--verdict',
  verdict,
  '--rubric-match',
  rubricMatch,
  '--missed-concepts',
  'a',
  '--evidence-cited',
  'src/a.js:1'
]

/**
 * Every overlap case as a score step on EUDPA-210, one question each.
 */
export const overlapSteps = [
  ...overlapCases.map(({ name, rubricMatch, verdict }, index) => ({
    name,
    command: 'score',
    args: scoreArgs('EUDPA-210', `Q${index + 1}`, verdict, rubricMatch)
  })),
  ...quirkOverlapCases.map(({ name, rubric, rubricMatch }, index) => ({
    name,
    command: 'score',
    args: scoreArgs(
      'EUDPA-210',
      rubric === 'absent' ? 'Q99' : `Q${overlapCases.length + index + 1}`,
      'PASS',
      rubricMatch
    )
  }))
]

const VALID_PARTIAL = 'Names one reason but not the other'

/**
 * Rubric texts the categorical-verb rule is asked about.
 */
export const verbCases = [
  'names',
  'Names it',
  'NAMES',
  'renames',
  'namesake',
  'names_x',
  '_names',
  'names-x',
  'x-names',
  'names.',
  '1names',
  'names1',
  'Identifies the cause',
  'it cites. ok',
  'Explains, describes, distinguishes',
  'contrasts and enumerates',
  'shows good understanding',
  'demonstrates it',
  'nam es',
  'line one\nnames on line two',
  'names\u0301',
  'namesé',
  'énames',
  'citesñ',
  '名names',
  'names²',
  'names٣',
  'namesⅧ',
  'namesª',
  'names‿',
  'names５',
  'nameſ',
  'İdentifies',
  'ıdentifies',
  'names😀',
  'names\u2011x',
  "d'cites",
  'cites’s',
  '-e names',
  '-n'
]

const questionArgs = (ticket, overrides = {}) => {
  const base = {
    ticket,
    '--category': 'implementation',
    '--prompt': 'Why does the retry skip 4xx?',
    '--anchor-file': 'src/retry.js',
    '--anchor-lines': '42-58',
    '--expected-concepts': 'retry budget, idempotency',
    '--rubric-pass': 'Names both reasons',
    '--rubric-partial': VALID_PARTIAL,
    '--rubric-fail': 'Conflates them',
    ...overrides
  }
  return Object.entries(base).flatMap(([flag, value]) => {
    if (value === undefined) return []
    return flag === 'ticket' ? [value] : [flag, value]
  })
}

/**
 * Each verb case run through question add as the PASS clause, then
 * through question replace as the PARTIAL clause.
 */
export const verbSteps = verbCases.flatMap((text, index) => [
  {
    name: `add, PASS ${index + 1}`,
    command: 'question-add',
    args: questionArgs('EUDPA-220', { '--rubric-pass': text })
  },
  {
    name: `replace, PARTIAL ${index + 1}`,
    command: 'question-replace',
    args: questionArgs('EUDPA-221', {
      '--id': 'Q1',
      '--rubric-partial': text
    })
  }
])

const optionNames = [
  'ticket',
  '--category',
  '--prompt',
  '--anchor-file',
  '--anchor-lines',
  '--expected-concepts',
  '--rubric-pass',
  '--rubric-partial',
  '--rubric-fail'
]

/**
 * Question steps run one after another on one staged workspace.
 */
export const questionSteps = [
  {
    name: 'first question starts questions.json',
    command: 'question-add',
    args: questionArgs('EUDPA-200', {
      '--expected-concepts':
        ' a , b ,, ,c\u00a0,\u2007d\ufeff, e\u0085,x\n y,\n',
      '--prompt': 'Multi-line\nprompt with "quotes" and café'
    })
  },
  {
    name: 'second question',
    command: 'question-add',
    args: questionArgs('EUDPA-200', {
      '--category': 'test-coverage',
      '--expected-concepts': ','
    })
  },
  {
    name: 'third question',
    command: 'question-add',
    args: questionArgs('EUDPA-200', { '--category': 'operability' })
  },
  {
    name: 'replace the second question',
    command: 'question-replace',
    args: questionArgs('EUDPA-200', {
      '--id': 'Q2',
      '--category': 'security',
      '--prompt': 'Replaced prompt',
      '--expected-concepts': 'only'
    })
  },
  {
    name: 'remove the first question renumbers the rest',
    command: 'question-remove',
    args: ['EUDPA-200', '--id', 'Q1']
  },
  {
    name: 'remove a question that is not there',
    command: 'question-remove',
    args: ['EUDPA-200', '--id', 'Q7']
  },
  {
    name: 'replace a question that is not there',
    command: 'question-replace',
    args: questionArgs('EUDPA-200', { '--id': 'Q9' })
  },
  {
    name: 'a thirteenth question',
    command: 'question-add',
    args: questionArgs('EUDPA-201')
  },
  {
    name: 'remove from a set whose questions lack ids',
    command: 'question-remove',
    args: ['EUDPA-202', '--id', 'Q2']
  }
]

/**
 * Question commands refused, each on a fresh workspace.
 */
export const questionRefusals = [
  ...optionNames.map((name) => ({
    name: `add without ${name}`,
    command: 'question-add',
    args: questionArgs('EUDPA-200', { [name]: undefined })
  })),
  {
    name: 'add with an empty prompt',
    command: 'question-add',
    args: questionArgs('EUDPA-200', { '--prompt': '' })
  },
  {
    name: 'add with an unknown category',
    command: 'question-add',
    args: questionArgs('EUDPA-200', { '--category': 'style' })
  },
  {
    name: 'add without a check folder',
    command: 'question-add',
    args: questionArgs('EUDPA-203')
  },
  {
    name: 'add to a ticket that is not EUDPA',
    command: 'question-add',
    args: questionArgs(undefined)
  },
  {
    name: 'replace without an id',
    command: 'question-replace',
    args: questionArgs('EUDPA-202')
  },
  {
    name: 'replace with an unknown category',
    command: 'question-replace',
    args: questionArgs('EUDPA-202', { '--id': 'Q1', '--category': 'x' })
  },
  {
    name: 'replace without questions.json',
    command: 'question-replace',
    args: questionArgs('EUDPA-200', { '--id': 'Q1' })
  },
  {
    name: 'remove without an id',
    command: 'question-remove',
    args: ['EUDPA-202']
  },
  {
    name: 'remove without a ticket',
    command: 'question-remove',
    args: ['--id', 'Q1']
  },
  {
    name: 'remove without questions.json',
    command: 'question-remove',
    args: ['EUDPA-200', '--id', 'Q1']
  }
]

const answerArgs = (ticket, questionId, file) => [
  ticket,
  '--question-id',
  questionId,
  ...(file === undefined
    ? []
    : ['--answer-file', `${ROOT_PLACEHOLDER}/${file}`])
]

/**
 * Answer steps run one after another on one staged workspace.
 */
export const answerSteps = [
  {
    name: 'first answer starts transcript.json',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q1', 'answers/multi-line.txt')
  },
  {
    name: 'an answer to a second question',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q2', 'answers/accented.txt')
  },
  {
    name: 'answering again replaces the entry and moves it last',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q1', 'answers/plain.txt')
  },
  {
    name: 'an empty answer file records a skip',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q3', 'answers/empty.txt')
  },
  {
    name: 'an answer file of newlines records a skip',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q2', 'answers/newlines.txt')
  },
  {
    name: 'skipped with no answer file',
    command: 'answer',
    args: [...answerArgs('EUDPA-230', 'Q3'), '--skipped']
  },
  {
    name: 'skipped wins over an answer file',
    command: 'answer',
    args: [...answerArgs('EUDPA-230', 'Q1', 'answers/plain.txt'), '--skipped']
  },
  {
    name: 'no answer file and not skipped, after transcript.json is started',
    command: 'answer',
    args: answerArgs('EUDPA-231', 'Q1')
  },
  {
    name: 'an answer file that is not there',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q1', 'answers/missing.txt')
  },
  {
    name: 'an answer file that is a folder',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q1', 'answers')
  },
  {
    name: 'a question that does not exist',
    command: 'answer',
    args: answerArgs('EUDPA-230', 'Q9', 'answers/plain.txt')
  },
  {
    name: 'no questions.json',
    command: 'answer',
    args: answerArgs('EUDPA-200', 'Q1', 'answers/plain.txt')
  },
  {
    name: 'no question id',
    command: 'answer',
    args: [
      'EUDPA-230',
      '--answer-file',
      `${ROOT_PLACEHOLDER}/answers/plain.txt`
    ]
  },
  {
    name: 'no ticket',
    command: 'answer',
    args: ['--question-id', 'Q1']
  }
]

const fullScoreArgs = (ticket, overrides = {}) => {
  const base = {
    ticket,
    '--question-id': 'Q1',
    '--verdict': 'PARTIAL',
    '--rubric-match': 'Names the Q1 reason but not the budget',
    '--missed-concepts': ' retry budget ,, idempotency ,',
    '--evidence-cited': 'src/a.js:1-4, C:/win/b.js:7 ,nocolon,:5, src/c.js:,',
    '--follow-up': 'Read the retry docs',
    ...overrides
  }
  return Object.entries(base).flatMap(([flag, value]) => {
    if (value === undefined) return []
    return flag === 'ticket' ? [value] : [flag, value]
  })
}

/**
 * Score steps run one after another on one staged workspace.
 */
export const scoreSteps = [
  {
    name: 'a quoted clause records the verdict',
    command: 'score',
    args: fullScoreArgs('EUDPA-240')
  },
  {
    name: 'an empty follow-up records null and an entry without a score gains one',
    command: 'score',
    args: fullScoreArgs('EUDPA-240', {
      '--question-id': 'Q2',
      '--verdict': 'PASS',
      '--rubric-match': 'Names the Q2 reason and the budget it protects',
      '--missed-concepts': '',
      '--follow-up': ''
    })
  },
  {
    name: 'an unquoted clause records FAIL, unscorable and a coverage gap',
    command: 'score',
    args: fullScoreArgs('EUDPA-240', {
      '--question-id': 'Q3',
      '--verdict': 'PASS',
      '--rubric-match': 'something the rubric never says',
      '--follow-up': undefined
    })
  },
  {
    name: 'scoring again replaces the score',
    command: 'score',
    args: fullScoreArgs('EUDPA-240', { '--verdict': 'FAIL' })
  },
  {
    name: 'an unscorable score with no meta writes no gap',
    command: 'score',
    args: fullScoreArgs('EUDPA-241', { '--rubric-match': '' })
  },
  {
    name: 'a gap added to a meta with no coverage_gaps',
    command: 'score',
    args: fullScoreArgs('EUDPA-242', { '--rubric-match': '<unscorable>' })
  },
  {
    name: 'a question with no transcript entry',
    command: 'score',
    args: fullScoreArgs('EUDPA-240', { '--question-id': 'Q3x' })
  }
]

/**
 * Score commands refused, each on a fresh workspace.
 */
export const scoreRefusals = [
  ...['ticket', '--question-id', '--verdict', '--evidence-cited'].map(
    (name) => ({
      name: `without ${name}`,
      command: 'score',
      args: fullScoreArgs('EUDPA-240', { [name]: undefined })
    })
  ),
  {
    name: 'an unknown verdict',
    command: 'score',
    args: fullScoreArgs('EUDPA-240', { '--verdict': 'pass' })
  },
  {
    name: 'no questions.json',
    command: 'score',
    args: fullScoreArgs('EUDPA-200')
  },
  {
    name: 'no transcript.json',
    command: 'score',
    args: fullScoreArgs('EUDPA-202')
  }
]

/**
 * Report commands, each on a fresh workspace.
 */
export const reportCases = [
  { name: 'preview', args: ['EUDPA-204', '--preview'] },
  { name: 'preview before ticket', args: ['--preview', 'EUDPA-204'] },
  { name: 'full report', args: ['EUDPA-204'] },
  { name: 'full report, sparse meta', args: ['EUDPA-205'] },
  { name: 'preview, sparse meta', args: ['EUDPA-205', '--preview'] },
  { name: 'full report, long description', args: ['EUDPA-208'] },
  { name: 'preview without questions.json', args: ['EUDPA-206', '--preview'] },
  { name: 'full report without transcript.json', args: ['EUDPA-209'] },
  { name: 'full report without questions.json', args: ['EUDPA-243'] },
  { name: 'no meta', args: ['EUDPA-207'] },
  { name: 'no meta, preview', args: ['EUDPA-207', '--preview'] },
  { name: 'no ticket', args: [] }
]

/**
 * The files of one check folder, keyed by workspace-relative path. A file
 * set to undefined is left out; a string is written as it is.
 */
const checkFiles = (ticket, files) =>
  Object.fromEntries(
    Object.entries(files)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [
        `${checkFolder(ticket)}/${name}`,
        typeof value === 'string' ? value : jsonText(value)
      ])
  )

const questionsFile = (ticket, questions) => ({
  ticket,
  generated_at: '2026-11-01T09:30:00Z',
  questions
})

const transcriptFile = (ticket, entries) => ({ ticket, entries })

const ticketsByName = {
  'EUDPA-200': { '.interview-meta.json': baseMeta('EUDPA-200') },
  'EUDPA-201': {
    '.interview-meta.json': baseMeta('EUDPA-201'),
    'questions.json': questionsFile('EUDPA-201', TWELVE_QUESTIONS)
  },
  'EUDPA-202': {
    '.interview-meta.json': baseMeta('EUDPA-202'),
    'questions.json': questionsFile('EUDPA-202', [
      question('Q1', 'architecture'),
      { category: 'security', prompt: 'No id here' },
      question('Q2', 'scenario'),
      question('Q3', 'debugging')
    ])
  },
  'EUDPA-204': {
    '.interview-meta.json': finalisedMeta('EUDPA-204'),
    'questions.json': questionsFile('EUDPA-204', REPORT_QUESTIONS),
    'transcript.json': transcriptFile('EUDPA-204', REPORT_TRANSCRIPT),
    'ticket.md': TICKET_MARKDOWN,
    'analysis.trade-imports-animals-frontend.json': fullAnalysis(
      'trade-imports-animals-frontend'
    ),
    'analysis.trade-imports-animals-backend.json': sparseAnalysis(
      'trade-imports-animals-backend'
    ),
    'analysis.trade-imports-stub.json': fullAnalysis('trade-imports-stub'),
    'analysis.json': { repo: 'not an analysis' }
  },
  'EUDPA-205': {
    '.interview-meta.json': { ticket: 'EUDPA-205', prs: [] },
    'questions.json': questionsFile('EUDPA-205', []),
    'transcript.json': transcriptFile('EUDPA-205', [])
  },
  'EUDPA-206': { '.interview-meta.json': baseMeta('EUDPA-206') },
  'EUDPA-207': {
    'questions.json': questionsFile('EUDPA-207', THREE_QUESTIONS),
    'transcript.json': transcriptFile('EUDPA-207', [])
  },
  'EUDPA-208': {
    '.interview-meta.json': finalisedMeta('EUDPA-208'),
    'questions.json': questionsFile('EUDPA-208', REPORT_QUESTIONS),
    'transcript.json': transcriptFile('EUDPA-208', REPORT_TRANSCRIPT),
    'ticket.md': LONG_TICKET_MARKDOWN
  },
  'EUDPA-209': {
    '.interview-meta.json': baseMeta('EUDPA-209'),
    'questions.json': questionsFile('EUDPA-209', THREE_QUESTIONS)
  },
  'EUDPA-210': {
    '.interview-meta.json': baseMeta('EUDPA-210'),
    'questions.json': questionsFile('EUDPA-210', overlapQuestions()),
    'transcript.json': transcriptFile(
      'EUDPA-210',
      overlapQuestions().map(({ id }) => answered(id, `Answer to ${id}.`))
    )
  },
  'EUDPA-220': {
    '.interview-meta.json': baseMeta('EUDPA-220'),
    'questions.json': questionsFile('EUDPA-220', THREE_QUESTIONS)
  },
  'EUDPA-221': {
    '.interview-meta.json': baseMeta('EUDPA-221'),
    'questions.json': questionsFile('EUDPA-221', THREE_QUESTIONS)
  },
  'EUDPA-230': {
    '.interview-meta.json': baseMeta('EUDPA-230'),
    'questions.json': questionsFile('EUDPA-230', THREE_QUESTIONS)
  },
  'EUDPA-231': {
    '.interview-meta.json': baseMeta('EUDPA-231'),
    'questions.json': questionsFile('EUDPA-231', THREE_QUESTIONS)
  },
  'EUDPA-240': {
    '.interview-meta.json': baseMeta('EUDPA-240'),
    'questions.json': questionsFile('EUDPA-240', THREE_QUESTIONS),
    'transcript.json': transcriptFile('EUDPA-240', [
      answered('Q1', 'First.'),
      { question_id: 'Q2', answer: 'No score key.' },
      answered('Q3', 'Third.')
    ])
  },
  'EUDPA-241': {
    'questions.json': questionsFile('EUDPA-241', THREE_QUESTIONS),
    'transcript.json': transcriptFile('EUDPA-241', [answered('Q1', 'One.')])
  },
  'EUDPA-243': {
    '.interview-meta.json': finalisedMeta('EUDPA-243'),
    'transcript.json': transcriptFile('EUDPA-243', REPORT_TRANSCRIPT)
  },
  'EUDPA-242': {
    '.interview-meta.json': { ticket: 'EUDPA-242', prs: [] },
    'questions.json': questionsFile('EUDPA-242', THREE_QUESTIONS),
    'transcript.json': transcriptFile('EUDPA-242', [answered('Q1', 'One.')])
  }
}

const ANSWER_FILES = {
  'answers/multi-line.txt': 'First line.\n\n  Indented second | line.\n\n\n',
  'answers/accented.txt': 'Café — naïve ✓ 😀',
  'answers/plain.txt': 'Plain answer.\n',
  'answers/empty.txt': '',
  'answers/newlines.txt': '\n\n\n'
}

/**
 * A staged workspace holding every fixture check folder and answer file,
 * with the named Bash scripts copied in. HOME points at it for a recorded
 * Bash run, and tim reaches it with `--workspace`.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.scripts]
 */
export const stageInterviewWorkspace = ({ scripts = [] } = {}) =>
  stageBashWorkspace({
    scripts,
    files: {
      'repos.json': '{}\n',
      'docs/best-practices/README.md': '# Best practices\n',
      ...ANSWER_FILES,
      ...Object.entries(ticketsByName).reduce(
        (files, [ticket, parts]) => ({
          ...files,
          ...checkFiles(ticket, parts)
        }),
        {}
      )
    }
  })
