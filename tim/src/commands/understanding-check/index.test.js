import { describe, expect, test } from 'vitest'
import { recordTimRun as recordTimCommand } from '../../test-support/bash-golden-harness.js'
import {
  analysisRefusals,
  asTimNamesPrepare,
  analysisSteps,
  countsCases,
  finalizeCases,
  readCheckGolden,
  stageCheckWorkspace,
  TIM_COMMAND_FOR,
  verifyCases,
  watchedFolder
} from '../../understanding-check/__fixtures__/check-workspace.js'

const golden = readCheckGolden()

const ticketOf = (args) => args.find((arg) => arg.startsWith('EUDPA-'))

const recordTimRun = (staged, command, args) => {
  const ticket = ticketOf(args)
  return recordTimCommand(
    staged,
    ['understanding-check', ...TIM_COMMAND_FOR[command], ...args],
    ticket ? { watch: watchedFolder(ticket) } : {}
  )
}

const recordTimFresh = async (command, args) => {
  const staged = stageCheckWorkspace()
  try {
    return await recordTimRun(staged, command, args)
  } finally {
    staged.remove()
  }
}

const bashRunNamed = (runs, name) => {
  const run = runs.find((each) => each.case === name)
  if (!run) throw new Error(`No recorded Bash run named "${name}"`)
  return run
}

const asTimSaysUsage = (command) => (stderr) =>
  stderr.replace(
    /^Usage: \S+\/tools\/understanding-check\/[a-z-]+\.sh /,
    `Usage: tim understanding-check ${command} `
  )

const withoutRunFields = ({
  case: _name,
  input: _input,
  command: _command,
  ...run
}) => run

const expectedTextRun = (bashRun, command) => {
  const run = withoutRunFields(bashRun)
  return { ...run, stderr: asTimSaysUsage(command)(run.stderr) }
}

const resultOf = (timRun) => JSON.parse(timRun.stdout).result

describe('tim understanding-check counts matches counts.sh', () => {
  const textCases = countsCases.filter(
    ({ args, name }) =>
      !args.includes('--json') &&
      name !== 'answer to a question not in questions.json'
  )

  test.each(textCases)(
    'Should print what counts.sh printed, exit as it did and leave the files alone for $name',
    async ({ name, args }) => {
      const timRun = await recordTimFresh('counts', args)

      expect(timRun).toEqual(
        expectedTextRun(bashRunNamed(golden.counts, name), 'counts')
      )
    }
  )

  test('Should put the counts counts.sh printed as JSON in the envelope result', async () => {
    const bashRun = bashRunNamed(golden.counts, 'mixed verdicts, json')

    const timRun = await recordTimFresh('counts', bashRun.input)

    expect(timRun.exitCode).toBe(bashRun.exitCode)
    expect(resultOf(timRun)).toEqual(JSON.parse(bashRun.stdout))
  })

  test('Should refuse, exit 1 and name the question when an answer has no category, where counts.sh died in jq with exit 5', async () => {
    const bashRun = bashRunNamed(
      golden.counts,
      'answer to a question not in questions.json'
    )

    const timRun = await recordTimFresh('counts', bashRun.input)

    expect(bashRun.exitCode).toBe(5)
    expect(timRun).toEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'Error: transcript.json answers Q9, which has no category in questions.json\n',
      files: bashRun.files
    })
  })
})

const recordedMetaPathFor = (ticket) => {
  const textRun = golden.finalize.find(
    ({ input }) => input.includes(ticket) && !input.includes('--json')
  )
  return textRun.stdout.match(/^Meta: +(.+)$/m)[1]
}

describe('tim understanding-check finalize matches finalize-verdict.sh', () => {
  const textCases = finalizeCases.filter(({ args }) => !args.includes('--json'))

  test.each(textCases)(
    'Should print the verdict finalize-verdict.sh printed, exit with its code and write the same meta for $name',
    async ({ name, args }) => {
      const timRun = await recordTimFresh('finalize', args)

      expect(timRun).toEqual(
        expectedTextRun(bashRunNamed(golden.finalize, name), 'finalize')
      )
    }
  )

  test.each(finalizeCases.filter(({ args }) => args.includes('--json')))(
    'Should put the verdict finalize-verdict.sh printed as JSON in the envelope result, with the meta path, and exit with its code for $name',
    async ({ name, args }) => {
      const bashRun = bashRunNamed(golden.finalize, name)

      const timRun = await recordTimFresh('finalize', args)

      expect(timRun.exitCode).toBe(bashRun.exitCode)
      expect(resultOf(timRun)).toEqual({
        ...JSON.parse(bashRun.stdout),
        meta_path: recordedMetaPathFor(ticketOf(args))
      })
      expect(timRun.files).toEqual(bashRun.files)
    }
  )
})

describe('tim understanding-check verify matches verify-coverage.sh with its sections filter corrected', () => {
  test.each(verifyCases.filter(({ args }) => !args.includes('--json')))(
    'Should print what the corrected verify-coverage.sh printed, on the same stream, and exit as it did for $name',
    async ({ name, args }) => {
      const timRun = await recordTimFresh('verify', args)

      expect(timRun).toEqual(
        expectedTextRun(bashRunNamed(golden.verify, name), 'verify')
      )
    }
  )

  test.each(verifyCases.filter(({ args }) => args.includes('--json')))(
    'Should put what the corrected verify-coverage.sh printed as JSON in the envelope result and exit as it did for $name',
    async ({ name, args }) => {
      const bashRun = bashRunNamed(golden.verify, name)

      const timRun = await recordTimFresh('verify', args)

      expect(timRun.exitCode).toBe(bashRun.exitCode)
      expect(resultOf(timRun)).toEqual(JSON.parse(bashRun.stdout))
    }
  )

  test('Should pass a complete check that verify-coverage.sh as shipped refused with a jq compile error', async () => {
    const shipped = bashRunNamed(golden.verifyAsShipped, 'all good')

    const timRun = await recordTimFresh('verify', shipped.input)

    expect(shipped.exitCode).toBe(3)
    expect(timRun.exitCode).toBe(0)
  })
})

describe('tim understanding-check analysis matches the analysis scripts', () => {
  const recordTimInOrder = async (steps) => {
    const staged = stageCheckWorkspace()
    try {
      const runs = []
      for (const { command, args } of steps) {
        runs.push(await recordTimRun(staged, command, args))
      }
      return runs
    } finally {
      staged.remove()
    }
  }

  test('Should print the ids and messages the scripts printed and leave the same analysis file after every step', async () => {
    const runs = await recordTimInOrder(analysisSteps)

    expect(runs).toEqual(golden.analysis.map(withoutRunFields))
  })

  test('Should refuse each bad command as the scripts did, with the same message and exit code', async () => {
    const runs = await recordTimInOrder(analysisRefusals)

    expect(runs).toEqual(
      golden.analysisRefusals.map(withoutRunFields).map((run) => ({
        ...run,
        stderr: asTimNamesPrepare(run.stderr)
      }))
    )
  })
})
