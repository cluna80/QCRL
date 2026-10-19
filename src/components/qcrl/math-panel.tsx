import { useState } from "react";

import {
  QcrlError,
  asCoeffs,
  formatPoly,
  gcd,
  mod,
  modInv,
  norm2sq,
  normInf,
  parseIntegerList,
  parseRing,
  polyMul,
  polyRem,
  relationLabel,
  ringMul,
  stable,
} from "@/lib/qcrl/core";
import { matrixDemo } from "@/lib/qcrl/experiments";
import type { RunInput } from "@/lib/qcrl/runs";
import { timeCall } from "@/lib/qcrl/runs";
import { Callout, ErrorNote, Field, Metric, PrimaryButton, QuietButton, SectionIntro, SelectInput, TextInput, readInt } from "./ui";

function fail(error: unknown): string {
  return error instanceof Error ? error.message : "The calculation failed.";
}

function relationCoeffs(n: number, q: number, relation: "negacyclic" | "cyclic"): number[] {
  const coeffs = new Array<number>(n + 1).fill(0);
  coeffs[0] = relation === "cyclic" ? mod(-1, q) : 1;
  coeffs[n] = 1;
  return coeffs;
}

export function MathPanel({ save }: { save: (input: RunInput) => void }) {
  const [aText, setAText] = useState("3");
  const [bText, setBText] = useState("14");
  const [mText, setMText] = useState("17");
  const [fText, setFText] = useState("1, 1");
  const [gText, setGText] = useState("1, -1");
  const [qText, setQText] = useState("5");
  const [nText, setNText] = useState("4");
  const [relation, setRelation] = useState<"negacyclic" | "cyclic">("negacyclic");
  const [vectorText, setVectorText] = useState("1, -1, 2");
  const [error, setError] = useState("");
  const [view, setView] = useState<null | {
    sum: string;
    product: string;
    difference: string;
    gcdText: string;
    inverse: string;
    polySum: string;
    polyProduct: string;
    reduced: string;
    agree: string;
    matrix: string;
    norm: string;
  }>(null);

  function compute() {
    setError("");
    try {
      const timed = timeCall(() => {
        const a = readInt(aText, "a");
        const b = readInt(bText, "b");
        const m = readInt(mText, "Modulus");
        if (m < 2 || m > 4096) throw new QcrlError(`Modulus ${m} is outside 2..4096.`);
        const q = readInt(qText, "Polynomial modulus");
        const n = readInt(nText, "Degree");
        const ring = parseRing(q, n, relation);
        const f = asCoeffs(parseIntegerList(fText), n, q);
        const g = asCoeffs(parseIntegerList(gText), n, q);
        const vector = parseIntegerList(vectorText);
        let inverse = "";
        try {
          inverse = `${modInv(a, m)}   (because ${a} × ${modInv(a, m)} ≡ 1 mod ${m})`;
        } catch (caught) {
          inverse = fail(caught);
        }
        const raw = polyMul(f, g, q);
        const reducedCoeffs = polyRem(raw, relationCoeffs(n, q, relation), q);
        while (reducedCoeffs.length < n) reducedCoeffs.push(0);
        const reduced = reducedCoeffs.slice(0, n);
        const viaRing = ringMul(f, g, ring);
        const same = reduced.every((value, index) => value === viaRing[index]);
        let matrix = "";
        try {
          const demo = matrixDemo(q);
          matrix = `[[1,2],[3,4]] · [[5,6],[7,8]] = ${JSON.stringify(demo.product)} mod ${q}. det = ${demo.determinant}. inverse ${demo.inverse ? "exists" : "does not exist"}.`;
        } catch (caught) {
          matrix = fail(caught);
        }
        return {
          sum: String(mod(a + b, m)),
          product: String(mod(a * b, m)),
          difference: String(mod(a - b, m)),
          gcdText: String(gcd(a, m)),
          inverse,
          polySum: formatPoly(f.map((value, index) => mod(value + (g[index] ?? 0), q)), q),
          polyProduct: formatPoly(raw, q),
          reduced: formatPoly(reduced, q),
          agree: same
            ? `Polynomial remainder and the ${relationLabel(ring)} product agree.`
            : "The two reduction paths disagreed. Treat the result as a bug, not a conjecture.",
          matrix,
          norm: `∞-norm ${normInf(vector)}, squared Euclidean norm ${norm2sq(vector)}.`,
          fingerprintSource: { sum: mod(a + b, m), product: mod(a * b, m), reduced, viaRing },
        };
      });
      const { fingerprintSource, ...rest } = timed.value;
      setView(rest);
      save({
        experimentId: "QCRL-MATH",
        seed: 0,
        paramsLabel: `a,b mod ${mText}; ${relation} n=${nText} q=${qText}`,
        durationMs: timed.durationMs,
        testResult: timed.value.agree.startsWith("Polynomial") ? "pass" : "fail",
        classification: "verified-finite",
        summary: `Sum ${rest.sum}, product ${rest.product}, reduced ${rest.reduced}.`,
        fingerprint: stable(fingerprintSource),
        detail: rest,
      });
    } catch (caught) {
      setView(null);
      setError(fail(caught));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro kicker="ARITHMETIC" title="Modular, polynomial, and matrix operations">
        <p>
          Integers, polynomials, and 2×2 matrices over a small modulus. Inverses are returned only when they exist.
          The polynomial panel reduces by x^n−1 or x^n+1 and checks that path against the ring product.
        </p>
      </SectionIntro>
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="flex flex-col gap-4 border border-line bg-panel p-4 md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            compute();
          }}
        >
          <p className="font-mono text-xs tracking-widest text-muted">INTEGERS</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="a">
              <TextInput value={aText} onChange={(event) => setAText(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="b">
              <TextInput value={bText} onChange={(event) => setBText(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Modulus">
              <TextInput value={mText} onChange={(event) => setMText(event.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <p className="font-mono text-xs tracking-widest text-muted">POLYNOMIALS</p>
          <Field label="f coefficients, low degree first">
            <TextInput value={fText} onChange={(event) => setFText(event.target.value)} />
          </Field>
          <Field label="g coefficients">
            <TextInput value={gText} onChange={(event) => setGText(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="q">
              <TextInput value={qText} onChange={(event) => setQText(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="n">
              <TextInput value={nText} onChange={(event) => setNText(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Relation">
              <SelectInput
                value={relation}
                onChange={(event) => setRelation(event.target.value as "negacyclic" | "cyclic")}
              >
                <option value="negacyclic">x^n + 1</option>
                <option value="cyclic">x^n − 1</option>
              </SelectInput>
            </Field>
          </div>
          <Field label="Vector for norms">
            <TextInput value={vectorText} onChange={(event) => setVectorText(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton type="submit">Compute</PrimaryButton>
            <QuietButton
              onClick={() => {
                setAText("8");
                setBText("3");
                setMText("12");
              }}
            >
              Load a non-unit
            </QuietButton>
          </div>
          <ErrorNote message={error} />
        </form>
        <div className="flex flex-col gap-4 border border-line bg-panel p-4 md:p-6" aria-live="polite">
          {view ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="a + b" value={view.sum} />
                <Metric label="a × b" value={view.product} />
                <Metric label="a − b" value={view.difference} />
                <Metric label="gcd(a, modulus)" value={view.gcdText} />
              </div>
              <Callout tone="muted" title="INVERSE">
                <p className="font-mono text-sm">{view.inverse}</p>
              </Callout>
              <Callout tone="muted" title="POLYNOMIALS">
                <p>Sum {view.polySum}</p>
                <p className="mt-2">Product {view.polyProduct}</p>
                <p className="mt-2">Reduced {view.reduced}</p>
                <p className="mt-2">{view.agree}</p>
              </Callout>
              <Callout tone="muted" title="MATRIX AND NORM">
                <p>{view.matrix}</p>
                <p className="mt-2 font-mono text-sm">{view.norm}</p>
              </Callout>
            </>
          ) : (
            <p className="text-sm text-muted">
              Compute writes the residues, the inverse or the reason it does not exist, and a cross-check of the two
              reduction paths. The result is appended to the run ledger.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
