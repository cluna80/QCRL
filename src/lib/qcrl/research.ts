import {
  QcrlError,
  center,
  ceilLog2,
  fetchBackend,
  fnv1a,
  gcd,
  mod,
  mulberry32,
  norm2sq,
  normInf,
  stable,
  type Ring,
} from "./core.ts";

export type ResearchEngine = "rust" | "typescript fallback";

export type LweRequest = {
  n: number;
  m: number;
  q: number;
  seed: number;
  error_bound: number;
  secret_bound: number;
};

export type LweReport = {
  engine: ResearchEngine;
  matrixA: number[][];
  b: number[];
  plantedSecret: number[];
  plantedError: number[];
  recoveryAttempted: boolean;
  recoverySucceeded: boolean;
  matchesPlantedSecret: boolean;
  recoveredSecret: number[] | null;
  candidatesChecked: number;
  searchSpace: number | null;
  fingerprint: string;
};

export type NormRequest = {
  coeffs: number[];
  q: number;
  n: number;
  relation: "cyclic" | "negacyclic";
};

export type NormProfileEntry = {
  k: number;
  lInf: number;
  l2Squared: number;
  hammingWeight: number;
};

export type NormReport = {
  engine: ResearchEngine;
  canonicalCoeffs: number[];
  lInf: number;
  l2Squared: number;
  hammingWeight: number;
  denseBits: number;
  sparseBits: number;
  compressionRatio: number | null;
  gamma1: number;
  gamma2: number;
  withinGamma1: boolean;
  withinGamma2: boolean;
  isShort: boolean;
  normProfile: NormProfileEntry[];
};

function validateLwe(request: LweRequest): void {
  if (!Number.isInteger(request.n) || request.n < 1 || request.n > 64) {
    throw new QcrlError("n must be an integer from 1 to 64.");
  }
  if (!Number.isInteger(request.m) || request.m < 1 || request.m > 256) {
    throw new QcrlError("m must be an integer from 1 to 256.");
  }
  if (!Number.isInteger(request.q) || request.q < 2 || request.q > 4096) {
    throw new QcrlError("q must be an integer from 2 to 4096.");
  }
  if (!Number.isInteger(request.seed) || request.seed < 0 || request.seed > 2147483647) {
    throw new QcrlError("Seed must be an integer from 0 to 2147483647.");
  }
  if (!Number.isInteger(request.error_bound) || request.error_bound < 0 || request.error_bound > 4096) {
    throw new QcrlError("error_bound must be an integer from 0 to 4096.");
  }
  if (!Number.isInteger(request.secret_bound) || request.secret_bound < 0 || request.secret_bound > 4096) {
    throw new QcrlError("secret_bound must be an integer from 0 to 4096.");
  }
}

export async function generateLwe(request: LweRequest): Promise<LweReport> {
  validateLwe(request);
  try {
    const response = await fetchBackend<Omit<LweReport, "engine">>("/api/lwe", request);
    return { ...response, engine: "rust" };
  } catch (error) {
    if (error instanceof TypeError) return generateLweFallback(request);
    throw error;
  }
}

function generateLweFallback(request: LweRequest): LweReport {
  const rng = mulberry32(request.seed);
  const matrixA = Array.from({ length: request.m }, () =>
    Array.from({ length: request.n }, () => Math.floor(rng() * request.q)),
  );
  const plantedSecret = Array.from(
    { length: request.n },
    () => Math.floor(rng() * (2 * request.secret_bound + 1)) - request.secret_bound,
  );
  const plantedError = Array.from(
    { length: request.m },
    () => Math.floor(rng() * (2 * request.error_bound + 1)) - request.error_bound,
  );
  const b = matrixA.map((row, index) =>
    mod(
      row.reduce((sum, coefficient, column) => sum + coefficient * (plantedSecret[column] ?? 0), 0) +
        (plantedError[index] ?? 0),
      request.q,
    ),
  );
  const recoveryAttempted = request.n <= 4 && request.secret_bound <= 2;
  const searchSpace = recoveryAttempted ? (2 * request.secret_bound + 1) ** request.n : null;
  let candidatesChecked = 0;
  let recoveredSecret: number[] | null = null;
  let matchesPlantedSecret = false;
  if (searchSpace !== null) {
    const span = 2 * request.secret_bound + 1;
    for (let encoded = 0; encoded < searchSpace; encoded += 1) {
      let value = encoded;
      const candidate = Array.from({ length: request.n }, () => {
        const coefficient = (value % span) - request.secret_bound;
        value = Math.floor(value / span);
        return coefficient;
      });
      candidatesChecked += 1;
      if (candidateFitsLwe(candidate, matrixA, b, request.q, request.error_bound)) {
        if (recoveredSecret === null) recoveredSecret = candidate;
        if (candidate.every((coefficient, index) => coefficient === plantedSecret[index])) {
          recoveredSecret = candidate;
          matchesPlantedSecret = true;
        }
      }
    }
  }

  const fingerprint = fnv1a(
    stable({ matrix_a: matrixA, b, planted_secret: plantedSecret, planted_error: plantedError }),
  );
  return {
    engine: "typescript fallback",
    matrixA,
    b,
    plantedSecret,
    plantedError,
    recoveryAttempted,
    recoverySucceeded: recoveredSecret !== null,
    matchesPlantedSecret,
    recoveredSecret,
    candidatesChecked,
    searchSpace,
    fingerprint,
  };
}

