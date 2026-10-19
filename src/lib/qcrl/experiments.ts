/**
 * QCRL v0.1 experiment runners.
 * Finite checks are labeled as finite checks. Nothing here is a security proof.
 */

import {
  QCRL_VERSION,
  QcrlError,
  asCoeffs,
  ceilLog2,
  center,
  detMod,
  formatPoly,
  formatVec,
  isPrime,
  matInv,
  matMul,
  matVec,
  mod,
  modInv,
  modPow,
  monomial,
  mulberry32,
  norm2sq,
  normInf,
  parseRing,
  randBelow,
  relationLabel,
  ringAdd,
  ringMul,
  ringSubstitute,
  rrefSolve,
  stable,
  vecEq,
  type Ring,
} from "./core.ts";

export type Classification =
  | "verified-finite"
  | "empirical"
  | "conjecture"
  | "classical-agreement"
  | "rejected"
  | "not-a-security-claim";

export type MapKind = "power-substitution" | "drop-constant" | "reversal" | "seeded-linear";

export type CandidateReport = {
  id: string;
  kind: MapKind;
  k: number | null;
  additive: true;
  unital: boolean;
  multiplicative: boolean;
  bijective: boolean;
  preservesEquality: boolean;
  counterexample: string | null;
  denseBits: number;
  compactBits: number | null;
  nonzeroEntries: number;
  applyCost: string;
  accepted: boolean;
  reason: string;
  classification: Classification;
};

export type DiscoveryReport = {
  experimentId: "QCRL-EXP-001";
  version: string;
  question: string;
  definition: string;
  ring: { q: number; n: number; r: number; relation: string };
  seed: number;
  method: string;
  candidates: CandidateReport[];
  acceptedIds: string[];
  rejectedIds: string[];
  preservingExample: string | null;
  invalidExample: string | null;
  criterionAgrees: boolean;
  notes: string[];
  formalOnThisParameterSet: string[];
  conjectures: string[];
  fingerprint: string;
};

export type LatticeReport = {
  experimentId: "QCRL-LATTICE-TOY";
  version: string;
  seed: number;
  disclaimer: string;
  lwe: {
    n: number;
    m: number;
    q: number;
    bound: number;
    secret: number[];
    error: number[];
    sampleFingerprint: string;
    recovered: boolean;
    solutionCount: number;
    searchSpace: number;
    zeroErrorStatus: string;
    noisyStatus: string;
    representationBits: number;
    secretNorm2: number;
    secretText: string;
    matrix: number[][];
    sample: number[];
  };
  moduleLwe: {
    ring: string;
    rank: number;
    secretNormInf: number;
    errorNormInf: number;
    recomputed: boolean;
    publicBits: number;
    polynomials: { name: string; body: string }[];
  };
  moduleSis: {
    searched: number;
    nonzeroShortKernelVectors: number;
    example: string | null;
    note: string;
  };
  fingerprint: string;
};

export type AttackReport = {
  experimentId: "QCRL-ATTACK-TOYHASH";
  version: string;
  seed: number;
  construction: string;
  knownWeakness: string;
  collision: { left: number[]; right: number[]; digest: number } | null;
  collisionSearched: number;
  avalancheMean: number;
  avalancheByBit: number[];
  chiSquare: number;
  chiSquareNote: string;
  deterministic: boolean;
  malformedRejected: boolean;
  malformedMessage: string;
  algebraicDistinguisher: string;
  classification: Classification;
  disclaimer: string;
  fingerprint: string;
};

export type EncodingReport = {
  experimentId: "QCRL-ENCODE-TOY";
  version: string;
  seed: number;
  q: number;
  n: number;
  sparse: EncodingCase;
  dense: EncodingCase;
  disclaimer: string;
  fingerprint: string;
};

export type EncodingCase = {
  label: string;
  polynomial: string;
  canonicalBytes: number;
  sparseBytes: number;
  ratio: number;
  roundTripOk: boolean;
  encodeUs: number;
  decodeUs: number;
};

export type BenchRow = {
  name: string;
  iterations: number;
  durationMs: number;
  perOpUs: number;
};

export type BenchReport = {
  experimentId: "QCRL-BENCH";
  version: string;
  seed: number;
  rows: BenchRow[];
  fingerprint: string;
  note: string;
};

export type SelfCheck = { name: string; ok: boolean; detail: string };

function assertSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
    throw new QcrlError(`Seed must be an integer from 0 to 2147483647. Received ${String(seed)}.`);
  }
}

const QUESTION =
  "Which polynomial maps on a small finite ring preserve addition, multiplication, and equality, while admitting a shorter description than a generic linear map?";

function requirePrime(q: number, where: string): void {
  if (!isPrime(q)) {
    throw new QcrlError(`${where} requires a prime modulus so linear algebra is decisive. q=${q} is not prime.`);
  }
}

function denseBits(n: number, q: number): number {
  return n * n * ceilLog2(q);
}

function matrixFromImages(images: number[][]): number[][] {
  const n = images.length;
  return Array.from({ length: n }, (_, row) => images.map((image) => image[row] ?? 0));
}

function applyMatrix(matrix: number[][], vector: number[], q: number): number[] {
  return matVec(matrix, vector, q);
}

