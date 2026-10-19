import { useState } from "react";

import { runDiscovery, type DiscoveryReport } from "@/lib/qcrl/experiments";
import type { RunInput } from "@/lib/qcrl/runs";
import { timeCall } from "@/lib/qcrl/runs";
import { Callout, ErrorNote, Field, Metric, PrimaryButton, QuietButton, SectionIntro, TextInput, readInt } from "./ui";

function fail(error: unknown): string {
  return error instanceof Error ? error.message : "Discovery failed.";
}

export function DiscoveryPanel({ save }: { save: (input: RunInput) => void }) {
  const [q, setQ] = useState("17");
  const [n, setN] = useState("4");
  const [seed, setSeed] = useState("20261015");
  const [kMin, setKMin] = useState("0");
  const [kMax, setKMax] = useState("3");
  const [relation, setRelation] = useState<"negacyclic" | "cyclic">("negacyclic");
  const [error, setError] = useState("");
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [repeat, setRepeat] = useState<string>("");

  async function run() {
    setError("");
    setRepeat("");
    try {
      const timed = await timeCall(() =>
        runDiscovery(
          readInt(q, "Modulus"),
          readInt(n, "Degree"),
          relation,
          readInt(seed, "Seed"),
          readInt(kMin, "Minimum exponent"),
          readInt(kMax, "Maximum exponent"),
        ),
      );
      setReport(timed.value);
      save({
        experimentId: timed.value.experimentId,
        seed: timed.value.seed,
        paramsLabel: `${timed.value.ring.relation}, q=${timed.value.ring.q}, n=${timed.value.ring.n}, k=${kMin}..${kMax}`,
        durationMs: timed.durationMs,
        testResult: timed.value.criterionAgrees ? "pass" : "fail",
        classification: timed.value.criterionAgrees ? "verified-finite" : "rejected",
        summary: `${timed.value.acceptedIds.length} accepted, ${timed.value.rejectedIds.length} rejected. ${timed.value.preservingExample ?? ""}`,
        fingerprint: timed.value.fingerprint,
        detail: timed.value,
      });
    } catch (caught) {
      setReport(null);
      setError(fail(caught));
    }
  }

  async function runTwice() {
    setError("");
    try {
      const first = await timeCall(() =>
        runDiscovery(
          readInt(q, "Modulus"),
          readInt(n, "Degree"),
          relation,
          readInt(seed, "Seed"),
          readInt(kMin, "Minimum exponent"),
          readInt(kMax, "Maximum exponent"),
        ),
      );
      const second = await timeCall(() =>
        runDiscovery(
          readInt(q, "Modulus"),
          readInt(n, "Degree"),
          relation,
          readInt(seed, "Seed"),
          readInt(kMin, "Minimum exponent"),
          readInt(kMax, "Maximum exponent"),
        ),
      );
      setReport(first.value);
      const same = first.value.fingerprint === second.value.fingerprint;
      setRepeat(
        same
          ? `Repeated with seed ${first.value.seed}. Fingerprints match (${first.value.fingerprint.slice(0, 16)}…). Times ${first.durationMs.toFixed(2)} ms and ${second.durationMs.toFixed(2)} ms.`
          : "The two runs disagreed. Do not treat either as stable.",
      );
      for (const timed of [first, second]) {
        save({
          experimentId: timed.value.experimentId,
          seed: timed.value.seed,
          paramsLabel: `${timed.value.ring.relation}, q=${timed.value.ring.q}, n=${timed.value.ring.n}, k=${kMin}..${kMax}`,
          durationMs: timed.durationMs,
          testResult: same ? "pass" : "fail",
          classification: "verified-finite",
          summary: same ? "Repeat produced the same mathematical fingerprint." : "Repeat diverged.",
          fingerprint: timed.value.fingerprint,
          detail: timed.value,
        });
      }
    } catch (caught) {
      setError(fail(caught));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro kicker="QCRL-EXP-001" title="Algebraic transformation and representation efficiency">
        <p>
          The question is whether a linear map on a small polynomial ring can preserve addition, multiplication, and
          equality while occupying fewer bits than its dense matrix. Acceptance is a finite-domain fact. It is not a
          discovery certificate and not a security claim.
        </p>
      </SectionIntro>
      <form
        className="grid gap-3 border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-6 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <Field label="Prime q">
          <TextInput type="number" min={2} max={4096} step={1} value={q} onChange={(event) => setQ(event.target.value)} />
        </Field>
        <Field label="Degree n">
          <TextInput type="number" min={1} max={12} step={1} value={n} onChange={(event) => setN(event.target.value)} />
        </Field>
        <Field label="Seed">
          <TextInput type="number" min={0} max={2147483647} step={1} value={seed} onChange={(event) => setSeed(event.target.value)} />
        </Field>
        <Field label="Relation">
          <div className="grid min-h-11 grid-cols-2 border border-line bg-ink" role="group" aria-label="Relation">
            {(["cyclic", "negacyclic"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={relation === value}
                onClick={() => setRelation(value)}
                className={`px-2 text-xs transition-colors ${relation === value ? "bg-brass text-brass-ink" : "text-muted hover:text-paper"}`}
              >
                {value === "cyclic" ? "Cyclic" : "Negacyclic"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Minimum k">
          <TextInput type="number" min={0} max={64} step={1} value={kMin} onChange={(event) => setKMin(event.target.value)} />
        </Field>
        <Field label="Maximum k">
          <TextInput type="number" min={0} max={64} step={1} value={kMax} onChange={(event) => setKMax(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-6">
          <PrimaryButton type="submit">Run search</PrimaryButton>
          <QuietButton onClick={runTwice}>Repeat with the same seed</QuietButton>
        </div>
      </form>
      <ErrorNote message={error} />
      {repeat ? (
        <Callout tone="sage" title="REPRODUCIBILITY">
          <p>{repeat}</p>
        </Callout>
      ) : null}
      {report ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <p className="max-w-3xl text-sm italic text-paper">{report.question}</p>
          <p className="max-w-3xl text-sm text-muted">{report.definition}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Accepted" value={String(report.acceptedIds.length)} />
            <Metric label="Rejected" value={String(report.rejectedIds.length)} />
            <Metric label="Ring" value={report.ring.relation} />
            <Metric label="Criterion" value={report.criterionAgrees ? "Agrees" : "Disagrees"} />
            <Metric label="Engine" value={report.engine} />
          </div>
          <Callout tone="sage" title="PRESERVING EXAMPLE">
            <p>{report.preservingExample}</p>
          </Callout>
          <Callout tone="oxide" title="INVALID EXAMPLE">
            <p>{report.invalidExample}</p>
          </Callout>
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-xl text-left text-sm">
              <thead className="bg-panel-2 font-mono text-xs tracking-widest text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Map</th>
                  <th className="px-3 py-3 font-medium">Rank</th>
                  <th className="px-3 py-3 font-medium">×</th>
                  <th className="px-3 py-3 font-medium">1:1</th>
                  <th className="px-3 py-3 font-medium">Classification</th>
                  <th className="px-3 py-3 font-medium">Compact bits</th>
                  <th className="px-3 py-3 font-medium">Dense bits</th>
                  <th className="px-3 py-3 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {report.rankedCandidates.map((candidate) => (
                  <tr key={candidate.id} className="border-t border-line align-top">
                    <td className="px-3 py-3 font-mono text-xs">
                      {candidate.id}
                      <span className="mt-1 block text-muted">{candidate.applyCost}</span>
                    </td>
                    <td className="px-3 py-3 font-mono tabular-nums">{candidate.rank}</td>
                    <td className="px-3 py-3 font-mono">{candidate.multiplicative ? "yes" : "no"}</td>
                    <td className="px-3 py-3 font-mono">{candidate.bijective ? "yes" : "no"}</td>
                    <td className="px-3 py-3 font-mono text-xs">{candidate.classification}</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{candidate.compactBits ?? "—"}</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{candidate.denseBits}</td>
                    <td className={`px-3 py-3 ${candidate.accepted ? "text-sage" : "text-oxide"}`}>
                      <p>{candidate.accepted ? "Accepted" : "Rejected"}</p>
                      <p className="mt-1 text-paper">{candidate.reason}</p>
                      {candidate.counterexample ? (
                        <p className="mt-2 font-mono text-xs text-muted">{candidate.counterexample}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout tone="brass" title="VERIFIED ON THIS PARAMETER SET">
            <ul className="flex flex-col gap-2">
              {report.formalOnThisParameterSet.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Callout>
          <Callout tone="oxide" title="CONJECTURE — NOT A THEOREM">
            <ul className="flex flex-col gap-2">
              {report.conjectures.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Callout>
          <ul className="flex flex-col gap-2 text-sm text-muted">
            {report.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
