import { useState } from "react";

import { runLattice, type LatticeReport } from "@/lib/qcrl/experiments";
import type { RunInput } from "@/lib/qcrl/runs";
import { timeCall } from "@/lib/qcrl/runs";
import { Callout, ErrorNote, Field, Metric, PrimaryButton, SectionIntro, TextInput, readInt } from "./ui";

function fail(error: unknown): string {
  return error instanceof Error ? error.message : "The lattice experiment failed.";
}

export function LatticePanel({ save }: { save: (input: RunInput) => void }) {
  const [seed, setSeed] = useState("11");
  const [n, setN] = useState("2");
  const [m, setM] = useState("4");
  const [q, setQ] = useState("17");
  const [bound, setBound] = useState("1");
  const [moduleN, setModuleN] = useState("2");
  const [error, setError] = useState("");
  const [report, setReport] = useState<LatticeReport | null>(null);

  function run() {
    setError("");
    try {
      const timed = timeCall(() =>
        runLattice({
          seed: readInt(seed, "Seed"),
          n: readInt(n, "Secret length"),
          m: readInt(m, "Samples"),
          q: readInt(q, "Modulus"),
          bound: readInt(bound, "Bound"),
          moduleN: readInt(moduleN, "Module degree"),
        }),
      );
      setReport(timed.value);
      save({
        experimentId: timed.value.experimentId,
        seed: timed.value.seed,
        paramsLabel: `LWE n=${timed.value.lwe.n} m=${timed.value.lwe.m} q=${timed.value.lwe.q} B=${timed.value.lwe.bound}; module n=${timed.value.moduleLwe.ring}`,
        durationMs: timed.durationMs,
        testResult: timed.value.lwe.recovered && timed.value.moduleLwe.recomputed ? "pass" : "fail",
        classification: "verified-finite",
        summary: timed.value.lwe.recovered
          ? `Bounded search found the planted secret. ${timed.value.lwe.solutionCount} vector(s) fit the error bound.`
          : "Bounded search did not find the planted secret.",
        fingerprint: timed.value.fingerprint,
        detail: timed.value,
      });
    } catch (caught) {
      setReport(null);
      setError(fail(caught));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro kicker="LATTICES" title="Toy LWE, Module-LWE, and Module-SIS">
        <p>
          These are the shapes of the problems, at sizes small enough to enumerate. They are not ML-DSA and they are
          not a security level.
        </p>
      </SectionIntro>
      <form
        className="grid gap-3 border border-line bg-panel p-4 sm:grid-cols-3 lg:grid-cols-6 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <Field label="Seed">
          <TextInput value={seed} onChange={(event) => setSeed(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="LWE n">
          <TextInput value={n} onChange={(event) => setN(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Samples m">
          <TextInput value={m} onChange={(event) => setM(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="q">
          <TextInput value={q} onChange={(event) => setQ(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Bound B">
          <TextInput value={bound} onChange={(event) => setBound(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Module n">
          <TextInput value={moduleN} onChange={(event) => setModuleN(event.target.value)} inputMode="numeric" />
        </Field>
        <div className="sm:col-span-3 lg:col-span-6">
          <PrimaryButton type="submit">Run lattice sample</PrimaryButton>
        </div>
      </form>
      <ErrorNote message={error} />
      {report ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <Callout tone="brass" title="BOUNDARY">
            <p>{report.disclaimer}</p>
          </Callout>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Secret" value={report.lwe.secretText} />
            <Metric label="Solutions in bound" value={String(report.lwe.solutionCount)} />
            <Metric label="Secret found" value={report.lwe.recovered ? "Yes" : "No"} />
            <Metric label="Sample bits" value={String(report.lwe.representationBits)} />
          </div>
          <Callout tone={report.lwe.recovered ? "sage" : "oxide"} title="EXHAUSTIVE SEARCH">
            <p>
              Every secret in [−B, B]^n was tested. The search space was {report.lwe.searchSpace}. Error coordinates:{" "}
              {report.lwe.error.join(", ")}.
            </p>
          </Callout>
          <Callout tone="muted" title="ZERO ERROR VERSUS NOISE">
            <p>{report.lwe.zeroErrorStatus}</p>
            <p className="mt-2">{report.lwe.noisyStatus}</p>
          </Callout>
          <div className="border border-line bg-panel p-4">
            <p className="font-mono text-xs tracking-widest text-muted">MODULE-LWE OVER {report.moduleLwe.ring}</p>
            <p className="mt-2 text-sm text-paper">
              Recomputed b = As + e: {report.moduleLwe.recomputed ? "yes" : "no"}. Secret ∞-norm{" "}
              {report.moduleLwe.secretNormInf}, error ∞-norm {report.moduleLwe.errorNormInf}. Public size about{" "}
              {report.moduleLwe.publicBits} bits.
            </p>
            <ul className="mt-3 flex flex-col gap-1 font-mono text-sm">
              {report.moduleLwe.polynomials.map((poly) => (
                <li key={poly.name}>
                  {poly.name} = {poly.body}
                </li>
              ))}
            </ul>
          </div>
          <Callout tone="muted" title="MODULE-SIS AT COEFFICIENTS IN −1, 0, 1">
            <p>
              Searched {report.moduleSis.searched} short vectors. Non-zero kernel vectors:{" "}
              {report.moduleSis.nonzeroShortKernelVectors}.
            </p>
            {report.moduleSis.example ? <p className="mt-2 font-mono text-sm">{report.moduleSis.example}</p> : null}
            <p className="mt-2">{report.moduleSis.note}</p>
          </Callout>
          <pre className="overflow-x-auto border border-line bg-ink p-4 font-mono text-xs text-paper">
            {report.lwe.matrix.map((row) => row.join(" ")).join("\n")}
            {"\n"}b = {report.lwe.sample.join(" ")}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