function nonzero(matrix: number[][]): number {
  let count = 0;
  for (const row of matrix) for (const value of row) if (value !== 0) count += 1;
  return count;
}

/** x ↦ x^k induces a ring endomorphism iff r^k ≡ r. Classical, re-checked below. */
export function inducesEndomorphism(k: number, ring: Ring): boolean {
  return modPow(ring.r, k, ring.q) === mod(ring.r, ring.q);
}

function predictedBijective(k: number, ring: Ring): boolean {
  return inducesEndomorphism(k, ring) && gcdInt(k, ring.n) === 1;
}

function gcdInt(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function checkMultiplicative(
  apply: (vector: number[]) => number[],
  ring: Ring,
): { ok: boolean; counterexample: string | null } {
  for (let i = 0; i < ring.n; i += 1) {
    for (let j = 0; j < ring.n; j += 1) {
      const f = monomial(i, ring.n);
      const g = monomial(j, ring.n);
      const product = ringMul(f, g, ring);
      const left = apply(product);
      const right = ringMul(apply(f), apply(g), ring);
      if (!vecEq(left, right)) {
        return {
          ok: false,
          counterexample: `f=${formatPoly(f)}, g=${formatPoly(g)}, fg=${formatPoly(product, ring.q)}, T(fg)=${formatPoly(left, ring.q)}, T(f)T(g)=${formatPoly(right, ring.q)}`,
        };
      }
    }
  }
  return { ok: true, counterexample: null };
}

function analyze(input: {
  id: string;
  kind: MapKind;
  k: number | null;
  matrix: number[][];
  ring: Ring;
  compactBits: number | null;
  applyCost: string;
}): CandidateReport {
  const { ring } = input;
  const apply = (vector: number[]) => applyMatrix(input.matrix, asCoeffs(vector, ring.n, ring.q), ring.q);
  const one = asCoeffs([1], ring.n, ring.q);
  const imageOne = apply(one);
  const unital = vecEq(imageOne, one);
  const multiplicative = checkMultiplicative(apply, ring);
  let det = 0;
  try {
    det = detMod(input.matrix, ring.q);
  } catch (error) {
    throw new QcrlError(error instanceof Error ? error.message : "Determinant failed.");
  }
  const bijective = det !== 0;
  const preservesEquality = bijective;
  let counterexample = multiplicative.counterexample;
  if (unital && multiplicative.ok && !bijective) {
    counterexample = `The map preserves + and × but det=${det}, so distinct inputs can collide. Equality is not preserved.`;
  }
  if (!unital && !counterexample) {
    counterexample = `T(1) = ${formatPoly(imageOne, ring.q)}, which is not 1.`;
  }
  const accepted = unital && multiplicative.ok && bijective;
  let reason: string;
  if (accepted && input.compactBits !== null && input.compactBits < denseBits(ring.n, ring.q)) {
    reason = `Preserves the ring operations and equality. Description is ${input.compactBits} bits versus ${denseBits(ring.n, ring.q)} bits for the dense matrix.`;
  } else if (accepted) {
    reason = "Preserves the ring operations and equality. No shorter description than the dense matrix was recorded.";
  } else if (!multiplicative.ok) {
    reason = "Rejected: multiplication is not preserved. A counterexample was found on the monomial basis.";
  } else if (!unital) {
    reason = "Rejected: the multiplicative identity is not fixed.";
  } else {
    reason = "Rejected: the map is a non-injective homomorphism, so equality is not preserved.";
  }
  return {
    id: input.id,
    kind: input.kind,
    k: input.k,
    additive: true,
    unital,
    multiplicative: multiplicative.ok,
    bijective,
    preservesEquality,
    counterexample,
    denseBits: denseBits(ring.n, ring.q),
    compactBits: input.compactBits,
    nonzeroEntries: nonzero(input.matrix),
    applyCost: input.applyCost,
    accepted,
    reason,
    classification: accepted ? "verified-finite" : "rejected",
  };
}

export function runDiscovery(q: number, n: number, relation: "negacyclic" | "cyclic", seed: number): DiscoveryReport {
  assertSeed(seed);
  requirePrime(q, "QCRL-EXP-001");
  const ring = parseRing(q, n, relation);
  if (!Number.isInteger(seed)) throw new QcrlError(`Seed must be an integer, received ${String(seed)}.`);
  const rng = mulberry32(seed);
  const candidates: CandidateReport[] = [];

  for (let k = 0; k < ring.n; k += 1) {
    const images = Array.from({ length: ring.n }, (_, i) => ringSubstitute(monomial(i, ring.n), k, ring));
    candidates.push(
      analyze({
        id: `sigma-${k}`,
        kind: "power-substitution",
        k,
        matrix: matrixFromImages(images),
        ring,
        compactBits: ceilLog2(Math.max(2, ring.n)),
        applyCost: `${ring.n} placements (one per coefficient)`,
      }),
    );
  }

  const dropImages = Array.from({ length: ring.n }, (_, i) => {
    const image = new Array<number>(ring.n).fill(0);
    if (i > 0) image[i - 1] = 1;
    return image;
  });
  candidates.push(
    analyze({
      id: "drop-constant",
      kind: "drop-constant",
      k: null,
      matrix: matrixFromImages(dropImages),
      ring,
      compactBits: null,
      applyCost: `${ring.n} copies, discarding the constant term's destination`,
    }),
  );

  const revImages = Array.from({ length: ring.n }, (_, i) => {
    const image = new Array<number>(ring.n).fill(0);
    image[ring.n - 1 - i] = 1;
    return image;
  });
  candidates.push(
    analyze({
      id: "reversal",
      kind: "reversal",
      k: null,
      matrix: matrixFromImages(revImages),
      ring,
      compactBits: ring.n * ceilLog2(ring.n),
      applyCost: `${ring.n} placements`,
    }),
  );

  const seeded = Array.from({ length: ring.n }, () =>
    Array.from({ length: ring.n }, () => randBelow(rng, ring.q)),
  );
  candidates.push(
    analyze({
      id: "seeded-linear",
      kind: "seeded-linear",
      k: null,
      matrix: seeded,
      ring,
      compactBits: null,
      applyCost: `${ring.n * ring.n} multiplications`,
    }),
  );

  const power = candidates.filter((c) => c.kind === "power-substitution");
  const criterionAgrees = power.every((c) => {
    const k = c.k ?? 0;
    return c.multiplicative === inducesEndomorphism(k, ring) && c.bijective === predictedBijective(k, ring);
  });

  const accepted = candidates.filter((c) => c.accepted);
  const rejected = candidates.filter((c) => !c.accepted);
  const nontrivial = accepted.find((c) => c.kind === "power-substitution" && c.k !== 1) ?? accepted[0] ?? null;
  const invalid = candidates.find((c) => c.id === "drop-constant") ?? rejected[0] ?? null;

  const mathPayload = candidates.map((c) => ({
    id: c.id,
    accepted: c.accepted,
    multiplicative: c.multiplicative,
    bijective: c.bijective,
    unital: c.unital,
    counterexample: c.counterexample,
  }));

  return {
    experimentId: "QCRL-EXP-001",
    version: QCRL_VERSION,
    question: QUESTION,
    definition:
      "A candidate T is a Z/qZ-linear map on coefficient vectors of R = Z/qZ[x]/(x^n − r). It is accepted only when T(1)=1, T(fg)=T(f)T(g) for every pair (checked on a monomial basis, which is exhaustive because both sides are bilinear), and T is bijective (so a=b iff T(a)=T(b)). Acceptance is not a claim of novelty or security.",
    ring: { q: ring.q, n: ring.n, r: ring.r, relation: relationLabel(ring) },
    seed,
    method:
      "Every map is stored as its matrix on the monomial basis, so additivity holds by construction. Multiplicativity is every pair x^i · x^j. Bijectivity is a non-zero determinant. Power substitutions are also compared with the classical rule: x ↦ x^k induces an endomorphism iff r^k ≡ r (mod q), and for r ∈ {±1} bijectivity is predicted iff that holds and gcd(k, n)=1.",
    candidates,
    acceptedIds: accepted.map((c) => c.id),
    rejectedIds: rejected.map((c) => c.id),
    preservingExample: nontrivial
      ? `${nontrivial.id}: ${nontrivial.reason}`
      : "No accepted map on this parameter set.",
    invalidExample: invalid
      ? `${invalid.id}: ${invalid.counterexample ?? invalid.reason}`
      : null,
    criterionAgrees,
    notes: [
      "A passing candidate is a verified finite-domain property of this exact ring. It is not labeled a discovery and it is not a cryptographic primitive.",
      "Statistical or algebraic success inside this bound says nothing about other parameters.",
      criterionAgrees
        ? "On this parameter set the basis check agrees with the classical endomorphism rule. That agreement is a finite verification, not a new theorem."
        : "The basis check disagreed with the classical prediction. Treat the prediction as wrong for these parameters and trust the explicit counterexample or determinant.",
    ],
    formalOnThisParameterSet: [
      "Additivity is by construction: each candidate is a matrix.",
      "Multiplicativity is settled for every ring element by the monomial-basis check, using bilinearity of both T(fg) and T(f)T(g).",
      "Bijectivity is the determinant over the field Z/qZ.",
    ],
    conjectures: criterionAgrees
      ? [
          "Conjecture, not a theorem of this lab: for every odd prime q and every n≤12, the same classical rule continues to match the basis check. v0.1 only verified the parameter set you just ran.",
        ]
      : [
          "The classical rule failed on this parameter set. Do not extrapolate it. The failed prediction is recorded rather than repaired silently.",
        ],
    fingerprint: stable(mathPayload),
  };
}

function sampleMatrix(rows: number, cols: number, q: number, rng: () => number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => randBelow(rng, q)));
}

