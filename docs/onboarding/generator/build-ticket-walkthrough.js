// Deep-dive companion deck for Session 2 (the `ticket` skill).
//
// Where 02-ticket.pptx is the usage-focused, live-view tour (per slide-theme.md),
// this deck is the opposite by design: a transcript-driven walkthrough of ONE
// real ticket — EUDPA-213, Java hot-reload — taken through plan, implement and
// refactor. It leans on terminal snippets lifted from the captured logs under
// workareas/ticket-skill-demo/{plan,implement,refactor}.log, so viewers see what
// the skill actually said and did, not a paraphrase.
//
// It reuses the programme theme (white + steel-blue, Arial + Courier New) and
// adds one new device: a dark terminal card for prompts, commands, log output
// and diffs. Output: ../02b-ticket-walkthrough.pptx (+ .md page).

const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..");

// Programme palette (white + muted steel-blue) — matches build-skill-decks.js.
const C = {
  black: "0f172a",
  blue: "2e5077",
  blueDark: "22405f",
  grey: "64748b",
  white: "ffffff",
  lightGrey: "f1f5f9",
  midGrey: "94a3b8",
  tint: "eaeff5",
  amber: "d97706",
};

// Terminal-card palette — the one new device this deck introduces.
const T = {
  bg: "0b1220",      // near-black slate
  bar: "1e293b",     // header bar
  text: "e2e8f0",    // default mono text
  muted: "94a3b8",   // comments / secondary
  prompt: "38bdf8",  // user prompts and the $ sigil (sky)
  cmd: "a5b4fc",     // shell commands (indigo)
  ok: "4ade80",      // success / added lines (green)
  warn: "fbbf24",    // highlight markers / warnings (amber)
  del: "f87171",     // removed diff lines (red)
  dotR: "ef4444", dotA: "f59e0b", dotG: "22c55e",
};

const FONT = "Arial", MONO = "Courier New";
const W = 13.333, H = 7.5, M = 0.7, BAND = 0.28;

const band = (s) => s.addShape("rect", { x: 0, y: 0, w: BAND, h: H, fill: { color: C.blue } });

const footer = (s, n) => {
  s.addText("trade-imports workspace onboarding · ticket deep dive", { x: M, y: H - 0.5, w: 9, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey });
  s.addText(`${n}`, { x: W - 1.2, y: H - 0.5, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey, align: "right" });
};

const heading = (s, label, title) => {
  s.addText(label.toUpperCase(), { x: M, y: 0.5, w: 11.95, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 2, margin: 0 });
  s.addText(title, { x: M, y: 0.8, w: 11.95, h: 0.7, fontFace: FONT, fontSize: 26, bold: true, color: C.black, margin: 0 });
};

// ---- terminal card --------------------------------------------------------
// lines: array of "line"; a line is either a string (default text) or an array
// of segments [text, colorKey, bold]. "" => blank line.
function termRuns(lines) {
  const runs = [];
  lines.forEach((line) => {
    const segs = typeof line === "string" ? [[line]] : (Array.isArray(line[0]) ? line : [line]);
    if (line === "" || (Array.isArray(line) && line.length === 0)) {
      runs.push({ text: " ", options: { breakLine: true } });
      return;
    }
    segs.forEach((seg, i) => {
      const [text, colorKey, bold] = Array.isArray(seg) ? seg : [seg];
      runs.push({
        text: text || " ",
        options: { color: T[colorKey] || T.text, bold: !!bold, breakLine: i === segs.length - 1 },
      });
    });
  });
  return runs;
}

function term(s, { x = M, y, w = 11.95, h, title = "zsh", lines, fontSize = 11.5 }) {
  s.addShape("roundRect", { x, y, w, h, rectRadius: 0.06, fill: { color: T.bg }, line: { color: T.bar, width: 1 } });
  // header bar
  const barH = 0.34;
  s.addShape("roundRect", { x, y, w, h: barH, rectRadius: 0.06, fill: { color: T.bar }, line: { type: "none" } });
  s.addShape("rect", { x, y: y + barH - 0.1, w, h: 0.1, fill: { color: T.bar }, line: { type: "none" } });
  [T.dotR, T.dotA, T.dotG].forEach((c, i) => {
    s.addShape("ellipse", { x: x + 0.18 + i * 0.22, y: y + barH / 2 - 0.055, w: 0.11, h: 0.11, fill: { color: c }, line: { type: "none" } });
  });
  s.addText(title, { x: x + 0.95, y, w: w - 1.2, h: barH, fontFace: MONO, fontSize: 9.5, color: T.muted, valign: "middle", margin: 0 });
  // body
  s.addText(termRuns(lines), {
    x: x + 0.28, y: y + barH + 0.06, w: w - 0.5, h: h - barH - 0.16,
    fontFace: MONO, fontSize, color: T.text, valign: "top", lineSpacingMultiple: 1.05, margin: 0,
  });
}

