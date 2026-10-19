import { useState } from "react";

import { runBenchmark, compareFingerprints, type BenchReport } from "@/lib/qcrl/experiments";
import { CANDIDATES, HYPOTHESES, ROADMAP, RULES } from "@/lib/qcrl/program";
import { downloadText, runMarkdown, runsToCsv, timeCall, type RunInput, type RunRecord } from "@/lib/qcrl/runs";
import { Callout, ErrorNote, Field, PrimaryButton, QuietButton, SectionIntro, SelectInput, TextInput, readInt } from "./ui";

function fail(error: unknown): string {
  return error instanceof Error ? error.message : "The measurement failed.";
}

export function BenchPanel({
  save,
  runs,
  onClear,
}: {
  save: (input: RunInput) => void;
  runs: RunRecord[];
  onClear: () => void;
}) {
  const [seed, setSeed] = useState("1");
  const [error, setError] = useState("");
  const [report, setReport] = useState<BenchReport | null>(null);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  function run() {
    setError("");
    try {
      const timed = timeCall(() => runBenchmark(readInt(seed, "Seed")));
      setReport(timed.value);
      save({
        experimentId: timed.value.experimentId,
        seed: timed.value.seed,
        paramsLabel: "ring product, substitution, ToySum-8, 4×4 determinant",
        durationMs: timed.durationMs,
        testResult: "pass",
        classification: "empirical",
        summary: timed.value.rows.map((row) => `${row.name}: ${row.perOpUs.toFixed(2)} µs`).join(" · "),
        fingerprint: timed.value.fingerprint,
        detail: timed.value,
      });
    } catch (caught) {
      setReport(null);
      setError(fail(caught));
    }
  }

  const left = runs.find((run) => run.id === leftId);
  const right = runs.find((run) => run.id === rightId);
  const comparison = left && right ? compareFingerprints(left.fingerprint, right.fingerprint) : null;

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro kicker="RECORDS" title="Measurements and the run ledger">
        <p>
          Durations are wall-clock readings from this page. They are not comparable to a tuned native library, and a
          faster toy is not a better primitive. Unavailable fields stay unavailable.
        </p>
      </SectionIntro>
      <form
        className="flex flex-wrap items-end gap-3 border border-line bg-panel p-4 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <div className="w-full sm:w-40">
          <Field label="Seed">
            <TextInput value={seed} onChange={(event) => setSeed(event.target.value)} inputMode="numeric" />
          </Field>
        </div>
        <PrimaryButton type="submit">Measure</PrimaryButton>
      </form>
      <ErrorNote message={error} />
      {report ? (
        <div className="overflow-x-auto border border-line" aria-live="polite">
          <table className="w-full min-w-xl text-left text-sm">
            <thead className="bg-panel-2 font-mono text-xs tracking-widest text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Operation</th>
                <th className="px-3 py-3 font-medium">Iterations</th>
                <th className="px-3 py-3 font-medium">Total ms</th>
                <th className="px-3 py-3 font-medium">Per call µs</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.name} className="border-t border-line">
                  <td className="px-3 py-3">{row.name}</td>
                  <td className="px-3 py-3 font-mono tabular-nums">{row.iterations}</td>
                  <td className="px-3 py-3 font-mono tabular-nums">{row.durationMs.toFixed(2)}</td>
                  <td className="px-3 py-3 font-mono tabular-nums">{row.perOpUs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-3 py-3 text-sm text-muted">{report.note}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border border-line bg-panel p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-medium">Ledger</h3>
          <div className="flex flex-wrap gap-3">
            <QuietButton
              onClick={() => downloadText("qcrl-runs.json", JSON.stringify(runs, null, 2), "application/json")}
              disabled={runs.length === 0}
            >
              JSON
            </QuietButton>
            <QuietButton
              onClick={() => downloadText("qcrl-runs.csv", runsToCsv(runs), "text/csv")}
              disabled={runs.length === 0}
            >
              CSV
            </QuietButton>
            <QuietButton onClick={onClear} disabled={runs.length === 0}>
              Clear ledger
            </QuietButton>
          </div>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">No runs yet. Compute any experiment and it will be listed here, on this browser only.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl text-left text-sm">
              <thead className="font-mono text-xs tracking-widest text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Experiment</th>
                  <th className="py-2 pr-3 font-medium">Seed</th>
                  <th className="py-2 pr-3 font-medium">ms</th>
                  <th className="py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-line align-top">
                    <td className="py-3 pr-3 font-mono text-xs text-muted">{run.timestamp.slice(0, 19)}</td>
                    <td className="py-3 pr-3">
                      <p className="font-mono text-xs">{run.experimentId}</p>
                      <p className="mt-1 text-muted">{run.summary}</p>
                    </td>
                    <td className="py-3 pr-3 font-mono tabular-nums">{run.seed}</td>
                    <td className="py-3 pr-3 font-mono tabular-nums">{run.durationMs.toFixed(2)}</td>
                    <td className={`py-3 ${run.testResult === "pass" ? "text-sage" : "text-oxide"}`}>{run.testResult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="First run">
            <SelectInput value={leftId} onChange={(event) => setLeftId(event.target.value)}>
              <option value="">Select</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.experimentId} · {run.timestamp.slice(11, 19)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Second run">
            <SelectInput value={rightId} onChange={(event) => setRightId(event.target.value)}>
              <option value="">Select</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.experimentId} · {run.timestamp.slice(11, 19)}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        {comparison && left && right ? (
          <Callout tone={comparison.equivalent ? "sage" : "oxide"} title="COMPARISON">
            <p>{comparison.detail}</p>
            <p className="mt-2">
              {left.durationMs.toFixed(2)} ms versus {right.durationMs.toFixed(2)} ms. Same experiment:{" "}
              {left.experimentId === right.experimentId ? "yes" : "no"}. Same seed: {left.seed === right.seed ? "yes" : "no"}.
            </p>
            <div className="mt-3">
              <QuietButton
                onClick={() => downloadText(`${left.experimentId}.md`, `${runMarkdown(left)}\n${runMarkdown(right)}`, "text/markdown")}
              >
                Download comparison
              </QuietButton>
            </div>
          </Callout>
        ) : (
          <p className="text-sm text-muted">Choose two ledger rows to compare fingerprints. Timings are allowed to differ.</p>
        )}
      </div>
    </div>
  );
}

export function RegistryPanel() {
  return (
    <div className="flex flex-col gap-6">
      <SectionIntro kicker="REGISTRY" title="Candidates, including the one that is supposed to fail">
        <p>Every entry carries its assumptions and its weaknesses. Security lines are hypotheses, or an explicit refusal to make one.</p>
      </SectionIntro>
      <div className="flex flex-col gap-4">
        {CANDIDATES.map((candidate) => (
          <article key={candidate.id} className="border border-line bg-panel p-4 md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-medium">{candidate.name}</h3>
              <p className="font-mono text-xs text-muted">
                {candidate.id} · v{candidate.version}
              </p>
            </div>
            <p className={`mt-2 font-mono text-xs tracking-widest ${candidate.status.startsWith("Rejected") ? "text-oxide" : "text-brass"}`}>
              {candidate.status}
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Category", candidate.category],
                  ["Definition", candidate.definition],
                  ["Purpose", candidate.purpose],
                  ["Input / output", candidate.io],
                  ["Parameters", candidate.parameters],
                  ["Assumptions", candidate.assumptions],
                  ["Security hypothesis", candidate.security],
                  ["Known weaknesses", candidate.weaknesses],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-xs tracking-widest text-muted">{label}</dt>
                  <dd className="mt-1 text-sm text-paper">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

export function NotesPanel() {
  return (
    <div className="flex flex-col gap-6">
      <SectionIntro kicker="NOTES" title="What this laboratory will and will not say">
        <p>
          Mathematical discovery first, a finite check second, and a cryptographic interpretation only after evidence
          that this version does not claim to have.
        </p>
      </SectionIntro>
      <div className="grid gap-3 sm:grid-cols-2">
        {RULES.map((rule) => (
          <p key={rule} className="border border-line bg-panel px-4 py-3 text-sm">
            {rule}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {HYPOTHESES.map((item) => (
          <article key={item.id} className="border border-line bg-panel p-4 md:p-6">
            <p className="font-mono text-xs tracking-widest text-brass">{item.id}</p>
            <h3 className="mt-2 text-lg font-medium">{item.title}</h3>
            <p className="mt-2 text-sm">{item.statement}</p>
            <p className="mt-3 text-sm text-muted">{item.standing}</p>
          </article>
        ))}
      </div>
      <Callout tone="muted" title="THREAT MODEL, VERSION 0.1">
        <p>
          The adversary is the person running the experiment. The targets are local toy constructions and generated
          samples. There is no protocol, no key, and no side channel to measure. Statistical tests are reported as
          statistics. They do not establish security, and the attack page says so next to the numbers.
        </p>
      </Callout>
      <div className="border border-line bg-panel p-4 md:p-6">
        <h3 className="text-lg font-medium">Roadmap for 0.2</h3>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
          {ROADMAP.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <Callout tone="brass" title="THIS EDITION">
        <p>
          The v0.1 program — modular arithmetic, the bounded search, the toy lattice shapes, the broken checksum, the
          encodings, and the ledger — runs in the page. Runs stay in this browser. Commit hash and peak memory are
          marked unavailable rather than invented. A native toolchain and a second computer-algebra checker are later
          work, not a result this page pretends to have.
        </p>
      </Callout>
    </div>
  );
}
