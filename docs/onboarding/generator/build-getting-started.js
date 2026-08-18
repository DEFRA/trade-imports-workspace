// Bespoke builder for the BA-first on-ramp (00-getting-started.pptx + .md).
//
// This deck is NOT a skill demo — it's the zero-assumption entry point for the
// ticketing track (Sessions 9 and 10), aimed at BAs and engineers who may never
// have opened a terminal. It assumes nothing: what the assistant is, the
// one-time engineer-led setup, then open a terminal -> cd -> run claude -> talk
// to it like a colleague. It shares the onboarding theme (see ../slide-theme.md)
// so it sits alongside the generated skill decks.
//
// Content lives in the CONTENT object below — edit that, then `npm run
// build:getting-started`. The .pptx and the .md are emitted from the same
// source so they can't drift.

const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..");
const FILE = "00-getting-started";

// Theme — kept in step with build-skill-decks.js (white + muted steel blue).
const C = {
  black: "0f172a",
  blue: "2e5077",
  blueDark: "22405f",
  grey: "64748b",
  white: "ffffff",
  lightGrey: "f1f5f9",
  midGrey: "94a3b8",
  darkCard: "eaeff5",
};
const FONT = "Arial", MONO = "Courier New";
const W = 13.333, H = 7.5, M = 0.7, BAND = 0.28;

// ---- Content (the only thing you edit) ----------------------------------
const CONTENT = {
  title: "Getting started",
  subtitle: "The ticketing track — for BAs and engineers",
  oneLiner:
    "No code required. Open a terminal, run claude, and describe what you need in plain English.",

  whatTitle: "Talk to an assistant that knows this team",
  what: [
    "You will not write code. You talk to an assistant that already knows this team's repositories, our Jira project and our conventions — and does the legwork for you.",
    "This short track covers two everyday jobs: creating a well-formed ticket (Session 9) and checking a ticket is ready for refinement (Session 10). Everything you tell it, you say in plain English, the way you'd brief a colleague.",
  ],
  // "What you get" cards
  whatYouGet: [
    ["Plain English", "describe the work; no Jira forms, no commands to memorise"],
    ["It does the legwork", "reads Jira, the repos and the team's conventions for you"],
    ["You stay in charge", "it drafts and advises; nothing changes until you approve"],
  ],

  setupTitle: "The one-time setup — pair with an engineer",
  setupLead:
    "You do this once, on a screenshare. An engineer sits with you and sorts the plumbing — after that you just open a terminal and go.",
  setup: [
    ["Access & keys", "the engineer sets up your Jira and GitHub credentials and the environment variables the tools read"],
    ["The workspace", "they confirm where the workspace lives on your machine — the folder you'll open the assistant in"],
    ["The tool", "they install the claude command and check it runs, so step one below just works"],
  ],

  stepsTitle: "Three steps to a prompt",
  stepsLead: "Once setup is done, this is the whole routine, every time:",
  // [label, text, isCommand] — isCommand renders the text as mono (a literal you type).
  steps: [
    ["Open a terminal", "the Terminal app — your engineer will show you which one", false],
    ["Go to the workspace", "cd ~/git/defra/trade-imports-workspace", true],
    ["Start the assistant", "claude", true],
  ],
  stepsNote: "Then press Enter and wait for the prompt. The cd line never changes — your engineer can save it as a shortcut.",

  talkTitle: "Talk to it like a colleague — with much more power",
  talkLead:
    "At the prompt, just say what you want. It can read Jira, the repositories and the conventions, so a one-line ask does a lot of work.",
  talkExamples: [
    ["create a ticket", "starts Session 9 — it interviews you, drafts the ticket, and waits for your OK"],
    ["is EUDPA-1234 ready?", "starts Session 10 — it reviews the ticket and gives you a verdict"],
    ["what can you do?", "unsure where to start? ask — it'll tell you, in plain English"],
  ],

  rulesTitle: "A few ground rules",
  rules: [
    ["It drafts, you approve", "for a new ticket it writes a draft first; nothing reaches Jira until you say \"create it\""],
    ["Plain English is fine", "no special syntax — \"make the acceptance criteria testable\" is a perfectly good instruction"],
    ["You can stop any time", "ask it to wait, change tack, or explain itself; you're never locked in"],
    ["When in doubt, ask it", "\"is this right?\", \"what would you change?\" — treat it as a knowledgeable colleague"],
  ],

  tryIt:
    "Get an engineer to pair with you for the one-time setup, then open a terminal, cd to the workspace, and run claude. At the prompt, type \"what can you do?\" and read what comes back. That's it — you're driving the assistant.",
  next: "Next: Session 9 — create a ticket",
  nextMd: "Next: [Session 9 — the `ticket-creator` skill](09-ticket-creator.md).",
};