// small blue chip (phase / label)
function chip(s, text, x, y, w = 1.85) {
  s.addShape("rect", { x, y, w, h: 0.42, fill: { color: C.blue } });
  s.addText(text, { x, y, w, h: 0.42, fontFace: FONT, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", charSpacing: 1, margin: 0 });
}

// bullet block on the right of a slide
function bullets(s, items, { x = M, y, w = 11.95, fontSize = 13.5 } = {}) {
  s.addText(items.map((b, i) => ({
    text: b, options: { bullet: { code: "2022", indent: 14 }, color: C.black, breakLine: true, paraSpaceAfter: 7 },
  })), { x, y, w, h: 2.4, fontFace: FONT, fontSize, color: C.black, valign: "top", margin: 0 });
}

// phase divider slide
function divider(pres, { phase, n, title, blurb, trigger }) {
  const s = pres.addSlide();
  s.background = { color: C.white };
  s.addShape("rect", { x: 0, y: 0, w: 2.2, h: H, fill: { color: C.blue } });
  s.addText(`${n}`, { x: 0, y: 2.4, w: 2.2, h: 2.6, fontFace: FONT, fontSize: 150, bold: true, color: "3c648f", align: "center", valign: "middle", margin: 0 });
  s.addText(`PHASE ${n} OF 3`, { x: 2.8, y: 2.25, w: 9.8, h: 0.4, fontFace: FONT, fontSize: 13, bold: true, color: C.blue, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 2.75, y: 2.6, w: 10, h: 1.0, fontFace: FONT, fontSize: 54, bold: true, color: C.black, margin: 0 });
  s.addText(blurb, { x: 2.8, y: 3.75, w: 9.6, h: 0.8, fontFace: FONT, fontSize: 15, color: C.grey, italic: true, margin: 0 });
  s.addText([
    { text: "Trigger   ", options: { color: C.grey, bold: true } },
    { text: trigger, options: { fontFace: MONO, color: C.blueDark, bold: true } },
  ], { x: 2.8, y: 4.7, w: 9.6, h: 0.4, fontFace: FONT, fontSize: 14, margin: 0 });
  return s;
}

// =====================================================================
const pres = new pptxgen();
pres.defineLayout({ name: "W", width: W, height: H });
pres.layout = "W";
pres.title = "Session 2 deep dive — the ticket skill on EUDPA-213";

let s;

// 1 — Title -----------------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
s.addShape("rect", { x: 0, y: 0, w: 0.45, h: H, fill: { color: C.blue } });
s.addText("TRADE-IMPORTS WORKSPACE ONBOARDING · DEEP DIVE", { x: 1.1, y: 1.35, w: 11, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.blue, charSpacing: 3, margin: 0 });
s.addText("Session 2 — companion walkthrough", { x: 1.05, y: 1.85, w: 11, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.grey, margin: 0 });
s.addText("ticket", { x: 1.0, y: 2.45, w: 11.6, h: 1.1, fontFace: MONO, fontSize: 52, bold: true, color: C.blueDark, margin: 0 });
s.addText("A real run, end to end — EUDPA-213, Java hot-reload across four repos", { x: 1.05, y: 3.75, w: 11.2, h: 0.5, fontFace: FONT, fontSize: 18, color: C.black, margin: 0 });
s.addText("plan → implement → refactor, told in the words of the actual transcript.", { x: 1.05, y: 4.25, w: 11.2, h: 0.5, fontFace: FONT, fontSize: 16, color: C.grey, italic: true, margin: 0 });
term(s, {
  x: 1.05, y: 5.0, w: 8.4, h: 1.5, title: "claude — workspace root",
  lines: [
    [["▸ ", "prompt", true], ["plan EUDPA-213", "prompt", true]],
    [["▸ ", "prompt", true], ["implement EUDPA-213", "prompt", true]],
    [["▸ ", "prompt", true], ["refactor EUDPA-213", "prompt", true]],
  ],
});

// 2 — The ticket ------------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "What you're handed", "The ticket — EUDPA-213");
term(s, {
  y: 1.55, h: 2.55, title: "workareas/ticket-planning/EUDPA-213/ticket.md",
  lines: [
    [["EUDPA-213", "ok", true], ["  (Task)  Hot-reload Java services in docker-compose-dev"]],
    "",
    [["Today  ", "muted"], ["editing a .java needs `make docker-restart-backend`"]],
    [["       ", "muted"], ["— a ~20–30s tax after every change."]],
    [["Want   ", "muted"], ["Spring Boot DevTools parity with frontend nodemon:"]],
    [["       ", "muted"], ["edit src → auto in-container restart in a few seconds."]],
    [["Scope  ", "muted"], ["backend + stub + reference-data; keep prod image clean."]],
  ],
});
s.addText("ACCEPTANCE CRITERIA (abbreviated)", { x: M, y: 4.35, w: 11.95, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 2, margin: 0 });
bullets(s, [
  "All three Java services hot-reload under make docker-compose-dev — no manual bounce.",
  "spring-boot-devtools excluded from the production image.",
  "docker/stack/AGENTS.md updated; no regression to make docker-compose-up.",
], { y: 4.7 });
footer(s, 2);

// 3 — The three phases ------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "One skill, three phases", "How the run is shaped");
const phases = [
  ["plan", "Reads the ticket, maps the repos, writes a plan you argue with. No code.", "1"],
  ["implement", "Confirms the baseline, branches per repo, builds the plan step by step.", "2"],
  ["refactor", "A quality pass over the committed diff only — tidy, not new behaviour.", "3"],
];
{
  const top = 1.7, gap = 0.2, cardH = (5.9 - top - gap * 2) / 3;
  phases.forEach((p, i) => {
    const y = top + i * (cardH + gap);
    s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
    s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.blue } });
    s.addText(p[0], { x: M + 0.35, y, w: 3.0, h: cardH, fontFace: MONO, fontSize: 20, bold: true, color: C.blueDark, valign: "middle", margin: 0 });
    s.addText(p[1], { x: M + 3.5, y, w: 8.1, h: cardH, fontFace: FONT, fontSize: 14, color: C.grey, valign: "middle", margin: 0 });
  });
}
s.addText("Each phase is a fresh prompt; each hands the next a written artifact — the plan — so nothing is held only in chat.", { x: M, y: 6.05, w: 11.95, h: 0.6, fontFace: FONT, fontSize: 13, italic: true, color: C.grey, margin: 0 });
footer(s, 3);

