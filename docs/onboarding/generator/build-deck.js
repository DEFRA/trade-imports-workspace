const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");
const path = require("path");

// Deck is written back into the onboarding folder (the parent dir).
const OUT = path.resolve(__dirname, "..");

// ---- Clean modern palette (white + muted steel-blue) -----------------------
const C = {
  black: "0f172a",     // ink
  blue: "2e5077",      // primary — greyed steel blue
  blueDark: "22405f",  // deeper blue
  blueTint: "eaeff5",  // light blue-grey panel
  green: "22405f",     // (kept name; mapped to blue)
  yellow: "2e5077",    // (kept name; mapped to blue)
  amber: "d97706",     // secondary categorical (Java)
  grey: "64748b",      // muted slate
  white: "ffffff",
  lightGrey: "f1f5f9", // panel
  midGrey: "94a3b8",   // subtle
};
const FONT = "Arial";
const MONO = "Courier New";

// ---- icon rasteriser -------------------------------------------------------
async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color, size: String(size) })
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

const W = 13.333, H = 7.5, M = 0.7, BAND = 0.28;

// recurring left band on content slides
function band(slide) {
  slide.addShape("rect", { x: 0, y: 0, w: BAND, h: H, fill: { color: C.blue } });
}
function footer(slide, n) {
  slide.addText("trade-imports-animals onboarding", {
    x: M, y: H - 0.5, w: 7, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey, align: "left",
  });
  slide.addText(`${n}`, {
    x: W - 1.2, y: H - 0.5, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey, align: "right",
  });
}
function heading(slide, label, title) {
  slide.addText(label.toUpperCase(), {
    x: M, y: 0.55, w: 11, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 2, margin: 0,
  });
  slide.addText(title, {
    x: M, y: 0.85, w: 11.8, h: 0.8, fontFace: FONT, fontSize: 30, bold: true, color: C.black, margin: 0,
  });
}

