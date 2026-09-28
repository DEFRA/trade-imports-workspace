import { register as registerSetup } from './setup.js'

export const register = (program, { timVersion }) => {
  const prototype = program
    .command('prototype')
    .description(
      'Commands for a designer working on the plants prototype from the workspace'
    )

  registerSetup(prototype, { timVersion })
}
