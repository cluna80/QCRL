import { useState } from "react";

import { runEncoding, type EncodingCase, type EncodingReport } from "@/lib/qcrl/experiments";
import type { RunInput } from "@/lib/qcrl/runs";
import { timeCall } from "@/lib/qcrl/runs";
import { Callout, ErrorNote, Field, Metric, PrimaryButton, SectionIntro, TextInput, readInt } from "./ui";

function fail(error: unknown): string {
  return error instanceof Error ? error.message : "Encoding failed.";
}

function CaseBlock({ item }: { item: EncodingCase }) {
  return (
    <div className="border border-line bg-panel p-4">
      <p className="font-mono text-xs tracking-widest text-brass">{item.label.toUpperCase()}</p>
      <p className="mt-2 font-mono text-sm text-paper">{item.polynomial}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Canonical bytes" value={String(item.canonicalBytes)} />
        <Metric label="Sparse bytes" value={String(item.sparseBytes)} />
        <Metric label="Sparse / canonical" value={item.ratio.toFixed(2)} />
        <Metric label="Round trip" value={item.roundTripOk ? "Exact" : "Failed"} />
      </div>
      <p className="mt-3 font-mono text-xs text-muted">
        Encode {item.encodeUs.toFixed(2)} µs, decode {item.decodeUs.toFixed(2)} µs, mean of 400 calls.
      </p>
    </div>
  );
}

export function EncodingPanel({ save }: { save: (input: RunInput) => void }) {
  const [seed, setSeed] = useState("3");
  const [q, setQ] = useState("17");
  const [n, setN] = useState("16");
  const [error, setError] = useState("");
  const [report, setReport] = useState<EncodingReport | null>(null);

  function run() {
    setError("");
    try {
      const timed = timeCall(() => runEncoding(readInt(seed, "Seed"), readInt(q, "Modulus"), readInt(n, "Length")));
      setReport(timed.value);
      save({
        experimentId: timed.value.experimentId,
        seed: timed.value.seed,
        paramsLabel: `q=${timed.value.q}, n=${timed.value.n}`,
        durationMs: timed.durationMs,
        testResult: timed.value.sparse.roundTripOk && timed.value.dense.roundTripOk ? "pass" : "fail",
        classification: "empirical",
        summary: `Sparse polynomial ${timed.value.sparse.sparseBytes} vs ${timed.value.sparse.canonicalBytes} bytes. Dense form ${timed.value.dense.sparseBytes} vs ${timed.value.dense.canonicalBytes}.`,
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
      <SectionIntro kicker="ENCODING" title="Lossless size, not proof compression">
        <p>
          Two byte layouts of the same coefficient vector: a fixed-width pack, and a list of the non-zero positions.
          Decoding must return the original element. This does not preserve a proof, because there is no proof.
        </p>
      </SectionIntro>
      <form
        className="grid gap-3 border border-line bg-panel p-4 sm:grid-cols-3 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <Field label="Seed">
          <TextInput value={seed} onChange={(event) => setSeed(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="q">
          <TextInput value={q} onChange={(event) => setQ(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Length">
          <TextInput value={n} onChange={(event) => setN(event.target.value)} inputMode="numeric" />
        </Field>
        <div className="sm:col-span-3">
          <PrimaryButton type="submit">Measure encodings</PrimaryButton>
        </div>
      </form>
      <ErrorNote message={error} />
      {report ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <Callout tone="brass" title="WHAT THIS IS NOT">
            <p>{report.disclaimer}</p>
          </Callout>
          <div className="grid gap-4 lg:grid-cols-2">
            <CaseBlock item={report.sparse} />
            <CaseBlock item={report.dense} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
