## EUDPA-398 — microchip identifier (backend side)

Increment `inc-101` of the DR1 parity backlog. Ticket **EUDPA-398**.

### The finding

A trader cannot record a microchip number for a horse, cat, dog or ferret anywhere in the frontend, but Design release 1 asks for one on both the equine (`0101`) and companion-animal (`01061900`) identifier sets.

### What changed here

The GBNAG animal identifier record recognised only the type codes `EAR_TAG` and `PASSPORT`, so a microchip captured in the frontend had nowhere to go once the notification was sent. This PR opens that door on the provider side:

- `TradeProductInstance.AnimalIdentifier` — adds the microchip identifier type to the GBNAG outbox contract.
- `Species` — adds the field that feeds it.
- Mapper, controller, integration test and shared test data updated to carry and assert the new type.

No behaviour changes for notifications that carry no microchip: the field is additive and absent values map as before.

### Cross-repo: merge this one first

This increment also has a frontend PR on the same branch name, in **DEFRA/trade-imports-animals-frontend**, which adds the microchip obligation, its copy and its mapping into the outbox payload.

Merge order is **backend, then frontend**. The backend is the provider and the frontend the consumer, so `main` is never left holding a frontend that writes a field the contract does not yet accept. Both PRs must be green before either merges.

The tests repo was branched for this increment but needed no changes, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01YNp6QZFGArtcNsfecKgWLo
