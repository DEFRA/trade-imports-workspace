import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from './io.js'
import { loadCorpus } from './load.js'
import { loadPairs, indexPairs, screenPairsFor } from './assets/pairs.js'

/**
 * Is the evidence file still about the commits the corpus is pinned to?
 *
 * evidence.json records the pins it was generated from. A pin that has moved
 * since means every URL, blob id and snippet in it is of code the report is no
 * longer talking about — which is the one failure the whole pinning design
 * exists to make impossible to miss.
 *
 * @param {object} args
 * @param {object} args.evidence
 * @param {object} args.meta
 * @returns {object[]} One entry per repo whose pin moved
 */
export const pinDrift = ({ evidence, meta }) => {
  const was = evidence?.generatedFrom?.pins ?? {}
  const now = Object.fromEntries(
    Object.entries(meta?.pins ?? {}).map(([repo, pin]) => [
      repo,
      pin.sha ?? pin
    ])
  )
  return Object.keys({ ...was, ...now })
    .filter((repo) => was[repo] !== now[repo])
    .map((repo) => ({
      repo,
      was: was[repo] ?? null,
      now: now[repo] ?? null
    }))
}

/**
 * Does the capture on disk say it is of the commit the corpus claims?
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {object} args.meta
 * @returns {object[]}
 */
export const captureIntegrity = ({ profile, meta }) =>
  profile.sides.map((side) => {
    const declared = meta?.captures?.[side.id]?.sha ?? null
    const dir =
      side.evidenceRoot && declared
        ? join(
            profile.workspaceRoot,
            side.evidenceRoot,
            `${side.id}@${declared}`
          )
        : null
    const manifestPath = dir ? join(dir, 'manifest.json') : null
    if (!manifestPath || !existsSync(manifestPath)) {
      return {
        side: side.id,
        declared,
        ok: false,
        why: declared
          ? `No manifest at ${manifestPath}. The pictures the corpus claims have not been captured, or were captured somewhere else.`
          : 'The corpus declares no capture for this side.',
        regenerate: side.captureCommand ?? null
      }
    }
    const manifest = readJsonFile(manifestPath)
    const appSha = manifest.appSha ?? ''
    return {
      side: side.id,
      declared,
      rows: manifest.rows?.length ?? 0,
      crops: (manifest.rows ?? []).reduce(
        (n, row) => n + (row.crops ?? []).filter((crop) => crop.file).length,
        0
      ),
      deviceScaleFactor: manifest.deviceScaleFactor ?? null,
      ok: appSha.startsWith(declared),
      why: appSha.startsWith(declared)
        ? null
        : `The manifest says it is of ${appSha.slice(0, 8)}, the corpus says ${declared}.`,
      regenerate: side.captureCommand ?? null
    }
  })

/**
 * Screens a finding points at that no capture visited.
 *
 * A manifest row is the record of one page visit, which produced the
 * screenshot, the crops, the page model and the rendered DOM together. No row
 * means none of the four exists, so there is nothing on disk anyone can argue
 * the finding from.
 *
 * @param {object} args
 * @param {object[]} args.items
 * @param {object} args.pairIndex
 * @param {object[]} args.sides
 * @param {Record<string, Set<string>>} args.captured
 * @returns {object[]}
 */
export const missingRows = ({ items, pairIndex, sides, captured }) => {
  const wanted = Object.fromEntries(sides.map((side) => [side.id, new Map()]))
  for (const item of items) {
    for (const row of screenPairsFor({
      screens: item.screens,
      pairIndex,
      sides
    })) {
      for (const side of sides) {
        const screen = row[side.id]?.screen
        if (!screen) continue
        const seen = wanted[side.id].get(screen) ?? []
        wanted[side.id].set(screen, [...seen, item.id])
      }
    }
  }
  return sides.flatMap((side) =>
    [...wanted[side.id].entries()]
      .filter(([screen]) => !captured[side.id]?.has(screen))
      .map(([screen, cited]) => ({ side: side.id, screen, cited }))
  )
}

/**
 * Crops the capture was told to take and could not.
 *
 * The anchor matched nothing on the page when the screen was shot, so the
 * control the finding is about has no picture of its own. Either the anchor
 * names the wrong thing or the page was captured in a state that does not hold
 * it — both are faults in the capture, and both are silent until listed here.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {object} args.meta
 * @returns {object[]}
 */