function sampleSmall(length: number, bound: number, rng: () => number): number[] {
  const span = 2 * bound + 1;
  return Array.from({ length }, () => randBelow(rng, span) - bound);
}

function enumerateSmall(
  length: number,
  bound: number,
  visit: (value: number[]) => void,
): number {
  const span = 2 * bound + 1;
  const total = span ** length;
  if (!Number.isFinite(total) || total > 100_000) {
    throw new QcrlError(
      `Search space ${String(total)} exceeds the v0.1 cap of 100000. Reduce dimension or bound.`,
    );
  }
  const current = new Array<number>(length).fill(0);
  for (let t = 0; t < total; t += 1) {
    let x = t;
    for (let i = 0; i < length; i += 1) {
      current[i] = (x % span) - bound;
      x = Math.floor(x / span);
    }
    visit(current);
  }
  return total;
}

export function runLattice(input: {
  seed: number;
  n: number;
  m: number;
  q: number;
  bound: number;
  moduleN: number;
}): LatticeReport {
  const { seed, n, m, q, bound, moduleN } = input;
  assertSeed(seed);
  if (!Number.isInteger(n) || n < 1 || n > 6) {
    throw new QcrlError(`LWE secret length n=${String(n)} is unsupported. Use 1..6.`);
  }
  if (!Number.isInteger(m) || m < n || m > 12) {
    throw new QcrlError(`LWE sample count m=${String(m)} is unsupported. Use n..12.`);
  }
  requirePrime(q, "The lattice demo");
  if (q > 251) throw new QcrlError(`Lattice demo modulus q=${q} is above the v0.1 cap of 251.`);
  if (!Number.isInteger(bound) || bound < 0 || bound > 2) {
    throw new QcrlError(`Error bound B=${String(bound)} is unsupported. Use 0, 1, or 2.`);
  }
  if (!Number.isInteger(moduleN) || moduleN < 2 || moduleN > 4) {
    throw new QcrlError(`Module degree ${String(moduleN)} is unsupported. Use 2, 3, or 4.`);
  }

  const rng = mulberry32(seed);
  const secretRaw = sampleSmall(n, bound, rng);
  const errorRaw = sampleSmall(m, bound, rng);
  const secret = secretRaw.map((value) => mod(value, q));
  const error = errorRaw.map((value) => mod(value, q));
  const a = sampleMatrix(m, n, q, rng);
  const as = matVec(a, secret, q);
  const b = as.map((value, i) => mod(value + (error[i] ?? 0), q));

  let solutionCount = 0;
  let recovered = false;
  const searchSpace = enumerateSmall(n, bound, (guess) => {
    const image = matVec(a, guess.map((value) => mod(value, q)), q);
    for (let i = 0; i < m; i += 1) {
      if (Math.abs(center(mod((b[i] ?? 0) - (image[i] ?? 0), q), q)) > bound) return;
    }
    solutionCount += 1;
    if (vecEq(guess.map((value) => mod(value, q)), secret)) recovered = true;
  });

  const zero = rrefSolve(a, as, q);
  const noisy = rrefSolve(a, b, q);
  const zeroMatches =
    zero.status === "unique" && zero.solution !== null && vecEq(zero.solution, secret);
  const noisyMatches =
    noisy.status === "unique" && noisy.solution !== null && vecEq(noisy.solution, secret);

  const ring = parseRing(q, moduleN, "negacyclic");
  const rank = 2;
  const moduleRng = mulberry32(seed ^ 0x51ed);
  const poly = () => Array.from({ length: moduleN }, () => randBelow(moduleRng, q));
  const smallPoly = () => sampleSmall(moduleN, 1, moduleRng).map((value) => mod(value, q));
  const a00 = poly();
  const a01 = poly();
  const a10 = poly();
  const a11 = poly();
  const s0 = smallPoly();
  const s1 = smallPoly();
  const e0 = smallPoly();
  const e1 = smallPoly();
  const b0 = ringAdd(ringAdd(ringMul(a00, s0, ring), ringMul(a01, s1, ring), ring), e0, ring);
  const b1 = ringAdd(ringAdd(ringMul(a10, s0, ring), ringMul(a11, s1, ring), ring), e1, ring);
  const check0 = vecEq(b0, ringAdd(ringAdd(ringMul(a00, s0, ring), ringMul(a01, s1, ring), ring), e0, ring));
  const check1 = vecEq(b1, ringAdd(ringAdd(ringMul(a10, s0, ring), ringMul(a11, s1, ring), ring), e1, ring));

  const sisRng = mulberry32(seed ^ 0x515);
  const sisA = poly();
  const sisB = poly();
  let kernel = 0;
  let example: string | null = null;
  const sisSearched = enumerateSmall(moduleN * 2, 1, (guess) => {
    if (guess.every((value) => value === 0)) return;
    const z0 = guess.slice(0, moduleN).map((value) => mod(value, q));
    const z1 = guess.slice(moduleN).map((value) => mod(value, q));
    const image = ringAdd(ringMul(sisA, z0, ring), ringMul(sisB, z1, ring), ring);
    if (image.every((value) => value === 0)) {
      kernel += 1;
      if (!example) {
        example = `z0=${formatPoly(z0, q)}, z1=${formatPoly(z1, q)}`;
      }
    }
  });

  const width = ceilLog2(q);
  const payload = {
    secret,
    error,
    b,
    a,
    recovered,
    solutionCount,
    module: { s0, s1, e0, e1, b0, b1 },
    kernel,
    example,
  };

  return {
    experimentId: "QCRL-LATTICE-TOY",
    version: QCRL_VERSION,
    seed,
    disclaimer:
      "Educational samples of the LWE, Module-LWE, and Module-SIS shapes on tiny parameters. They are not ML-DSA, not Module-LWE at a standardized security level, and not evidence for or against any production scheme.",
    lwe: {
      n,
      m,
      q,
      bound,
      secret: secret.map((value) => center(value, q)),
      error: error.map((value) => center(value, q)),
      sampleFingerprint: stable({ a, b }),
      recovered,
      solutionCount,
      searchSpace,
      zeroErrorStatus: zeroMatches
        ? "With the error removed, elimination recovered the secret. The zero-error system is ordinary linear algebra."
        : `Zero-error system status: ${zero.status}. Rank ${zero.rank}. ${zeroMatches ? "matched" : "did not match"} the planted secret.`,
      noisyStatus: noisy.status === "inconsistent"
        ? "With the error left in, the overdetermined system is inconsistent. The sample is not an exact linear relation."
        : noisyMatches
          ? "The noisy system still produced the planted secret. That can happen when the error is zero or the extra rows do not bind."
          : `Noisy system status: ${noisy.status}. It did not return the planted secret.`,
      representationBits: m * n * width + m * width,
      secretNorm2: norm2sq(secret, q),
      secretText: formatVec(secret, q),
      matrix: a,
      sample: b.map((value) => center(value, q)),
    },
    moduleLwe: {
      ring: relationLabel(ring),
      rank,
      secretNormInf: Math.max(normInf(s0, q), normInf(s1, q)),
      errorNormInf: Math.max(normInf(e0, q), normInf(e1, q)),
      recomputed: check0 && check1,
      publicBits: (4 + 2) * moduleN * width,
      polynomials: [
        { name: "s0", body: formatPoly(s0, q) },
        { name: "s1", body: formatPoly(s1, q) },
        { name: "e0", body: formatPoly(e0, q) },
        { name: "e1", body: formatPoly(e1, q) },
        { name: "b0", body: formatPoly(b0, q) },
        { name: "b1", body: formatPoly(b1, q) },
      ],
    },
    moduleSis: {
      searched: sisSearched,
      nonzeroShortKernelVectors: kernel,
      example,
      note:
        kernel > 0
          ? "A short non-zero kernel vector exists at this bound. Tiny Module-SIS instances are often easy; this does not measure asymptotic hardness."
          : "No non-zero kernel vector with coefficients in {−1, 0, 1} was found. That is a finite statement about this draw only.",
    },
    fingerprint: stable(payload),
  };
}