// ===== DIVIDER — PLAN =====
divider(pres, { n: 1, title: "Plan", blurb: "Gather the context, surface the decisions as text — before a line of code exists.", trigger: "plan EUDPA-213" });

// 4 — Plan kick-off ---------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Plan · kick-off", "It gathers the context for you");
term(s, {
  y: 1.55, h: 3.5, title: "claude — PLAN phase (references/PLANNER.md)",
  lines: [
    [["▸ ", "prompt", true], ["plan EUDPA-213", "prompt", true]],
    "",
    [["$ ", "ok"], ["tools/ticket/prepare-plan.sh EUDPA-213", "cmd"]],
    [["  → wrote ticket.md + .plan-meta.json", "muted"]],
    "",
    [["$ ", "ok"], ["tools/ticket/prepare-plan.sh EUDPA-213 \\", "cmd"]],
    [["      --repos backend,stub,reference-data", "cmd"]],
    [["  → detected [springboot, spring-data-mongodb, openapi-springdoc,", "muted"]],
    [["     aws-sdk-v2, rest-api]; baked best-practices/{repo}.md", "muted"]],
    "",
    [["  ⟳ dispatched 2 Explore agents in parallel:", "warn"]],
    [["     · map docker/stack dev overlay", "text"]],
    [["     · map the 3 Java Dockerfiles + poms", "text"]],
  ],
  fontSize: 11,
});
s.addText("Before it plans anything, it pulls Jira, the affected repos, the per-stack best-practices, and reads the existing files in parallel.", { x: M, y: 5.25, w: 11.95, h: 0.6, fontFace: FONT, fontSize: 13.5, color: C.grey, italic: true, margin: 0 });
footer(s, 4);

