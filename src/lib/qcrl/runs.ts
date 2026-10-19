import { QCRL_VERSION } from "./core.ts";
import { bytesOf, environmentMeta } from "./experiments.ts";

export type RunRecord = {
  id: string;
  experimentId: string;
  version: string;
  seed: number;
  paramsLabel: string;
  timestamp: string;
  durationMs: number;
  testResult: "pass" | "fail";
  classification: string;
  summary: string;
  fingerprint: string;
  outputBytes: number;
  cpuArchitecture: string;
  deviceMemoryGb: number | null;
  runtime: string;
  runtimeDetail: string;
  sourceCommit: string;
  peakMemory: string;
  python: string;
  rustc: string;
  detail: unknown;
};

export type RunInput = {
  experimentId: string;
  seed: number;
  paramsLabel: string;
  durationMs: number;
  testResult: "pass" | "fail";
  classification: string;
  summary: string;
  fingerprint: string;
  detail: unknown;
};

const STORAGE_KEY = "qcrl-runs-v1";

export function makeRun(input: RunInput): RunRecord {
  const env = environmentMeta();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `run-${Date.now().toString(36)}`;
  return {
    id,
    version: QCRL_VERSION,
    timestamp: new Date().toISOString(),
    outputBytes: bytesOf(input.detail),
    cpuArchitecture: env.cpuArchitecture,
    deviceMemoryGb: env.deviceMemoryGb,
    runtime: env.runtime,
    runtimeDetail: env.runtimeDetail,
    sourceCommit: env.sourceCommit,
    peakMemory: env.peakMemory,
    python: env.python,
    rustc: env.rustc,
    ...input,
  };
}

export function loadRuns(): RunRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRun).slice(0, 40);
  } catch {
    return [];
  }
}

export function saveRuns(runs: RunRecord[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 40)));
}

function isRun(value: unknown): value is RunRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<RunRecord>;
  return typeof row.id === "string" && typeof row.experimentId === "string" && typeof row.fingerprint === "string";
}

export function runsToCsv(runs: RunRecord[]): string {
  const headers = [
    "id",
    "experimentId",
    "version",
    "seed",
    "params",
    "timestamp",
    "durationMs",
    "testResult",
    "classification",
    "fingerprint",
    "outputBytes",
    "cpuArchitecture",
    "deviceMemoryGb",
    "runtime",
    "sourceCommit",
    "peakMemory",
    "summary",
  ];
  const lines = [headers.join(",")];
  for (const run of runs) {
    const cells = [
      run.id,
      run.experimentId,
      run.version,
      String(run.seed),
      run.paramsLabel,
      run.timestamp,
      run.durationMs.toFixed(3),
      run.testResult,
      run.classification,
      run.fingerprint,
      String(run.outputBytes),
      run.cpuArchitecture,
      run.deviceMemoryGb === null ? "unavailable" : String(run.deviceMemoryGb),
      run.runtime,
      run.sourceCommit,
      run.peakMemory,
      run.summary,
    ];
    lines.push(cells.map(csvCell).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function runMarkdown(run: RunRecord): string {
  return [
    `# ${run.experimentId}`,
    "",
    run.summary,
    "",
    `- Version: ${run.version}`,
    `- Seed: ${run.seed}`,
    `- Parameters: ${run.paramsLabel}`,
    `- Result: ${run.testResult}`,
    `- Classification: ${run.classification}`,
    `- Duration: ${run.durationMs.toFixed(2)} ms`,
    `- Output size: ${run.outputBytes} bytes`,
    `- Fingerprint: ${run.fingerprint}`,
    `- Timestamp: ${run.timestamp}`,
    `- Runtime: ${run.runtime}`,
    `- CPU architecture: ${run.cpuArchitecture}`,
    `- Device memory (GB): ${run.deviceMemoryGb ?? "unavailable"}`,
    `- Source commit: ${run.sourceCommit}`,
    `- Peak memory: ${run.peakMemory}`,
    `- Python: ${run.python}`,
    `- Rustc: ${run.rustc}`,
    "",
    "The fingerprint is the mathematical output. Durations are measurements and may change between repeats.",
    "A passing result is not a security claim.",
    "",
  ].join("\n");
}

export function downloadText(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function timeCall<T>(fn: () => Promise<T>): Promise<{ value: T; durationMs: number }>;
export function timeCall<T>(fn: () => T): { value: T; durationMs: number };
export function timeCall<T>(fn: () => T | Promise<T>) {
  const started = performance.now();
  const value = fn();
  if (value instanceof Promise) {
    return value.then((resolved) => ({ value: resolved, durationMs: performance.now() - started }));
  }
  return { value, durationMs: performance.now() - started };
}