export const unresolvedAnchors = ({ profile, meta }) =>
  profile.sides.flatMap((side) => {
    const declared = meta?.captures?.[side.id]?.sha
    if (!side.evidenceRoot || !declared) return []
    const path = join(
      profile.workspaceRoot,
      side.evidenceRoot,
      `${side.id}@${declared}`,
      'manifest.json'
    )
    if (!existsSync(path)) return []
    return (readJsonFile(path).rows ?? []).flatMap((row) =>
      (row.crops ?? [])
        .filter((crop) => !crop.file)
        .map((crop) => ({
          side: side.id,
          screen: row.screen,
          anchor: crop.anchor,
          why: crop.why
        }))
    )
  })

/**
 * Citations whose target has moved, split by what a person would have to do.
 *
 * @param {object} evidence
 * @returns {object}
 */
export const citationHealth = (evidence) => {
  const rows = Object.entries(evidence?.increments ?? {}).flatMap(
    ([id, item]) =>
      Object.entries(item.citations ?? {}).map(([ref, citation]) => ({
        id,
        ref,
        ...citation
      }))
  )
  const named = (key) =>
    rows
      .filter((row) => row.anchorCheck?.[key]?.length)
      .map((row) => ({
        at: `${row.id}/${row.ref}`,
        anchors: row.anchorCheck[key]
      }))

  return {
    total: rows.length,
    resolved: rows.filter((row) => row.state === 'resolved').length,
    queued: rows.filter((row) => row.state === 'unresolved').length,
    notPushed: rows
      .filter((row) => row.pushed === false)
      .map((row) => `${row.id}/${row.ref}`),
    // The identifier is in the file but outside the cited lines: widen it.
    outOfRange: named('outOfRange'),
    // The identifier is not in the file at all: the claim's premise has moved
    // and the finding needs re-verifying, not the line range nudging.
    missingFromFile: named('missingFromFile'),
    // Neither. The string belongs to a sibling citation of the same finding, or
    // the source interpolates it, or the finding quoted the rendered page. All
    // three are correct citations and none is a warning; they are counted so a
    // reader can see the check looked at them and had an answer.
    inSibling: named('inSibling'),
    interpolated: named('interpolated'),
    rendered: named('rendered')
  }
}

const visibleFields = (model) =>
  (model?.allFields ?? []).filter(
    (field) => field.kind !== 'hidden' && field.name !== 'crumb'
  ).length

/**
 * Screens with no control on one side and controls on the other.
 *
 * Every delta, anchor and insertion point is derived from the page models, so
 * a page captured in a state that renders nothing does not merely lose its own
 * evidence: it tells the differ that side has no fields there, and the report
 * then shows an absence that is an artefact of the journey rather than a
 * difference between the two codebases.
 *
 * The asymmetry is the signal, not the emptiness. Confirmation pages, hubs
 * and review pages have no controls on either side and are not worth a line;
 * flagging them buries the one screen that matters in twenty that do not.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {Map} args.pairIndex
 * @returns {object[]}
 */
export const emptyModels = ({ profile, pairIndex }) => {
  const modelOf = (side, screen) => {
    const path = join(side.modelDir, `${screen}.json`)
    return existsSync(path) ? readJsonFile(path) : null
  }

  return profile.sides.flatMap((side) => {
    if (!existsSync(side.modelDir)) return []
    return readdirSync(side.modelDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        const screen = name.replace(/\.json$/, '')
        const model = readJsonFile(join(side.modelDir, name))
        const partners = profile.sides
          .filter((other) => other.id !== side.id)
          .flatMap((other) =>
            (pairIndex?.get(screen)?.[other.id] ?? [])
              .map((partner) => ({
                side: other,
                screen: partner,
                fields: visibleFields(modelOf(other, partner))
              }))
              .filter((partner) => partner.fields > 0)
          )
        return { screen, model, partners }
      })
      .filter(
        ({ model, partners }) => visibleFields(model) === 0 && partners.length
      )
      .map(({ screen, model, partners }) => ({
        side: side.id,
        screen,
        h1: model.h1 ?? null,
        partner: partners[0].screen,
        partnerFields: partners[0].fields
      }))
  })
}