// 5 — Plan: the catch -------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Plan · the catch", "It noticed the ticket wouldn't actually work");
s.addText("The ticket's literal scope — \"add DevTools + mount src\" — gives the fast-restart machinery but nothing ever triggers it. The skill caught this before any code was written:", { x: M, y: 1.5, w: 11.95, h: 0.7, fontFace: FONT, fontSize: 14, color: C.black, margin: 0 });
term(s, {
  y: 2.3, h: 3.1, title: "the load-bearing finding",
  lines: [
    [["! ", "warn", true], ["DevTools watches the COMPILED classpath", "warn", true], [" (target/classes),", "warn", true]],
    [["  not src/.", "warn", true]],
    "",
    [["  `mvn spring-boot:run` compiles ONCE at startup and never", "text"]],
    [["  recompiles. So you get the restart machinery — but nothing", "text"]],
    [["  ever changes target/classes, so nothing fires.", "text"]],
    "",
    [["  → Fix needs a SEPARATE recompile step running in-container,", "ok"]],
    [["    plus a trigger-file to collapse a batch into one restart.", "ok"]],
  ],
});
s.addText("This is the whole value of the plan phase: a wrong assumption surfaced as a sentence you can read, not a bug you debug three days later.", { x: M, y: 5.6, w: 11.95, h: 0.7, fontFace: FONT, fontSize: 13.5, color: C.grey, italic: true, margin: 0 });
footer(s, 5);

// 6 — Plan: you argue with it -----------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Plan · you argue with it", "The plan is a conversation, not a verdict");
term(s, {
  y: 1.5, h: 4.5, title: "plan.log — the back-and-forth (abridged)",
  lines: [
    [["▸ ", "prompt", true], ["Why set livereload to false? Doesn't that do what we want?", "prompt"]],
    [["  Set an agent to look into nodemon-for-SpringBoot patterns.", "prompt"]],
    [["  → ", "muted"], ["restart ≠ livereload. restart IS the nodemon equiv (stays", "text"]],
    [["    on); livereload only pings a browser — dead weight here.", "text"]],
    "",
    [["▸ ", "prompt", true], ["How \"big\" is this fizzed-watcher plugin? Stars? Downloads?", "prompt"]],
    [["  Can't help feeling we're missing a better option.", "prompt"]],
    [["  → ", "muted"], ["61★, single-maintainer; only a 2015 artifact on Maven", "text"]],
    [["    Central (the 2025 tag was never published); rank #4266.", "text"]],
    [["  → ", "muted"], ["verdict: niche, frozen. ", "text"], ["Dropped it.", "del", true]],
    "",
    [["  ⇒ pivot: ", "ok", true], ["DevTools + a ~10-line in-container mtime-poll", "ok"]],
    [["    `mvn compile` loop. Zero third-party deps.", "ok"]],
  ],
  fontSize: 11,
});
s.addText("Two challenges from you reshaped the approach — and each one is recorded with the evidence that settled it.", { x: M, y: 6.15, w: 11.95, h: 0.5, fontFace: FONT, fontSize: 13, italic: true, color: C.grey, margin: 0 });
footer(s, 6);

// 7 — Plan: the settled approach --------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Plan · the settled approach", "What landed in plan.md");
term(s, {
  y: 1.5, h: 3.55, title: "docker/dev-run.sh — the sketch the plan settled on",
  lines: [
    [["# watch loop: recompile when src changes, then DevTools restarts", "muted"]],
    [["while true; do", "text"]],
    [["  ", "text"], ["if", "cmd"], [" [ -n \"$(find src -newer \"$marker\" ...)\" ]; ", "text"], ["then", "cmd"]],
    [["    touch \"$marker\"          ", "text"], ["# stamp BEFORE compile", "muted"]],
    [["    mvn -o -q compile process-classes \\", "text"]],
    [["      && touch target/classes/.reloadtrigger", "text"]],
    [["  ", "text"], ["fi", "cmd"]],
    [["  sleep 2", "text"]],
    [["done &", "text"]],
    [["exec mvn spring-boot:run -Dspring-boot.run.profiles=local", "ok"]],
  ],
});
bullets(s, [
  "mtime poll (find -newer), NOT inotify — events don't cross the macOS bind mount; mtimes do.",
  "devtools <optional>true</optional> → auto-excluded from the prod jar.",
  "Confidence raised to Medium-High; fizzed-watcher kept in the doc as a rejected option, with the numbers.",
], { y: 5.25 });
footer(s, 7);

