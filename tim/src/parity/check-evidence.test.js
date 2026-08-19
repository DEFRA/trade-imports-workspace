import { describe, test, expect } from 'vitest'
import { pinDrift, citationHealth, blockers } from './check-evidence.js'

describe('pinDrift', () => {
  const meta = {
    pins: {
      frontend: { sha: 'aaa' },
      prototype: { sha: 'bbb' }
    }
  }

  test('is silent when the evidence is of the commits the corpus is pinned to', () => {
    const evidence = {
      generatedFrom: { pins: { frontend: 'aaa', prototype: 'bbb' } }
    }
    expect(pinDrift({ evidence, meta })).toEqual([])
  })

  test('names the repo that moved, and both shas', () => {
    const evidence = {
      generatedFrom: { pins: { frontend: 'old', prototype: 'bbb' } }
    }
    expect(pinDrift({ evidence, meta })).toEqual([
      { repo: 'frontend', was: 'old', now: 'aaa' }
    ])
  })

  test('a repo the corpus has gained is drift too', () => {
    const evidence = { generatedFrom: { pins: { frontend: 'aaa' } } }
    expect(pinDrift({ evidence, meta })).toEqual([
      { repo: 'prototype', was: null, now: 'bbb' }
    ])
  })
})

describe('citationHealth', () => {
  const evidence = {
    increments: {
      'inc-001': {
        citations: {
          c1: { state: 'resolved', pushed: true, anchorCheck: { ok: true } },
          c2: {
            state: 'resolved',
            pushed: true,
            anchorCheck: { outOfRange: ['handleSubmit'] }
          }
        }
      },
      'inc-002': {
        citations: {
          c1: { state: 'unresolved' },
          c2: {
            state: 'resolved',
            pushed: false,
            anchorCheck: {
              missingFromFile: ['NotificationFulfilmentsController']
            }
          }
        }
      }
    }
  }

  test('counts every citation across every increment', () => {
    expect(citationHealth(evidence).total).toBe(4)
  })

  test('separates a drifted line range from a moved premise', () => {
    const health = citationHealth(evidence)
    // Widening a range is a mechanical fix; a missing identifier means the
    // claim itself has to be re-verified, so conflating them would send
    // someone to nudge line numbers under a finding that no longer holds.
    expect(health.outOfRange).toEqual([
      { at: 'inc-001/c2', anchors: ['handleSubmit'] }
    ])
    expect(health.missingFromFile).toEqual([
      { at: 'inc-002/c2', anchors: ['NotificationFulfilmentsController'] }
    ])
  })

  test('flags citations whose commit is not pushed, because their links 404 for everyone else', () => {
    expect(citationHealth(evidence).notPushed).toEqual(['inc-002/c2'])
  })

  test('counts what is still queued for a human', () => {
    expect(citationHealth(evidence).queued).toBe(1)
  })
})

describe('blockers', () => {
  const clean = {
    evidencePresent: true,
    pinDrift: [],
    captures: [{ side: 'frontend', ok: true }],
    citations: { outOfRange: [{}], missingFromFile: [{}] }
  }

  test('a drifted citation anchor does not block', () => {
    // It is the expected yield of pinning to HEAD — a list of findings to
    // re-verify, not a fault in the pipeline.
    expect(blockers(clean)).toEqual([])
  })

  test('a moved pin blocks, because every URL in the evidence is of other code', () => {
    expect(
      blockers({
        ...clean,
        pinDrift: [{ repo: 'frontend', was: 'x', now: 'y' }]
      })
    ).toEqual(['frontend pin moved since the evidence was generated'])
  })

  test('a missing capture blocks and says why', () => {
    expect(
      blockers({
        ...clean,
        captures: [{ side: 'prototype', ok: false, why: 'No manifest at /x.' }]
      })
    ).toEqual(['prototype capture: No manifest at /x.'])
  })

  test('a missing evidence file blocks on its own', () => {
    expect(blockers({ ...clean, evidencePresent: false })).toEqual([
      'evidence.json is missing'
    ])
  })
})
