import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../backlog/io.js'
import {
  DISTIL_SCHEMA_FILES,
  areaFilesOf,
  extractPartPathOf,
  readJsonLenient
} from './files.js'
import { inspectSources, readPartition, readSources } from './checks.js'
import { problemsError, schemaProblems } from './problems.js'

const AREAS_LABEL = 'distil/areas.json'
const MISSED_ID = /^(.+)-m[1-9][0-9]*$/
const MAX_LISTED_IDS = 10

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const objectsIn = (list) => (Array.isArray(list) ? list.filter(isObject) : [])
const textsIn = (list) => (Array.isArray(list) ? list.filter(isText) : [])
const idsIn = (list) =>
  objectsIn(list)
    .map((item) => item.id)
    .filter(isText)

const listIds = (ids) =>
  ids.length > MAX_LISTED_IDS
    ? `${ids.slice(0, MAX_LISTED_IDS).join(', ')} and ${ids.length - MAX_LISTED_IDS} more`
    : ids.join(', ')

const duplicatesIn = (values) =>
  Object.entries(Object.groupBy(values, (value) => value))
    .filter(([, copies]) => copies.length > 1)
    .map(([value]) => value)

const countOf = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const heldIdsOf = (verify) =>
  new Set(
    objectsIn(verify?.verdicts)
      .filter((verdict) => verdict.holds === true)
      .map((verdict) => verdict.id)
  )

/**
 * One verified source as the area slicer sees it: its working-set claims
 * (held extract claims in extract order, then missed claims), where each
 * extract claim sits, and which extract part holds it.
 *
 * @param {object} entry - From `inspectSources`, verified
 * @param {object} context
 * @returns {object}
 */
const slicedSourceOf = (entry, { layout, schemas, rankOf }) => {
  const held = heldIdsOf(entry.verify)
  const extractIds = idsIn(entry.extract.claims)
  const indexOf = new Map(extractIds.map((id, index) => [id, index]))
  const partition = readPartition({ layout, schemas, source: entry.source })
  const partOf = new Map(
    (partition.exists && !partition.problems.length
      ? partition.value.parts
      : []
    ).flatMap((part) =>
      idsIn(
        readJsonLenient(extractPartPathOf(layout, entry.report.slug, part.part))
          .value?.claims
      ).map((id) => [id, part.part])
    )
  )
  const claims = [
    ...entry.extract.claims
      .filter((claim) => held.has(claim.id))
      .map((claim) => ({ ...claim, origin: 'extract' })),
    ...objectsIn(entry.verify.missed).map((claim) => ({
      ...claim,
      origin: 'missed'
    }))
  ]
  return {
    source: entry.source,
    slug: entry.report.slug,
    rank: rankOf(entry.source.id),
    partNumbers: new Set(
      partition.exists && !partition.problems.length
        ? partition.value.parts.map((part) => part.part)
        : []
    ),
    indexOf,
    claims,
    anchorOf: (claimId) => MISSED_ID.exec(claimId)?.[1] ?? claimId,
    partOf
  }
}

const sliceLabelOf = (area, index) =>
  `${AREAS_LABEL} ${area.id} slices[${index}]`

const sliceProblems = (area, slice, index, bySource) => {
  const label = sliceLabelOf(area, index)
  const sliced = bySource.get(slice.source)
  if (!sliced) {
    return [
      `${label} names ${slice.source}, which is not a verified source in sources.json.`
    ]
  }
  if (Array.isArray(slice.parts) && isText(slice.from)) {
    return [
      `${label} names both parts and a claim range. Give one slice for the parts and another for the range.`
    ]
  }
  if (Array.isArray(slice.parts)) {
    return slice.parts
      .filter((part) => !sliced.partNumbers.has(part))
      .map((part) =>
        sliced.partNumbers.size
          ? `${label} names part ${part} of ${slice.source}, whose partition has parts 1 to ${sliced.partNumbers.size}.`
          : `${label} names part ${part} of ${slice.source}, which has no partition: take a claim range or the whole source.`
      )
  }
  if (isText(slice.from) || isText(slice.to)) {
    const ends = [slice.from, slice.to].filter(isText)
    const unknown = ends.filter((id) => !sliced.indexOf.has(id))
    if (unknown.length) {
      return unknown.map(
        (id) =>
          `${label} starts or ends at ${id}, which is not a claim in ${slice.source}'s extract.`
      )
    }
    if (ends.length < 2) {
      return [`${label} needs both "from" and "to" for a claim range.`]
    }
    return sliced.indexOf.get(slice.from) > sliced.indexOf.get(slice.to)
      ? [
          `${label} runs from ${slice.from} back to ${slice.to}. Name the earlier claim in "from".`
        ]
      : []
  }
  return []
}

