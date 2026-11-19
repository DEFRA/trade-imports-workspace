import { writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'

const loaded = []

registerHooks({
  resolve: (specifier, context, nextResolve) => {
    const resolved = nextResolve(specifier, context)
    loaded.push(resolved.url)
    return resolved
  }
})

process.on('exit', () =>
  writeFileSync(process.env.MODULE_LOAD_PROBE_FILE, JSON.stringify(loaded))
)
