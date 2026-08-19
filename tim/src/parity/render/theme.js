// The palette is inherited from build-page.js:128-177, which already works in
// both themes. What is new is everything below the tokens: two fixed columns, a
// picture band, a sources strip, and a decision block that reads as something
// you act on rather than something you scroll past.

export const THEME_CSS = `
:root {
  --ground: #f6f7f5;
  --surface: #ffffff;
  --surface-sunk: #eef0ed;
  --surface-raised: #ffffff;
  --ink: #191d1b;
  --ink-muted: #5c6560;
  --ink-faint: #838d87;
  --rule: #dee3de;
  --rule-strong: #c3ccc5;
  --accent: #1f5f4e;
  --accent-soft: #e4efe9;
  --band-default: #56605a;
  --band-frontend-only: #2e6b3e;
  --band-frontend-work: #2e6b3e;
  --band-needs-design-decision: #8a5a12;
  --band-needs-backend: #34518c;
  --band-disputed: #6b3f8a;
  --decision-ground: #fdf6e8;
  --decision-rule: #e0c88a;
  --falsifier-ground: #f4f1fb;
  --falsifier-rule: #c9bce8;
  --correction-ground: #eef5f2;
  --withdrawn-ground: #f2f2f1;
  --warn: #9a3412;
  --warn-ground: #fdf0e9;
  --shadow: 0 1px 2px rgba(25, 29, 27, .05), 0 8px 24px -16px rgba(25, 29, 27, .28);
  --shadow-lift: 0 2px 4px rgba(25, 29, 27, .06), 0 18px 44px -28px rgba(25, 29, 27, .42);

  --display: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #101311;
    --surface: #171b19;
    --surface-sunk: #1e2320;
    --surface-raised: #1b201d;
    --ink: #e8ede9;
    --ink-muted: #9aa49d;
    --ink-faint: #78827b;
    --rule: #272d29;
    --rule-strong: #3a423d;
    --accent: #6fbfa6;
    --accent-soft: #1d2a26;
    --band-default: #7f8a83;
    --band-frontend-only: #6aae76;
    --band-frontend-work: #6aae76;
    --band-needs-design-decision: #d2a052;
    --band-needs-backend: #7d9ada;
    --band-disputed: #a98cd6;
    --decision-ground: #241f13;
    --decision-rule: #6b5628;
    --falsifier-ground: #1d1a26;
    --falsifier-rule: #4a3f6b;
    --correction-ground: #16211d;
    --withdrawn-ground: #191b1a;
    --warn: #f0a077;
    --warn-ground: #2a1a12;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px -16px rgba(0, 0, 0, .8);
    --shadow-lift: 0 2px 4px rgba(0, 0, 0, .5), 0 18px 44px -28px rgba(0, 0, 0, .9);
  }
}

:root[data-theme="dark"] {
  --ground: #101311;
  --surface: #171b19;
  --surface-sunk: #1e2320;
  --surface-raised: #1b201d;
  --ink: #e8ede9;
  --ink-muted: #9aa49d;
  --ink-faint: #78827b;
  --rule: #272d29;
  --rule-strong: #3a423d;
  --accent: #6fbfa6;
  --accent-soft: #1d2a26;
  --band-default: #7f8a83;
  --band-frontend-only: #6aae76;
  --band-frontend-work: #6aae76;
  --band-needs-design-decision: #d2a052;
  --band-needs-backend: #7d9ada;
  --band-disputed: #a98cd6;
  --decision-ground: #241f13;
  --decision-rule: #6b5628;
  --falsifier-ground: #1d1a26;
  --falsifier-rule: #4a3f6b;
  --correction-ground: #16211d;
  --withdrawn-ground: #191b1a;
  --warn: #f0a077;
  --warn-ground: #2a1a12;
  --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px -16px rgba(0, 0, 0, .8);
  --shadow-lift: 0 2px 4px rgba(0, 0, 0, .5), 0 18px 44px -28px rgba(0, 0, 0, .9);
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; scroll-padding-top: 5rem; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--body);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); }

code, .mono { font-family: var(--mono); font-size: .86em; }

code {
  background: var(--surface-sunk);
  border-radius: 3px;
  padding: .08em .34em;
}

code.ref { color: var(--ink-muted); }

.quoted { font-style: italic; }

.wrap {
  max-width: 78rem;
  margin: 0 auto;
  padding: clamp(2rem, 5vw, 4.5rem) clamp(1rem, 4vw, 2.5rem) 8rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

/* --- masthead ------------------------------------------------------- */

.masthead { display: flex; flex-direction: column; gap: 1rem; }

.masthead__eyebrow {
  font-family: var(--mono);
  font-size: .72rem;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.masthead__title {
  font-family: var(--display);
  font-size: clamp(2rem, 4.4vw, 3rem);
  line-height: 1.12;
  margin: 0;
  font-weight: 500;
}

.masthead__standfirst {
  margin: 0;
  max-width: 46rem;
  font-size: 1.08rem;
  color: var(--ink-muted);
}

.masthead__note {
  margin: 1rem 0 0;
  max-width: 46rem;
  padding: .7rem .9rem;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  font-size: .9rem;
  color: var(--ink-muted);
}

/* Flex rather than grid: a grid leaves the remainder of the last row empty,
   and an empty cell in a row of numbers reads as a number that failed to
   render. Flex lets the last row's cells grow to fill it. */
.figures {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: 10px;
  overflow: hidden;
}

.figure {
  flex: 1 1 9rem;
  background: var(--surface);
  padding: .95rem 1.1rem;
}
.figure__n { font-family: var(--display); font-size: 1.85rem; line-height: 1; }
.figure__label { display: block; margin-top: .3rem; font-size: .78rem; color: var(--ink-muted); }

/* --- provenance ----------------------------------------------------- */

.pins {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: .75rem;
}

.pin {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: .7rem .9rem;
  font-size: .82rem;
}

.pin__repo { font-weight: 600; }
.pin__sha { font-family: var(--mono); color: var(--ink-muted); }
.pin__why { display: block; margin-top: .35rem; color: var(--ink-muted); }
.pin--unpushed { border-color: var(--warn); }

/* --- controls ------------------------------------------------------- */

.controls {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--ground) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--rule);
  margin: 0 calc(-1 * clamp(1rem, 4vw, 2.5rem));
  padding: .75rem clamp(1rem, 4vw, 2.5rem);
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
}

.controls input[type="search"] {
  flex: 1 1 16rem;
  min-width: 12rem;
  font: inherit;
  padding: .45rem .7rem;
  border: 1px solid var(--rule-strong);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
}

.controls select, .controls button {
  font: inherit;
  font-size: .88rem;
  padding: .42rem .6rem;
  border: 1px solid var(--rule-strong);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.controls__count { font-size: .84rem; color: var(--ink-muted); margin-left: auto; }

/* --- sections ------------------------------------------------------- */

.section { display: flex; flex-direction: column; gap: 1.5rem; }

.section__head { display: flex; flex-direction: column; gap: .3rem; }

.section__title {
  font-family: var(--display);
  font-size: 1.6rem;
  margin: 0;
  font-weight: 500;
  display: flex;
  align-items: baseline;
  gap: .6rem;
}

.section__count {
  font-family: var(--mono);
  font-size: .8rem;
  color: var(--ink-faint);
}

.section__blurb { margin: 0; color: var(--ink-muted); max-width: 46rem; }

/* --- card ----------------------------------------------------------- */

.card {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
  scroll-margin-top: 5rem;
}

.card--withdrawn { background: var(--withdrawn-ground); }
.card--candidate { border-style: dashed; }

.card__head {
  padding: 1.3rem 1.5rem 1rem;
  border-bottom: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  gap: .6rem;
}

.card__idline { display: flex; align-items: center; gap: .6rem; }

.card__id {
  font-family: var(--mono);
  font-size: .78rem;
  color: var(--ink-faint);
  text-decoration: none;
}

.card__id:hover { color: var(--accent); }

.card__title {
  font-family: var(--display);
  font-size: 1.3rem;
  line-height: 1.32;
  margin: 0;
  font-weight: 500;
}

.chips { display: flex; flex-wrap: wrap; gap: .35rem; }

.chip {
  font-size: .72rem;
  font-family: var(--mono);
  letter-spacing: .02em;
  padding: .16rem .5rem;
  border-radius: 999px;
  border: 1px solid var(--rule-strong);
  color: var(--ink-muted);
  background: var(--surface-sunk);
}

/* The taxonomy is per-corpus data but the stylesheet is one file for every
   corpus, so a band this palette has never heard of must still be legible —
   without the default background it would be white text on the plain chip. */
.chip--band { color: #fff; border-color: transparent; background: var(--band-default); }
.chip--band-frontend-only { background: var(--band-frontend-only); }
.chip--band-frontend-work { background: var(--band-frontend-work); }
.chip--band-needs-design-decision { background: var(--band-needs-design-decision); }
.chip--band-needs-backend { background: var(--band-needs-backend); }
.chip--band-disputed { background: var(--band-disputed); }
.chip--gate { border-color: var(--decision-rule); background: var(--decision-ground); color: var(--ink); }
.chip--ruled { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

.card__body { padding: 1.2rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1.4rem; }

/* --- decision ------------------------------------------------------- */

.decision {
  background: var(--decision-ground);
  border: 1px solid var(--decision-rule);
  border-radius: 10px;
  padding: 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: .7rem;
}

.decision__label {
  font-family: var(--mono);
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.decision__question {
  font-family: var(--display);
  font-size: 1.12rem;
  line-height: 1.4;
  margin: 0;
}

.decision__options { margin: 0; padding-left: 1.1rem; }
.decision__consequence { margin: 0; font-size: .92rem; color: var(--ink-muted); }

.decision__source {
  font-size: .78rem;
  color: var(--ink-muted);
  font-style: italic;
}

.decision__apply { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }

.decision__cmd {
  flex: 1 1 20rem;
  font-family: var(--mono);
  font-size: .74rem;
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 6px;
  padding: .4rem .55rem;
  overflow-x: auto;
  white-space: nowrap;
}

.decision__rule {
  font: inherit;
  font-size: .8rem;
  padding: .3rem .6rem;
  border-radius: 6px;
  border: 1px solid var(--rule-strong);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.decision__rule[aria-pressed="true"] { background: var(--accent); color: #fff; border-color: var(--accent); }

.ruling {
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  border-radius: 0 8px 8px 0;
  padding: .7rem 1rem;
}

.ruling__head { font-size: .78rem; font-family: var(--mono); text-transform: uppercase; letter-spacing: .1em; color: var(--ink-muted); }

/* --- two columns ---------------------------------------------------- */

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem;
}

@media (max-width: 1000px) { .columns { grid-template-columns: 1fr; } }

.column {
  display: flex;
  flex-direction: column;
  gap: .7rem;
  min-width: 0;
}

.column__label {
  font-family: var(--mono);
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ink-faint);
  border-bottom: 1px solid var(--rule);
  padding-bottom: .3rem;
}

.column p { margin: 0 0 .7rem; }
.column p:last-child { margin-bottom: 0; }

.block { display: flex; flex-direction: column; gap: .4rem; }

.block__label {
  font-family: var(--mono);
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.block p { margin: 0 0 .7rem; }
.block p:last-child { margin-bottom: 0; }

.block--falsifier {
  background: var(--falsifier-ground);
  border: 1px solid var(--falsifier-rule);
  border-radius: 10px;
  padding: .85rem 1.05rem;
}

.block--correction {
  background: var(--correction-ground);
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  padding: .75rem 1rem;
}

.block--note {
  background: var(--warn-ground);
  border-left: 3px solid var(--warn);
  border-radius: 0 8px 8px 0;
  padding: .75rem 1rem;
}

/* --- pictures ------------------------------------------------------- */

.frames { display: flex; flex-direction: column; gap: 1rem; }

.frame {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem;
}

@media (max-width: 1000px) { .frame { grid-template-columns: 1fr; } }

.shot {
  display: flex;
  flex-direction: column;
  gap: .4rem;
  min-width: 0;
}

.shot__label {
  font-family: var(--mono);
  font-size: .7rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--ink-faint);
  display: flex;
  justify-content: space-between;
  gap: .5rem;
}

.shot__figure {
  margin: 0;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--surface-sunk);
  overflow: hidden;
}

.shot__figure img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 30rem;
  object-fit: cover;
  object-position: top center;
}

.shot__caption {
  font-size: .76rem;
  color: var(--ink-muted);
  padding: .4rem .6rem;
  border-top: 1px solid var(--rule);
  background: var(--surface);
}

/* The artifact declares each picture once and points every use at it, so a
   crop there is a labelled box rather than an img. Contain rather than cover:
   a cropped crop is a different picture. */
.sprite {
  display: block;
  width: 100%;
  max-height: 30rem;
  background-repeat: no-repeat;
  background-position: top center;
  background-size: contain;
}

/* An insertion crop shows something that is present, standing in for
   something that is not. The outline is on the frame rather than burnt into
   the pixels, so changing how it reads never needs a re-capture. */
.shot__figure--insertion {
  border: 2px solid var(--decision-rule);
  background: var(--decision-ground);
}

.shot__insertion {
  margin: 0;
  padding: .5rem .6rem;
  font-size: .8rem;
  color: var(--ink);
  background: var(--decision-ground);
  border-top: 1px solid var(--decision-rule);
}

.plate {
  border: 1px dashed var(--rule-strong);
  border-radius: 8px;
  background: var(--surface-sunk);
  padding: .8rem .9rem;
  font-size: .82rem;
  max-height: 30rem;
  overflow-y: auto;
}

.plate__rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .3rem; }
.plate__row { display: flex; gap: .5rem; align-items: baseline; }

.plate__kind {
  font-family: var(--mono);
  font-size: .64rem;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  flex: 0 0 5.2rem;
}

.plate__text { min-width: 0; }
.plate__meta { color: var(--ink-faint); font-size: .74rem; }

.plate--absent { display: flex; flex-direction: column; gap: .5rem; color: var(--ink-muted); }
.plate--absent code { display: block; overflow-x: auto; white-space: pre; padding: .5rem .6rem; }

.plate--elsewhere { display: flex; flex-direction: column; gap: .5rem; color: var(--ink-muted); }
.plate--elsewhere strong { color: var(--ink); }
.plate--elsewhere code { display: block; overflow-x: auto; white-space: pre; font-size: .7rem; padding: .5rem .6rem; }

/* --- sources -------------------------------------------------------- */

.sources { display: flex; flex-direction: column; gap: .5rem; }

.source {
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--surface-raised);
  overflow: hidden;
  scroll-margin-top: 6rem;
}

.source__head {
  display: flex;
  gap: .5rem;
  align-items: baseline;
  padding: .45rem .7rem;
  font-size: .78rem;
  border-bottom: 1px solid var(--rule);
  flex-wrap: wrap;
}

.source__n {
  font-family: var(--mono);
  font-size: .7rem;
  color: var(--ink-faint);
  flex: 0 0 auto;
}

.source__path { font-family: var(--mono); font-size: .74rem; min-width: 0; overflow-wrap: anywhere; }
.source__state { margin-left: auto; font-size: .7rem; color: var(--ink-muted); }
.source--dead .source__path { text-decoration: line-through; }
.source--dead { border-color: var(--warn); }
.source--unresolved { border-style: dashed; }

.snippet {
  margin: 0;
  font-family: var(--mono);
  font-size: .73rem;
  line-height: 1.55;
  overflow-x: auto;
  background: var(--surface-sunk);
  padding: .5rem 0;
}

.snippet__line { display: flex; gap: .8rem; padding: 0 .7rem; white-space: pre; }
.snippet__line--context { color: var(--ink-faint); }
.snippet__line--focus { background: var(--accent-soft); }
.snippet__n { flex: 0 0 3rem; text-align: right; color: var(--ink-faint); user-select: none; }

details.source__more > summary { cursor: pointer; padding: .35rem .7rem; font-size: .76rem; color: var(--ink-muted); }

/* --- verification --------------------------------------------------- */

details.audit {
  border: 1px solid var(--rule);
  border-radius: 10px;
  background: var(--surface-sunk);
}

details.audit > summary {
  cursor: pointer;
  padding: .6rem .9rem;
  font-family: var(--mono);
  font-size: .74rem;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.audit__body { padding: 0 1rem 1rem; }
.audit__body p { margin: 0 0 .7rem; }
.audit__note { font-size: .76rem; color: var(--ink-faint); font-style: italic; }

/* --- drift ---------------------------------------------------------- */

.drift {
  background: var(--warn-ground);
  border: 1px solid var(--warn);
  border-radius: 10px;
  padding: 1rem 1.15rem;
}

.drift p { margin: .5rem 0 0; }

.drift__list {
  list-style: none;
  margin: .8rem 0 0;
  padding: 0;
  display: grid;
  gap: .4rem;
}

.drift__list li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .5rem;
  align-items: baseline;
  padding-bottom: .4rem;
  border-bottom: 1px solid var(--warn);
  font-size: .85rem;
}

/* The before-and-after is the whole point of the row, so it gets its own line
   rather than being folded into the title it belongs to. */
.drift__what {
  grid-column: 1 / -1;
  font-family: var(--mono);
  font-size: .72rem;
  color: var(--ink-muted);
}

.drift__accept { font-size: .8rem; color: var(--ink-muted); }

.ribbon {
  position: absolute;
  top: .5rem;
  left: .5rem;
  background: var(--warn);
  color: #fff;
  font-family: var(--mono);
  font-size: .64rem;
  letter-spacing: .06em;
  text-transform: uppercase;
  padding: .15rem .45rem;
  border-radius: 4px;
}

/* --- footer --------------------------------------------------------- */

.footer {
  border-top: 1px solid var(--rule);
  padding-top: 1.4rem;
  font-size: .78rem;
  color: var(--ink-muted);
  display: flex;
  flex-direction: column;
  gap: .35rem;
}

.footer code { font-size: .72rem; }

.hidden { display: none !important; }

@media print {
  .controls { position: static; }
  .card { break-inside: avoid; box-shadow: none; }
}
`