const sliceTakes = (slice, sliced) => {
  if (Array.isArray(slice.parts)) {
    const parts = new Set(slice.parts)
    return (claimId) => parts.has(sliced.partOf.get(sliced.anchorOf(claimId)))
  }
  if (isText(slice.from) && isText(slice.to)) {
    const first = sliced.indexOf.get(slice.from)
    const last = sliced.indexOf.get(slice.to)
    return (claimId) => {
      const index = sliced.indexOf.get(sliced.anchorOf(claimId))
      return index !== undefined && index >= first && index <= last
    }
  }
  return () => true
}

/**
 * Each area's claims, per source in precedence order: the slices' claims,
 * plus every claim of each `everyArea` source.
 *
 * @param {object} plan - The parsed areas.json, in shape
 * @param {Map<string, object>} bySource - Each verified source, sliced
 * @returns {Map<string, {source: object, everyArea: boolean, claims: object[]}[]>}
 */
const areaClaimsOf = (plan, bySource) => {
  const everyArea = new Set(textsIn(plan.everyArea))
  return new Map(
    plan.areas.map((area) => {
      const sliced = [...bySource.values()].sort(
        (left, right) => left.rank - right.rank
      )
      const perSource = sliced
        .map((source) => {
          if (everyArea.has(source.source.id)) {
            return { sliced: source, everyArea: true, claims: source.claims }
          }
          const takers = objectsIn(area.slices)
            .filter((slice) => slice.source === source.source.id)
            .map((slice) => sliceTakes(slice, source))
          return {
            sliced: source,
            everyArea: false,
            claims: source.claims.filter((claim) =>
              takers.some((takes) => takes(claim.id))
            )
          }
        })
        .filter((taken) => taken.claims.length)
      return [area.id, perSource]
    })
  )
}

const unassignedProblems = (plan, bySource, claimsByArea) => {
  const everyArea = new Set(textsIn(plan.everyArea))
  const assigned = new Set(
    [...claimsByArea.values()].flatMap((perSource) =>
      perSource.flatMap((taken) => taken.claims.map((claim) => claim.id))
    )
  )
  return [...bySource.values()]
    .filter((sliced) => !everyArea.has(sliced.source.id))
    .map((sliced) => ({
      sliced,
      left: sliced.claims
        .map((claim) => claim.id)
        .filter((id) => !assigned.has(id))
    }))
    .filter(({ left }) => left.length)
    .map(({ sliced, left }) => {
      const parts = [
        ...new Set(
          left
            .map((id) => sliced.partOf.get(sliced.anchorOf(id)))
            .filter(Boolean)
        )
      ]
      const where = parts.length
        ? ` They are in part${parts.length === 1 ? '' : 's'} ${parts.join(', ')}.`
        : ''
      return `${sliced.source.id} has ${countOf(left.length, 'claim')} in no area: ${listIds(left)}.${where} Give each to the area it speaks to, or name the source in everyArea.`
    })
}

const ownershipProblems = (plan, field, existingIds, noun) => {
  const owners = new Map()
  for (const area of plan.areas) {
    for (const id of textsIn(area[field])) {
      owners.set(id, [...(owners.get(id) ?? []), area.id])
    }
  }
  return [
    ...[...owners]
      .filter(([, areas]) => areas.length > 1)
      .map(
        ([id, areas]) =>
          `${AREAS_LABEL} gives ${id} to ${areas.join(' and ')}. Each existing ${noun} belongs to one area.`
      ),
    ...[...owners.keys()]
      .filter((id) => !existingIds.has(id))
      .map(
        (id) =>
          `${AREAS_LABEL} gives ${id} to ${owners.get(id).join(' and ')}, but distil/${field}.json has no ${id}.`
      ),
    ...[...existingIds]
      .filter((id) => !owners.has(id))
      .map(
        (id) =>
          `${id} is in distil/${field}.json, but ${AREAS_LABEL} gives it to no area. Give every existing ${noun} to the one area its claims speak to.`
      )
  ]
}

const existingIdsOf = (path, field) =>
  new Set(idsIn(readJsonLenient(path).value?.[field]))

/**
 * Read areas.json and everything an area check needs, and judge it.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @returns {{plan: object|null, bySource: Map<string, object>, claimsByArea: Map<string, object[]>, existing: {requirements: Set<string>, conflicts: Set<string>}, problems: string[]}}
 * @throws {TimError} NOT_FOUND when areas.json does not exist, PARSE when it is not JSON
 */
