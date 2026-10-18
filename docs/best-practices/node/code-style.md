# JavaScript / TypeScript — Code Style

Project baseline: Node >= 24, ESM modules throughout. These conventions apply across all Node.js repos in this workspace.

The house rules in `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` apply on top of these 16 rules and win where they differ.

---

## 1. Do one thing

Every function should have a single, clear responsibility. If you find yourself writing "and" when describing what a function does, split it.

```js
// bad — fetches AND transforms AND validates
const processUserData = async (id) => {
  const response = await fetch(`/users/${id}`)
  const data = await response.json()
  if (!data.name) throw new Error('missing name')
  return { ...data, name: data.name.trim().toLowerCase() }
}

// good — each step is its own concern
const fetchUser = (id) => fetch(`/users/${id}`).then((res) => res.json())
const normaliseUser = (user) => ({ ...user, name: user.name.trim().toLowerCase() })
const validateUser = (user) => {
  if (!user.name) throw new Error('missing name')
  return user
}

const processUser = async (id) => fetchUser(id).then(validateUser).then(normaliseUser)
```

---

## 2. Prefer fat-arrow functions

Use fat arrows for all functions that are not class methods or top-level named exports requiring hoisting.

```js
// bad
function double(value) {
  return value * 2
}

// good
const double = (value) => value * 2
```

Single-expression bodies should drop the braces and `return`:

```js
// bad
const isActive = (user) => {
  return user.status === 'active'
}

// good
const isActive = (user) => user.status === 'active'
```

---

## 3. Drop unnecessary braces and returns

Braces and explicit `return` add noise. Remove them when the body is a single expression.

```js
// array methods — no braces needed
const names = users.map((user) => user.name)
const admins = users.filter((user) => user.role === 'admin')
const total = orders.reduce((sum, order) => sum + order.amount, 0)

// chained pipelines read left-to-right without clutter
const adminNames = users
  .filter((user) => user.role === 'admin')
  .map((user) => user.name)
  .sort()
```

Exception: multi-step logic that would be unreadable on one line should stay in a block — clarity beats brevity.

---

## 4. Prefer functional style

Reach for `map`, `filter`, `reduce`, `find`, and `flatMap` over imperative loops. Avoid mutating arrays or objects in place.

```js
// bad — mutation, imperative loop
const result = []
for (const item of items) {
  if (item.active) {
    result.push(item.id)
  }
}

// good
const result = items.filter((item) => item.active).map((item) => item.id)
```

Use spread and object rest to produce new values rather than mutating:

```js
// bad
user.name = 'Alice'

// good
const updatedUser = { ...user, name: 'Alice' }
```

---

## 5. Small, composed functions over large blocks

Break logic into small named functions and compose them. Named functions act as inline documentation — a well-named helper removes the need for a comment.

```js
// bad — one large function doing everything
const buildEmailPayload = (order) => {
  const items = order.lines
    .filter((line) => line.quantity > 0)
    .map((line) => `${line.name} x${line.quantity}`)
  const total = order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const greeting = order.customer.preferredName ?? order.customer.firstName
  return {
    to: order.customer.email,
    subject: `Order ${order.ref} confirmed`,
    body: `Hi ${greeting},\n\n${items.join('\n')}\n\nTotal: £${total.toFixed(2)}`
  }
}

// good — each helper tells a story
const activeLines = (lines) => lines.filter((line) => line.quantity > 0)
const formatLine = (line) => `${line.name} x${line.quantity}`
const orderTotal = (lines) => lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
const displayName = (customer) => customer.preferredName ?? customer.firstName

const buildEmailPayload = (order) => ({
  to: order.customer.email,
  subject: `Order ${order.ref} confirmed`,
  body: [
    `Hi ${displayName(order.customer)},`,
    '',
    ...activeLines(order.lines).map(formatLine),
    '',
    `Total: £${orderTotal(order.lines).toFixed(2)}`
  ].join('\n')
})
```

---

