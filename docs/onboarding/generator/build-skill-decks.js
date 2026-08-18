const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// Decks and pages are written back into the onboarding folder (the parent dir).
const OUT = path.resolve(__dirname, "..");

// Clean modern theme — white and muted steel-blue.
const C = {
  black: "0f172a",     // ink — text and titles
  blue: "2e5077",      // primary — greyed steel blue
  blueDark: "22405f",  // deeper blue for emphasis
  green: "22405f",     // (kept name; mapped to blue so the theme stays white + blue)
  yellow: "2e5077",    // (kept name; mapped to blue)
  grey: "64748b",      // muted slate
  white: "ffffff",
  lightGrey: "f1f5f9", // panel
  midGrey: "94a3b8",   // subtle (footers)
  darkCard: "eaeff5",  // blue-grey tint (live-view rows)
};
const FONT = "Arial", MONO = "Courier New";
const W = 13.333, H = 7.5, M = 0.7, BAND = 0.28;

const band = (s) => s.addShape("rect", { x: 0, y: 0, w: BAND, h: H, fill: { color: C.blue } });
const footer = (s, n) => {
  s.addText("trade-imports workspace onboarding", { x: M, y: H - 0.5, w: 7, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey });
  s.addText(`${n}`, { x: W - 1.2, y: H - 0.5, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey, align: "right" });
};
const heading = (s, label, title) => {
  s.addText(label.toUpperCase(), { x: M, y: 0.55, w: 11.8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 2, margin: 0 });
  s.addText(title, { x: M, y: 0.85, w: 11.8, h: 0.8, fontFace: FONT, fontSize: 29, bold: true, color: C.black, margin: 0 });
};