// ---- Slide primitives (shared shape with the skill decks) ---------------
const band = (s) => s.addShape("rect", { x: 0, y: 0, w: BAND, h: H, fill: { color: C.blue } });
const footer = (s, n) => {
  s.addText("trade-imports-animals onboarding", { x: M, y: H - 0.5, w: 7, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey });
  s.addText(`${n}`, { x: W - 1.2, y: H - 0.5, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 9, color: C.midGrey, align: "right" });
};
const heading = (s, label, title) => {
  s.addText(label.toUpperCase(), { x: M, y: 0.55, w: 11.8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 2, margin: 0 });
  s.addText(title, { x: M, y: 0.85, w: 11.8, h: 0.8, fontFace: FONT, fontSize: 29, bold: true, color: C.black, margin: 0 });
};

// A vertical stack of left-accent cards: [mono?] left label + grey description.
function cardStack(s, rows, { top, bottom, leftW, mono }) {
  const n = rows.length, gap = 0.16;
  const cardH = (bottom - top - gap * (n - 1)) / n;
  rows.forEach((r, i) => {
    const y = top + i * (cardH + gap);
    s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
    s.addShape("rect", { x: M, y, w: 0.09, h: cardH, fill: { color: C.blue } });
    s.addText(r[0], { x: M + 0.35, y: y + 0.05, w: leftW, h: cardH - 0.1, fontFace: mono ? MONO : FONT, fontSize: mono ? 14 : 15, bold: true, color: mono ? C.blueDark : C.black, valign: "middle", margin: 0 });
    s.addText(r[1], { x: M + 0.35 + leftW + 0.3, y: y + 0.05, w: 11.6 - leftW - 0.65, h: cardH - 0.1, fontFace: FONT, fontSize: 12.5, color: C.grey, valign: "middle", margin: 0 });
  });
}

