import { describe, test, expect, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  appNamed,
  captureConfigPath,
  captureDirFor,
  readCaptureConfig,
  workareaPathFor
} from './config.js'

const WORKAREA = 'shared/programme'

const APP = {
  repo: 'repos/animals-frontend',
  fitScript: 'test:fit',
  projects: ['journeys'],
  flow: 'src/flow/flow.js',
  pagePath: '/notifications/{journeyId}/{slug}'
}

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedConfig = (contents) => {
  root = mkdtempSync(join(tmpdir(), 'tim-capture-config-'))
  const dir = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'capture.json'), contents)
  return root
}

describe('workareaPathFor', () => {
  test('resolves a workarea under workareas/', () => {
    expect(workareaPathFor('/ws', 'shared/programme')).toBe(
      '/ws/workareas/shared/programme'
    )
  })

  test('refuses a workarea that climbs out of workareas/', () => {
    expect(() => workareaPathFor('/ws', '../../etc')).toThrow(
      'must be a path inside workareas/'
    )
  })

  test('refuses an empty workarea', () => {
    expect(() => workareaPathFor('/ws', '  ')).toThrow('Name a workarea')
  })
})

describe('captureConfigPath', () => {
  test('names capture.json beside the workarea', () => {
    expect(captureConfigPath('/ws', 'shared/programme')).toBe(
      '/ws/workareas/shared/programme/capture.json'
    )
  })
})

describe('readCaptureConfig', () => {
  test('returns the apps a valid capture.json declares', () => {
    seedConfig(JSON.stringify({ apps: { 'animals-frontend': APP } }))

    expect(readCaptureConfig(root, WORKAREA)).toEqual({
      apps: { 'animals-frontend': APP }
    })
  })

  test('says where it looked when capture.json is missing', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-capture-config-'))

    expect(() => readCaptureConfig(root, WORKAREA)).toThrow(
      /Can't find .*capture\.json/
    )
  })

  test('says the file is not valid JSON when it cannot be parsed', () => {
    seedConfig('{ not json')

    expect(() => readCaptureConfig(root, WORKAREA)).toThrow('is not valid JSON')
  })

  test('refuses a pagePath that does not end with the slug', () => {
    seedConfig(
      JSON.stringify({
        apps: { 'animals-frontend': { ...APP, pagePath: '/{slug}/edit' } }
      })
    )

    expect(() => readCaptureConfig(root, WORKAREA)).toThrow(
      'pagePath must end with {slug}'
    )
  })

  test('refuses an app entry missing its flow module', () => {
    const { flow, ...withoutFlow } = APP
    seedConfig(JSON.stringify({ apps: { 'animals-frontend': withoutFlow } }))

    expect(() => readCaptureConfig(root, WORKAREA)).toThrow(
      /apps\.animals-frontend\.flow/
    )
  })

  test('refuses a capture.json with no apps', () => {
    seedConfig(JSON.stringify({ apps: {} }))

    expect(() => readCaptureConfig(root, WORKAREA)).toThrow(
      'apps must name at least one app'
    )
  })
})

describe('appNamed', () => {
  test('returns the named app with its name', () => {
    expect(
      appNamed({ apps: { 'animals-frontend': APP } }, 'animals-frontend')
    ).toEqual({ name: 'animals-frontend', ...APP })
  })

  test('refuses an unknown app by name and lists the ones it has', () => {
    expect(() =>
      appNamed({ apps: { 'animals-frontend': APP, admin: APP } }, 'plants')
    ).toThrow(
      'Can\'t find an app called "plants" in capture.json. It has: admin, animals-frontend.'
    )
  })
})

describe('captureDirFor', () => {
  test('gives one folder per app and commit', () => {
    expect(captureDirFor('/ws/workareas/x', 'animals-frontend', 'abc123')).toBe(
      '/ws/workareas/x/traces/animals-frontend/abc123'
    )
  })
})