/** Deliberately weak checksum. Output is 8 bits. Not a hash proposal. */
export function toySumHash(bytes: number[]): number {
  if (bytes.length > 64) {
    throw new QcrlError("ToySum-8 refuses inputs longer than 64 bytes in v0.1.");
  }
  let acc = 0;
  for (const byte of bytes) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new QcrlError(`ToySum-8 expected a byte 0..255, received ${String(byte)}.`);
    }
    acc = (acc + byte) & 0xff;
  }
  return acc;
}

export function runAttacks(seed: number): AttackReport {
  assertSeed(seed);
  const rng = mulberry32(seed);
  const buckets = new Map<number, number[]>();
  let searched = 0;
  let collision: AttackReport["collision"] = null;
  for (let left = 0; left < 16 && !collision; left += 1) {
    for (let right = 0; right < 16; right += 1) {
      searched += 1;
      const message = [left, right];
      const digest = toySumHash(message);
      const previous = buckets.get(digest);
      if (previous && !vecEq(previous, message)) {
        collision = { left: previous, right: message, digest };
        break;
      }
      if (!previous) buckets.set(digest, message);
    }
  }

  const avalancheByBit = new Array<number>(8).fill(0);
  const trials = 48;
  let flips = 0;
  let observations = 0;
  for (let t = 0; t < trials; t += 1) {
    const message = Array.from({ length: 4 }, () => randBelow(rng, 256));
    const base = toySumHash(message);
    for (let bit = 0; bit < 32; bit += 1) {
      const mutated = message.slice();
      const index = Math.floor(bit / 8);
      mutated[index] = (mutated[index] ?? 0) ^ (1 << (bit % 8));
      const next = toySumHash(mutated);
      const delta = base ^ next;
      let count = 0;
      for (let o = 0; o < 8; o += 1) {
        if ((delta >> o) & 1) {
          count += 1;
          avalancheByBit[o] += 1;
        }
      }
      flips += count;
      observations += 1;
    }
  }
  const avalancheMean = observations === 0 ? 0 : flips / (observations * 8);
  const bitDenom = trials * 32;
  const avalancheRate = avalancheByBit.map((count) => count / bitDenom);

  const hist = new Array<number>(256).fill(0);
  for (let a = 0; a < 16; a += 1) {
    for (let b = 0; b < 16; b += 1) hist[toySumHash([a, b])] += 1;
  }
  const expected = 256 / 256;
  let chi = 0;
  for (const count of hist) chi += (count - expected) ** 2 / expected;

  const again = toySumHash([1, 2, 3, 4]);
  const deterministic = again === toySumHash([1, 2, 3, 4]) && again === 10;
  let malformedRejected = false;
  let malformedMessage = "";
  try {
    toySumHash([1, 256]);
  } catch (error) {
    malformedRejected = true;
    malformedMessage = error instanceof Error ? error.message : "rejected";
  }

  const oneByteIdentity = [0, 1, 7, 255].every((value) => toySumHash([value]) === value);

  return {
    experimentId: "QCRL-ATTACK-TOYHASH",
    version: QCRL_VERSION,
    seed,
    construction:
      "ToySum-8(b0, b1, …) = (b0 + b1 + …) mod 256. Built to be broken. It is registered only as a negative example.",
    knownWeakness: "Eight-bit modular sum: collisions, no diffusion, and an algebraic distinguisher.",
    collision,
    collisionSearched: searched,
    avalancheMean,
    avalancheByBit: avalancheRate,
    chiSquare: chi,
    chiSquareNote:
      "256 two-byte messages with bytes in 0..15 land in 256 bins. A uniform 8-bit function would put about one message per bin (chi-square near 255 for 255 degrees of freedom). ToySum-8 only produces sums 0..30, so most bins are empty. The statistic is a measurement, not a security proof — a uniform output can still be insecure.",
    deterministic,
    malformedRejected,
    malformedMessage,
    algebraicDistinguisher: oneByteIdentity
      ? "On one-byte messages ToySum-8 is the identity, so the output is the input. On two-byte messages the output is their sum, and h(a,b) − h(a,c) ≡ b − c (mod 256)."
      : "The expected one-byte identity failed. The construction did not match its definition.",
    classification: collision ? "rejected" : "empirical",
    disclaimer:
      "Finding this collision shows the toy is weak. Failing to find a collision, or seeing a flattering statistic, would still not establish cryptographic security.",
    fingerprint: stable({
      collision,
      deterministic,
      malformedRejected,
      avalancheMean: Number(avalancheMean.toFixed(6)),
    }),
  };
}