## 6. Naming

Names should reveal intent. Never use single-character variable names. Avoid abbreviations and generic names like `data`, `info`, `obj`, `temp`.

```js
// bad
const d = await getData(id)
const fn = (user) => user.active
const users = items.filter((u) => u.active)

// good
const user = await fetchUser(id)
const isActive = (user) => user.active
const activeUsers = users.filter((user) => user.active)
```

This applies everywhere — including inline callbacks and destructured parameters:

```js
// bad
orders.reduce((a, b) => a + b.total, 0)
items.map(({ n, v }) => `${n}: ${v}`)

// good
orders.reduce((total, order) => total + order.total, 0)
items.map(({ name, value }) => `${name}: ${value}`)
```

Boolean variables and functions should read as predicates:

```js
const isValid = (value) => value !== null && value !== undefined
const hasPermission = (user, action) => user.roles.includes(action)
```

### The naming test

A name must predict what the code returns and what it changes. Read the body, then ask: did the name tell me both? If not, rename it or split the code until it does. A name that needs a comment to explain it fails this test.

```js
// bad — returns the kept lines and a count; "dropped by" names neither
const linesDroppedBy = (lines, commodityType) => ...
const { kept, removed } = linesDroppedBy(linesOf(current), value.commodityType)

// good — the name says what comes back
const keepLinesAllowedBy = (lines, commodityType) => ...
```

```js
// bad — a comment decodes the name, and the name hides which states it covers
// c-201: an amendment opens with no errors; Continue refused shows them.
const holdsSilently = readOnly || (journey.status === state.AMEND && !refused)

// good — the name carries the meaning, so the comment goes
const hidesAnswerErrors = readOnly || (journey.status === state.AMEND && !refused)
```

```js
// bad — "report" promises a read, but this also clears expired faults
report () {
  return { integrations: [...states.values()].map((state) => reportOf(state, now())) }
}

// good — the side effect has its own name; report() only reads
clearExpiredFaults()
report()
```

### No metaphors

Name the behaviour, not its effect. A metaphor makes the reader open the file to find out what happens.

```js
// bad
const lightenRemote = () => ...
const slimRepo = () => ...

// good
const excludeGhPagesFromFetch = () => ...
const pruneGhPagesObjects = () => ...
```

### No positional boolean flags

A bare `true` or `false` at a call site says nothing. Pass a named option, or split the function.

```js
// bad
saveActions(true, false, true)

// good
saveActions({ readOnly: true, showCancel: true })
```

The same applies to Nunjucks macros and Java methods.

### One concept, one name

One value keeps one name from the request header to the repository, and across twin repos. A rename covers the concept's whole vocabulary: keys, variables, copy keys and test titles. Search for the concept word, not only the old identifier.

```js
// bad — four names for the person who owns the notification
headers['User-Id']
const { userId } = request.auth
notification.ownerId
// "actor id" in a log line

// good — one name everywhere
headers['User-Id']
const { userId } = request.auth
notification.userId
logger.info({ userId }, 'Notification saved')
```

---

## 7. Destructuring and defaults

Destructure early to reduce repeated property access:

```js
// bad
const greet = (user) => `Hello ${user.profile.firstName} ${user.profile.lastName}`

// good
const greet = ({ profile: { firstName, lastName } }) => `Hello ${firstName} ${lastName}`
```

Use default parameter values rather than guard clauses where possible:

```js
// bad
const paginate = (items, page, size) => {
  const currentPage = page ?? 1
  const pageSize = size ?? 20
  return items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
}

// good
const paginate = (items, page = 1, size = 20) => items.slice((page - 1) * size, page * size)
```

---

## 8. Early returns over nested conditionals

Return early to eliminate nesting. The happy path should be the last thing in the function.

```js
// bad
const processPayment = (payment) => {
  if (payment) {
    if (payment.amount > 0) {
      if (payment.currency === 'GBP') {
        return charge(payment)
      }
    }
  }
}

// good
const processPayment = (payment) => {
  if (!payment) return null
  if (payment.amount <= 0) return null
  if (payment.currency !== 'GBP') return null
  return charge(payment)
}
```