/**
 * Which commit each side's page models were read at.
 *
 * A page model has no provenance inside it. It is the evidence anyone reaches
 * for to settle what a screen actually asked — every field, its kind and its
 * label — so a model of unknown vintage under a pending decision means nobody
 * can say which commit the finding was argued from.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {object} args.meta
 * @returns {object[]}
 */
export const modelVintage = ({ profile, meta }) =>
  profile.sides.map((side) => {
    const from = side.modelsFrom ?? null
    const pin = meta?.pins?.[side.repo ?? side.id]?.sha ?? null
    return {
      side: side.id,
      sha: from?.sha ?? null,
      how: from?.how ?? null,
      matchesPin: Boolean(from?.sha && pin && pin.startsWith(from.sha)),
      why: from?.why ?? null
    }
  })

/**
 * Everything the evidence pipeline can say about its own state.
 *
 * The point of gathering it in one command is that no single check is enough:
 * a full capture over a stale pin, or a clean citation list against a
 * capture nobody re-ran, both read as "the evidence is fine" when it is not.
 *
 * @param {object} args
 * @param {object} args.profile
 * @returns {object}
 */
export const runCheckEvidence = ({ profile }) => {
  const corpus = loadCorpus({ profile })
  const evidence = existsSync(profile.paths.evidence)
    ? readJsonFile(profile.paths.evidence)
    : null
  const meta = corpus.meta

  const captures = captureIntegrity({ profile, meta })
  const captured = Object.fromEntries(
    captures.map((capture) => {
      const side = profile.sideById[capture.side]
      const declared = meta?.captures?.[capture.side]?.sha
      if (!side?.evidenceRoot || !declared) return [capture.side, new Set()]
      const path = join(
        profile.workspaceRoot,
        side.evidenceRoot,
        `${side.id}@${declared}`,
        'manifest.json'
      )
      if (!existsSync(path)) return [capture.side, new Set()]
      return [
        capture.side,
        new Set((readJsonFile(path).rows ?? []).map((row) => row.screen))
      ]
    })
  )

  const pairIndex = indexPairs(loadPairs(profile.paths.pairingModule))
  const items = [...corpus.findings, ...corpus.withdrawn]

  return {
    corpus: profile.id,
    evidencePresent: Boolean(evidence),
    pinDrift: evidence ? pinDrift({ evidence, meta }) : [],
    captures,
    missingRows: missingRows({
      items,
      pairIndex,
      sides: profile.sides,
      captured
    }),
    unresolvedAnchors: unresolvedAnchors({ profile, meta }),
    citations: evidence
      ? citationHealth(evidence)
      : {
          total: 0,
          resolved: 0,
          queued: 0,
          notPushed: [],
          outOfRange: [],
          missingFromFile: [],
          inSibling: [],
          interpolated: [],
          rendered: []
        },
    models: modelVintage({ profile, meta }),
    emptyModels: emptyModels({ profile, pairIndex }),
    regenerate: regenerationCommands({ profile, evidence, meta })
  }
}

/**
 * The exact commands that would produce what is absent.
 *
 * Naming the command is the difference between a report someone acts on and a
 * report someone reads. Nothing here is run: a capture takes a stack and a
 * running application, and guessing that they are up would be worse than
 * printing the line.
 *
 * @param {object} args
 * @returns {string[]}
 */
export const regenerationCommands = ({ profile, evidence, meta }) => {
  const out = []
  if (!evidence) {
    out.push(`tim parity evidence ${profile.runId} --write`)
  } else if (pinDrift({ evidence, meta }).length) {
    out.push(
      `tim parity meta ${profile.runId} --write   # re-read the pins`,
      `tim parity evidence ${profile.runId} --write   # re-resolve every citation at them`
    )
  }
  for (const side of profile.sides) {
    if (side.captureCommand) out.push(side.captureCommand)
  }
  out.push(`tim parity report ${profile.runId}`)
  return out
}

const bullet = (line) => `  - ${line}`

/**
 * @param {object} result
 * @returns {string}
 */