function bitsFor(q: number): number {
  if (q < 2 || q > 256) {
    throw new QcrlError(`Encoding demo supports modulus 2..256. Received q=${q}.`);
  }
  return ceilLog2(q);
}

function writeBits(values: number[], width: number): Uint8Array {
  const bits = values.length * width;
  const out = new Uint8Array(Math.ceil(bits / 8));
  values.forEach((value, index) => {
    for (let bit = 0; bit < width; bit += 1) {
      if (((value >> bit) & 1) === 0) continue;
      const at = index * width + bit;
      out[at >> 3] = (out[at >> 3] ?? 0) | (1 << (at & 7));
    }
  });
  return out;
}

function readBits(bytes: Uint8Array, count: number, width: number): number[] {
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    let value = 0;
    for (let bit = 0; bit < width; bit += 1) {
      const at = index * width + bit;
      if ((bytes[at >> 3] ?? 0) & (1 << (at & 7))) value |= 1 << bit;
    }
    values.push(value);
  }
  return values;
}

export function encodeCanonical(coeffs: number[], q: number): Uint8Array {
  const width = bitsFor(q);
  return writeBits(coeffs.map((c) => mod(c, q)), width);
}

export function decodeCanonical(bytes: Uint8Array, n: number, q: number): number[] {
  const width = bitsFor(q);
  const need = Math.ceil((n * width) / 8);
  if (bytes.length < need) {
    throw new QcrlError(`Canonical encoding is ${need} bytes; received ${bytes.length}.`);
  }
  return readBits(bytes, n, width).map((value) => mod(value, q));
}

