import { describe, test, expect } from 'vitest'
import { createServer } from 'node:net'
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isPortHeld, portHolder, describeHolder } from './ports.js'

const listening = () =>
  new Promise((resolve) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => resolve(server))
  })

const closed = (server) => new Promise((resolve) => server.close(resolve))

// A `docker` on PATH that prints what it is given, so the test controls what
// the containers look like without a Docker daemon.
const withFakeDocker = async (output, assertions) => {
  const bin = mkdtempSync(join(tmpdir(), 'tim-fake-docker-'))
  const docker = join(bin, 'docker')
  writeFileSync(docker, `#!/usr/bin/env bash\nprintf '%b' '${output}'\n`)
  chmodSync(docker, 0o755)
  try {
    await assertions({ PATH: `${bin}:${process.env.PATH}` })
  } finally {
    rmSync(bin, { recursive: true, force: true })
  }
}

describe('isPortHeld', () => {
  test('sees a port something is listening on', async () => {
    const server = await listening()

    const held = await isPortHeld(server.address().port)

    await closed(server)
    expect(held).toBe(true)
  })

  test('sees a port nothing is listening on as free', async () => {
    const server = await listening()
    const { port } = server.address()
    await closed(server)

    expect(await isPortHeld(port)).toBe(false)
  })
})

describe('portHolder', () => {
  test('names a workspace stack container that publishes the port', async () => {
    await withFakeDocker(
      'trade-imports-plants-frontend-1\\ttrade-imports\\n',
      async (env) => {
        expect(await portHolder(3003, { env })).toEqual({
          kind: 'container',
          name: 'trade-imports-plants-frontend-1',
          workspaceStack: true
        })
      }
    )
  })

  test('tells a container from another compose project apart', async () => {
    await withFakeDocker('redis-1\\tsomething-else\\n', async (env) => {
      expect(await portHolder(6379, { env })).toEqual(
        expect.objectContaining({ name: 'redis-1', workspaceStack: false })
      )
    })
  })

  test('names the process when no container publishes the port', async () => {
    const server = await listening()
    const { port } = server.address()

    let holder
    await withFakeDocker('', async (env) => {
      holder = await portHolder(port, { env })
    })

    await closed(server)
    expect(holder).toEqual(
      expect.objectContaining({ kind: 'process', pid: process.pid })
    )
  })
})

describe('describeHolder', () => {
  test('describes a workspace stack container', () => {
    expect(
      describeHolder({
        kind: 'container',
        name: 'trade-imports-plants-frontend-1',
        workspaceStack: true
      })
    ).toBe("the workspace stack's trade-imports-plants-frontend-1 container")
  })

  test('describes a process by name and pid', () => {
    expect(describeHolder({ kind: 'process', name: 'node', pid: 42 })).toBe(
      'node (pid 42)'
    )
  })

  test('says when it cannot tell who holds the port', () => {
    expect(describeHolder({ kind: 'unknown' })).toBe(
      'a process tim cannot identify'
    )
  })
})