function buildDeck(spec) {
  const pres = new pptxgen();
  pres.defineLayout({ name: "W", width: W, height: H });
  pres.layout = "W";
  pres.title = `Session ${spec.n} — ${spec.skill}`;

  // 1 — Title (light)
  let s = pres.addSlide();
  s.background = { color: C.white };
  s.addShape("rect", { x: 0, y: 0, w: 0.45, h: H, fill: { color: C.blue } });
  s.addText("TRADE-IMPORTS WORKSPACE ONBOARDING", { x: 1.1, y: 1.55, w: 10, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.blue, charSpacing: 3, margin: 0 });
  s.addText(`Session ${spec.n}`, { x: 1.05, y: 2.05, w: 11, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: C.grey, margin: 0 });
  s.addText(spec.skill, { x: 1.0, y: 2.7, w: 11.6, h: 1.2, fontFace: MONO, fontSize: 52, bold: true, color: C.blueDark, margin: 0 });
  s.addText(spec.oneLiner, { x: 1.05, y: 4.5, w: 10.8, h: 1.2, fontFace: FONT, fontSize: 18, color: C.black, italic: true, margin: 0 });

  // 2 — What it's for (white)
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "What it's for", spec.whyTitle);
  s.addText(spec.why.map((p, i) => ({ text: p, options: { breakLine: i < spec.why.length - 1, paraSpaceAfter: 12 } })),
    { x: M, y: 1.7, w: 11.8, h: 2.6, fontFace: FONT, fontSize: 15.5, color: C.black, valign: "top", margin: 0 });
  s.addText("WHAT YOU GET", { x: M, y: 4.5, w: 11.8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 2, margin: 0 });
  {
    const bw = (11.95 - 2 * 0.3) / 3, bgap = 0.3, btop = 4.9, bh = 1.8;
    spec.benefits.forEach((b, i) => {
      const x = M + i * (bw + bgap);
      s.addShape("rect", { x, y: btop, w: bw, h: bh, fill: { color: C.lightGrey } });
      s.addShape("rect", { x, y: btop, w: bw, h: 0.09, fill: { color: C.blue } });
      s.addText(b[0], { x: x + 0.25, y: btop + 0.28, w: bw - 0.5, h: 0.62, fontFace: FONT, fontSize: 14.5, bold: true, color: C.black, valign: "top", margin: 0 });
      s.addText(b[1], { x: x + 0.25, y: btop + 0.9, w: bw - 0.5, h: 0.8, fontFace: FONT, fontSize: 11.5, color: C.grey, valign: "top", margin: 0 });
    });
  }
  footer(s, 2);

  // 3 — Live view (white, blue callout)
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  s.addShape("rect", { x: M, y: 0.55, w: 1.85, h: 0.42, fill: { color: C.blue } });
  s.addText("LIVE VIEW", { x: M, y: 0.55, w: 1.85, h: 0.42, fontFace: FONT, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", charSpacing: 1, margin: 0 });
  s.addText("Don't memorise — read the current truth", { x: M, y: 1.1, w: 11.8, h: 0.8, fontFace: FONT, fontSize: 29, bold: true, color: C.black, margin: 0 });
  let ly = 2.35;
  spec.liveView.forEach((l) => {
    s.addShape("rect", { x: M, y: ly, w: 11.95, h: 1.0, fill: { color: C.darkCard } });
    s.addShape("rect", { x: M, y: ly, w: 0.09, h: 1.0, fill: { color: C.blue } });
    s.addText(l[0], { x: M + 0.35, y: ly, w: 5.7, h: 1.0, fontFace: MONO, fontSize: 14, bold: true, color: C.blueDark, valign: "middle", margin: 0 });
    s.addText(l[1], { x: M + 6.25, y: ly, w: 5.35, h: 1.0, fontFace: FONT, fontSize: 13, color: C.grey, valign: "middle", margin: 0 });
    ly += 1.15;
  });
  s.addText("The SKILL.md is what the agent actually executes — it can't drift from reality.", { x: M, y: ly + 0.05, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 13, italic: true, color: C.grey, margin: 0 });
  footer(s, 3);

  // 4 — Watch it run (white)
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Watch it run", `${spec.skill} end to end`);
  s.addText([
    { text: "Trigger it:  ", options: { bold: true, color: C.grey } },
    { text: spec.triggers, options: { fontFace: MONO, color: C.blue } },
  ], { x: M, y: 1.68, w: 11.95, h: 0.45, fontFace: FONT, fontSize: 12.5, color: C.grey, margin: 0 });
  {
    const n = spec.demo.length;
    const top = 2.35, bottom = 6.95, gap = 0.14;
    const cardH = (bottom - top - gap * (n - 1)) / n;
    spec.demo.forEach((d, i) => {
      const y = top + i * (cardH + gap);
      s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
      s.addShape("ellipse", { x: M + 0.28, y: y + cardH / 2 - 0.22, w: 0.44, h: 0.44, fill: { color: C.blue } });
      s.addText(`${i + 1}`, { x: M + 0.28, y: y + cardH / 2 - 0.22, w: 0.44, h: 0.44, fontFace: FONT, fontSize: 17, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
      s.addText(d[0], { x: M + 0.95, y: y + 0.08, w: 3.0, h: cardH - 0.16, fontFace: FONT, fontSize: 14.5, bold: true, color: C.black, valign: "middle", margin: 0 });
      s.addText(d[1], { x: M + 4.05, y: y + 0.08, w: 7.7, h: cardH - 0.16, fontFace: FONT, fontSize: 12.5, color: C.grey, valign: "middle", margin: 0 });
    });
  }
  footer(s, 4);

  // 5 — Reading the output (white)
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Reading the output", "What it produces");
  s.addText(spec.outputsLead, { x: M, y: 1.7, w: 11.8, h: 0.45, fontFace: FONT, fontSize: 15, color: C.grey, margin: 0 });
  {
    const n = spec.outputs.length;
    const top = 2.35, bottom = 6.9, gap = 0.16;
    const cardH = (bottom - top - gap * (n - 1)) / n;
    spec.outputs.forEach((o, i) => {
      const y = top + i * (cardH + gap);
      s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
      s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.blue } });
      s.addText(o[0], { x: M + 0.35, y: y + 0.05, w: 4.6, h: cardH - 0.1, fontFace: MONO, fontSize: 13, bold: true, color: C.blue, valign: "middle", margin: 0 });
      s.addText(o[1], { x: M + 5.1, y: y + 0.05, w: 6.6, h: cardH - 0.1, fontFace: FONT, fontSize: 12.5, color: C.grey, valign: "middle", margin: 0 });
    });
  }
  footer(s, 5);

  let pageNo = 6;
  // 6 — How you use it (white)
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "How you use it", `${spec.skill} in your workflow`);
  {
    const n = spec.usage.length;
    const top = 2.15, bottom = 6.6, gap = 0.22;
    const cardH = (bottom - top - gap * (n - 1)) / n;
    spec.usage.forEach((u, i) => {
      const y = top + i * (cardH + gap);
      s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
      s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.blue } });
      s.addText(u[0], { x: M + 0.35, y: y + 0.05, w: 3.4, h: cardH - 0.1, fontFace: FONT, fontSize: 15, bold: true, color: C.black, valign: "middle", margin: 0 });
      s.addText(u[1], { x: M + 3.95, y: y + 0.05, w: 7.7, h: cardH - 0.1, fontFace: FONT, fontSize: 13, color: C.grey, valign: "middle", margin: 0 });
    });
  }
  footer(s, pageNo);
  pageNo += 1;

  // optional — Anatomy slide
  if (spec.anatomy) {
    s = pres.addSlide();
    s.background = { color: C.white };
    band(s);
    heading(s, "Under the lid", "Anatomy of a skill");
    const n = spec.anatomy.length;
    const top = 2.0, bottom = 6.9, gap = 0.16;
    const cardH = (bottom - top - gap * (n - 1)) / n;
    spec.anatomy.forEach((o, i) => {
      const y = top + i * (cardH + gap);
      s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
      s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.green } });
      s.addText(o[0], { x: M + 0.35, y: y + 0.05, w: 3.3, h: cardH - 0.1, fontFace: MONO, fontSize: 14, bold: true, color: C.green, valign: "middle", margin: 0 });
      s.addText(o[1], { x: M + 3.9, y: y + 0.05, w: 7.8, h: cardH - 0.1, fontFace: FONT, fontSize: 12.5, color: C.grey, valign: "middle", margin: 0 });
    });
    footer(s, pageNo);
    pageNo += 1;
  }

  // last — Try it (green)
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Try it", "Have a go yourself");
  s.addShape("rect", { x: M, y: 2.2, w: 11.95, h: 2.4, fill: { color: C.darkCard } });
  s.addShape("rect", { x: M, y: 2.2, w: 0.12, h: 2.4, fill: { color: C.blue } });
  s.addText(spec.tryIt, { x: M + 0.5, y: 2.5, w: 11.0, h: 1.8, fontFace: FONT, fontSize: 17, color: C.black, valign: "top", margin: 0 });
  s.addText(spec.next, { x: M, y: H - 0.7, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.blueDark, margin: 0 });

  return pres;
}