export const inspectAreas = ({ layout, schemas, workarea }) => {
  const read = readJsonLenient(layout.areas)
  if (!read.exists) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${layout.areas}. The area-plan step writes it, before any area is reconciled.`
    )
  }
  if (read.error) throw new TimError('PARSE', `${AREAS_LABEL} ${read.error}`)
  const plan = read.value
  const shapeProblems = schemaProblems({
    label: AREAS_LABEL,
    value: plan,
    schema: schemas.areas,
    schemaName: DISTIL_SCHEMA_FILES.areas
  })
  const sources = readSources(layout, schemas.sources)
  const rankOf = (id) => sources.precedence.indexOf(id) + 1
  const bySource = new Map(
    inspectSources({ layout, schemas, sources, workarea })
      .filter((entry) => entry.report.state === 'verified')
      .map((entry) => [
        entry.source.id,
        slicedSourceOf(entry, { layout, schemas, rankOf })
      ])
  )
  const existing = {
    requirements: existingIdsOf(layout.requirements, 'requirements'),
    conflicts: existingIdsOf(layout.conflicts, 'conflicts')
  }
  if (shapeProblems.length) {
    return {
      plan: null,
      bySource,
      claimsByArea: new Map(),
      existing,
      problems: shapeProblems
    }
  }
  const claimsByArea = areaClaimsOf(plan, bySource)
  const problems = [
    ...duplicatesIn(plan.areas.map((area) => area.id)).map(
      (id) => `${AREAS_LABEL} has the area ${id} more than once.`
    ),
    ...textsIn(plan.everyArea)
      .filter((id) => !bySource.has(id))
      .map(
        (id) =>
          `${AREAS_LABEL} everyArea names ${id}, which is not a verified source in sources.json.`
      ),
    ...plan.areas.flatMap((area) =>
      area.slices.flatMap((slice, index) =>
        sliceProblems(area, slice, index, bySource)
      )
    ),
    ...plan.areas
      .filter((area) => !claimsByArea.get(area.id).length)
      .map(
        (area) =>
          `${AREAS_LABEL} area ${area.id} takes no claim. Give it the slices that speak to it, or drop it.`
      ),
    ...unassignedProblems(plan, bySource, claimsByArea),
    ...ownershipProblems(
      plan,
      'requirements',
      existing.requirements,
      'requirement'
    ),
    ...ownershipProblems(plan, 'conflicts', existing.conflicts, 'conflict')
  ]
  return { plan, bySource, claimsByArea, existing, problems }
}

const areaCountsOf = (area, perSource) => ({
  id: area.id,
  title: area.title,
  claims: perSource.reduce((total, taken) => total + taken.claims.length, 0),
  sources: perSource.map((taken) => ({
    id: taken.sliced.source.id,
    claims: taken.claims.length,
    everyArea: taken.everyArea
  })),
  requirements: area.requirements,
  conflicts: area.conflicts
})

const refuseProblems = (problems, layout) => {
  if (problems.length) {
    throw problemsError([...new Set(problems)], `in ${layout.dir}`)
  }
}

/**
 * Check areas.json against its schema, the verified sources and the
 * existing requirements and conflicts, and count each area's claims.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @returns {{path: string, areas: object[], everyArea: string[], total: number}}
 * @throws {TimError} NOT_FOUND, PARSE, or LINT with every problem
 */
export const checkAreas = ({ layout, schemas, workarea }) => {
  const inspected = inspectAreas({ layout, schemas, workarea })
  refuseProblems(inspected.problems, layout)
  const areas = inspected.plan.areas.map((area) =>
    areaCountsOf(area, inspected.claimsByArea.get(area.id))
  )
  return {
    path: layout.areas,
    areas,
    everyArea: inspected.plan.everyArea,
    total: areas.reduce((total, area) => total + area.claims, 0)
  }
}

const workingSetFileOf = (area, perSource) => ({
  area: { id: area.id, title: area.title, scope: area.scope },
  owns: { requirements: area.requirements, conflicts: area.conflicts },
  total: perSource.reduce((total, taken) => total + taken.claims.length, 0),
  sources: perSource.map((taken) => ({
    id: taken.sliced.source.id,
    kind: taken.sliced.source.kind,
    role: taken.sliced.source.role,
    rank: taken.sliced.rank,
    slug: taken.sliced.slug,
    everyArea: taken.everyArea,
    claims: taken.claims
  }))
})

const removeIfThere = (path) => {
  if (!existsSync(path)) return []
  rmSync(path, { recursive: true, force: true })
  return [path]
}

const staleAreaFilesOf = (layout, areaIds) => {
  const known = new Set(areaIds)
  const folders = existsSync(layout.areasDir)
    ? readdirSync(layout.areasDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    : []
  return [
    ...folders
      .filter((name) => !known.has(name))
      .map((name) => join(layout.areasDir, name)),
    ...areaIds.flatMap((id) => {
      const files = areaFilesOf(layout, id)
      return [files.reconciled, files.rows]
    }),
    layout.areaIdMap,
    layout.challengeDir
  ]
}

/**
 * Start a reconcile: check areas.json, write each area's working set to
 * distil/areas/<area id>/working-set.json, and remove what an earlier
 * reconcile left (each area's reconciled and draft-row files, the folders of
 * areas no longer planned, the merge's id map and the challenge verdicts), so
 * nothing from an earlier run is merged or enforced.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @returns {{path: string, areas: object[], everyArea: string[], total: number, written: string[], removed: string[]}}
 * @throws {TimError} NOT_FOUND, PARSE, or LINT with every problem
 */
export const writeAreaWorkingSets = ({ layout, schemas, workarea }) => {
  const inspected = inspectAreas({ layout, schemas, workarea })
  refuseProblems(inspected.problems, layout)
  const { plan, claimsByArea } = inspected
  const removed = staleAreaFilesOf(
    layout,
    plan.areas.map((area) => area.id)
  ).flatMap(removeIfThere)
  const written = plan.areas.map((area) => {
    const path = areaFilesOf(layout, area.id).workingSet
    writeJsonAtomic(path, workingSetFileOf(area, claimsByArea.get(area.id)))
    return path
  })
  const areas = plan.areas.map((area) =>
    areaCountsOf(area, claimsByArea.get(area.id))
  )
  return {
    path: layout.areas,
    areas,
    everyArea: plan.everyArea,
    total: areas.reduce((total, area) => total + area.claims, 0),
    written,
    removed
  }
}

const requirementAreasOf = (layout, plan) => {
  const map = readJsonLenient(layout.areaIdMap).value
  const fromMap = isObject(map?.requirements)
    ? Object.entries(map.requirements).map(([id, entry]) => [id, entry?.area])
    : []
  const fromPlan = plan.areas.flatMap((area) =>
    textsIn(area.requirements).map((id) => [id, area.id])
  )
  return new Map([...fromPlan, ...fromMap].filter(([, area]) => isText(area)))
}

const isToBuild = (requirement) =>
  requirement.status === 'adopted' && requirement.delta !== 'exists'

/**
 * One area as the consolidate step needs it: its counts, and the
 * requirements now in requirements.json that came from it, those still to
 * build named apart. Requirements no area holds, such as one the cross-area
 * pass wrote, are listed under `unassigned` when no area is named.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {string} [args.areaId] - One area; every area when left out
 * @returns {{areas: object[], unassigned?: string[]}}
 * @throws {TimError} NOT_FOUND for an unknown area, or as `checkAreas`
 */
export const areaRequirements = ({ layout, schemas, workarea, areaId }) => {
  const checked = checkAreas({ layout, schemas, workarea })
  const plan = readJsonLenient(layout.areas).value
  if (areaId && !checked.areas.some((area) => area.id === areaId)) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find the area ${areaId} in ${layout.areas}. Its areas are ${checked.areas.map((area) => area.id).join(', ')}.`
    )
  }
  const areaOf = requirementAreasOf(layout, plan)
  const requirements = objectsIn(
    readJsonLenient(layout.requirements).value?.requirements
  ).filter((requirement) => isText(requirement.id))
  const ofArea = (id) =>
    requirements.filter((requirement) => areaOf.get(requirement.id) === id)
  const chosen = checked.areas.filter((area) => !areaId || area.id === areaId)
  return {
    areas: chosen.map((area) => ({
      ...area,
      reconciled: ofArea(area.id).map((requirement) => requirement.id),
      toBuild: ofArea(area.id)
        .filter(isToBuild)
        .map((requirement) => requirement.id)
    })),
    ...(areaId
      ? {}
      : {
          unassigned: requirements
            .filter((requirement) => !areaOf.has(requirement.id))
            .map((requirement) => requirement.id)
        })
  }
}

/**
 * Every claim id in one area's working set, as written by
 * `writeAreaWorkingSets`.
 *
 * @param {object} layout - From `distilLayout`
 * @param {string} areaId
 * @returns {Set<string>|null} Null when the area has no working set yet
 */
export const areaClaimIdsOf = (layout, areaId) => {
  const read = readJsonLenient(areaFilesOf(layout, areaId).workingSet)
  if (!read.exists || read.error) return null
  return new Set(
    objectsIn(read.value?.sources).flatMap((source) => idsIn(source.claims))
  )
}