export function encodeSparse(coeffs: number[], q: number): Uint8Array {
  if (coeffs.length > 255) throw new QcrlError("Sparse encoding supports length ≤ 255.");
  const pairs: number[] = [];
  coeffs.forEach((raw, index) => {
    const value = mod(raw, q);
    if (value !== 0) pairs.push(index, value);
  });
  const out = new Uint8Array(1 + pairs.length);
  out[0] = pairs.length / 2;
  pairs.forEach((value, index) => {
    out[index + 1] = value;
  });
  return out;
}

export function decodeSparse(bytes: Uint8Array, n: number, q: number): number[] {
  if (bytes.length < 1) throw new QcrlError("Sparse encoding is empty.");
  const count = bytes[0] ?? 0;
  if (bytes.length < 1 + count * 2) {
    throw new QcrlError("Sparse encoding is truncated.");
  }
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < count; i += 1) {
    const index = bytes[1 + 2 * i] ?? 0;
    const value = bytes[2 + 2 * i] ?? 0;
    if (index >= n) throw new QcrlError(`Sparse index ${index} is outside 0..${n - 1}.`);
    out[index] = mod(value, q);
  }
  return out;
}

function timeUs(fn: () => void, iterations: number): number {
  const started = nowMs();
  for (let i = 0; i < iterations; i += 1) fn();
  return ((nowMs() - started) * 1000) / iterations;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
  return Date.now();
}