// Numbered step cards (mirrors the skill deck "Watch it run" beat). Each row is
// [label, text, isCommand]; a command renders mono, prose renders grey.
function numberedSteps(s, rows, { top, bottom }) {
  const n = rows.length, gap = 0.18;
  const cardH = (bottom - top - gap * (n - 1)) / n;
  rows.forEach((r, i) => {
    const y = top + i * (cardH + gap);
    const isCmd = r[2];
    s.addShape("rect", { x: M, y, w: 11.95, h: cardH, fill: { color: C.lightGrey } });
    s.addShape("ellipse", { x: M + 0.28, y: y + cardH / 2 - 0.24, w: 0.48, h: 0.48, fill: { color: C.blue } });
    s.addText(`${i + 1}`, { x: M + 0.28, y: y + cardH / 2 - 0.24, w: 0.48, h: 0.48, fontFace: FONT, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(r[0], { x: M + 1.0, y: y + 0.08, w: 3.6, h: cardH - 0.16, fontFace: FONT, fontSize: 15.5, bold: true, color: C.black, valign: "middle", margin: 0 });
    s.addText(r[1], { x: M + 4.75, y: y + 0.08, w: 7.0, h: cardH - 0.16, fontFace: isCmd ? MONO : FONT, fontSize: isCmd ? 14 : 12.5, color: isCmd ? C.blueDark : C.grey, valign: "middle", margin: 0 });
  });
}

function build() {
  const pres = new pptxgen();
  pres.defineLayout({ name: "W", width: W, height: H });
  pres.layout = "W";
  pres.title = "Getting started — ticketing track";

  // 1 — Title
  let s = pres.addSlide();
  s.background = { color: C.white };
  s.addShape("rect", { x: 0, y: 0, w: 0.45, h: H, fill: { color: C.blue } });
  s.addText("TRADE-IMPORTS-ANIMALS ONBOARDING", { x: 1.1, y: 1.45, w: 10, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.blue, charSpacing: 3, margin: 0 });
  s.addText(CONTENT.subtitle, { x: 1.05, y: 1.95, w: 11, h: 0.6, fontFace: FONT, fontSize: 20, bold: true, color: C.grey, margin: 0 });
  s.addText(CONTENT.title, { x: 1.0, y: 2.55, w: 11.6, h: 1.2, fontFace: FONT, fontSize: 52, bold: true, color: C.blueDark, margin: 0 });
  s.addText(CONTENT.oneLiner, { x: 1.05, y: 4.4, w: 10.8, h: 1.2, fontFace: FONT, fontSize: 18, color: C.black, italic: true, margin: 0 });

  // 2 — What this is + what you get
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "What this is", CONTENT.whatTitle);
  s.addText(CONTENT.what.map((p, i) => ({ text: p, options: { breakLine: i < CONTENT.what.length - 1, paraSpaceAfter: 12 } })),
    { x: M, y: 1.7, w: 11.8, h: 2.6, fontFace: FONT, fontSize: 15.5, color: C.black, valign: "top", margin: 0 });
  s.addText("WHAT YOU GET", { x: M, y: 4.5, w: 11.8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.blue, charSpacing: 2, margin: 0 });
  {
    const bw = (11.95 - 2 * 0.3) / 3, bgap = 0.3, btop = 4.9, bh = 1.8;
    CONTENT.whatYouGet.forEach((b, i) => {
      const x = M + i * (bw + bgap);
      s.addShape("rect", { x, y: btop, w: bw, h: bh, fill: { color: C.lightGrey } });
      s.addShape("rect", { x, y: btop, w: bw, h: 0.09, fill: { color: C.blue } });
      s.addText(b[0], { x: x + 0.25, y: btop + 0.28, w: bw - 0.5, h: 0.62, fontFace: FONT, fontSize: 14.5, bold: true, color: C.black, valign: "top", margin: 0 });
      s.addText(b[1], { x: x + 0.25, y: btop + 0.9, w: bw - 0.5, h: 0.8, fontFace: FONT, fontSize: 11.5, color: C.grey, valign: "top", margin: 0 });
    });
  }
  footer(s, 2);

  // 3 — One-time setup
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "One-time setup", CONTENT.setupTitle);
  s.addText(CONTENT.setupLead, { x: M, y: 1.7, w: 11.8, h: 0.7, fontFace: FONT, fontSize: 15, color: C.grey, valign: "top", margin: 0 });
  cardStack(s, CONTENT.setup, { top: 2.6, bottom: 6.9, leftW: 2.6, mono: false });
  footer(s, 3);

  // 4 — Three steps to a prompt (mono on the commands)
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Every time", CONTENT.stepsTitle);
  s.addText(CONTENT.stepsLead, { x: M, y: 1.7, w: 11.8, h: 0.45, fontFace: FONT, fontSize: 15, color: C.grey, margin: 0 });
  numberedSteps(s, CONTENT.steps, { top: 2.4, bottom: 6.6 });
  s.addText(CONTENT.stepsNote, { x: M, y: 6.75, w: 11.95, h: 0.4, fontFace: FONT, fontSize: 12.5, italic: true, color: C.grey, margin: 0 });
  footer(s, 4);

  // 5 — Talk to it like a colleague
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "At the prompt", CONTENT.talkTitle);
  s.addText(CONTENT.talkLead, { x: M, y: 1.7, w: 11.8, h: 0.7, fontFace: FONT, fontSize: 15, color: C.grey, valign: "top", margin: 0 });
  // blue-tint rows, mono ask on the left (like the live-view callout)
  {
    let ly = 2.6;
    CONTENT.talkExamples.forEach((l) => {
      s.addShape("rect", { x: M, y: ly, w: 11.95, h: 1.1, fill: { color: C.darkCard } });
      s.addShape("rect", { x: M, y: ly, w: 0.09, h: 1.1, fill: { color: C.blue } });
      s.addText(`"${l[0]}"`, { x: M + 0.35, y: ly, w: 4.5, h: 1.1, fontFace: MONO, fontSize: 15, bold: true, color: C.blueDark, valign: "middle", margin: 0 });
      s.addText(l[1], { x: M + 5.05, y: ly, w: 6.6, h: 1.1, fontFace: FONT, fontSize: 13, color: C.grey, valign: "middle", margin: 0 });
      ly += 1.25;
    });
  }
  footer(s, 5);

  // 6 — Ground rules
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Good to know", CONTENT.rulesTitle);
  cardStack(s, CONTENT.rules, { top: 2.0, bottom: 6.9, leftW: 3.0, mono: false });
  footer(s, 6);

  // 7 — Try it
  s = pres.addSlide();
  s.background = { color: C.white };
  band(s);
  heading(s, "Try it", "Have a go yourself");
  s.addShape("rect", { x: M, y: 2.2, w: 11.95, h: 2.4, fill: { color: C.darkCard } });
  s.addShape("rect", { x: M, y: 2.2, w: 0.12, h: 2.4, fill: { color: C.blue } });
  s.addText(CONTENT.tryIt, { x: M + 0.5, y: 2.5, w: 11.0, h: 1.8, fontFace: FONT, fontSize: 17, color: C.black, valign: "top", margin: 0 });
  s.addText(CONTENT.next, { x: M, y: H - 0.7, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.blueDark, margin: 0 });

  return pres;
}

