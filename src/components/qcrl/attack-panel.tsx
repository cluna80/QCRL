import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { runAttacks, type AttackReport } from "@/lib/qcrl/experiments";
import type { RunInput } from "@/lib/qcrl/runs";
import { timeCall } from "@/lib/qcrl/runs";
import { Callout, ErrorNote, Field, Metric, PrimaryButton, SectionIntro, TextInput, readInt } from "./ui";

function fail(error: unknown): string {
  return error instanceof Error ? error.message : "The attack demo failed.";
}

export function AttackPanel({ save }: { save: (input: RunInput) => void }) {
  const [seed, setSeed] = useState("9");
  const [error, setError] = useState("");
  const [report, setReport] = useState<AttackReport | null>(null);

  function run() {
    setError("");
    try {
      const timed = timeCall(() => runAttacks(readInt(seed, "Seed")));
      setReport(timed.value);
      save({
        experimentId: timed.value.experimentId,
        seed: timed.value.seed,
        paramsLabel: "ToySum-8",
        durationMs: timed.durationMs,
        testResult: timed.value.collision ? "pass" : "fail",
        classification: "rejected",
        summary: timed.value.collision
          ? `Collision at digest ${timed.value.collision.digest}: [${timed.value.collision.left.join(", ")}] and [${timed.value.collision.right.join(", ")}].`
          : "No collision was exhibited.",
        fingerprint: timed.value.fingerprint,
        detail: timed.value,
      });
    } catch (caught) {
      setReport(null);
      setError(fail(caught));
    }
  }

  const chart = report?.avalancheByBit.map((rate, index) => ({ bit: `b${index}`, rate })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro kicker="ATTACKS" title="A checksum that was built to break">
        <p>
          ToySum-8 adds bytes modulo 256. The panel looks for a collision, measures avalanche, and states the linear
          relation that makes the statistic unnecessary. A flattering chart would still not be a security proof.
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
        <PrimaryButton type="submit">Run attack demo</PrimaryButton>
      </form>
      <ErrorNote message={error} />
      {report ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <Callout tone="oxide" title="KNOWN WEAKNESS">
            <p>{report.construction}</p>
            <p className="mt-2">{report.knownWeakness}</p>
          </Callout>
          <Callout tone="brass" title="ALGEBRAIC DISTINGUISHER">
            <p>{report.algebraicDistinguisher}</p>
          </Callout>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Collision" value={report.collision ? "Found" : "None"} />
            <Metric label="Digest" value={report.collision ? String(report.collision.digest) : "—"} />
            <Metric label="Messages tried" value={String(report.collisionSearched)} />
            <Metric label="Mean bit flip" value={`${(report.avalancheMean * 100).toFixed(1)}%`} />
          </div>
          {report.collision ? (
            <p className="font-mono text-sm text-paper">
              [{report.collision.left.join(", ")}] and [{report.collision.right.join(", ")}] both hash to{" "}
              {report.collision.digest}.
            </p>
          ) : null}
          <div className="border border-line bg-panel p-4">
            <p className="font-mono text-xs tracking-widest text-muted">AVALANCHE BY OUTPUT BIT</p>
            <p className="mt-2 text-sm text-muted">
              Fraction of one-bit input flips that flipped each output bit. A diffusing function sits near one half.
              ToySum-8 does not.
            </p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <XAxis dataKey="bit" stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <YAxis domain={[0, 1]} stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-panel)",
                      border: "1px solid var(--color-line)",
                      color: "var(--color-paper)",
                    }}
                    formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, "Flip rate"]}
                  />
                  <Bar dataKey="rate" fill="var(--color-brass)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <Callout tone="muted" title="OUTPUT DISTRIBUTION">
            <p>Chi-square statistic {report.chiSquare.toFixed(1)}.</p>
            <p className="mt-2">{report.chiSquareNote}</p>
          </Callout>
          <div className="grid gap-3 md:grid-cols-2">
            <Callout tone={report.deterministic ? "sage" : "oxide"} title="DETERMINISM">
              <p>{report.deterministic ? "The same input hashed to the same byte twice." : "Determinism failed."}</p>
            </Callout>
            <Callout tone={report.malformedRejected ? "sage" : "oxide"} title="MALFORMED INPUT">
              <p>{report.malformedMessage}</p>
            </Callout>
          </div>
          <p className="text-sm text-muted">{report.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
