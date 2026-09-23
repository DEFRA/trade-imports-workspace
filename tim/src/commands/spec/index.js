import { register as registerLint } from './lint.js'

export const register = (program, { timVersion }) => {
  const spec = program
    .command('spec')
    .description(
      'The Behaviour Spec under openspec/ — validate it and find what it still needs'
    )

  registerLint(spec, { timVersion })
}
