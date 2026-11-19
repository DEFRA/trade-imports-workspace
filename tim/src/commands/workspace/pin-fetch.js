import { z } from 'zod'
import { pinFetch } from '../../exec/git-pin-fetch.js'
import { makeRunAction } from '../_run-action.js'
import { parseOptions } from '../backlog/shared.js'

const pinFetchOptionsSchema = z
  .object({
    excludeGhPages: z.boolean().optional(),
    prune: z.boolean().optional(),
    pr: z
      .string()
      .regex(/^[1-9]\d*$/, 'Give --pr a pull request number, such as 42.')
      .optional(),
    includeMain: z.boolean().optional()
  })
  .refine((opts) => Boolean(opts.excludeGhPages) !== (opts.pr !== undefined), {
    message: 'Choose one of --exclude-gh-pages or --pr <number>.'
  })
  .refine((opts) => !opts.prune || opts.excludeGhPages, {
    message: 'Use --prune only with --exclude-gh-pages.'
  })
  .refine((opts) => !opts.includeMain || opts.pr !== undefined, {
    message: 'Use --include-main only with --pr <number>.'
  })

const toPinRequest = (opts) =>
  opts.excludeGhPages
    ? { mode: 'exclude', prune: opts.prune === true }
    : {
        mode: 'pr-only',
        pullRequestNumber: opts.pr,
        includeMain: opts.includeMain === true
      }

/**
 * The plain-text report of `tim workspace pin-fetch`.
 *
 * @param {{dir: string, mode: string, refspecs: string[]}} outcome
 * @returns {string}
 */
export const renderPinFetchText = ({ dir, mode, refspecs }) =>
  [
    `remote.origin.fetch pinned (${mode}) for ${dir}:`,
    ...refspecs.map((refspec) => `  ${refspec}`)
  ].join('\n')

/**
 * `tim workspace pin-fetch`: pin one clone's fetch refspec so a bare
 * `git fetch` or `git pull` cannot bring in gh-pages.
 *
 * @param {import('commander').Command} parent
 * @param {{timVersion: string}} options
 */
export const register = (parent, { timVersion }) =>
  parent
    .command('pin-fetch')
    .description(
      "Pin a clone's fetch refspec so a bare git fetch or git pull cannot bring in gh-pages. --exclude-gh-pages fetches every branch except gh-pages (needs git 2.29 or later); --prune then runs git gc --prune=now to reclaim what gh-pages already used. --pr <number> fetches only that pull request's head, as origin/pr-<number>; --include-main fetches main as well. Either way, the gh-pages remote-tracking ref is deleted. Safe to run again."
    )
    .argument('<dir>', 'The clone to pin')
    .option('--exclude-gh-pages', 'Fetch every branch except gh-pages')
    .option(
      '--prune',
      'With --exclude-gh-pages: reclaim the disk gh-pages already used'
    )
    .option('--pr <number>', "Fetch only this pull request's head")
    .option('--include-main', 'With --pr: fetch main as well')
    .addHelpText(
      'after',
      '\nExamples:\n  tim workspace pin-fetch . --exclude-gh-pages --prune\n  tim workspace pin-fetch workareas/reviews/EUDPA-1/repos/trade-imports-stub --pr 42 --include-main --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) =>
          toPinRequest(parseOptions(pinFetchOptionsSchema, opts)),
        run: ({ args: [dir] }, request) => pinFetch({ dir, ...request }),
        renderText: renderPinFetchText,
        timVersion
      })
    )