function candidateFitsLwe(
  secret: number[],
  matrixA: number[][],
  b: number[],
  q: number,
  errorBound: number,
): boolean {
  return matrixA.every((row, index) => {
    const dot = row.reduce((sum, coefficient, column) => sum + coefficient * (secret[column] ?? 0), 0);
    return Math.abs(center((b[index] ?? 0) - dot, q)) <= errorBound;
  });
}

function validateNorms(request: NormRequest): Ring {
  if (!Number.isInteger(request.q) || request.q < 2 || request.q > 4096) {
    throw new QcrlError("q must be an integer from 2 to 4096.");
  }
  if (!Number.isInteger(request.n) || request.n < 1 || request.n > 12) {
    throw new QcrlError("n must be an integer from 1 to 12.");
  }
  if (request.relation !== "cyclic" && request.relation !== "negacyclic") {
    throw new QcrlError("relation must be cyclic or negacyclic.");
  }
  if (!Array.isArray(request.coeffs) || request.coeffs.length > 256 || request.coeffs.some((value) => !Number.isSafeInteger(value))) {
    throw new QcrlError("coeffs must contain at most 256 safe integers.");
  }
  return { q: request.q, n: request.n, r: request.relation === "cyclic" ? 1 : mod(-1, request.q) };
}

export async function trackNorms(request: NormRequest): Promise<NormReport> {
  validateNorms(request);
  try {
    const response = await fetchBackend<Omit<NormReport, "engine">>("/api/norms", request);
    return { ...response, engine: "rust" };
  } catch (error) {
    if (error instanceof TypeError) return trackNormsFallback(request);
    throw error;
  }
}

function trackNormsFallback(request: NormRequest): NormReport {
  const ring = validateNorms(request);
  const residues = reducePolynomial(request.coeffs, ring, request.relation);
  const canonicalCoeffs = residues.map((coefficient) => center(coefficient, ring.q));
  const base = measure(canonicalCoeffs, ring.q);
  const gamma1 = 2 ** 17;
  const gamma2 = (ring.q - 1) / 88;
  const withinGamma1 = base.lInf < gamma1;
  const withinGamma2 = base.lInf < gamma2;
  const denseBits = ring.n * ceilLog2(ring.q);
  const sparseBits = base.hammingWeight * (ceilLog2(ring.n) + ceilLog2(ring.q));
  const normProfile: NormProfileEntry[] = [];
  const maxExponent = request.relation === "negacyclic" ? 2 * ring.n : ring.n;
  for (let k = 1; k <= maxExponent; k += 1) {
    const order = request.relation === "negacyclic" ? 2 * ring.n : ring.n;
    if (gcd(k, order) !== 1) continue;
    const transformed = applyPowerAutomorphism(residues, k, ring, request.relation);
    const transformedNorms = measure(transformed.map((coefficient) => center(coefficient, ring.q)), ring.q);
    normProfile.push({ k, ...transformedNorms });
  }
  return {
    engine: "typescript fallback",
    canonicalCoeffs,
    ...base,
    denseBits,
    sparseBits,
    compressionRatio: sparseBits === 0 ? null : denseBits / sparseBits,
    gamma1,
    gamma2,
    withinGamma1,
    withinGamma2,
    isShort: withinGamma1 && withinGamma2,
    normProfile,
  };
}

function reducePolynomial(coeffs: number[], ring: Ring, relation: NormRequest["relation"]): number[] {
  const result = new Array<number>(ring.n).fill(0);
  for (let degree = 0; degree < coeffs.length; degree += 1) {
    const wraps = Math.floor(degree / ring.n);
    const sign = relation === "negacyclic" && wraps % 2 === 1 ? -1 : 1;
    const index = degree % ring.n;
    result[index] = mod((result[index] ?? 0) + sign * (coeffs[degree] ?? 0), ring.q);
  }
  return result;
}

function applyPowerAutomorphism(
  coeffs: number[],
  k: number,
  ring: Ring,
  relation: NormRequest["relation"],
): number[] {
  const result = new Array<number>(ring.n).fill(0);
  for (let degree = 0; degree < ring.n; degree += 1) {
    const coefficient = coeffs[degree] ?? 0;
    const power = degree * k;
    const wraps = Math.floor(power / ring.n);
    const index = power % ring.n;
    const sign = relation === "negacyclic" && wraps % 2 === 1 ? -1 : 1;
    result[index] = mod((result[index] ?? 0) + sign * coefficient, ring.q);
  }
  return result;
}

function measure(coeffs: number[], q: number): Omit<NormProfileEntry, "k"> {
  return {
    lInf: normInf(coeffs),
    l2Squared: norm2sq(coeffs),
    hammingWeight: coeffs.filter((coefficient) => mod(coefficient, q) !== 0).length,
  };
}