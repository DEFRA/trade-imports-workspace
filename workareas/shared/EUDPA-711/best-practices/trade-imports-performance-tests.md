# Best practices applicable to trade-imports-performance-tests

Concatenated from `docs/best-practices/` at prepare-review time.
Apply these standards when reviewing files in this repo.


---

## Source: `docs/best-practices/k6/BEST_PRACTICES.md`

# k6 Best Practices

**Golden Rule:** Design tests for clarity and realism.

## Test Design

### Do

- **Four-step procedure:** Script, Assert, Model, Iterate
- **Name descriptively:** smoke-user-login.js, load-checkout-flow.js
- **Define thresholds:**
  ```typescript
  export const options = {
    thresholds: {
      http_req_duration: ['p(95)<500', 'p(99)<1000'],
      http_req_failed: ['rate<0.01'],
      checks: ['rate>0.99'],
    },
  }
  ```
- **Start with smoke tests:** `k6 run --iterations 5 script.js`

### Don't

- Tests without thresholds - just monitoring, no pass/fail
- Complex logic in test functions - keep VU code linear

## Load Modelling

### Executors

```typescript
// Virtual Users
executor: 'constant-vus', vus: 50, duration: '5m'

// Arrival Rate (requests/second)
executor: 'constant-arrival-rate', rate: 100, timeUnit: '1s'
```

### Ramping
```typescript
stages: [
  { duration: '2m', target: 50 },   // Ramp up
  { duration: '5m', target: 50 },   // Steady
  { duration: '2m', target: 100 },  // Peak
  { duration: '2m', target: 0 },    // Down
]
```

### Always Include Sleep
```typescript
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'
sleep(randomIntBetween(1, 5))  // Realistic think time
```

## Checks and Thresholds

### Checks (functional validation)
```typescript
check(res, {
  'login successful': (r) => r.status === 200,
  'has auth token': (r) => r.json('token') !== undefined,
})
```

### Thresholds (pass/fail criteria)
```typescript
thresholds: {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
  checks: ['rate>0.99'],
}
```

### Abort on Critical Failure
```typescript
http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true }]
```

### Tag for Granular Thresholds
```typescript
thresholds: {
  'http_req_duration{name:login}': ['p(95)<300'],
  'http_req_duration{name:search}': ['p(95)<500'],
}
http.post('/api/login', payload, { tags: { name: 'login' } })
```

## Test Data

### SharedArray for Large Datasets
```typescript
import { SharedArray } from 'k6/data'
const users = new SharedArray('users', () => JSON.parse(open('./users.json')))
```

### Setup for Auth
```typescript
export function setup() {
  const res = http.post('/login', JSON.stringify(creds))
  return { token: res.json('token') }
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` }
  http.get('/protected', { headers })
}
```

### Never Load Data in Default Function
```typescript
// Bad - runs every iteration
export default function () {
  const users = JSON.parse(open('./users.json'))  // Wrong!
}
```

## HTTP Requests

### URL Grouping
```typescript
// Groups metrics under one name
http.get('/users/123', { tags: { name: 'GetUser' } })
```

### Batch Parallel Calls
```typescript
const responses = http.batch([
  ['GET', '/users'],
  ['GET', '/products'],
])
```

### Use Environment Variables
```typescript
const BASE_URL = __ENV.BASE_URL || 'https://api.dev.example.com'
```

## Common Review Flags

| Issue | Problem |
|-------|---------|
| No thresholds | Test cannot fail |
| sleep(0) or no sleep | Unrealistic load |
| Checks without threshold on rate | Failures don't fail test |
| Hardcoded URLs/IDs | Brittle tests |
| Data loaded in default function | File I/O every iteration |
| No error handling | Silent failures |
| p(100) threshold | Any outlier fails test |
| No tags for dynamic URLs | Scattered metrics |

## Test Types

| Type | Configuration |
|------|---------------|
| Smoke | `iterations: 5` |
| Load | `vus: 50, duration: '10m'` |
| Stress | `vus: 200, duration: '30m'` |
| Spike | Ramping: 0→200→0 quickly |
| Soak | `vus: 50, duration: '2h'` |
