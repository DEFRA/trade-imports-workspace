import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../backlog/io.js'
import { DISTIL_SCHEMA_FILES, areaFilesOf, readJsonLenient } from './files.js'
import { areaClaimIdsOf, inspectAreas } from './areas.js'
import { problemsError, schemaProblems } from './problems.js'

const EXISTING_REQUIREMENT = /^req-([0-9]{3,})$/
const EXISTING_CONFLICT = /^c-([0-9]{3,})$/
const NEW_REQUIREMENT = /^req-([a-z0-9]+(?:-[a-z0-9]+)*)-([0-9]{3,})$/
const NEW_CONFLICT = /^c-([a-z0-9]+(?:-[a-z0-9]+)*)-([0-9]{3,})$/
const AREA_REQUIREMENT_ID = '^req-([0-9]{3,}|[a-z0-9]+(-[a-z0-9]+)*-[0-9]{3,})$'
const AREA_CONFLICT_ID = '^c-([0-9]{3,}|[a-z0-9]+(-[a-z0-9]+)*-[0-9]{3,})$'
const ID_DIGITS = 3

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const objectsIn = (list) => (Array.isArray(list) ? list.filter(isObject) : [])
const textsIn = (list) => (Array.isArray(list) ? list.filter(isText) : [])
const idsIn = (list) =>
  objectsIn(list)
    .map((item) => item.id)
    .filter(isText)

const duplicatesIn = (values) =>
  Object.entries(Object.groupBy(values, (value) => value))
    .filter(([, copies]) => copies.length > 1)
    .map(([value]) => value)

const labelOf = (areaId) => `distil/areas/${areaId}/reconciled.json`

/**
 * The requirements or conflicts schema with only the id pattern widened, so
 * an area's items are held to the one definition of each field, and its new
 * ids (req-<area>-NNN, c-<area>-NNN) still pass.
 *
 * @param {object} schema
 * @param {string} definition - `requirement` or `conflict`
 * @param {string} pattern
 * @returns {object}
 */
const withAreaIds = (schema, definition, pattern) => {
  const widened = structuredClone(schema)
  widened.$defs[definition].properties.id.pattern = pattern
  return widened
}

const widenedSchemasCache = new WeakMap()

const widenedSchemasOf = (schemas) => {
  const cached = widenedSchemasCache.get(schemas)
  if (cached) return cached
  const widened = {
    requirements: withAreaIds(
      schemas.requirements,
      'requirement',
      AREA_REQUIREMENT_ID
    ),
    conflicts: withAreaIds(schemas.conflicts, 'conflict', AREA_CONFLICT_ID)
  }
  widenedSchemasCache.set(schemas, widened)
  return widened
}

const shapeProblems = (label, value, schemas) => {
  const widened = widenedSchemasOf(schemas)
  const envelope = schemaProblems({
    label,
    value,
    schema: schemas.reconcilePart,
    schemaName: DISTIL_SCHEMA_FILES.reconcilePart
  })
  if (envelope.length) return envelope
  return [
    ...schemaProblems({
      label,
      value: { requirements: value.requirements },
      schema: widened.requirements,
      schemaName: DISTIL_SCHEMA_FILES.requirements
    }),
    ...schemaProblems({
      label,
      value: { conflicts: value.conflicts },
      schema: widened.conflicts,
      schemaName: DISTIL_SCHEMA_FILES.conflicts
    })
  ]
}

const idRuleProblems = ({
  label,
  area,
  ids,
  owned,
  existingPattern,
  newPattern,
  noun
}) =>
  ids.flatMap((id) => {
    if (existingPattern.test(id)) {
      return owned.has(id)
        ? []
        : [
            `${label} has ${id}, which distil/areas.json does not give to ${area.id}. Keep only the existing ${noun}s this area owns; give a new one the id ${newPattern === NEW_REQUIREMENT ? 'req' : 'c'}-${area.id}-NNN.`
          ]
    }
    const match = newPattern.exec(id)
    return match && match[1] === area.id
      ? []
      : [
          `${label} has ${id}. A new ${noun} in this area is ${newPattern === NEW_REQUIREMENT ? 'req' : 'c'}-${area.id}-NNN.`
        ]
  })

const missingOwnedProblems = (label, owned, ids, noun) =>
  [...owned]
    .filter((id) => !ids.includes(id))
    .map(
      (id) =>
        `${label} leaves out ${id}, which distil/areas.json gives this area. Keep every existing ${noun}: one nothing supports any more becomes out-of-scope, with why saying what changed.`
    )