(async () => {
  const I = {
    book: await icon(FA.FaBook, "#ffffff"),
    pipe: await icon(FA.FaProjectDiagram, "#ffffff"),
    term: await icon(FA.FaTerminal, "#ffffff"),
    docker: await icon(FA.FaDocker, "#ffffff"),
    robot: await icon(FA.FaRobot, "#ffffff"),
    folder: await icon(FA.FaFolderOpen, "#2e5077"),
    check: await icon(FA.FaCheckCircle, "#22405f"),
    play: await icon(FA.FaPlayCircle, "#22405f"),
    layers: await icon(FA.FaLayerGroup, "#ffffff"),
    node: await icon(FA.FaNodeJs, "#2e5077"),
    java: await icon(FA.FaJava, "#d97706"),
    bolt: await icon(FA.FaBolt, "#0f172a"),
  };

  const pres = new pptxgen();
  pres.defineLayout({ name: "W", width: W, height: H });
  pres.layout = "W";
  pres.author = "trade-imports-animals";
  pres.title = "Session 1 — The workspace";

  // ============================ Slide 1 — Title ============================
  let s = pres.addSlide();
  s.background = { color: C.white };
  s.addShape("rect", { x: 0, y: 0, w: 0.45, h: H, fill: { color: C.blue } });
  s.addText("TRADE-IMPORTS-ANIMALS ONBOARDING", {
    x: 1.1, y: 1.5, w: 10, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.blue, charSpacing: 3, margin: 0,
  });
  s.addText("Session 1", {
    x: 1.05, y: 2.0, w: 11, h: 0.9, fontFace: FONT, fontSize: 28, color: C.grey, bold: true, margin: 0,
  });
  s.addText("The workspace, and\nwhy it exists", {
    x: 1.05, y: 2.75, w: 11.3, h: 1.9, fontFace: FONT, fontSize: 50, bold: true, color: C.black, lineSpacingMultiple: 1.0, margin: 0,
  });
  s.addText("What it is, how you work in it, and how to run it locally.", {
    x: 1.05, y: 5.1, w: 10.5, h: 0.8, fontFace: FONT, fontSize: 17, color: C.grey, italic: true, margin: 0,
  });

  // ====================== Slide 2 — What it is =============================
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "What it is", "A workspace, not a monorepo");
  // left prose
  s.addText([
    { text: "A local workspace that clones eight independent GitHub repos side by side and adds shared tooling on top.", options: { breakLine: true, paraSpaceAfter: 14 } },
    { text: "Each repo keeps its own git history, its own remotes, and its own CI.", options: { breakLine: true, paraSpaceAfter: 14 } },
    { text: "The workspace doesn't own them — it sits alongside and lets you work across all eight at once.", options: {} },
  ], { x: M, y: 2.0, w: 6.0, h: 3.2, fontFace: FONT, fontSize: 16, color: C.black, valign: "top", margin: 0 });
  // "Not a monorepo" pill
  s.addShape("roundRect", { x: M, y: 5.4, w: 3.6, h: 0.7, rectRadius: 0.08, fill: { color: C.blue } });
  s.addText("NOT a monorepo", { x: M, y: 5.4, w: 3.6, h: 0.7, fontFace: FONT, fontSize: 16, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  // right panel: 8 chips + shared tooling layer
  const px = 7.3, pw = 5.3;
  s.addShape("rect", { x: px, y: 1.95, w: pw, h: 4.2, fill: { color: C.lightGrey } });
  s.addText("8 independent repos", { x: px + 0.25, y: 2.1, w: pw - 0.5, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: C.grey, margin: 0 });
  const chips = ["frontend", "backend", "tests", "admin", "stub", "reference-data", "defra-id-stub", "dynamics-gateway"];
  chips.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = px + 0.25 + col * ((pw - 0.5) / 2 + 0.0) + col * 0.0;
    const cw = (pw - 0.7) / 2;
    const cxx = px + 0.25 + col * (cw + 0.2);
    const cy = 2.55 + row * 0.62;
    s.addShape("rect", { x: cxx, y: cy, w: cw, h: 0.5, fill: { color: C.white }, line: { color: C.midGrey, width: 1 } });
    s.addShape("rect", { x: cxx, y: cy, w: 0.07, h: 0.5, fill: { color: C.blue } });
    s.addText(c, { x: cxx + 0.18, y: cy, w: cw - 0.25, h: 0.5, fontFace: FONT, fontSize: 11, color: C.black, valign: "middle", margin: 0 });
  });
  s.addShape("rect", { x: px + 0.25, y: 5.5, w: pw - 0.5, h: 0.5, fill: { color: C.blue } });
  s.addText("+ shared tooling & cross-repo context", { x: px + 0.25, y: 5.5, w: pw - 0.5, h: 0.5, fontFace: FONT, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  footer(s, 2);

  // ====================== Slide 3 — Agent-first ===========================
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "How you work", "Agent-first: run the agent here");
  s.addText([
    { text: "You rarely drop into a single repo. You run ", options: {} },
    { text: "claude", options: { fontFace: MONO, bold: true, color: C.black } },
    { text: " in the workspace root — and the harness wires itself up.", options: {} },
  ], { x: M, y: 1.7, w: 11.8, h: 0.45, fontFace: FONT, fontSize: 15, color: C.grey, margin: 0 });
  {
    const colY = 2.45, colHd = 0.62, colH = 3.35, colW = 5.75;
    const cols = [
      { x: M, head: "claude in a vanilla repo", hc: C.grey, tc: C.grey,
        items: ["A general assistant", "One repo's context", "None of the team's workflows", "You wire up everything by hand"] },
      { x: M + 5.75 + 0.45, head: "claude in this workspace", hc: C.blue, tc: C.black,
        items: ["Ticketing, review & upgrade skills", "All eight repos in view", "Best-practice guides baked in", "Shared cross-repo tools"] },
    ];
    cols.forEach((col) => {
      s.addShape("rect", { x: col.x, y: colY, w: colW, h: colHd, fill: { color: col.hc } });
      s.addText(col.head, { x: col.x, y: colY, w: colW, h: colHd, fontFace: FONT, fontSize: 15, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
      s.addShape("rect", { x: col.x, y: colY + colHd, w: colW, h: colH - colHd, fill: { color: C.lightGrey } });
      s.addText(col.items.map((t, i) => ({ text: t, options: { bullet: { code: "2022" }, breakLine: i < col.items.length - 1, paraSpaceAfter: 12 } })),
        { x: col.x + 0.45, y: colY + colHd + 0.25, w: colW - 0.8, h: colH - colHd - 0.4, fontFace: FONT, fontSize: 14, color: col.tc, valign: "top", margin: 0 });
    });
    s.addText("Work inside a sub-repo and you lose the workspace skills — so drive from the root.", {
      x: M, y: colY + colH + 0.18, w: 11.8, h: 0.4, fontFace: FONT, fontSize: 13, italic: true, color: C.grey, margin: 0,
    });
  }
  footer(s, 3);

  // ====================== Slide 4 — Why it exists ==========================
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Why it exists", "Harness engineering: one shared place");
  s.addText("Running the agent at the root wires all of this up. Rather than every developer carrying the cross-repo workflow in their head, the workspace is the single place for:", {
    x: M, y: 1.75, w: 11.8, h: 0.7, fontFace: FONT, fontSize: 15, color: C.grey, margin: 0,
  });
  const rows = [
    [I.book, "Documentation", "Architecture, ADRs, runbooks, best-practice guides, synced Confluence."],
    [I.pipe, "Pipelines", "Trigger and read CI runs without leaving the workspace."],
    [I.term, "Dev scripts", "Clone, update, lint and test every repo at once."],
    [I.docker, "Docker", "One compose stack stands up all eight services together."],
    [I.robot, "The agent harness", "Skills and shared scripts that encode the team's workflows."],
  ];
  const cardY = 2.6, cardH = 0.74, gap = 0.1;
  rows.forEach((r, i) => {
    const y = cardY + i * (cardH + gap);
    s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
    s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.blue } });
    s.addShape("ellipse", { x: M + 0.35, y: y + 0.17, w: 0.44, h: 0.44, fill: { color: C.blue } });
    s.addImage({ data: r[0], x: M + 0.45, y: y + 0.27, w: 0.24, h: 0.24 });
    s.addText(r[1], { x: M + 1.05, y: y + 0.05, w: 3.3, h: cardH - 0.1, fontFace: FONT, fontSize: 15, bold: true, color: C.black, valign: "middle", margin: 0 });
    s.addText(r[2], { x: M + 4.4, y: y + 0.05, w: 7.4, h: cardH - 0.1, fontFace: FONT, fontSize: 13, color: C.grey, valign: "middle", margin: 0 });
  });
  footer(s, 4);

  // ====================== Slide 5 — The system shape =======================
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "The repos", "Real services, plus stubs for the outside world");
  // legend bottom-right
  s.addShape("ellipse", { x: 10.5, y: 6.62, w: 0.16, h: 0.16, fill: { color: C.blue } });
  s.addText("Node", { x: 10.73, y: 6.54, w: 0.7, h: 0.32, fontFace: FONT, fontSize: 11, color: C.grey, valign: "middle", margin: 0 });
  s.addShape("ellipse", { x: 11.6, y: 6.62, w: 0.16, h: 0.16, fill: { color: C.amber } });
  s.addText("Java", { x: 11.83, y: 6.54, w: 0.7, h: 0.32, fontFace: FONT, fontSize: 11, color: C.grey, valign: "middle", margin: 0 });
  {
    const groups = [
      { head: "What you build", hc: C.blue, items: [
        ["frontend", "Public web app", "node"],
        ["admin", "Internal admin UI", "node"],
        ["backend", "API & business logic", "java"],
        ["reference-data", "Reference data service", "java"],
      ] },
      { head: "Stubs for the outside world", hc: C.grey, items: [
        ["trade-imports-stub", "Upstream trade-imports", "java"],
        ["defra-id-stub", "Defra ID sign-in (OIDC)", "node"],
      ] },
      { head: "Edge & tests", hc: C.green, items: [
        ["dynamics-gateway", "Events → Azure Service Bus", "java"],
        ["tests", "End-to-end across all of it", "node"],
      ] },
    ];
    const gy = 1.95, hdH = 0.55, panelH = 3.35, gW = (11.95 - 2 * 0.4) / 3, gGap = 0.4;
    groups.forEach((g, gi) => {
      const x = M + gi * (gW + gGap);
      s.addShape("rect", { x, y: gy, w: gW, h: hdH, fill: { color: g.hc } });
      s.addText(g.head, { x: x + 0.15, y: gy, w: gW - 0.3, h: hdH, fontFace: FONT, fontSize: 13, bold: true, color: C.white, valign: "middle", margin: 0 });
      s.addShape("rect", { x, y: gy + hdH, w: gW, h: panelH, fill: { color: C.lightGrey } });
      g.items.forEach((it, j) => {
        const iy = gy + hdH + 0.28 + j * 0.78;
        const dot = it[2] === "node" ? C.blue : C.amber;
        s.addShape("ellipse", { x: x + 0.25, y: iy + 0.07, w: 0.15, h: 0.15, fill: { color: dot } });
        s.addText(it[0], { x: x + 0.55, y: iy, w: gW - 0.7, h: 0.32, fontFace: FONT, fontSize: 13.5, bold: true, color: C.black, valign: "middle", margin: 0 });
        s.addText(it[1], { x: x + 0.55, y: iy + 0.31, w: gW - 0.7, h: 0.28, fontFace: FONT, fontSize: 11, color: C.grey, valign: "middle", margin: 0 });
      });
    });
    s.addText([
      { text: "The stubs fake the systems outside your control", options: { bold: true, color: C.black } },
      { text: " — so the whole service runs end-to-end on your machine. Full roles and the live repo map live in CLAUDE.md.", options: {} },
    ], { x: M, y: gy + hdH + panelH + 0.2, w: 11.95, h: 0.5, fontFace: FONT, fontSize: 13, color: C.grey, margin: 0 });
  }
  footer(s, 5);

  // ====================== Slide 6 — Where things live ======================
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Orientation", "Where things live");
  const dirs = [
    ["repos/", "the eight service repos"],
    ["docs/", "all documentation + best-practices + synced Confluence"],
    ["tools/", "shared shell scripts the skills call"],
    ["scripts/", "setup, update and the Docker stack runner"],
    ["docker/", "the full-stack compose setup"],
    ["tim/", "experimental CLI — may replace the Makefile in time"],
    [".claude/skills/", "the agent skills (from Session 3 on)"],
  ];
  let dy = 1.9;
  dirs.forEach((d) => {
    s.addImage({ data: I.folder, x: M + 0.1, y: dy + 0.07, w: 0.32, h: 0.32 });
    s.addText(d[0], { x: M + 0.6, y: dy, w: 2.7, h: 0.45, fontFace: MONO, fontSize: 16, bold: true, color: C.blue, valign: "middle", margin: 0 });
    s.addText(d[1], { x: M + 3.4, y: dy, w: 8.4, h: 0.45, fontFace: FONT, fontSize: 14, color: C.black, valign: "middle", margin: 0 });
    dy += 0.66;
  });
  footer(s, 6);

  // ====================== Slide 6 — Live view ==============================
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  s.addShape("rect", { x: M, y: 0.55, w: 1.85, h: 0.42, fill: { color: C.blue } });
  s.addText("LIVE VIEW", { x: M, y: 0.55, w: 1.85, h: 0.42, fontFace: FONT, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", charSpacing: 1, margin: 0 });
  s.addText("Don't memorise — read the current truth", {
    x: M, y: 1.1, w: 11.8, h: 0.8, fontFace: FONT, fontSize: 29, bold: true, color: C.black, margin: 0,
  });
  const live = [
    ["make help", "every Make target, with a one-line description"],
    ["read CLAUDE.md", "the living index: repo map, targets, skills, tools"],
    ["read a SKILL.md", "ask Claude what a skill does — it can't drift from reality"],
  ];
  let ly = 2.35;
  live.forEach((l) => {
    s.addShape("rect", { x: M, y: ly, w: 11.95, h: 1.0, fill: { color: C.blueTint } });
    s.addShape("rect", { x: M, y: ly, w: 0.09, h: 1.0, fill: { color: C.blue } });
    s.addText(l[0], { x: M + 0.35, y: ly, w: 4.5, h: 1.0, fontFace: MONO, fontSize: 20, bold: true, color: C.blueDark, valign: "middle", margin: 0 });
    s.addText(l[1], { x: M + 5.1, y: ly, w: 6.5, h: 1.0, fontFace: FONT, fontSize: 14, color: C.grey, valign: "middle", margin: 0 });
    ly += 1.15;
  });
  s.addText("The slides show the door, not the contents — so the recordings can't go stale.", {
    x: M, y: ly + 0.05, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 13, italic: true, color: C.grey, margin: 0,
  });
  footer(s, 7);

  // ====================== Slide 8 — Running it locally =====================
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Hands on", "Running it locally");
  s.addText("Can you actually build and run all eight services? The stack is driven by the scripts under scripts/stack/ — the make docker-* targets are just thin wrappers around them.", {
    x: M, y: 1.7, w: 11.8, h: 0.55, fontFace: FONT, fontSize: 15, color: C.grey, margin: 0,
  });
  {
    const cardY = 2.6, hdH = 0.6, bodyH = 2.7, cW = 3.717, cGap = 0.4;
    const cards = [
      { step: "1 · Set up (once)", cmds: [["make setup", "clone all eight repos"], ["make install", "npm deps across Node repos"]] },
      { step: "2 · Run from source", cmds: [["scripts/stack/run-stack.sh --dev", "build & run all services"], ["scripts/stack/bounce-backend.sh", "pick up edited Java source"]] },
      { step: "3 · Verify", cmds: [["cd …-tests", "the E2E suite lives here"], ["npm run test:docker-compose", "exercise the running stack"]] },
    ];
    cards.forEach((c, ci) => {
      const x = M + ci * (cW + cGap);
      s.addShape("rect", { x, y: cardY, w: cW, h: hdH, fill: { color: C.blue } });
      s.addText(c.step, { x: x + 0.2, y: cardY, w: cW - 0.4, h: hdH, fontFace: FONT, fontSize: 14, bold: true, color: C.white, valign: "middle", margin: 0 });
      s.addShape("rect", { x, y: cardY + hdH, w: cW, h: bodyH, fill: { color: C.lightGrey } });
      c.cmds.forEach((cm, j) => {
        const cy = cardY + hdH + 0.3 + j * 1.15;
        s.addText(cm[0], { x: x + 0.25, y: cy, w: cW - 0.4, h: 0.4, fontFace: MONO, fontSize: 11, bold: true, color: C.blue, valign: "middle", margin: 0 });
        s.addText(cm[1], { x: x + 0.25, y: cy + 0.38, w: cW - 0.4, h: 0.4, fontFace: FONT, fontSize: 11, color: C.grey, valign: "middle", margin: 0 });
      });
      if (ci < 2) {
        s.addText("→", { x: x + cW - 0.04, y: cardY + hdH, w: cGap + 0.08, h: bodyH, fontFace: FONT, fontSize: 24, bold: true, color: C.midGrey, align: "center", valign: "middle", margin: 0 });
      }
    });
    s.addText([
      { text: "Logs: ", options: { bold: true } },
      { text: "docker compose -p trade-imports logs -f", options: { fontFace: MONO } },
      { text: "   ·   stop / restart: ", options: { bold: true } },
      { text: "scripts/stack/{stop,restart}-stack.sh", options: { fontFace: MONO } },
      { text: "   ·   flags & profiles: ", options: { bold: true } },
      { text: "run-stack.sh --help", options: { fontFace: MONO } },
    ], { x: M, y: cardY + hdH + bodyH + 0.22, w: 11.95, h: 0.4, fontFace: FONT, fontSize: 11.5, color: C.grey, margin: 0 });
  }
  footer(s, 7);

  // ====================== Slide 9 — Try it ================================
  s = pres.addSlide();
  s.background = { color: C.white };
  s.addShape("rect", { x: 0, y: 0, w: 0.45, h: H, fill: { color: C.green } });
  heading(s, "Try it", "Get the stack running, end to end");
  const steps = [
    ["1", "Clone & set up", "Clone to ~/git/defra/trade-imports-workspace (symlink if elsewhere), then make setup && make install."],
    ["2", "Bring the stack up", "scripts/stack/run-stack.sh --dev to build from source, then watch the logs."],
    ["3", "Run the E2E suite", "npm run test:docker-compose in the tests repo. Skim make help and CLAUDE.md while it runs."],
  ];
  let ty = 2.0;
  steps.forEach((st) => {
    s.addShape("rect", { x: M, y: ty, w: 11.95, h: 1.15, fill: { color: C.lightGrey } });
    s.addShape("ellipse", { x: M + 0.3, y: ty + 0.32, w: 0.5, h: 0.5, fill: { color: C.green } });
    s.addText(st[0], { x: M + 0.3, y: ty + 0.32, w: 0.5, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(st[1], { x: M + 1.1, y: ty + 0.16, w: 10.5, h: 0.45, fontFace: FONT, fontSize: 17, bold: true, color: C.black, valign: "middle", margin: 0 });
    s.addText(st[2], { x: M + 1.1, y: ty + 0.6, w: 10.5, h: 0.45, fontFace: FONT, fontSize: 13, color: C.grey, valign: "middle", margin: 0 });
    ty += 1.35;
  });
  s.addText("Next: Session 2 — the ticket skill", {
    x: M, y: H - 0.7, w: 11, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.green, margin: 0,
  });

  await pres.writeFile({ fileName: path.join(OUT, "01-workspace.pptx") });
  console.log("written 01-workspace.pptx");
})();