// 8 — Plan: handover prompt -------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Plan · the handover", "It front-loads the decisions a fresh agent would undo");
s.addText("Instead of implementing in the same chat, you can ask for a copy-paste handover prompt. The settled, hard-won decisions go at the top as non-negotiables:", { x: M, y: 1.5, w: 11.95, h: 0.7, fontFace: FONT, fontSize: 14, color: C.black, margin: 0 });
term(s, {
  y: 2.3, h: 3.7, title: "the handover prompt — ## Non-negotiable decisions",
  lines: [
    [["• ", "blue"], ["DevTools restart + in-container mtime-poll `mvn compile` loop.", "text"]],
    [["• ", "blue"], ["NO third-party watcher plugin. ", "text"], ["fizzed-watcher was rejected.", "del"]],
    [["• ", "blue"], ["mtime poll (find -newer), ", "text"], ["NOT inotify/entr", "warn"], [".", "text"]],
    [["• ", "blue"], ["spring-boot-devtools <optional>true</optional> in each pom.", "text"]],
    [["• ", "blue"], ["mvn spring-boot:run — ", "text"], ["never", "warn"], [" -Dspring-boot.run.fork=false.", "text"]],
    "",
    [["• ", "ok"], ["Canary on backend FIRST, verify, then fan out.", "ok"]],
    [["• ", "ok"], ["Same branch name across all four repos. One PR each.", "ok"]],
  ],
});
s.addText("\"These were front-loaded deliberately — a fresh agent is most likely to 'helpfully' undo exactly these.\"", { x: M, y: 6.1, w: 11.95, h: 0.5, fontFace: FONT, fontSize: 13, italic: true, color: C.grey, margin: 0 });
footer(s, 8);

// ===== DIVIDER — IMPLEMENT =====
divider(pres, { n: 2, title: "Implement", blurb: "Build the plan, repo by repo, keeping the tests green and verifying every target live.", trigger: "implement EUDPA-213" });

// 9 — Implement kick-off ----------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Implement · kick-off", "Baseline first, then investigate");
term(s, {
  y: 1.55, h: 3.7, title: "claude — IMPLEMENT phase (references/IMPLEMENTOR.md)",
  lines: [
    [["▸ ", "prompt", true], ["implement EUDPA-213", "prompt", true], ["   (+ the handover prompt)", "muted"]],
    "",
    [["$ ", "ok"], ["tools/ticket/prepare-implement.sh EUDPA-213", "cmd"]],
    [["  → plan present; detect-tech re-validated; .implement-meta.json", "muted"]],
    "",
    [["  Investigated current state:", "text"]],
    [["   · backend  Dockerfile has a dev-run stage — stale comment", "text"]],
    [["   · stub / reference-data  ", "text"], ["NO dev-run stage", "warn"], ["  (ports 8087/8086)", "muted"]],
    [["   · dev.compose.yml — backend mounts src; the other two don't", "text"]],
    "",
    [["$ ", "ok"], ["mvn verify", "cmd"], ["   → BUILD SUCCESS  ", "muted"], ["(baseline green)", "ok"]],
    [["  TaskList: canary → fan out → docs/no-regression → sonar+PRs", "muted"]],
  ],
  fontSize: 11,
});
s.addText("It re-reads reality rather than trusting the plan blindly — and proves the tests are green before it changes anything.", { x: M, y: 5.45, w: 11.95, h: 0.5, fontFace: FONT, fontSize: 13.5, italic: true, color: C.grey, margin: 0 });
footer(s, 9);

// 10 — Implement: canary first ----------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Implement · canary first", "Prove it on one service before fanning out");
s.addText("It wired backend only (pom + application-local.yml + docker/dev-run.sh + Dockerfile), brought up the stack via the wrapper, edited a .java, and watched the logs:", { x: M, y: 1.5, w: 11.95, h: 0.7, fontFace: FONT, fontSize: 13.5, color: C.black, margin: 0 });
term(s, {
  y: 2.3, h: 3.4, title: "make docker-compose-dev → backend logs (live canary)",
  lines: [
    [["$ ", "ok"], ["# edited ProxyConfig.java: added [EUDPA-213-CANARY] to a log line", "muted"]],
    "",
    [["File Watcher  ", "muted"], ["Restarting due to 115 class path changes", "text"]],
    [["              ", "muted"], ["→ ONE restart (trigger-file collapsed the batch)", "ok"]],
    [["restartedMain ", "muted"], ["No HTTP_PROXY configured — direct connections ", "text"], ["[EUDPA-213-CANARY]", "warn", true]],
    [["restartedMain ", "muted"], ["Started Application in 2.619 seconds", "text"]],
    "",
    [["  ✓ edited code served, ", "ok"], ["with no `make docker-restart-backend`.", "ok"]],
    [["  ✓ reverted the canary edit; working tree clean.", "ok"]],
  ],
});
s.addText("\"restartedMain\" is DevTools' two-classloader restart signature — proof the reload actually fired, not just the JVM booting.", { x: M, y: 5.85, w: 11.95, h: 0.5, fontFace: FONT, fontSize: 12.5, italic: true, color: C.grey, margin: 0 });
footer(s, 10);