const citationProblems = ({ label, value, claimIds, knownConflicts }) => {
  const ownConflicts = new Set(idsIn(value.conflicts))
  const claimProblem = (citer, claimId) =>
    claimIds.has(claimId)
      ? []
      : [
          `${label} ${citer} cites ${claimId}, which is not in this area's working set. Cite only claims the area's working set holds.`
        ]
  return [
    ...objectsIn(value.requirements).flatMap((requirement) => [
      ...textsIn(requirement.claims).flatMap((claimId) =>
        claimProblem(requirement.id, claimId)
      ),
      ...textsIn(requirement.conflicts)
        .filter(
          (conflictId) =>
            !ownConflicts.has(conflictId) && !knownConflicts.has(conflictId)
        )
        .map(
          (conflictId) =>
            `${label} ${requirement.id} cites ${conflictId}, which is neither in this file nor in distil/conflicts.json.`
        )
    ]),
    ...objectsIn(value.conflicts).flatMap((conflict) =>
      objectsIn(conflict.positions)
        .map((position) => position.claim)
        .filter(isText)
        .flatMap((claimId) => claimProblem(`${conflict.id} position`, claimId))
    )
  ]
}

/**
 * Read one area's reconciled file and judge it on its own: its shape, its
 * ids, that it keeps every existing id the area owns, and that every claim
 * and conflict it cites can be found.
 *
 * @param {object} args
 * @param {object} args.layout
 * @param {object} args.schemas
 * @param {object} args.area - The area from areas.json
 * @param {Set<string>} args.knownConflicts - The conflict ids already in conflicts.json
 * @returns {{area: object, value?: object, problems: string[]}}
 */
const readAreaPart = ({ layout, schemas, area, knownConflicts }) => {
  const label = labelOf(area.id)
  const read = readJsonLenient(areaFilesOf(layout, area.id).reconciled)
  if (!read.exists) {
    return {
      area,
      problems: [
        `${label} does not exist yet: area ${area.id} (${area.title}) has no reconcile.`
      ]
    }
  }
  if (read.error) return { area, problems: [`${label} ${read.error}`] }
  const value = read.value
  const shape = shapeProblems(label, value, schemas)
  if (shape.length) return { area, value, problems: shape }
  const claimIds = areaClaimIdsOf(layout, area.id)
  const requirementIds = idsIn(value.requirements)
  const conflictIds = idsIn(value.conflicts)
  return {
    area,
    value,
    problems: [
      ...(value.area === area.id
        ? []
        : [
            `${label} says it is area ${JSON.stringify(value.area)}, not ${area.id}.`
          ]),
      ...duplicatesIn([...requirementIds, ...conflictIds]).map(
        (id) => `${label} has ${id} more than once.`
      ),
      ...idRuleProblems({
        label,
        area,
        ids: requirementIds,
        owned: new Set(area.requirements),
        existingPattern: EXISTING_REQUIREMENT,
        newPattern: NEW_REQUIREMENT,
        noun: 'requirement'
      }),
      ...idRuleProblems({
        label,
        area,
        ids: conflictIds,
        owned: new Set(area.conflicts),
        existingPattern: EXISTING_CONFLICT,
        newPattern: NEW_CONFLICT,
        noun: 'conflict'
      }),
      ...missingOwnedProblems(
        label,
        new Set(area.requirements),
        requirementIds,
        'requirement'
      ),
      ...missingOwnedProblems(
        label,
        new Set(area.conflicts),
        conflictIds,
        'conflict'
      ),
      ...(claimIds
        ? citationProblems({ label, value, claimIds, knownConflicts })
        : [
            `distil/areas/${area.id}/working-set.json does not exist yet. Write every area's working set first: tim distil areas --write.`
          ])
    ]
  }
}

const numberOf = (id, pattern) => Number(pattern.exec(id)?.[1] ?? 0)

const formatId = (prefix, number) =>
  `${prefix}-${String(number).padStart(ID_DIGITS, '0')}`

/**
 * The final id of every new requirement or conflict, numbered on from the
 * highest existing one, area by area in areas.json order, then in file order.
 *
 * @param {string[]} existing - Every existing id, in or out of the area files
 * @param {{area: string, id: string}[]} newOnes
 * @param {string} prefix - `req` or `c`
 * @param {RegExp} pattern - The existing-id pattern, its number in group 1
 * @returns {Map<string, string>}
 */
const numberNewIds = (existing, newOnes, prefix, pattern) => {
  const highest = Math.max(0, ...existing.map((id) => numberOf(id, pattern)))
  return new Map(
    newOnes.map(({ id }, index) => [id, formatId(prefix, highest + index + 1)])
  )
}

const byNumber = (pattern) => (left, right) =>
  numberOf(left.id, pattern) - numberOf(right.id, pattern)

const renamedConflictsOf = (requirement, conflictIds) => ({
  ...requirement,
  conflicts: textsIn(requirement.conflicts).map(
    (id) => conflictIds.get(id) ?? id
  )
})