function mdPage() {
  const L = [];
  L.push(`# Getting started: the ticketing track`, "");
  L.push(`**Objective:** ${CONTENT.oneLiner}`, "");
  L.push(`Companion deck: \`${FILE}.pptx\`.`, "");
  L.push(`This is the entry point for BAs and engineers who want to create and refine`);
  L.push(`tickets with Claude. It assumes no terminal or git experience — an engineer`);
  L.push(`pairs with you once for setup, and after that it's three steps and a`);
  L.push(`conversation. You don't write code.`, "");

  L.push(`## ${CONTENT.whatTitle}`, "");
  CONTENT.what.forEach((p) => { L.push(p, ""); });
  L.push("What you get:", "");
  CONTENT.whatYouGet.forEach((b) => L.push(`- **${b[0]}** — ${b[1]}`));
  L.push("");

  L.push(`## ${CONTENT.setupTitle}`, "");
  L.push(CONTENT.setupLead, "");
  CONTENT.setup.forEach((b) => L.push(`- **${b[0]}** — ${b[1]}`));
  L.push("");

  L.push(`## ${CONTENT.stepsTitle}`, "");
  L.push(CONTENT.stepsLead, "");
  CONTENT.steps.forEach((b, i) => L.push(`${i + 1}. **${b[0]}** — ${b[2] ? `\`${b[1]}\`` : b[1]}`));
  L.push("");
  L.push(CONTENT.stepsNote, "");

  L.push(`## ${CONTENT.talkTitle}`, "");
  L.push(CONTENT.talkLead, "");
  CONTENT.talkExamples.forEach((b) => L.push(`- \`"${b[0]}"\` — ${b[1]}`));
  L.push("");

  L.push(`## ${CONTENT.rulesTitle}`, "");
  CONTENT.rules.forEach((b) => L.push(`- **${b[0]}** — ${b[1]}`));
  L.push("");

  L.push("## Try it", "");
  L.push(CONTENT.tryIt, "");
  L.push(CONTENT.nextMd);
  L.push("");
  return L.join("\n");
}

const pres = build();
pres.writeFile({ fileName: path.join(OUT, `${FILE}.pptx`) });
fs.writeFileSync(path.join(OUT, `${FILE}.md`), mdPage());
console.log(`built ${FILE}`);