function encodingCase(label: string, coeffs: number[], q: number): EncodingCase {
  const canonical = encodeCanonical(coeffs, q);
  const sparse = encodeSparse(coeffs, q);
  const backC = decodeCanonical(canonical, coeffs.length, q);
  const backS = decodeSparse(sparse, coeffs.length, q);
  const roundTripOk = vecEq(backC, coeffs.map((c) => mod(c, q))) && vecEq(backS, coeffs.map((c) => mod(c, q)));
  let sink = 0;
  const encodeUs = timeUs(() => {
    sink ^= encodeSparse(coeffs, q)[0] ?? 0;
  }, 400);
  const decodeUs = timeUs(() => {
    sink ^= decodeSparse(sparse, coeffs.length, q)[0] ?? 0;
  }, 400);
  if (sink === -1) throw new QcrlError("unreachable");
  return {
    label,
    polynomial: formatPoly(coeffs, q),
    canonicalBytes: canonical.length,
    sparseBytes: sparse.length,
    ratio: canonical.length === 0 ? 1 : sparse.length / canonical.length,
    roundTripOk,
    encodeUs,
    decodeUs,
  };
}

export function runEncoding(seed: number, q: number, n: number): EncodingReport {
  assertSeed(seed);
  if (!Number.isInteger(n) || n < 2 || n > 32) {
    throw new QcrlError(`Encoding length n=${String(n)} is unsupported. Use 2..32.`);
  }
  if (!Number.isInteger(q) || q < 2 || q > 256) {
    throw new QcrlError(`Encoding modulus q=${String(q)} is unsupported. Use 2..256.`);
  }
  const rng = mulberry32(seed);
  const sparseCoeffs = new Array<number>(n).fill(0);
  sparseCoeffs[0] = 1;
  sparseCoeffs[n - 1] = q > 2 ? 2 : 1;
  const denseCoeffs = Array.from({ length: n }, () => randBelow(rng, q));
  const sparse = encodingCase("Sparse secret-like", sparseCoeffs, q);
  const dense = encodingCase("Dense uniform", denseCoeffs.map((c) => mod(c, q)), q);
  return {
    experimentId: "QCRL-ENCODE-TOY",
    version: QCRL_VERSION,
    seed,
    q,
    n,
    sparse,
    dense,
    disclaimer:
      "These are lossless serializations of coefficient vectors. They are not cryptographic proof compression. A proof encoding would also have to preserve completeness, soundness, and zero-knowledge of a specified proof system. No such system is implemented here.",
    fingerprint: stable({
      sparse: { bytes: sparse.sparseBytes, ok: sparse.roundTripOk, poly: sparse.polynomial },
      dense: { bytes: dense.sparseBytes, ok: dense.roundTripOk, poly: dense.polynomial },
    }),
  };
}

export function runBenchmark(seed: number): BenchReport {
  assertSeed(seed);
  const ring = parseRing(17, 8, "negacyclic");
  const rng = mulberry32(seed);
  const left = Array.from({ length: 8 }, () => randBelow(rng, 17));
  const right = Array.from({ length: 8 }, () => randBelow(rng, 17));
  let sink = 0;
  const mulMs = elapsedMs(() => {
    for (let i = 0; i < 1500; i += 1) sink ^= ringMul(left, right, ring)[i % 8] ?? 0;
  });
  const subMs = elapsedMs(() => {
    for (let i = 0; i < 800; i += 1) sink ^= ringSubstitute(left, 3, ring)[i % 8] ?? 0;
  });
  const hashMs = elapsedMs(() => {
    for (let i = 0; i < 4000; i += 1) sink ^= toySumHash([i & 255, (i >> 1) & 255, seed & 255]);
  });
  const detMs = elapsedMs(() => {
    const matrix = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (_, c) => mod(left[r] ?? 1 + (right[c] ?? 0) + r + c, 17)),
    );
    for (let i = 0; i < 300; i += 1) sink ^= detMod(matrix, 17);
  });
  if (sink === -2) throw new QcrlError("unreachable");
  const rows: BenchRow[] = [
    rowOf("Ring product in Z/17Z[x]/(x^8+1)", 1500, mulMs),
    rowOf("Power substitution σ_3", 800, subMs),
    rowOf("ToySum-8", 4000, hashMs),
    rowOf("4×4 determinant mod 17", 300, detMs),
  ];
  return {
    experimentId: "QCRL-BENCH",
    version: QCRL_VERSION,
    seed,
    rows,
    fingerprint: stable(rows.map((r) => r.name)),
    note: "Times are wall-clock measurements of this JavaScript engine on the current machine. They are not comparable to optimized native cryptography, and a faster toy is not a better primitive.",
  };
}

function elapsedMs(fn: () => void): number {
  const started = nowMs();
  fn();
  return nowMs() - started;
}

function rowOf(name: string, iterations: number, durationMs: number): BenchRow {
  return {
    name,
    iterations,
    durationMs,
    perOpUs: (durationMs * 1000) / iterations,
  };
}

