import { register as registerLint } from './lint.js'
import { register as registerStatus } from './status.js'
import { register as registerGaps } from './gaps.js'
import { register as registerCandidates } from './candidates.js'
import { register as registerBaseline } from './baseline.js'
import { register as registerE2eOverlap } from './e2e-overlap.js'

export const register = (program, { timVersion }) => {
  const spec = program
    .command('spec')
    .description(
      'The Behaviour Spec under openspec/ — validate it and find what it still needs'
    )

  registerLint(spec, { timVersion })
  registerStatus(spec, { timVersion })
  registerGaps(spec, { timVersion })
  registerCandidates(spec, { timVersion })
  registerBaseline(spec, { timVersion })
  registerE2eOverlap(spec, { timVersion })
}