// 11 — Implement: fan out + verify every target -----------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Implement · fan out", "Verify every target — not a spot-check");
term(s, {
  y: 1.5, h: 2.6, title: "live verify — stub (8087) and reference-data (8086)",
  lines: [
    [["stub          ", "muted"], ["Restarting due to 29 class path changes", "text"]],
    [["restartedMain ", "muted"], ["…served ", "text"], ["[EUDPA-213-STUB]", "warn", true], [" · Started in 1.97s", "text"]],
    "",
    [["reference-data", "muted"], [" Restarting due to 35 class path changes", "text"]],
    [["restartedMain ", "muted"], ["…served ", "text"], ["[EUDPA-213-REFDATA]", "warn", true], [" · Started in 1.54s", "text"]],
    "",
    [["  ✓ both PASSED; both canary edits reverted.", "ok"]],
  ],
});
s.addText("And when something else broke, it didn't shrug it off:", { x: M, y: 4.35, w: 11.95, h: 0.35, fontFace: FONT, fontSize: 13.5, bold: true, color: C.black, margin: 0 });
term(s, {
  y: 4.75, h: 1.65, title: "the out-of-scope failure it refused to excuse",
  lines: [
    [["! ", "warn"], ["gateway container exited(1) — \"Could not transfer artifact", "text"]],
    [["    …repo.maven.apache.org\" while 4 Java builds compiled at once.", "text"]],
    [["  → ", "muted"], ["investigated, confirmed a transient Maven Central outage", "text"]],
    [["    (out-of-scope service), restarted it — recovered. Not this change.", "ok"]],
  ],
  fontSize: 10.5,
});
footer(s, 11);

// 12 — Implement: green, committed, PRs -------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Implement · hand-off", "Green, committed, four PRs");
term(s, {
  y: 1.5, h: 3.4, title: "prod-exclusion check + commits",
  lines: [
    [["$ ", "ok"], ["unzip -l target/*.jar | grep devtools", "cmd"]],
    [["  → (empty)   ", "muted"], ["✓ devtools absent from every prod jar", "ok"]],
    "",
    [["backend         ", "text"], ["d54d545  ", "cmd"], ["4 files  +71 −3", "muted"]],
    [["stub            ", "text"], ["900c72e  ", "cmd"], ["4 files  +96 −1", "muted"]],
    [["reference-data  ", "text"], ["6733a3e  ", "cmd"], ["4 files  +96 −1", "muted"]],
    [["workspace       ", "text"], ["ee878de  ", "cmd"], ["4 files  +33 −17", "muted"]],
    "",
    [["  PRs → backend #53 · stub #7 · reference-data #13 · workspace #17", "ok"]],
  ],
});
bullets(s, [
  "Same branch name (feature/EUDPA-213-java-hot-reload) across all four repos.",
  "Deviations recorded under ## Implementation Notes in plan.md.",
  "Flagged honestly: dev-run.sh committed mode 100644 (host chmod blocked by the sandbox) — fine in-container.",
], { y: 5.1 });
footer(s, 12);

// ===== DIVIDER — REFACTOR =====
divider(pres, { n: 3, title: "Refactor", blurb: "A quality pass over the committed diff only — tidy what's there, find what's lurking.", trigger: "refactor EUDPA-213" });

// 13 — Refactor kick-off ----------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Refactor · scope", "Tidy the diff — not new behaviour");
term(s, {
  y: 1.55, h: 3.3, title: "claude — refactor EUDPA-213 (over the committed diff)",
  lines: [
    [["▸ ", "prompt", true], ["refactor EUDPA-213", "prompt", true]],
    [["  Quality/tidy pass over the committed diff ONLY.", "prompt"]],
    "",
    [["  Examined all four repos:", "text"]],
    [["   · docker/dev-run.sh — byte-identical across the 3 services", "text"]],
    [["     (same SHA 1bfb98ff…)", "muted"]],
    [["   · 3 dev-run Dockerfile stages — differ only by port", "text"]],
    [["   · application-local.yml devtools blocks — consistent", "text"]],
    "",
    [["$ ", "ok"], ["shellcheck docker/dev-run.sh", "cmd"], ["   → clean (exit 0)", "ok"]],
  ],
  fontSize: 11,
});
s.addText("The refactor phase is scoped to the diff: it does not reach into the wider codebase, and it carries the same non-negotiables forward.", { x: M, y: 5.1, w: 11.95, h: 0.5, fontFace: FONT, fontSize: 13.5, italic: true, color: C.grey, margin: 0 });
footer(s, 13);

