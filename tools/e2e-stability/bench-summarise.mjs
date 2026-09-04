// Reduce one frontend-bench run to the numbers two configurations are compared on.
// Usage: node bench-summarise.mjs <bench-dir>   -> summary.json on stdout
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

const env = Object.fromEntries(
  read(path.join(dir, 'env.txt'))
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);

const summary = {
  label: env.label,
  mode: env.mode,
  workers: Number(env.workers),
  vars: env.vars,
  exitCode: Number(env.exit),
  wallSeconds: Number(env.wall_seconds),
  frontendEnv: read(path.join(dir, 'frontend-env.txt')).split('\n').filter(Boolean),
  frontendReplicas: 0,
  tests: [],
  totalTestMs: 0,
  frontendCpu: { peakPercent: 0, meanPercent: 0, samples: 0, perContainerPeak: [] },
};

// ---- per-test durations -----------------------------------------------------
const reportPath = path.join(dir, 'report.json');
if (fs.existsSync(reportPath)) {
  let report = null;
  try {
    report = JSON.parse(read(reportPath));
  } catch (error) {
    summary.reportParseError = String(error);
  }
  if (report) {
    summary.stats = report.stats ?? null;
    const specs = [];
    const walk = (suite, trail) => {
      const here = suite.title ? [...trail, suite.title] : trail;
      for (const spec of suite.specs ?? []) specs.push({ trail: here, spec });
      for (const child of suite.suites ?? []) walk(child, here);
    };
    for (const suite of report.suites ?? []) walk(suite, []);
    for (const { trail, spec } of specs) {
      for (const test of spec.tests ?? []) {
        const ms = Math.max(0, ...(test.results ?? []).map((r) => r.duration ?? 0));
        summary.tests.push({
          title: `${[...trail.slice(1), spec.title].join(' › ')}`,
          status: test.status,
          ms,
        });
        summary.totalTestMs += ms;
      }
    }
    summary.tests.sort((a, b) => b.ms - a.ms);
  }
}

// ---- frontend CPU across the run -------------------------------------------
const perContainer = new Map();
let cpuTotal = 0;
let cpuSamples = 0;
for (const line of read(path.join(dir, 'stats.tsv')).split('\n').filter(Boolean)) {
  const [, name, cpu] = line.split('\t');
  if (!name?.includes('animals-frontend') || name.includes('-lb-')) continue;
  const value = Number((cpu ?? '').replace('%', ''));
  if (!Number.isFinite(value)) continue;
  perContainer.set(name, Math.max(perContainer.get(name) ?? 0, value));
  cpuTotal += value;
  cpuSamples += 1;
}
summary.frontendReplicas = perContainer.size;
summary.frontendCpu = {
  peakPercent: Math.max(0, ...perContainer.values()),
  meanPercent: cpuSamples ? Number((cpuTotal / cpuSamples).toFixed(1)) : 0,
  samples: cpuSamples,
  perContainerPeak: [...perContainer.entries()]
    .map(([name, cpuPercent]) => ({ name, cpuPercent }))
    .sort((a, b) => b.cpuPercent - a.cpuPercent),
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