function mdPage(spec) {
  const L = [];
  L.push(`# Session ${spec.n}: the \`${spec.skill}\` skill`, "");
  L.push(`**Objective:** ${spec.oneLiner}`, "");
  L.push(`Companion deck: \`${spec.file}.pptx\`.`, "");
  L.push("## What it's for", "");
  spec.why.forEach((p) => { L.push(p, ""); });
  L.push("What you get:", "");
  spec.benefits.forEach((b) => L.push(`- **${b[0]}** — ${b[1]}`));
  L.push("");
  L.push("## How you trigger it", "");
  L.push(`You launch it in natural language: ${spec.triggers}`, "");
  L.push("## Watch it run", "");
  spec.demo.forEach((d, i) => L.push(`${i + 1}. **${d[0]}** — ${d[1]}`));
  L.push("");
  L.push("## Reading the output", "");
  L.push(spec.outputsLead, "");
  spec.outputs.forEach((o) => L.push(`- \`${o[0]}\` — ${o[1]}`));
  L.push("");
  L.push("## How you use it", "");
  spec.usage.forEach((u) => L.push(`- **${u[0]}** — ${u[1]}`));
  L.push("");
  if (spec.anatomy) {
    L.push("## Anatomy of a skill", "");
    L.push("If you'll maintain or grow the harness, it helps to know the parts:", "");
    spec.anatomy.forEach((o) => L.push(`- \`${o[0]}\` — ${o[1]}`));
    L.push("");
  }
  L.push("## Live view", "");
  L.push("Don't memorise the surface — read the current version:", "");
  spec.liveView.forEach((l) => L.push(`- \`${l[0]}\` — ${l[1]}`));
  L.push("");
  if (spec.note) { L.push(spec.note, ""); }
  L.push("## Try it", "");
  L.push(spec.tryIt, "");
  L.push(spec.nextMd || spec.next.replace(/^Next: /, "Next: "));
  L.push("");
  return L.join("\n");
}

const specs = require("./skill-specs.js");
specs.forEach((spec) => {
  const pres = buildDeck(spec);
  pres.writeFile({ fileName: path.join(OUT, `${spec.file}.pptx`) });
  fs.writeFileSync(path.join(OUT, `${spec.file}.md`), mdPage(spec));
  console.log(`built ${spec.file}`);
});