---

## 9. Avoid clever one-liners at the expense of clarity

Functional and terse is good. Clever and unreadable is not. When a pipeline becomes hard to follow, name the intermediate steps.

```js
// too clever
const result = data.reduce((acc, { key, val }) => ({ ...acc, [key]: (acc[key] ?? []).concat(val) }), {})

// better — name what you're building
const groupByKey = (items) =>
  items.reduce((groups, { key, value }) => {
    const existing = groups[key] ?? []
    return { ...groups, [key]: [...existing, value] }
  }, {})

const result = groupByKey(data)
```

A pipeline is not readable just because it is functional. When a `map`, `filter` or `flatMap` callback branches, returns early or derives a value in several steps, move each case into a named helper so the top function reads as a few named steps.

---

## 10. Module exports

Prefer named exports. Default exports make refactoring harder and IDE support weaker.

```js
// bad
export default function formatDate(date) { ... }

// good
export const formatDate = (date) => ...
```

Prefer more nesting to less. Group related modules in a folder, and split a crowded module into small modules inside that folder. A folder holding one small module is fine.

```
// bad — one crowded module
src/utils/date.js          formatDate, parseDate, isExpired, addWorkingDays, welshMonthName

// good — a folder of small modules
src/utils/date/format.js
src/utils/date/parse.js
src/utils/date/expiry.js
src/utils/date/working-days.js
src/utils/date/welsh-month-names.js
```

