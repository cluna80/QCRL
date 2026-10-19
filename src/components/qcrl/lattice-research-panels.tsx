import { useState } from "react";

import { parseIntegerList } from "@/lib/qcrl/core";
import { generateLwe, trackNorms, type LweReport, type NormReport } from "@/lib/qcrl/research";
import { Callout, ErrorNote, Field, Metric, PrimaryButton, SelectInput, TextInput, readInt } from "./ui";

function fail(error: unknown): string {
  return error instanceof Error ? error.message : "Research request failed.";
}

export function LatticeResearchPanels() {
  return (
    <section className="flex flex-col gap-5 border-t border-line pt-6">
      <header>
        <p className="font-mono text-xs tracking-widest text-brass">ADDITIONAL EXPERIMENTS</p>
        <h2 className="mt-2 text-2xl font-medium text-paper">LWE generation and norm tracking</h2>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <LweGeneratorPanel />
        <NormTrackerPanel />
      </div>
    </section>
  );
}

function LweGeneratorPanel() {
  const [n, setN] = useState("4");
  const [m, setM] = useState("8");
  const [q, setQ] = useState("17");
  const [seed, setSeed] = useState("12345");
  const [errorBound, setErrorBound] = useState("2");
  const [secretBound, setSecretBound] = useState("1");
  const [report, setReport] = useState<LweReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      setReport(
        await generateLwe({
          n: readInt(n, "n"),
          m: readInt(m, "m"),
          q: readInt(q, "q"),
          seed: readInt(seed, "Seed"),
          error_bound: readInt(errorBound, "Error bound"),
          secret_bound: readInt(secretBound, "Secret bound"),
        }),
      );
    } catch (caught) {
      setReport(null);
      setError(fail(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="flex min-w-0 flex-col gap-4 border border-line bg-panel p-4 md:p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-brass">LWE INSTANCE</p>
          <h3 className="mt-1 text-lg font-medium">Generate and recover</h3>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted">{report?.engine ?? "engine —"}</span>
      </header>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={run}>
        <Field label="Secret length n">
          <TextInput type="number" min={1} max={64} step={1} value={n} onChange={(event) => setN(event.target.value)} />
        </Field>
        <Field label="Samples m">
          <TextInput type="number" min={1} max={256} step={1} value={m} onChange={(event) => setM(event.target.value)} />
        </Field>
        <Field label="Modulus q">
          <TextInput type="number" min={2} max={4096} step={1} value={q} onChange={(event) => setQ(event.target.value)} />
        </Field>
        <Field label="Seed">
          <TextInput type="number" min={0} max={2147483647} step={1} value={seed} onChange={(event) => setSeed(event.target.value)} />
        </Field>
        <Field label="Error bound">
          <TextInput type="number" min={0} max={4096} step={1} value={errorBound} onChange={(event) => setErrorBound(event.target.value)} />
        </Field>
        <Field label="Secret bound">
          <TextInput type="number" min={0} max={4096} step={1} value={secretBound} onChange={(event) => setSecretBound(event.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Generating…" : "Generate instance"}
          </PrimaryButton>
        </div>
      </form>
      <ErrorNote message={error} />
      {report ? (
        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Engine" value={report.engine} />
            <Metric label="Recovery" value={report.recoverySucceeded ? "Succeeded" : "Not attempted / failed"} />
            <Metric label="Candidates checked" value={String(report.candidatesChecked)} />
            <Metric label="Matches planted" value={report.matchesPlantedSecret ? "Yes" : "No"} />
          </div>
          {!report.recoveryAttempted ? (
            <p className="text-sm text-muted">Brute-force recovery is limited to n ≤ 4 and secret bound ≤ 2.</p>
          ) : null}
          <Callout tone={report.matchesPlantedSecret ? "sage" : "oxide"} title="PLANTED INSTANCE">
            <p>Secret: <span className="font-mono">[{report.plantedSecret.join(", ")}]</span></p>
            <p className="mt-1">Error: <span className="font-mono">[{report.plantedError.join(", ")}]</span></p>
            <p className="mt-1">Recovered: <span className="font-mono">{report.recoveredSecret ? `[${report.recoveredSecret.join(", ")}]` : "none"}</span></p>
            <p className="mt-1">Fingerprint: <span className="font-mono">{report.fingerprint}</span></p>
          </Callout>
          <pre className="max-h-64 overflow-auto border border-line bg-ink p-3 font-mono text-xs text-paper">
            {report.matrixA.map((row) => row.join(" ")).join("\n")}
            {"\nb = "}{report.b.join(" ")}
          </pre>
        </div>
      ) : null}
    </article>
  );
}

function NormTrackerPanel() {
  const [coeffText, setCoeffText] = useState("1, -3, 2, 0, -1");
  const [q, setQ] = useState("17");
  const [n, setN] = useState("4");
  const [relation, setRelation] = useState<"cyclic" | "negacyclic">("negacyclic");
  const [report, setReport] = useState<NormReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      setReport(
        await trackNorms({
          coeffs: parseIntegerList(coeffText),
          q: readInt(q, "q"),
          n: readInt(n, "n"),
          relation,
        }),
      );
    } catch (caught) {
      setReport(null);
      setError(fail(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="flex min-w-0 flex-col gap-4 border border-line bg-panel p-4 md:p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-brass">NORM PROFILE</p>
          <h3 className="mt-1 text-lg font-medium">Track coefficient norms</h3>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted">{report?.engine ?? "engine —"}</span>
      </header>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={run}>
        <Field label="Coefficient vector">
          <TextInput value={coeffText} onChange={(event) => setCoeffText(event.target.value)} />
        </Field>
        <Field label="Modulus q">
          <TextInput type="number" min={2} max={4096} step={1} value={q} onChange={(event) => setQ(event.target.value)} />
        </Field>
        <Field label="Degree n">
          <TextInput type="number" min={1} max={12} step={1} value={n} onChange={(event) => setN(event.target.value)} />
        </Field>
        <Field label="Relation">
          <SelectInput value={relation} onChange={(event) => setRelation(event.target.value as "cyclic" | "negacyclic")}>
            <option value="cyclic">Cyclic</option>
            <option value="negacyclic">Negacyclic</option>
          </SelectInput>
        </Field>
        <div className="sm:col-span-2">
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Tracking…" : "Track norms"}
          </PrimaryButton>
        </div>
      </form>
      <ErrorNote message={error} />
      {report ? (
        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Engine" value={report.engine} />
            <Metric label="L∞ norm" value={String(report.lInf)} />
            <Metric label="L2 squared" value={String(report.l2Squared)} />
            <Metric label="Hamming weight" value={String(report.hammingWeight)} />
            <Metric label="Compression ratio" value={report.compressionRatio === null ? "n/a" : `${report.compressionRatio.toFixed(2)}×`} />
            <Metric label="Gamma short" value={report.isShort ? "Yes" : "No"} />
          </div>
          <p className="text-xs text-muted">
            gamma1 {report.gamma1}; gamma2 {report.gamma2.toFixed(3)}. Dense {report.denseBits} bits, sparse estimate {report.sparseBits} bits.
          </p>
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-64 text-left text-sm">
              <thead className="bg-panel-2 font-mono text-xs text-muted">
                <tr>
                  <th className="px-3 py-2">Automorphism k</th>
                  <th className="px-3 py-2">L∞</th>
                  <th className="px-3 py-2">L2²</th>
                  <th className="px-3 py-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {report.normProfile.map((entry) => (
                  <tr key={entry.k} className="border-t border-line font-mono tabular-nums">
                    <td className="px-3 py-2">sigma-{entry.k}</td>
                    <td className="px-3 py-2">{entry.lInf}</td>
                    <td className="px-3 py-2">{entry.l2Squared}</td>
                    <td className="px-3 py-2">{entry.hammingWeight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </article>
  );
}