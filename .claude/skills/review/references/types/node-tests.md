## Node test specifics

- No spy assertions (`toHaveBeenCalled`, `toHaveBeenCalledWith`,
  `toHaveBeenCalledTimes`) unless the call is itself the external side
  effect, and then assert the captured payload.
- No `vi.mock()` of the repo's own modules. Fake the network with
  `vitest-fetch-mock` (or `nock` in `tim/`).
- Handler tests use `driveHandler` and the stub adapters from the shared
  test support, not a local copy of their set-up.
- `expect.objectContaining` with the fields that matter, not
  `expect.any(Object)`. Assert an error's contract, not just that
  something threw.