Push back on a deeper folder only when it breaks a layer rule (for example the repo's dependency-cruiser checks) or when its name misleads.

---

## 11. `const` over `let`, never `var`

Default to `const`. Only reach for `let` when you genuinely need to reassign. Never use `var`.

```js
// bad
var count = 0
let name = 'Alice'  // never reassigned

// good
const name = 'Alice'

// let is justified here
let retries = 0
while (retries < 3) {
  retries++
}
```

If you find yourself needing `let` for a value built up over time, that is usually a sign to use `map`, `filter`, or `reduce` instead.

---

## 12. Optional chaining and nullish coalescing

Use `?.` and `??` to handle absent values without verbose null checks.

```js
// bad
const city = user && user.address && user.address.city
const label = value !== null && value !== undefined ? value : 'unknown'

// good
const city = user?.address?.city
const label = value ?? 'unknown'
```

Prefer `??` over `||` for defaults — `||` triggers on any falsy value (`0`, `''`, `false`), which is rarely what you want:

```js
// bad — treats 0 and '' as missing
const count = total || 0
const title = input || 'Untitled'

// good — only falls back when null or undefined
const count = total ?? 0
const title = input ?? 'Untitled'
```

---

## 13. No magic numbers or strings

Extract bare literals that carry meaning into named constants. The name documents the intent; the constant makes it easy to change.

```js
// bad
if (user.role === 3) { ... }
setTimeout(sync, 86400000)
if (password.length < 8) { ... }

// good
const ROLE_ADMIN = 3
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MIN_PASSWORD_LENGTH = 8

if (user.role === ROLE_ADMIN) { ... }
setTimeout(sync, ONE_DAY_MS)
if (password.length < MIN_PASSWORD_LENGTH) { ... }
```

---

## 14. Prefer `async`/`await`

Use `async`/`await` over `.then()` chains. It reads sequentially, handles errors uniformly with `try`/`catch`, and is easier to debug.

```js
// bad
const loadDashboard = (userId) =>
  fetchUser(userId)
    .then((user) => fetchPermissions(user.role))
    .then((permissions) => fetchWidgets(permissions))
    .catch((err) => logger.error(err))

// good
const loadDashboard = async (userId) => {
  const user = await fetchUser(userId)
  const permissions = await fetchPermissions(user.role)
  return fetchWidgets(permissions)
}
```

Exception: short single-expression pipelines where `.then()` reads cleanly as a transformation are fine:

```js
const fetchUser = (id) => fetch(`/users/${id}`).then((res) => res.json())
```

---

## 15. Self-documenting code — no comments

Code is near-bare of comments. Names and structure carry the meaning. Comments drift out of step with the code; a name is read at every call site, so a wrong one gets noticed.

When you feel the urge to write a comment, rename or extract a function instead:

```js
// bad — comment compensating for a poor name
// multiply by 1.2 to add VAT
const total = subtotal * 1.2

// bad — comment describing what the code does
// filter out inactive users and get their IDs
const result = users.filter((user) => user.active).map((user) => user.id)

// good — the code reads as its own explanation
const VAT_MULTIPLIER = 1.2
const totalWithVat = subtotal * VAT_MULTIPLIER

const activeUserIds = users.filter((user) => user.active).map((user) => user.id)
```

A comment that describes other code is wrong as soon as that code changes, and nobody editing the other code sees it. Never describe callers, other modules, the backend, a library, the UI or a test. Put the guarantee in code where it is enforced:

```js
// bad — describes the library and the route config, not the line below
// Hapi validates the full payload before route handlers run,
// so by the time we reach here the token is guaranteed present.
const { token } = request.payload

// good — the route's own validation states the guarantee; the handler needs no comment
export const confirmRoute = {
  method: 'POST',
  path: '/confirm',
  options: {
    validate: { payload: Joi.object({ token: Joi.string().required() }) }
  },
  handler: (request, h) => confirmToken(request.payload.token, h)
}
```

Rationale (why a rule exists, a ruling, a known gotcha) goes in the repo's `docs/` or the behaviour spec, where it is found and kept up to date. If deleting a comment would lose a fact that is in neither, move that fact to `docs/`.

No history in code. Git holds it.

```js
// bad
// Renamed from telephone in the contact-details rework.
// The country hint used to say "Start typing to search for a country."
const REMOVED_INTERNAL_REFERENCE_LIMIT = 'It can be up to 58 characters.'

// good — the code and its tests state how things are now
await expect(field).toHaveAccessibleDescription(copy.internalReference.hint)
```

No ticket keys, backlog or ruling ids, release names or session words in comments or test titles:

```js
// bad
// EUDPA-310: options come from reference data.
// c-201: an amendment opens with no errors.
test('shows the region hint, as in the real service', ...)

// good — no comment; the test title says what it proves
test('shows the region question with the health-certificate hint', ...)
```

When a comment is stale, delete it. Do not reword it. When a comment explains a name, the name is the defect: rename, then delete the comment in the same change.

The only doc comments allowed state the contract of an exported public API. See `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/jsdoc.md`.

---

## 16. Modern array and object methods

Prefer built-in methods over manual implementations. They are more readable and signal intent clearly.

```js
// last element — no need to compute length
const last = items.at(-1)

// searching from the end
const lastError = events.findLast((event) => event.type === 'error')

// check a condition holds for every item
const allApproved = items.every((item) => item.approved)

// check at least one item matches
const hasErrors = items.some((item) => item.type === 'error')

// flatten one level and map in one pass
const tags = posts.flatMap((post) => post.tags)

// group into an object by a key (Node 22+)
const byStatus = Object.groupBy(orders, (order) => order.status)

// build an object from entries
const index = Object.fromEntries(users.map((user) => [user.id, user]))
```

---

## Running packages with `npx`

Not a style rule, but it applies to every script, CI step and doc example. Unscoped package names on npm can be taken by anyone, so a bare binary name can run a stranger's code.

```sh
# bad — runs whatever package is called "lhci"
npx lhci autorun

# good — the scoped package, or a script that resolves through node_modules
npx @lhci/cli autorun
npm run lighthouse
```

If you are not sure what a name resolves to, check with `npm view <name>` first. In CI, install with `npm ci` and call an `npm run` script.