// 14 — Refactor: the latent bug ---------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Refactor · the latent bug", "shellcheck was clean — it found one anyway");
s.addText("The find … | grep -q . change detector is a footgun under set -o pipefail: grep -q exits on first match, find takes SIGPIPE (141), pipefail propagates it as false — so a busy poll cycle can silently MISS edits.", { x: M, y: 1.5, w: 11.95, h: 0.85, fontFace: FONT, fontSize: 13, color: C.black, margin: 0 });
term(s, {
  y: 2.45, h: 2.95, title: "docker/dev-run.sh — the fix (all three repos, identical)",
  lines: [
    [["  watch_and_compile() {", "muted"]],
    [["    while true; do", "muted"]],
    [["- ", "del", true], ["    if find src -type f \\( -name '*.java' … \\) \\", "del"]],
    [["- ", "del", true], ["         -newer \"$marker\" 2>/dev/null | grep -q .; then", "del"]],
    [["+ ", "ok", true], ["    if [ -n \"$(find src -type f \\( -name '*.java' … \\) \\", "ok"]],
    [["+ ", "ok", true], ["         -newer \"$marker\" 2>/dev/null)\" ]; then", "ok"]],
    [["        touch \"$marker\"", "muted"]],
  ],
});
s.addText("Pipe-free command substitution: no SIGPIPE, no pipefail interaction, and it drops the grep dependency. Same mtime-poll mechanism — the non-negotiable held.", { x: M, y: 5.55, w: 11.95, h: 0.6, fontFace: FONT, fontSize: 12.5, italic: true, color: C.grey, margin: 0 });
footer(s, 14);

// 15 — Refactor: verify + commit --------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Refactor · verify & commit", "Touching dev-run.sh mandated a fresh canary");
term(s, {
  y: 1.5, h: 3.0, title: "make docker-compose-dev → re-verified all three",
  lines: [
    [["backend         ", "muted"], ["115 changes → ", "text"], ["[canary] served", "warn", true], [" → 3.16s", "text"]],
    [["stub            ", "muted"], ["29 changes  → ", "text"], ["[canary] served", "warn", true], [" → 2.74s", "text"]],
    [["reference-data  ", "muted"], ["35 changes  → ", "text"], ["[canary] served", "warn", true], [" → 2.72s", "text"]],
    "",
    [["  ✓ all on restartedMain, no manual bounce. Edits reverted.", "ok"]],
    [["  ✓ shellcheck clean; all three dev-run.sh still SHA-identical.", "ok"]],
  ],
});
term(s, {
  y: 4.7, h: 1.65, title: "git — one commit per repo, PRs updated",
  lines: [
    [["refactor(EUDPA-213): make dev-run.sh poll robust under pipefail", "text"]],
    "",
    [["backend        d54d545..cda45c6   stub  900c72e..46290ba", "cmd"]],
    [["reference-data 6733a3e..179c06a   ", "cmd"], ["(workspace #17 unchanged)", "muted"]],
  ],
  fontSize: 10.5,
});
footer(s, 15);

// 16 — Refactor: what it left alone -----------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Refactor · restraint", "What it deliberately left alone");
s.addText("Just as important as the fix — the things it looked at and chose not to churn:", { x: M, y: 1.55, w: 11.95, h: 0.4, fontFace: FONT, fontSize: 14, color: C.black, margin: 0 });
{
  const items = [
    ["3 near-duplicate Dockerfile dev-run stages", "Differ only by port; mirror the existing build/dev/prod duplication and can't be DRY'd across separate repos. Acceptable."],
    ["application-local.yml devtools blocks", "Already consistent; comments already explain the \"why\". No change."],
    ["mvn -o -q compile process-classes", "compile is technically redundant but explicit and harmless — as the plan specified. Not worth the churn."],
    ["Workspace docs (AGENTS.md, Makefile, CLAUDE.md)", "Accurate, no migration comments. Untouched."],
  ];
  const top = 2.1, gap = 0.18, cardH = (6.35 - top - gap * 3) / 4;
  items.forEach((it, i) => {
    const y = top + i * (cardH + gap);
    s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
    s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.amber } });
    s.addText(it[0], { x: M + 0.35, y, w: 4.5, h: cardH, fontFace: MONO, fontSize: 12, bold: true, color: C.blueDark, valign: "middle", margin: 0 });
    s.addText(it[1], { x: M + 5.0, y: y + 0.04, w: 6.7, h: cardH - 0.08, fontFace: FONT, fontSize: 11.5, color: C.grey, valign: "middle", margin: 0 });
  });
}
footer(s, 16);

