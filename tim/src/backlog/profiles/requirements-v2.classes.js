const PLAN_HOME = 'build/plans/<id>.md'
const RUN_CONFIG_HOME = 'build/run.json'
const STATE_HOME = 'build/state.json'
const REGISTRY_HOME = 'tools/backlog/registry.json'

const recipeMessage = (field) => {
  if (field === 'filesToTouch') {
    return `"filesToTouch" is a recipe field. The plan owns files: ${PLAN_HOME}.`
  }
  if (field === 'verification') {
    return `"verification" is a recipe field. The plan owns how a change is verified: ${PLAN_HOME}.`
  }
  return `"${field}" is a recipe field. The plan owns it: ${PLAN_HOME}.`
}

const executorMessage = (field) =>
  `"${field}" is an executor field. The run configuration owns it: ${RUN_CONFIG_HOME}.`

const runStateMessage = (field) =>
  `"${field}" is a run-state field. Run state owns it: ${STATE_HOME}.`

const repoHowMessage = (field) =>
  `"${field}" is a repo field. The registry entry owns it: ${REGISTRY_HOME}.`

const LAYER_MESSAGE =
  '"repo" is a layer field. "surface.repos", derived from the behaviour, replaces it.'

/** DESIGN 3.14's "recipe" family: how, never what or why. */
export const RECIPE_FIELDS = [
  'filesToTouch',
  'verification',
  'recipe',
  'implementorSkill',
  'obligations',
  'flowChanges',
  'schemaFields',
  'copyKeys',
  'specs',
  'exemplars',
  'hints',
  'reference',
  'type',
  'band',
  'sizeGuess',
  'targetTree',
  'plan'
]

/** DESIGN 3.14's "executor" family: who builds, never what or why. */
export const EXECUTOR_FIELDS = [
  'executor',
  'model',
  'models',
  'tier',
  'brief',
  'outputSchema',
  'sandbox',
  'reviewCap',
  'ciFixAttempts'
]

/** DESIGN 3.14's "run-state" family: belongs to build/state.json, not the backlog. */
export const RUN_STATE_FIELDS = [
  'ticket',
  'branch',
  'commit',
  'commits',
  'prs',
  'notes',
  'openQuestions',
  'gate',
  'failure_reason',
  'crossRepoE2e',
  'integrationProofSource'
]

/** DESIGN 3.14's "repo how-fields" family: belongs to the registry entry. */
export const REPO_HOW_FIELDS = ['github', 'ladder', 'knowledge', 'generated']

/** DESIGN 3.14's "layer" family: the loop's frontend|backend|tests|both, replaced by surface.repos. */
export const LAYER_FIELDS = ['repo']

/**
 * Every field DESIGN section 3.14 lists as "absent by design, and refused
 * by name", mapped to a sentence naming its home. Refused on an authored
 * file and on a written row alike.
 */
export const REFUSED_FIELDS = {
  ...Object.fromEntries(
    RECIPE_FIELDS.map((field) => [field, recipeMessage(field)])
  ),
  ...Object.fromEntries(
    EXECUTOR_FIELDS.map((field) => [field, executorMessage(field)])
  ),
  ...Object.fromEntries(
    RUN_STATE_FIELDS.map((field) => [field, runStateMessage(field)])
  ),
  ...Object.fromEntries(
    REPO_HOW_FIELDS.map((field) => [field, repoHowMessage(field)])
  ),
  repo: LAYER_MESSAGE
}

/**
 * DESIGN section 3.4's requirement atom fields, each classed `requirement`,
 * `meta` or `state`. `persisted: true` means this increment's writer
 * (`requirements-v2.js`) actually puts the field on a row; `persisted:
 * false` names the later command that will.
 */
export const ATOM_FIELDS = {
  id: { class: 'meta', persisted: true },
  key: { class: 'meta', persisted: true },
  slice: { class: 'meta', persisted: true },
  kind: { class: 'requirement', persisted: true },
  title: { class: 'requirement', persisted: true },
  statement: { class: 'requirement', persisted: true },
  why: { class: 'requirement', persisted: true },
  actor: { class: 'requirement', persisted: false, owner: 'author (inc-032)' },
  acceptance: { class: 'requirement', persisted: true },
  falsifiedBy: { class: 'requirement', persisted: true },
  sources: { class: 'requirement', persisted: true },
  confidence: {
    class: 'meta',
    persisted: false,
    owner: 'ingest, derived (inc-032)'
  },
  surface: { class: 'requirement', persisted: true },
  consistentWith: {
    class: 'requirement',
    persisted: false,
    owner: 'author, reconcile (inc-032)'
  },
  constraints: {
    class: 'requirement',
    persisted: false,
    owner: 'reconcile (inc-032)'
  },
  outOfScope: {
    class: 'requirement',
    persisted: false,
    owner: 'author (inc-032)'
  },
  needs: { class: 'requirement', persisted: true },
  assumptions: {
    class: 'requirement',
    persisted: false,
    owner: 'reconcile, rule (inc-033, inc-009)'
  },
  decisions: {
    class: 'requirement',
    persisted: false,
    owner: 'reconcile, rule (inc-033, inc-009)'
  },
  conflicts: {
    class: 'requirement',
    persisted: false,
    owner: 'reconcile, rule (inc-033, inc-009)'
  },
  dependsOn: { class: 'meta', persisted: true },
  edgeChecks: {
    class: 'meta',
    persisted: false,
    owner: 'REQUIREMENT_VERIFIER (inc-032)'
  },
  relatedTo: { class: 'meta', persisted: true },
  specRefs: {
    class: 'requirement',
    persisted: false,
    owner: 'author (inc-032)'
  },
  variantOf: {
    class: 'meta',
    persisted: false,
    owner: 'reconcile, panel, question editor (inc-033)'
  },
  status: { class: 'state', persisted: true },
  supersededBy: {
    class: 'meta',
    persisted: false,
    owner: 'dedupe, rule (inc-009)'
  },
  carriedFrom: {
    class: 'meta',
    persisted: false,
    owner: 'carryover, migrate, reslice (inc-040)'
  },
  provenance: { class: 'meta', persisted: true }
}

/**
 * DESIGN section 3.5's increment fields, each classed the same way. A solo
 * increment writes every `persisted: true` field except `title` and
 * `outcome`, which are rendered from its member at read time (C-062).
 */
export const INCREMENT_FIELDS = {
  id: { class: 'meta', persisted: true },
  key: { class: 'meta', persisted: true },
  title: { class: 'requirement', persisted: true },
  outcome: { class: 'requirement', persisted: true },
  why: { class: 'requirement', persisted: true },
  members: { class: 'requirement', persisted: true },
  class: { class: 'meta', persisted: true },
  surface: { class: 'meta', persisted: true },
  milestone: { class: 'meta', persisted: true },
  dependsOn: { class: 'meta', persisted: true },
  edgeChecks: {
    class: 'meta',
    persisted: false,
    owner: 'COMBINE_VERIFIER (inc-011)'
  },
  sequence: { class: 'meta', persisted: true },
  needs: { class: 'state', persisted: true },
  checkpoint: { class: 'meta', persisted: true },
  size: { class: 'meta', persisted: true },
  combination: { class: 'meta', persisted: true },
  status: { class: 'state', persisted: true },
  doneBy: { class: 'state', persisted: true },
  statusNote: { class: 'state', persisted: true },
  supersededBy: { class: 'meta', persisted: false, owner: 'ingest (inc-036)' }
}
