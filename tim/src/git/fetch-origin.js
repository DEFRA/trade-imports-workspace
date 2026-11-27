import { run } from '../exec/exec.js'

/**
 * @param {string} dir
 * @returns {Promise<boolean>} Whether `git fetch origin` succeeded in `dir`
 */
export const fetchOrigin = async (dir) =>
  (await run('git', ['-C', dir, 'fetch', '--quiet', 'origin'])).exitCode === 0
