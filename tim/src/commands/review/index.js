import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import {
  detectRepoTech,
  renderDetectedTechText
} from '../../review/detect-tech.js'
import { makeRunAction } from '../_run-action.js'
import { registerFile } from './file.js'
import { registerItems } from './items.js'
import { registerFileDiff } from './file-diff.js'
import { registerPrepareAndStart } from './prepare.js'
import { registerRefresh } from './refresh.js'
import { registerShare } from './share.js'
import { registerReviewTools } from './tools.js'

const registerDetectTech = (review, { timVersion }) =>
  review
    .command('detect-tech')
    .argument('[repo-path]', 'The repo folder to look in')
    .description(
      'Detect the technologies a repo uses from the review skill\'s routing (.claude/skills/review/assets/routing.json), with the best-practice files each one brings. Prints {"technologies":[...],"best_practices":[...]}. A missing or empty path detects nothing.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim review detect-tech repos/trade-imports-stub --no-ui\n  tim review detect-tech repos/trade-imports-animals-frontend --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
        }),
        run: ({ args: [repoPath] }, { workspaceRoot }) =>
          detectRepoTech({ workspaceRoot, repoPath }),
        renderText: renderDetectedTechText,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

/**
 * `tim review`: the review skill's own helpers.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const review = program
    .command('review')
    .description("The review skill's helpers")
  registerDetectTech(review, { timVersion })
  registerFile(review, { timVersion })
  registerItems(review, { timVersion })
  registerReviewTools(review, { timVersion })
  registerRefresh(review, { timVersion })
  registerFileDiff(review, { timVersion })
  registerPrepareAndStart(review, { timVersion })
  registerShare(review, { timVersion })
}
