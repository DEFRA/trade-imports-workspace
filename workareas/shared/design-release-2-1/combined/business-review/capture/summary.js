const L = require('./lib')
const m = L.readManifest()
const ok = m.filter((e) => e.ok)
console.log(`${SIDE_NAME()}: ${ok.length} ok of ${m.length} recorded`)
for (const e of m.filter((x) => !x.ok)) console.log(`FAIL ${e.key}: ${(e.error || '').slice(0, 230)}`)

function SIDE_NAME() {
  return L.SIDE
}