export const renderCheckEvidence = (result) => {
  const lines = [`evidence check — ${result.corpus}`, '']

  if (!result.evidencePresent) {
    lines.push('evidence.json is missing. Nothing below is trustworthy.', '')
  }

  lines.push('pins')
  lines.push(
    result.pinDrift.length === 0
      ? bullet('every repo is at the commit the evidence was generated from.')
      : result.pinDrift
          .map((entry) =>
            bullet(
              `${entry.repo} moved: evidence is of ${String(entry.was).slice(0, 8)}, the corpus is pinned to ${String(entry.now).slice(0, 8)}.`
            )
          )
          .join('\n')
  )

  lines.push('', 'captures')
  for (const capture of result.captures) {
    lines.push(
      bullet(
        capture.ok
          ? `${capture.side} @ ${capture.declared}: ${capture.rows} screens, ${capture.crops} crops, ${capture.deviceScaleFactor}x.`
          : `${capture.side}: ${capture.why}`
      )
    )
  }

  lines.push('', 'cited screens no capture visited')
  lines.push(
    result.missingRows.length === 0
      ? bullet('none — every cited screen has a manifest row.')
      : result.missingRows
          .map((row) =>
            bullet(
              `${row.side}/${row.screen} — cited by ${row.cited.join(', ')}`
            )
          )
          .join('\n')
  )

  lines.push('', 'crops the capture could not take')
  lines.push(
    result.unresolvedAnchors.length === 0
      ? bullet('none.')
      : result.unresolvedAnchors
          .map((entry) =>
            bullet(
              `${entry.side}/${entry.screen} ${entry.anchor}: ${entry.why}`
            )
          )
          .join('\n')
  )

  lines.push('', 'citations')
  lines.push(
    bullet(
      `${result.citations.resolved} of ${result.citations.total} resolved to a permalink.`
    )
  )
  if (result.citations.queued) {
    lines.push(bullet(`${result.citations.queued} still queued for a human.`))
  }
  if (result.citations.notPushed.length) {
    lines.push(
      bullet(
        `${result.citations.notPushed.length} point at commits that are not pushed, so their links 404 for anyone else.`
      )
    )
  }
  lines.push(
    bullet(
      `${result.citations.outOfRange.length} name an identifier that is in the file but outside the cited lines — widen the range.`
    )
  )
  lines.push(
    bullet(
      `${result.citations.missingFromFile.length} name an identifier that is not in the file at all — re-verify the finding, do not nudge the lines.`
    )
  )
  lines.push(
    bullet(
      `${result.citations.inSibling.length} name a string another citation of the same finding holds, ${result.citations.interpolated.length} a string the source builds at runtime, and ${result.citations.rendered.length} a string quoted off the rendered page. None of the three is a fault.`
    )
  )

  lines.push('', 'page models')
  for (const model of result.models) {
    lines.push(
      bullet(
        model.sha
          ? `${model.side} @ ${model.sha}${model.matchesPin ? ', which is the pin' : ', which is not the pin — see the capture note in corpora.json'}: ${model.how}.`
          : `${model.side}: no vintage recorded, so anyone arguing a finding from these cannot say which commit they are of.`
      )
    )
  }

  if (result.emptyModels.length) {
    lines.push(
      '',
      'screens with no control on one side and controls on the other'
    )
    for (const entry of result.emptyModels) {
      lines.push(
        bullet(
          `${entry.side}/${entry.screen} (${entry.h1 ?? 'no heading'}) renders nothing, against ${entry.partnerFields} controls on ${entry.partner}. The differ reads that as "this side has no fields here", which may be a fact about the journey rather than about the two codebases.`
        )
      )
    }
  }

  lines.push('', 'to regenerate')
  lines.push(...result.regenerate.map(bullet))

  return lines.join('\n')
}

/**
 * What makes this check fail rather than merely report.
 *
 * A moved pin and a missing capture invalidate the page. A citation whose
 * anchor has drifted does not: that is a finding to re-verify, and it is the
 * expected yield of pinning to HEAD rather than a fault in the pipeline.
 *
 * @param {object} result
 * @returns {string[]}
 */
export const blockers = (result) => {
  const out = []
  if (!result.evidencePresent) out.push('evidence.json is missing')
  for (const entry of result.pinDrift) {
    out.push(`${entry.repo} pin moved since the evidence was generated`)
  }
  for (const capture of result.captures.filter((c) => !c.ok)) {
    out.push(`${capture.side} capture: ${capture.why}`)
  }
  return out
}
