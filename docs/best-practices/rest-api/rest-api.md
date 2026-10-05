# REST API Design

Based on [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/).

## Core Principles

**API First:** Define APIs before implementation using OpenAPI
**API as Product:** Treat APIs as products with ownership
**Robustness (Postel's Law):** Liberal in acceptance, conservative in sending

## URL Design

### Path Structure
Use kebab-case: `^[a-z][a-z\-0-9]*$`

```
GET /sales-orders
GET /sales-orders/{order-id}
GET /sales-orders/{order-id}/items
```

### Resource Naming
| Do | Don't |
|----|-------|
| /customers | /customer |
| /sales-orders | /salesOrders |
| /order-items | /order_items |

- Plural nouns for collections
- Meaningful business names
- Verb-free URLs (use HTTP methods)
- Max 3 sub-resource levels

### Query Parameters
Use snake_case: `?sort=-created_at&limit=20&fields=id,name`

| Parameter | Purpose |
|-----------|---------|
| q | Default search |
| sort | Sort with +/- prefix |
| fields | Partial response |
| embed | Sub-entity expansion |
| offset/limit | Pagination |
| cursor | Cursor pagination |

## HTTP Methods

| Method | Purpose | Safe | Idempotent | Body |
|--------|---------|------|------------|------|
| GET | Read | Yes | Yes | Forbidden |
| POST | Create | No | Consider | Required |
| PUT | Replace | No | Yes | Required |
| PATCH | Partial update | No | Consider | Required |
| DELETE | Remove | No | Yes | Rare |

### Idempotency Patterns
1. **ETag + If-Match:** Prevents concurrent updates
2. **Secondary Key:** Resource-specific unique key
3. **Idempotency-Key Header:** Client-provided retry key

## Status Codes

### Success (2xx)
| Code | Usage |
|------|-------|
| 200 OK | General success |
| 201 Created | Resource created (+ Location) |
| 202 Accepted | Async started |
| 204 No Content | Success, no body |

### Client Errors (4xx)
| Code | Usage |
|------|-------|
| 400 Bad Request | Invalid input |
| 401 Unauthorized | Missing/invalid credentials |
| 403 Forbidden | Insufficient permissions |
| 404 Not Found | Resource missing |
| 409 Conflict | State conflict |
| 429 Too Many Requests | Rate limited |

### Server Errors (5xx)
| Code | Usage |
|------|-------|
| 500 Internal Error | Unexpected error |
| 503 Unavailable | Temporary down |

### Error Response (RFC 9457)
```json
{
  "type": "/problems/out-of-stock",
  "title": "Product out of stock",
  "detail": "Product 123 unavailable",
  "instance": "/orders/456"
}
```
Never expose stack traces.

## JSON Payload

### Property Naming
Use snake_case:
```json
{
  "order_id": "abc123",
  "created_at": "2024-01-15T10:30:00Z",
  "line_items": []
}
```

### Null Handling
- Treat null and absent identically
- Never null for booleans (use enums)
- Empty array `[]` instead of null

### Common Fields
| Field | Purpose |
|-------|---------|
| id | Opaque string identifier |
| xyz_id | Reference to another resource |
| etag | Version for optimistic locking |
| created_at | Creation timestamp |
| modified_at | Last modification |

### Response Structure
Always use objects as top-level, never bare arrays:
```json
{ "items": [...], "cursor": "abc" }
```

### Enumerations
Use UPPER_SNAKE_CASE: `"status": "IN_PROGRESS"`

## Data Formats

### Numbers
| Type | Format | Usage |
|------|--------|-------|
| integer | int32/int64 | Standard integers |
| number | decimal | Money (never float/double) |

### Dates (RFC 3339 / ISO 8601)
| Format | Example |
|--------|---------|
| date | 2024-01-15 |
| date-time | 2024-01-15T10:30:00Z |

Use uppercase T and Z. Prefer UTC.

### Standard Codes
| Data | Format | Example |
|------|--------|---------|
| Country | ISO 3166-1 alpha-2 | GB |
| Language | ISO 639-1 | en |
| Currency | ISO 4217 | GBP |

### Money
```json
{ "amount": "99.99", "currency": "GBP" }
```

## Pagination

### Cursor-Based (Recommended)
```json
{
  "items": [...],
  "self": "...?cursor=abc",
  "next": "...?cursor=def"
}
```
Efficient, stable with concurrent modifications.

### Offset-Based
`GET /orders?offset=20&limit=10`
Simpler but less robust for large datasets.

## Backward Compatibility

### Non-Breaking (Allowed)
- Adding optional properties
- Making mandatory fields optional
- Extending extensible enums

### Breaking (Avoid)
- Removing required fields
- Changing field types
- Adding required fields
- Changing defaults

### Versioning
**Preferred:** Evolve without versioning
**If required:** Media type: `Accept: application/vnd.example+json;version=2`
**Forbidden:** URL versioning `/v1/resources`

## Quick Reference

### Do
- Define APIs before implementation
- kebab-case for paths
- snake_case for properties/params
- UPPER_SNAKE_CASE for enums
- Problem JSON for errors
- Make POST/PATCH idempotent
- Cursor pagination for large datasets

### Don't
- Request body in GET
- camelCase in JSON
- Bare arrays as top-level
- null for empty collections
- float/double for money
- Version numbers in URLs
- Break existing consumers
- Expose stack traces