export function runSelfTest(): SelfCheck[] {
  const checks: SelfCheck[] = [];
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  try {
    push("Inverse of 3 mod 17", mod(3 * modPow(3, 15, 17), 17) === 1, "3 × 3^15 ≡ 1 (mod 17).");
  } catch (error) {
    push("Inverse of 3 mod 17", false, error instanceof Error ? error.message : "failed");
  }

  try {
    let thrown = false;
    try {
      modInv(8, 12);
    } catch (error) {
      thrown = error instanceof QcrlError;
    }
    push(
      "Non-unit is rejected",
      thrown,
      thrown ? "Inverse of 8 mod 12 raised a precise error." : "Expected a QcrlError.",
    );
  } catch (error) {
    push("Non-unit is rejected", false, error instanceof Error ? error.message : "failed");
  }

  const ring = parseRing(5, 4, "negacyclic");
  const x3 = monomial(3, 4);
  const x = monomial(1, 4);
  const product = ringMul(x3, x, ring);
  push(
    "x^3 · x = −1 in Z/5Z[x]/(x^4+1)",
    vecEq(product, [4, 0, 0, 0]),
    `Computed ${formatPoly(product, 5)}.`,
  );

  const bad = ringSubstitute(product, 2, ring);
  const left = ringMul(ringSubstitute(x3, 2, ring), ringSubstitute(x, 2, ring), ring);
  push(
    "σ_2 is not multiplicative here",
    !vecEq(bad, left),
    `T(fg)=${formatPoly(bad, 5)}, T(f)T(g)=${formatPoly(left, 5)}.`,
  );

  const discovery = runDiscovery(17, 4, "negacyclic", 7);
  const sigma1 = discovery.candidates.find((c) => c.id === "sigma-1");
  const sigma3 = discovery.candidates.find((c) => c.id === "sigma-3");
  const drop = discovery.candidates.find((c) => c.id === "drop-constant");
  push("σ_1 accepted", sigma1?.accepted === true, sigma1?.reason ?? "missing");
  push("σ_3 accepted on x^4+1", sigma3?.accepted === true, sigma3?.reason ?? "missing");
  push("drop-constant rejected", drop?.accepted === false && Boolean(drop?.counterexample), drop?.counterexample ?? "missing");
  push(
    "Classical rule agrees",
    discovery.criterionAgrees,
    discovery.criterionAgrees ? "Basis check matches the prediction." : "Mismatch recorded.",
  );

  const again = runDiscovery(17, 4, "negacyclic", 7);
  push(
    "Same seed, same discovery",
    discovery.fingerprint === again.fingerprint,
    `Fingerprint ${discovery.fingerprint.slice(0, 18)}… matches.`,
  );

  const lattice = runLattice({ seed: 11, n: 2, m: 4, q: 17, bound: 1, moduleN: 2 });
  const latticeAgain = runLattice({ seed: 11, n: 2, m: 4, q: 17, bound: 1, moduleN: 2 });
  push(
    "Lattice sample repeats",
    lattice.fingerprint === latticeAgain.fingerprint,
    `Sample ${lattice.lwe.sampleFingerprint.slice(0, 18)}… matches.`,
  );
  push("Module-LWE recomputes", lattice.moduleLwe.recomputed, "b = As + e was checked.");
  push(
    "Bounded search finds the planted LWE secret",
    lattice.lwe.recovered,
    `${lattice.lwe.solutionCount} solution(s) inside the bound.`,
  );

  const attacks = runAttacks(3);
  push("Toy collision found", attacks.collision !== null, attacks.collision ? `digest ${attacks.collision.digest}` : "none");
  push("Malformed byte rejected", attacks.malformedRejected, attacks.malformedMessage);
  push("Toy hash is deterministic", attacks.deterministic, "h(1,2,3,4) = 10 twice.");

  const encoding = runEncoding(1, 17, 8);
  push(
    "Encodings round-trip",
    encoding.sparse.roundTripOk && encoding.dense.roundTripOk,
    `sparse ${encoding.sparse.sparseBytes} bytes, dense sparse-form ${encoding.dense.sparseBytes} bytes.`,
  );

  let unsupported = false;
  try {
    runDiscovery(9, 4, "negacyclic", 1);
  } catch (error) {
    unsupported = error instanceof QcrlError && /prime/.test(error.message);
  }
  push("Composite modulus is refused", unsupported, unsupported ? "Clear error for q=9." : "Expected a refusal.");

  return checks;
}

export function environmentMeta(): {
  cpuArchitecture: string;
  deviceMemoryGb: number | null;
  runtime: string;
  runtimeDetail: string;
  sourceCommit: string;
  peakMemory: string;
  python: string;
  rustc: string;
} {
  const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { deviceMemory?: number });
  return {
    cpuArchitecture: nav?.platform || "unavailable",
    deviceMemoryGb: nav?.deviceMemory ?? null,
    runtime: nav ? "browser javascript" : "javascript",
    runtimeDetail: nav?.userAgent ?? "engine",
    sourceCommit: "unavailable",
    peakMemory: "unavailable",
    python: "not used in this edition",
    rustc: "not used in this edition",
  };
}

export function bytesOf(value: unknown): number {
  return new TextEncoder().encode(stable(value)).length;
}

export function compareFingerprints(left: string, right: string): { equivalent: boolean; detail: string } {
  if (left === right) {
    return { equivalent: true, detail: "Mathematical fingerprints match. Timings are allowed to differ." };
  }
  return { equivalent: false, detail: "Fingerprints differ. These runs are not the same mathematical output." };
}

export function matrixDemo(q: number): { product: number[][]; determinant: number; inverse: number[][] | null } {
  requirePrime(q, "The matrix demo");
  const a = [
    [1, 2],
    [3, 4],
  ];
  const b = [
    [5, 6],
    [7, 8],
  ];
  return { product: matMul(a, b, q), determinant: detMod(a, q), inverse: matInv(a, q) };
}
