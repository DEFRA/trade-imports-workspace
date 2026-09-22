const VALID_CODES = new Set([
  'AUTH',
  'NOT_FOUND',
  'RATE_LIMIT',
  'NETWORK',
  'PARSE',
  'USAGE',
  'MISSING_DEP',
  'USER_ABORT',
  'PARTIAL_FAILURE',
  'LINT',
  'UNKNOWN',
  'LOST_UPDATE',
  'LOCKED',
  'DIRTY_TREE'
])

export class TimError extends Error {
  constructor(code, message, cause) {
    if (!VALID_CODES.has(code)) {
      throw new Error(`TimError code "${code}" is not in the allowed set`)
    }
    super(message)
    this.name = 'TimError'
    this.code = code
    if (cause !== undefined) this.cause = cause
  }
}

export const isTimError = (error) => error instanceof TimError
