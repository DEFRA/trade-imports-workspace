import { describe, it, expect } from 'vitest'
import {
  routeTemplate,
  maskedUrl,
  bucket,
  fingerprintInputs,
  fingerprint,
  slugFromTemplate,
  screenId,
  uniqueId
} from './identity.js'

describe('routeTemplate', () => {
  it('replaces a uuid segment with a token', () => {
    const template = routeTemplate(
      'http://localhost:3000/notifications/6f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f/import-reason'
    )

    expect(template).toBe('/notifications/:id/import-reason')
  })

  it('replaces a numeric segment with a token', () => {
    expect(routeTemplate('/animals/12/identifiers')).toBe(
      '/animals/:n/identifiers'
    )
  })

  it('replaces a notification reference with a token', () => {
    expect(routeTemplate('/n/GBN-GB-26-ABC123/tasks')).toBe('/n/:ref/tasks')
  })

  it('keeps the root path as a slash', () => {
    expect(routeTemplate('http://localhost:3000/')).toBe('/')
  })

  it('leaves a path of real words alone', () => {
    expect(routeTemplate('/what-are-you-importing')).toBe(
      '/what-are-you-importing'
    )
  })
})

describe('maskedUrl', () => {
  it('drops the host and masks the generated reference', () => {
    expect(
      maskedUrl('http://localhost:3010/view/GBN-GB-26-ABC123?tab=all')
    ).toBe('/view/GBN-XX-00-REFERENCE?tab=all')
  })
})

describe('bucket', () => {
  it('calls three rows and four rows the same shape', () => {
    expect(bucket(3)).toBe(bucket(4))
  })

  it('distinguishes an empty list from a list of one', () => {
    expect([bucket(0), bucket(1)]).toEqual(['none', 'one'])
  })
})

const model = (over = {}) => ({
  h1: 'What are you importing?',
  allFields: [{ kind: 'radios', name: 'importKind', options: [{}, {}] }],
  summaryRows: [],
  taskItems: [],
  errorSummary: { items: [] },
  ...over
})

describe('fingerprintInputs', () => {
  it('records the fields, the heading and the bucketed counts', () => {
    const inputs = fingerprintInputs({
      model: model(),
      routeTemplate: '/what-are-you-importing'
    })

    expect(inputs).toEqual({
      routeTemplate: '/what-are-you-importing',
      h1: 'What are you importing?',
      fields: ['radios:importKind'],
      options: ['importKind=2'],
      summaryRows: 'none',
      taskItems: 'none',
      errorSummary: false
    })
  })

  it('ignores hidden fields, which every form carries and none of them show', () => {
    const inputs = fingerprintInputs({
      model: model(),
      controls: [
        { kind: 'hidden', name: 'csrf' },
        { kind: 'text', name: 'fullName' }
      ],
      routeTemplate: '/name'
    })

    expect(inputs.fields).toEqual(['text:fullName'])
  })
})

describe('fingerprint', () => {
  it('gives a dashboard with three notifications and one with four the same hash', () => {
    const three = fingerprintInputs({
      model: model({ summaryRows: [{}, {}, {}] }),
      routeTemplate: '/dashboard'
    })
    const four = fingerprintInputs({
      model: model({ summaryRows: [{}, {}, {}, {}] }),
      routeTemplate: '/dashboard'
    })

    expect(fingerprint(three)).toBe(fingerprint(four))
  })

  it('gives a page showing an error summary a different hash', () => {
    const clean = fingerprintInputs({
      model: model(),
      routeTemplate: '/name'
    })
    const withErrors = fingerprintInputs({
      model: model({ errorSummary: { items: ['Enter your name'] } }),
      routeTemplate: '/name'
    })

    expect(fingerprint(clean)).not.toBe(fingerprint(withErrors))
  })
})

describe('screenId', () => {
  it('names a screen after its route, under the side prefix', () => {
    expect(
      screenId({ prefix: 'fe-', routeTemplate: '/notifications/:id/tasks' })
    ).toBe('fe-notifications-id-tasks')
  })

  it('suffixes a variant so a conditional reveal is its own screen', () => {
    expect(
      screenId({
        prefix: 'dr21-',
        routeTemplate: '/reason-for-import',
        variant: 'internal-market-revealed'
      })
    ).toBe('dr21-reason-for-import--internal-market-revealed')
  })

  it('calls the root screen root', () => {
    expect(slugFromTemplate('/')).toBe('root')
  })
})

describe('uniqueId', () => {
  it('numbers a second screen that would otherwise overwrite the first', () => {
    expect(uniqueId('fe-tasks', new Set(['fe-tasks']))).toBe('fe-tasks--v2')
  })

  it('leaves an unused id alone', () => {
    expect(uniqueId('fe-tasks', new Set())).toBe('fe-tasks')
  })
})
