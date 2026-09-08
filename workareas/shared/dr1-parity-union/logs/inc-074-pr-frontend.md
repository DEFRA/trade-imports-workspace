## What changed

Four of the eleven internal-market purpose hints on the reason-for-import page read differently on the frontend than in Design release 1. The eleven options, their order and their labels already matched — only the hint copy drifted.

Corrected in the import-reason copy files:

- **Transfer of ownership - Sale/gift** — `it's` → `its`, dropped the comma after "aim", `e.g.` → `for example` (GDS style), added the closing full stop.
- **Breeding** — added the missing closing full stop ("... or produce offspring.").
- **Racing, competition, show or training** — added the missing closing full stop ("Animals to participate in competitive or training events.").
- **Production** — added the missing closing full stop ("... any other animal product or by-product.").

Applied to both the English (`copy.en.js`) and Welsh (`copy.cy.js`) copy files, with copy tests covering the four corrected strings.

No behaviour change: this is copy only, and nothing on the page moves.

## Guard rail honoured

The awkward `traveling` spelling in the Companion animal hint is byte-identical on both sides, so it is deliberately left untouched — it is not part of this drift.

## Provenance

- Increment: `inc-074`
- Ticket: EUDPA-489
- Corpus: `dr1` parity union — frontend `.../import-reason/copy/copy.en.js` against Design release 1 `app/data/internal-market-purposes.js`.
- Confidence: high. The same four-item list was derived independently by two parity runs months apart.

Frontend-only increment: the tests repo was branched but has no commits, so there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
