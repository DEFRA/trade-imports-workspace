## EUDPA-595 — inc-060

DR1 asks for a CPH number on every consignment except horses and the 01061900 group; the frontend asks only when the consignment contains cattle.

### The problem

The CPH (County Parish Holding) question was gated by an allow-list of a single commodity name:

```js
CPH_COMMODITIES = ['Cow']
```

So horses, cats, dogs and fish were never asked for a CPH number — and every commodity added to the catalogue in future would have been silently exempt too, because the default was "do not ask".

### What Design release 1 says

DR1 works the other way round. CPH is in the **default** set of address sections, and a commodity code has to be listed **explicitly** to escape it. Only two live-animal codes do:

| Code | Covers | Why exempt |
|---|---|---|
| `0101` | Horses and donkeys | Not holding-registered |
| `01061900` | Cats, dogs and ferrets | Asked for a permanent address instead |

### The change

Invert the rule so the default is to ask.

- `CPH_EXEMPT_COMMODITY_CODES` names the two exempt codes.
- `CPH_COMMODITIES` is now **derived** from the commodity catalogue by excluding those codes, rather than hand-listed.

Exempting by code rather than by picker name keeps the rule holding as the catalogue grows: a new commodity added tomorrow is asked for a CPH number unless somebody deliberately exempts its code.

Within today's five-entry catalogue the visible behaviour change is exactly one commodity: **a trader importing ornamental fish is now asked for a CPH number**, as they are in DR1.

### Tests

Updated to pin both the derivation and the new applicability:

- commodity whitelist and commodity service suites (derivation, exempt codes)
- applicability bridge
- check-answers
- addresses hub-picker FIT spec
- characterisation oracles fixture
- live-animals journey fit fixture

### Scope

Frontend only. The sibling repos (`trade-imports-animals-backend`, `trade-imports-animals-tests`) were branched for this increment but needed no changes, so no PR is raised against either.

---

Increment: `inc-060`
Ticket: EUDPA-595
