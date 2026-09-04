## EUDPA-398 — microchip identifier (frontend side)

Increment `inc-101` of the DR1 parity backlog. Ticket **EUDPA-398**.

### The finding

Frontend knew six ways to identify an animal and a microchip was not one of them: passport, tattoo, ear tag, horse name, and — only for commodities with no specific identifier at all — free-text identification details and a description. The gap bit hardest on the commodities that need it. Because dogs and horses *do* have specific identifiers, the free-text fallback is switched off for them, so a trader importing a dog was shown a passport field and a tattoo field and nothing to put a chip number in.

Design release 1 asks for a microchip on both identifier sets a companion animal or an equine falls into — a horse (`0101`) is asked for Microchip, Passport and Horse name; a cat, dog, ferret or other live mammal (all `01061900`) for Microchip, Passport and Tattoo. Microchip is the first field on both panels. Microchipping is how a dog is identified in law, so the field is not decoration.

### What changed

- **A microchip obligation** beside passport, tattoo, ear tag and horse name in `sets/live-animals/obligations/sections/commodities/identifiers.js`.
- **A `MICROCHIP_COMMODITIES` allowlist** in `services/commodities/stub.js`, in the stub's picker-name vocabulary, covering horse, cat, dog and ferret — the equine and companion-animal commodities, not the dog and horse alone.
- **Label and error copy** in the commodities feature's `copy.en.js` and `copy.cy.js`.
- **`requires.anyOfIds`** on the unit record gains the new id, so a microchip on its own satisfies the at-least-one-identifier rule.
- **The specific-identifier union** gains it too, so the free-text fallback keeps behaving exactly as it does today.
- **Through to the outbox** — the value is carried by the notification mapper, alongside the backend's new `MICROCHIP` type code.

Tests updated across contract, notification-mapper, controller, whitelist, fit-spec and characterisation-oracle fixtures.

### Cross-repo: merge this one second

The sibling PR is in **DEFRA/trade-imports-animals-backend** on the same branch name — it adds the `MICROCHIP` type to the GBNAG outbox contract and the field that feeds it.

Merge order is **backend, then frontend**. The backend is the provider and this repo the consumer, so `main` is never left holding a frontend that writes a field the contract does not yet accept. Both PRs must be green before either merges.

The tests repo was branched for this increment but needed no changes, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01YNp6QZFGArtcNsfecKgWLo
