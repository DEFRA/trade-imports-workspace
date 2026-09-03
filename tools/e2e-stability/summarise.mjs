// Derive one run's numbers from the artefacts run-once.sh captured.
// Usage: node summarise.mjs <run-dir>   -> summary.json on stdout
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

const env = Object.fromEntries(
  read(path.join(dir, 'env.txt'))
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);

const summary = {
  label: env.label,
  workers: Number(env.workers),
  startedAt: env.started_at,
  finishedAt: env.finished_at,
  wallSeconds: Number(env.wall_seconds),
  exitCode: Number(env.exit),
  testsHead: env.tests_head,
  green: null,
  stats: null,
  tests: { failed: [], flaky: [], slowest: [] },
  errorSignatures: {},
  containers: { oomKilled: [], restarted: [], unhealthy: [] },
  peakContainerCpu: [],
  peakContainerMem: [],
  host: { peakLoad1: null, peakSwapUsed: null, peakChromium: null, peakCompressorPages: null },
};

// ---- Playwright JSON report -------------------------------------------------
const reportPath = path.join(dir, 'report.json');
if (fs.existsSync(reportPath)) {
  let report;
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
        const attempts = test.results ?? [];
        const title = `${spec.file} › ${[...trail.slice(1), spec.title].join(' › ')}`;
        const entry = {
          title,
          project: test.projectName,
          status: test.status,
          attempts: attempts.length,
          workerIndexes: attempts.map((a) => a.workerIndex),
          durationsMs: attempts.map((a) => a.duration),
          errors: attempts.flatMap((a) => (a.errors ?? []).map((e) => (e.message ?? '').split('\n').slice(0, 12).join('\n'))),
        };
        if (test.status === 'unexpected') summary.tests.failed.push(entry);
        else if (test.status === 'flaky') summary.tests.flaky.push(entry);
        summary.tests.slowest.push({ title, project: test.projectName, ms: Math.max(0, ...entry.durationsMs) });
      }
    }
    summary.tests.slowest.sort((a, b) => b.ms - a.ms);
    summary.tests.slowest = summary.tests.slowest.slice(0, 12);
    summary.green = summary.tests.failed.length === 0 && summary.tests.flaky.length === 0 && summary.exitCode === 0;

    // Coarse error fingerprints so runs can be compared without reading prose.
    const fingerprint = (message) => {
      if (/Timeout .* exceeded.*waiting for locator|locator\.\w+: Timeout/s.test(message)) return 'locator-timeout';
      if (/Test timeout of \d+ms exceeded/.test(message)) return 'test-timeout';
      if (/net::ERR_CONNECTION_(REFUSED|RESET)/.test(message)) return 'connection-refused-or-reset';
      if (/net::ERR_EMPTY_RESPONSE|net::ERR_FAILED/.test(message)) return 'empty-response';
      if (/ECONNREFUSED|ECONNRESET|socket hang up|fetch failed/.test(message)) return 'api-connection';
      if (/\b5\d\d\b|Internal Server Error|Sorry, there is a problem with the service/.test(message)) return 'server-5xx';
      if (/expected .* received|toHaveText|toHaveValue|toBeVisible/.test(message)) return 'assertion-mismatch';
      if (/Screenshot comparison failed/.test(message)) return 'visual-diff';
      if (/navigation|page\.goto/.test(message)) return 'navigation';
      return 'other';
    };
    for (const entry of [...summary.tests.failed, ...summary.tests.flaky]) {
      for (const message of entry.errors) {
        const key = fingerprint(message);
        summary.errorSignatures[key] = (summary.errorSignatures[key] ?? 0) + 1;
      }
    }
  }
}

// ---- container health ------------------------------------------------------
for (const line of read(path.join(dir, 'containers.tsv')).split('\n').filter(Boolean)) {
  const [name, status, oom, restarts, health] = line.split('\t');
  const clean = (name ?? '').replace(/^\//, '');
  if (oom === 'true') summary.containers.oomKilled.push(clean);
  if (Number(restarts) > 0) summary.containers.restarted.push({ name: clean, restarts: Number(restarts) });
  if (health !== 'none' && health !== 'healthy') summary.containers.unhealthy.push({ name: clean, health, status });
}

// ---- docker stats peaks ----------------------------------------------------
const toMiB = (text) => {
  const match = /([\d.]+)\s*([KMG]i?B)/i.exec(text ?? '');
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (unit.startsWith('G')) return value * 1024;
  if (unit.startsWith('K')) return value / 1024;
  return value;
};
const cpuPeaks = new Map();
const memPeaks = new Map();
for (const line of read(path.join(dir, 'stats.tsv')).split('\n').filter(Boolean)) {
  const [, name, cpu, memUsage, memPerc] = line.split('\t');
  if (!name) continue;
  const cpuValue = Number((cpu ?? '').replace('%', ''));
  if (Number.isFinite(cpuValue)) cpuPeaks.set(name, Math.max(cpuPeaks.get(name) ?? 0, cpuValue));
  const used = toMiB((memUsage ?? '').split('/')[0]);
  const percent = Number((memPerc ?? '').replace('%', ''));
  const prior = memPeaks.get(name);
  if (!prior || used > prior.mib) memPeaks.set(name, { mib: Math.round(used), percentOfLimit: percent });
}
summary.peakContainerCpu = [...cpuPeaks.entries()]
  .map(([name, cpuPercent]) => ({ name, cpuPercent }))
  .sort((a, b) => b.cpuPercent - a.cpuPercent)
  .slice(0, 10);
summary.peakContainerMem = [...memPeaks.entries()]
  .map(([name, peak]) => ({ name, ...peak }))
  .sort((a, b) => b.percentOfLimit - a.percentOfLimit)
  .slice(0, 10);

// ---- host peaks ------------------------------------------------------------
let peakLoad = 0;
let peakSwap = 0;
let peakChromium = 0;
let peakCompressor = 0;
for (const line of read(path.join(dir, 'host.tsv')).split('\n').filter(Boolean)) {
  const [, load, swapUsed, chromium, , , compressor] = line.split('\t');
  peakLoad = Math.max(peakLoad, Number((load ?? '').split('|')[0]) || 0);
  peakSwap = Math.max(peakSwap, toMiB(swapUsed));
  peakChromium = Math.max(peakChromium, Number(chromium) || 0);
  peakCompressor = Math.max(peakCompressor, Number(compressor) || 0);
}
summary.host = {
  peakLoad1: peakLoad,
  peakSwapUsedMiB: Math.round(peakSwap),
  peakChromiumProcesses: peakChromium,
  peakCompressorPages: peakCompressor,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
