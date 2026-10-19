import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detMod,
  egcd,
  matInv,
  matMul,
  matVec,
  mod,
  modInv,
  polyAdd,
  polyMul,
  polyRem,
  parseRing,
  ringMul,
  vecEq,
} from "./core.ts";
import { runAttacks, runDiscovery, runEncoding, runLattice, runSelfTest, toySumHash } from "./experiments.ts";

describe("modular arithmetic", () => {
  it("reduces negatives and computes inverses", () => {
    assert.equal(mod(-1, 17), 16);
    assert.equal(mod(modInv(3, 17) * 3, 17), 1);
    assert.equal(egcd(8, 12).g, 4);
    assert.throws(() => modInv(8, 12), /Inverse does not exist/);
  });

  it("rejects a composite discovery modulus", async () => {
    await assert.rejects(runDiscovery(9, 4, "negacyclic", 1), /prime/);
    await assert.rejects(runDiscovery(17, 0, "cyclic", 1), /degree/);
  });
});

describe("polynomials and rings", () => {
  it("matches remainder reduction with the negacyclic product", () => {
    const q = 5;
    const ring = parseRing(q, 4, "negacyclic");
    const f = [1, 2, 0, 4];
    const g = [3, 0, 1, 1];
    const raw = polyMul(f, g, q);
    const relation = [1, 0, 0, 0, 1];
    const reduced = polyRem(raw, relation, q);
    while (reduced.length < 4) reduced.push(0);
    assert.deepEqual(reduced.slice(0, 4), ringMul(f, g, ring));
  });

  it("distributes", () => {
    const ring = parseRing(17, 5, "cyclic");
    const a = [1, 2, 3, 4, 5];
    const b = [6, 0, 8, 1, 2];
    const c = [4, 4, 4, 4, 1];
    const left = ringMul(a, polyAdd(b, c, 17).concat(new Array(5).fill(0)).slice(0, 5), ring);
    const right = ringMul(a, b, ring).map((value, i) => mod(value + ringMul(a, c, ring)[i], 17));
    assert.deepEqual(left, right);
  });
});

describe("matrices", () => {
  it("inverts and multiplies mod 17", () => {
    const a = [
      [1, 2],
      [3, 5],
    ];
    const inverse = matInv(a, 17);
    assert.ok(inverse);
    assert.deepEqual(matMul(a, inverse, 17), [
      [1, 0],
      [0, 1],
    ]);
    assert.equal(detMod([[1, 2], [3, 4]], 17), mod(-2, 17));
    assert.equal(detMod([[1, 2], [2, 4]], 17), 0);
    assert.deepEqual(matVec([[1, 2], [3, 4]], [1, 1], 17), [3, 7]);
  });
});

describe("QCRL-EXP-001", () => {
  it("accepts a real automorphism and rejects the planted invalid map", async () => {
    const report = await runDiscovery(17, 4, "negacyclic", 20261015);
    const keep = report.candidates.find((c) => c.id === "sigma-3");
    const drop = report.candidates.find((c) => c.id === "drop-constant");
    assert.equal(keep?.accepted, true);
    assert.equal(keep?.classification, "verified-finite");
    assert.equal(drop?.accepted, false);
    const rev = report.candidates.find((c) => c.id === "reversal");
    assert.equal(rev?.accepted, false);
    assert.ok(drop?.counterexample);
    assert.equal(report.criterionAgrees, true);
    assert.equal(report.fingerprint, (await runDiscovery(17, 4, "negacyclic", 20261015)).fingerprint);
    assert.notEqual(report.fingerprint, (await runDiscovery(17, 4, "negacyclic", 20261016)).fingerprint);
  });

  it("accepts exactly the odd exponents coprime to 8 on the negacyclic ring", async () => {
    const report = await runDiscovery(17, 8, "negacyclic", 4);
    const accepted = report.candidates.filter((c) => c.kind === "power-substitution" && c.accepted).map((c) => c.k);
    assert.deepEqual(accepted, [1, 3, 5, 7]);
  });
});

describe("attacks, lattices, encodings", () => {
  it("finds the known checksum collision and repeats", () => {
    assert.equal(toySumHash([1, 2]), toySumHash([3]));
    const attack = runAttacks(9);
    assert.ok(attack.collision);
    assert.equal(attack.collision.digest, toySumHash(attack.collision.left));
    assert.equal(vecEq(attack.collision.left, attack.collision.right), false);
    assert.equal(attack.deterministic, true);
    assert.equal(attack.fingerprint, runAttacks(9).fingerprint);
  });

  it("reproduces a lattice sample and recovers the secret", () => {
    const a = runLattice({ seed: 11, n: 2, m: 4, q: 17, bound: 1, moduleN: 2 });
    const b = runLattice({ seed: 11, n: 2, m: 4, q: 17, bound: 1, moduleN: 2 });
    assert.equal(a.fingerprint, b.fingerprint);
    assert.equal(a.lwe.recovered, true);
    assert.equal(a.moduleLwe.recomputed, true);
  });

  it("round-trips both encodings", () => {
    const report = runEncoding(3, 17, 16);
    assert.equal(report.sparse.roundTripOk, true);
    assert.equal(report.dense.roundTripOk, true);
    assert.ok(report.sparse.sparseBytes < report.sparse.canonicalBytes);
    assert.ok(report.dense.sparseBytes > report.dense.canonicalBytes);
  });
});

describe("integrity suite", () => {
  it("passes every built-in check", () => {
    const checks = runSelfTest();
    const failed = checks.filter((c) => !c.ok);
    assert.deepEqual(
      failed.map((c) => `${c.name}: ${c.detail}`),
      [],
    );
  });
});