const mergeAreaParts = (parts, existing) => {
  const items = (field) =>
    parts.flatMap(({ area, value }) =>
      objectsIn(value[field]).map((item) => ({ area: area.id, item }))
    )
  const requirements = items('requirements')
  const conflicts = items('conflicts')
  const isNew = (pattern) => (entry) => !pattern.test(entry.item.id)
  const requirementIds = numberNewIds(
    [...existing.requirements, ...requirements.map((entry) => entry.item.id)],
    requirements
      .filter(isNew(EXISTING_REQUIREMENT))
      .map((entry) => ({ area: entry.area, id: entry.item.id })),
    'req',
    EXISTING_REQUIREMENT
  )
  const conflictIds = numberNewIds(
    [...existing.conflicts, ...conflicts.map((entry) => entry.item.id)],
    conflicts
      .filter(isNew(EXISTING_CONFLICT))
      .map((entry) => ({ area: entry.area, id: entry.item.id })),
    'c',
    EXISTING_CONFLICT
  )
  const finalOf = (ids, id) => ids.get(id) ?? id
  const mapEntry = (ids) => (entry) => [
    finalOf(ids, entry.item.id),
    {
      area: entry.area,
      ...(ids.has(entry.item.id) ? { was: entry.item.id } : {})
    }
  ]
  return {
    requirements: requirements
      .map(({ item }) =>
        renamedConflictsOf(
          { ...item, id: finalOf(requirementIds, item.id) },
          conflictIds
        )
      )
      .sort(byNumber(EXISTING_REQUIREMENT)),
    conflicts: conflicts
      .map(({ item }) => ({ ...item, id: finalOf(conflictIds, item.id) }))
      .sort(byNumber(EXISTING_CONFLICT)),
    idMap: {
      requirements: Object.fromEntries(
        requirements.map(mapEntry(requirementIds))
      ),
      conflicts: Object.fromEntries(conflicts.map(mapEntry(conflictIds)))
    },
    renumbered: requirementIds.size + conflictIds.size
  }
}

const areaCounts = ({ area, value }) => {
  const requirements = idsIn(value.requirements)
  const conflicts = idsIn(value.conflicts)
  return {
    id: area.id,
    requirements: requirements.length,
    newRequirements: requirements.filter((id) => !EXISTING_REQUIREMENT.test(id))
      .length,
    conflicts: conflicts.length,
    newConflicts: conflicts.filter((id) => !EXISTING_CONFLICT.test(id)).length
  }
}

/**
 * Join every area's reconciled file into requirements.json and conflicts.json.
 * Existing ids stay as they are. Each new id (req-<area>-NNN, c-<area>-NNN)
 * takes the next free number, area by area, and every requirement's cited
 * conflicts follow. distil/areas/id-map.json records which area each final
 * id came from, and what a new one was called in its area's file. Writes
 * nothing unless areas.json and every area's file are in shape.
 *
 * With `areaId`, checks that one area's file only and writes nothing: the
 * check an area's reconciler runs on its own work.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {string} [args.areaId]
 * @returns {{areas: object[], requirements?: number, conflicts?: number, renumbered?: number, idMap?: string}}
 * @throws {TimError} NOT_FOUND for an unknown area or no areas.json, LINT with every problem
 */
export const mergeReconcile = ({ layout, schemas, workarea, areaId }) => {
  const inspected = inspectAreas({ layout, schemas, workarea })
  if (inspected.problems.length) {
    throw problemsError(
      [...new Set(inspected.problems)],
      `in ${layout.dir}: distil/areas.json is out of shape, so no area can be merged`
    )
  }
  const chosen = inspected.plan.areas.filter(
    (area) => !areaId || area.id === areaId
  )
  if (!chosen.length) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find the area ${areaId} in ${layout.areas}. Its areas are ${inspected.plan.areas.map((area) => area.id).join(', ')}.`
    )
  }
  const parts = chosen.map((area) =>
    readAreaPart({
      layout,
      schemas,
      area,
      knownConflicts: inspected.existing.conflicts
    })
  )
  const problems = parts.flatMap((part) => part.problems)
  if (problems.length) {
    throw problemsError(
      [...new Set(problems)],
      `in ${layout.dir}. Nothing was written`
    )
  }
  if (areaId) return { areas: parts.map(areaCounts) }
  const merged = mergeAreaParts(parts, {
    requirements: [...inspected.existing.requirements],
    conflicts: [...inspected.existing.conflicts]
  })
  writeJsonAtomic(layout.requirements, { requirements: merged.requirements })
  writeJsonAtomic(layout.conflicts, { conflicts: merged.conflicts })
  writeJsonAtomic(layout.areaIdMap, merged.idMap)
  return {
    areas: parts.map(areaCounts),
    requirements: merged.requirements.length,
    conflicts: merged.conflicts.length,
    renumbered: merged.renumbered,
    idMap: layout.areaIdMap
  }
}
