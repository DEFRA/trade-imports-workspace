import { afterEach, describe, expect, test } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveSonarToken } from './token.js'

const folders = []

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

const pathWithZshPrinting = (scriptBody) => {
  const folder = mkdtempSync(join(tmpdir(), 'tim-sonar-token-'))
  folders.push(folder)
  if (scriptBody !== undefined) {
    writeFileSync(join(folder, 'zsh'), `#!/bin/sh\n${scriptBody}\n`, {
      mode: 0o755
    })
  }
  return folder
}

describe('#resolveSonarToken', () => {
  test('Should return SONAR_TOKEN from the environment without asking zsh', async () => {
    const path = pathWithZshPrinting('echo from-zsh')

    const token = await resolveSonarToken({
      env: { PATH: path, SONAR_TOKEN: 'from-env' }
    })

    expect(token).toBe('from-env')
  })

  test('Should return the last line an interactive zsh prints when SONAR_TOKEN is unset', async () => {
    const path = pathWithZshPrinting(
      '[ "$1" = "-ic" ] && [ "$2" = "printenv SONAR_TOKEN" ] || exit 9\necho "Welcome banner"\necho from-zshrc'
    )

    const token = await resolveSonarToken({ env: { PATH: path } })

    expect(token).toBe('from-zshrc')
  })

  test('Should ask zsh when SONAR_TOKEN is set but empty', async () => {
    const path = pathWithZshPrinting('echo from-zshrc')

    const token = await resolveSonarToken({
      env: { PATH: path, SONAR_TOKEN: '' }
    })

    expect(token).toBe('from-zshrc')
  })

  test('Should keep what zsh printed when zsh exits with an error', async () => {
    const path = pathWithZshPrinting('echo from-zshrc\nexit 1')

    const token = await resolveSonarToken({ env: { PATH: path } })

    expect(token).toBe('from-zshrc')
  })

  test('Should return undefined when zsh prints nothing', async () => {
    const path = pathWithZshPrinting('exit 1')

    const token = await resolveSonarToken({ env: { PATH: path } })

    expect(token).toBeUndefined()
  })

  test('Should return undefined when there is no zsh on the PATH', async () => {
    const path = pathWithZshPrinting()

    const token = await resolveSonarToken({ env: { PATH: path } })

    expect(token).toBeUndefined()
  })

  test('Should give up and return undefined when zsh takes longer than the timeout', async () => {
    const path = pathWithZshPrinting('/bin/sleep 5\necho too-late')

    const token = await resolveSonarToken({
      env: { PATH: path },
      timeoutMs: 200
    })

    expect(token).toBeUndefined()
  })
})
