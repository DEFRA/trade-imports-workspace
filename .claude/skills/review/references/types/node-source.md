## Node source specifics

- Feature folders: production controllers under
  `sets/*/journeys/*/features/*` are independent by design. Near-identical
  `get`, `post` and `render` bodies across feature controllers are not a
  duplication finding, and the fix is never a shared controller. This
  covers production controllers only, never test support.
- Logging: pino with `{ err }` and the ids in the object, and a static
  message. `request.logger` inside a handler.
- No empty catch: `.catch(() => undefined)` hides the failure it swallows.
- JSDoc only on an exported public API, and only its contract.
