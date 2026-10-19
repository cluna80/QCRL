import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateLwe, trackNorms } from "./research.ts";

async function withOfflineBackend<T>(run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("backend offline");
  };
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe("research endpoint fallbacks", () => {
  it("generates and recovers an LWE sample when Rust is offline", async () => {
    const report = await withOfflineBackend(() =>
      generateLwe({ n: 2, m: 8, q: 17, seed: 12345, error_bound: 1, secret_bound: 1 }),
    );
    assert.equal(report.engine, "typescript fallback");
    assert.equal(report.recoveryAttempted, true);
    assert.equal(report.recoverySucceeded, true);
    assert.equal(report.matchesPlantedSecret, true);
    assert.equal(report.candidatesChecked, 9);
    assert.match(report.fingerprint, /^[0-9a-f]{8}$/);
  });

  it("calculates norms and automorphism profiles when Rust is offline", async () => {
    const report = await withOfflineBackend(() =>
      trackNorms({ coeffs: [1, -3, 2, 0, -1], q: 17, n: 4, relation: "negacyclic" }),
    );
    assert.equal(report.engine, "typescript fallback");
    assert.deepEqual(report.canonicalCoeffs, [2, -3, 2, 0]);
    assert.equal(report.lInf, 3);
    assert.equal(report.l2Squared, 17);
    assert.equal(report.hammingWeight, 3);
    assert.deepEqual(report.normProfile.map((entry) => entry.k), [1, 3, 5, 7]);
  });
});