// 17 — The throughline ------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "What to notice", "The throughline across all three phases");
{
  const items = [
    ["Challenge before code", "The plan caught a wrong assumption (DevTools watches target/classes) as a sentence — not a three-day bug."],
    ["You stay the decision-maker", "Two of your questions reshaped the approach; each pivot is recorded with the evidence that settled it."],
    ["Canary first, verify every target", "Backend proven end-to-end before the fan-out — and stub + reference-data each verified live, not spot-checked."],
    ["Don't excuse failures", "A transient, out-of-scope gateway failure was investigated and explained, not waved away as \"pre-existing\"."],
    ["Don't over-engineer", "The refactor fixed one real latent bug and consciously left four tidy-looking-but-fine things alone."],
  ];
  const top = 1.7, gap = 0.16, cardH = (6.4 - top - gap * 4) / 5;
  items.forEach((it, i) => {
    const y = top + i * (cardH + gap);
    s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
    s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.blue } });
    s.addText(it[0], { x: M + 0.35, y, w: 3.7, h: cardH, fontFace: FONT, fontSize: 13.5, bold: true, color: C.black, valign: "middle", margin: 0 });
    s.addText(it[1], { x: M + 4.2, y: y + 0.04, w: 7.5, h: cardH - 0.08, fontFace: FONT, fontSize: 11.5, color: C.grey, valign: "middle", margin: 0 });
  });
}
footer(s, 17);

// 18 — Live view ------------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
chip(s, "LIVE VIEW", M, 0.55);
s.addText("Don't memorise this run — read the real thing", { x: M, y: 1.1, w: 11.95, h: 0.7, fontFace: FONT, fontSize: 26, bold: true, color: C.black, margin: 0 });
{
  const rows = [
    ["workareas/ticket-skill-demo/*.log", "the three transcripts this deck is built from — plan / implement / refactor"],
    [".claude/skills/ticket/SKILL.md", "what the skill actually executes — straight from source"],
    ["plan / implement / refactor EUDPA-X", "how you launch each phase on a ticket of your own"],
  ];
  let ly = 2.2;
  rows.forEach((l) => {
    s.addShape("rect", { x: M, y: ly, w: 11.95, h: 0.95, fill: { color: C.tint } });
    s.addShape("rect", { x: M, y: ly, w: 0.09, h: 0.95, fill: { color: C.blue } });
    s.addText(l[0], { x: M + 0.35, y: ly, w: 6.0, h: 0.95, fontFace: MONO, fontSize: 13, bold: true, color: C.blueDark, valign: "middle", margin: 0 });
    s.addText(l[1], { x: M + 6.5, y: ly, w: 5.1, h: 0.95, fontFace: FONT, fontSize: 12.5, color: C.grey, valign: "middle", margin: 0 });
    ly += 1.1;
  });
  s.addText("The snippets here are lifted from those logs — the SKILL.md and the transcripts stay the source of truth.", { x: M, y: ly + 0.05, w: 11.95, h: 0.4, fontFace: FONT, fontSize: 13, italic: true, color: C.grey, margin: 0 });
}
footer(s, 18);

// 19 — Try it ---------------------------------------------------------
s = pres.addSlide();
s.background = { color: C.white };
band(s);
heading(s, "Try it", "Have a go yourself");
s.addShape("rect", { x: M, y: 2.0, w: 11.95, h: 2.5, fill: { color: C.tint } });
s.addShape("rect", { x: M, y: 2.0, w: 0.12, h: 2.5, fill: { color: C.blue } });
s.addText([
  { text: "Pick a real ticket you know and run just the plan phase: ", options: { color: C.black } },
  { text: "plan EUDPA-XXXX", options: { fontFace: MONO, bold: true, color: C.blueDark } },
  { text: ".", options: { color: C.black } },
  { text: "  No code is written, so it's a safe first run. Open ", options: { color: C.black, breakLine: false } },
  { text: "plan.md", options: { fontFace: MONO, bold: true, color: C.blueDark } },
  { text: " and look for the same shape you saw here: the numbered steps, the risks, and the [NEEDS VERIFICATION] markers where it wants you to decide.", options: { color: C.black } },
], { x: M + 0.5, y: 2.35, w: 11.0, h: 1.9, fontFace: FONT, fontSize: 17, valign: "top", margin: 0 });
s.addText("Read first: workareas/ticket-skill-demo/plan.log — then run your own and compare.", { x: M, y: 5.0, w: 11.95, h: 0.4, fontFace: FONT, fontSize: 13.5, color: C.grey, italic: true, margin: 0 });
s.addText("Back to Session 2 — the ticket skill (02-ticket.md).", { x: M, y: H - 0.7, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.blueDark, margin: 0 });
footer(s, 19);

pres.writeFile({ fileName: path.join(OUT, "02b-ticket-walkthrough.pptx") })
  .then((f) => console.log("built", f));
