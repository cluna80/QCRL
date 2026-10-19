/** Finite-ring arithmetic for QCRL v0.1. Experimental mathematics, not a crypto library. */

export const QCRL_VERSION = "0.1.0";

export class QcrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QcrlError";
  }
}

export function mod(a: number, m: number): number {
  if (!Number.isInteger(m) || m <= 0) {
    throw new QcrlError(`Modulus must be a positive integer, received ${String(m)}.`);
  }
  if (!Number.isFinite(a)) {
    throw new QcrlError("Arithmetic received a non-finite number.");
  }
  const t = Math.trunc(a);
  const r = t % m;
  return r < 0 ? r + m : r;
}

export function egcd(a: number, b: number): { g: number; x: number; y: number } {
  let oldR = Math.trunc(a);
  let r = Math.trunc(b);
  let oldS = 1;
  let s = 0;
  let oldT = 0;
  let t = 1;
  while (r !== 0) {
    const q = Math.trunc(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  return { g: Math.abs(oldR), x: oldR < 0 ? -oldS : oldS, y: oldR < 0 ? -oldT : oldT };
}

export function modInv(a: number, m: number): number {
  const aa = mod(a, m);
  const { g, x } = egcd(aa, m);
  if (g !== 1) {
    throw new QcrlError(
      `Inverse does not exist: gcd(${aa}, ${m}) = ${g}. ${aa} is not a unit modulo ${m}.`,
    );
  }
  return mod(x, m);
}

export function modPow(base: number, exp: number, m: number): number {
  if (!Number.isInteger(exp) || exp < 0) {
    throw new QcrlError(`Exponent must be a non-negative integer, received ${String(exp)}.`);
  }
  let result = 1;
  let b = mod(base, m);
  let e = exp;
  while (e > 0) {
    if (e & 1) result = mod(result * b, m);
    b = mod(b * b, m);
    e = Math.floor(e / 2);
  }
  return result;
}

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

export function ceilLog2(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new QcrlError(`ceilLog2 expects a positive integer, received ${String(n)}.`);
  }
  let bits = 0;
  let v = n - 1;
  while (v > 0) {
    v = Math.floor(v / 2);
    bits += 1;
  }
  return Math.max(1, bits);
}

export function center(value: number, q: number): number {
  const m = mod(value, q);
  return m > q / 2 ? m - q : m;
}

export function gcd(a: number, b: number): number {
  return egcd(a, b).g;
}

/** Mulberry32. Same seed → same stream. Not a cryptographic generator. */
export function mulberry32(seed: number): () => number {
  if (!Number.isInteger(seed)) {
    throw new QcrlError(`Seed must be an integer, received ${String(seed)}.`);
  }
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randBelow(rng: () => number, n: number): number {
  if (!Number.isInteger(n) || n <= 0) {
    throw new QcrlError(`Random bound must be a positive integer, received ${String(n)}.`);
  }
  return Math.floor(rng() * n);
}

export function trimPoly(coeffs: number[]): number[] {
  let end = coeffs.length;
  while (end > 1 && coeffs[end - 1] === 0) end -= 1;
  return coeffs.slice(0, Math.max(1, end));
}

export function polyDeg(coeffs: number[]): number {
  const t = trimPoly(coeffs);
  if (t.length === 1 && t[0] === 0) return -1;
  return t.length - 1;
}

export function polyAdd(a: number[], b: number[], q: number): number[] {
  const n = Math.max(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(mod((a[i] ?? 0) + (b[i] ?? 0), q));
  return trimPoly(out);
}

export function polySub(a: number[], b: number[], q: number): number[] {
  const n = Math.max(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(mod((a[i] ?? 0) - (b[i] ?? 0), q));
  return trimPoly(out);
}

export function polyMul(a: number[], b: number[], q: number): number[] {
  if (a.length === 0 || b.length === 0) return [0];
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    const ai = mod(a[i] ?? 0, q);
    if (ai === 0) continue;
    for (let j = 0; j < b.length; j += 1) {
      const bj = mod(b[j] ?? 0, q);
      if (bj === 0) continue;
      out[i + j] = mod(out[i + j] + ai * bj, q);
    }
  }
  return trimPoly(out);
}

/** Remainder of dividend modulo a non-zero divisor. Prime modulus required. */
export function polyRem(dividend: number[], divisor: number[], q: number): number[] {
  if (!isPrime(q)) {
    throw new QcrlError(
      `General polynomial reduction requires a prime modulus. q=${q} is not prime.`,
    );
  }
  const modP = trimPoly(divisor.map((c) => mod(c, q)));
  if (polyDeg(modP) < 0) {
    throw new QcrlError("Cannot reduce by the zero polynomial.");
  }
  const lead = modP[modP.length - 1] ?? 0;
  const invLead = modInv(lead, q);
  let rest = trimPoly(dividend.map((c) => mod(c, q)));
  let guard = 0;
  while (polyDeg(rest) >= polyDeg(modP)) {
    guard += 1;
    if (guard > dividend.length + divisor.length + 8) {
      throw new QcrlError("Polynomial reduction did not terminate. Check the divisor.");
    }
    const shift = polyDeg(rest) - polyDeg(modP);
    const factor = mod((rest[rest.length - 1] ?? 0) * invLead, q);
    const next = rest.slice();
    for (let i = 0; i < modP.length; i += 1) {
      const at = i + shift;
      next[at] = mod((next[at] ?? 0) - factor * (modP[i] ?? 0), q);
    }
    rest = trimPoly(next);
  }
  return rest.length ? rest : [0];
}

export type Ring = {
  q: number;
  n: number;
  /** x^n ≡ r in the quotient Z/qZ[x] / (x^n − r). */
  r: number;
};

export function parseRing(q: number, n: number, relation: "negacyclic" | "cyclic"): Ring {
  if (!Number.isInteger(q) || q < 2 || q > 4096) {
    throw new QcrlError(`Unsupported modulus q=${String(q)}. Use an integer from 2 to 4096.`);
  }
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    throw new QcrlError(`Unsupported degree n=${String(n)}. Use an integer from 1 to 12.`);
  }
  if (relation !== "negacyclic" && relation !== "cyclic") {
    throw new QcrlError(`Unknown relation "${String(relation)}". Use negacyclic (x^n+1) or cyclic (x^n−1).`);
  }
  const r = relation === "cyclic" ? 1 : mod(-1, q);
  return { q, n, r };
}

export function relationLabel(ring: Ring): string {
  return ring.r === 1 ? `x^${ring.n} − 1` : `x^${ring.n} + 1`;
}

export function asCoeffs(values: number[], n: number, q: number): number[] {
  if (values.length > n) {
    throw new QcrlError(`Expected at most ${n} coefficients, received ${values.length}.`);
  }
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < values.length; i += 1) {
    if (!Number.isFinite(values[i] ?? NaN)) {
      throw new QcrlError(`Coefficient ${i} is not a finite number.`);
    }
    out[i] = mod(values[i] ?? 0, q);
  }
  return out;
}

export function ringAdd(a: number[], b: number[], ring: Ring): number[] {
  const left = asCoeffs(a, ring.n, ring.q);
  const right = asCoeffs(b, ring.n, ring.q);
  return left.map((c, i) => mod(c + (right[i] ?? 0), ring.q));
}

export function ringScale(a: number[], scalar: number, ring: Ring): number[] {
  const v = asCoeffs(a, ring.n, ring.q);
  const s = mod(scalar, ring.q);
  return v.map((c) => mod(c * s, ring.q));
}

export function ringMul(a: number[], b: number[], ring: Ring): number[] {
  const left = asCoeffs(a, ring.n, ring.q);
  const right = asCoeffs(b, ring.n, ring.q);
  const out = new Array<number>(ring.n).fill(0);
  for (let i = 0; i < ring.n; i += 1) {
    if (left[i] === 0) continue;
    for (let j = 0; j < ring.n; j += 1) {
      if (right[j] === 0) continue;
      const deg = i + j;
      const wraps = Math.floor(deg / ring.n);
      const idx = deg % ring.n;
      const factor = modPow(ring.r, wraps, ring.q);
      out[idx] = mod(out[idx] + (left[i] ?? 0) * (right[j] ?? 0) * factor, ring.q);
    }
  }
  return out;
}

/** f ↦ f(x^k) reduced in the ring. k is an integer exponent, not reduced modulo n. */
export function ringSubstitute(f: number[], k: number, ring: Ring): number[] {
  if (!Number.isInteger(k) || k < 0 || k > 64) {
    throw new QcrlError(`Substitution exponent k=${String(k)} is outside 0..64.`);
  }
  const coeffs = asCoeffs(f, ring.n, ring.q);
  const out = new Array<number>(ring.n).fill(0);
  for (let i = 0; i < ring.n; i += 1) {
    const c = coeffs[i] ?? 0;
    if (c === 0) continue;
    const deg = i * k;
    const wraps = Math.floor(deg / ring.n);
    const idx = deg - wraps * ring.n;
    const factor = modPow(ring.r, wraps, ring.q);
    out[idx] = mod(out[idx] + c * factor, ring.q);
  }
  return out;
}

export function monomial(index: number, n: number): number[] {
  const v = new Array<number>(n).fill(0);
  if (index < 0 || index >= n) {
    throw new QcrlError(`Monomial index ${index} is outside 0..${n - 1}.`);
  }
  v[index] = 1;
  return v;
}

export function vecEq(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function matVec(matrix: number[][], vector: number[], q: number): number[] {
  return matrix.map((row) => {
    if (row.length !== vector.length) {
      throw new QcrlError(
        `Matrix row width ${row.length} does not match vector length ${vector.length}.`,
      );
    }
    let sum = 0;
    for (let i = 0; i < row.length; i += 1) sum = mod(sum + (row[i] ?? 0) * (vector[i] ?? 0), q);
    return sum;
  });
}

export function matMul(a: number[][], b: number[][], q: number): number[][] {
  const rows = a.length;
  const mid = a[0]?.length ?? 0;
  const cols = b[0]?.length ?? 0;
  if (b.length !== mid) {
    throw new QcrlError(`Cannot multiply ${rows}×${mid} by ${b.length}×${cols}.`);
  }
  const out: number[][] = [];
  for (let i = 0; i < rows; i += 1) {
    const row: number[] = [];
    for (let j = 0; j < cols; j += 1) {
      let sum = 0;
      for (let k = 0; k < mid; k += 1) sum = mod(sum + (a[i]?.[k] ?? 0) * (b[k]?.[j] ?? 0), q);
      row.push(sum);
    }
    out.push(row);
  }
  return out;
}

export function matIdentity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

export function detMod(matrix: number[][], q: number): number {
  if (!isPrime(q)) {
    throw new QcrlError(`Determinant over Z/${q}Z is only decided for prime q in v0.1.`);
  }
  const n = matrix.length;
  if (matrix.some((row) => row.length !== n)) {
    throw new QcrlError("Determinant expects a square matrix.");
  }
  const m = matrix.map((row) => row.map((value) => mod(value, q)));
  let det = 1;
  for (let col = 0; col < n; col += 1) {
    let pivot = -1;
    for (let row = col; row < n; row += 1) {
      if ((m[row]?.[col] ?? 0) !== 0) {
        pivot = row;
        break;
      }
    }
    if (pivot < 0) return 0;
    if (pivot !== col) {
      const tmp = m[col];
      m[col] = m[pivot] ?? [];
      m[pivot] = tmp ?? [];
      det = mod(-det, q);
    }
    const pivotValue = m[col]?.[col] ?? 0;
    det = mod(det * pivotValue, q);
    const inv = modInv(pivotValue, q);
    for (let row = col + 1; row < n; row += 1) {
      const head = m[row]?.[col] ?? 0;
      if (head === 0) continue;
      const factor = mod(head * inv, q);
      for (let c = col; c < n; c += 1) {
        const rowRef = m[row];
        if (!rowRef) continue;
        rowRef[c] = mod((rowRef[c] ?? 0) - factor * (m[col]?.[c] ?? 0), q);
      }
    }
  }
  return det;
}

export function matInv(matrix: number[][], q: number): number[][] | null {
  if (!isPrime(q)) {
    throw new QcrlError(`Matrix inversion requires a prime modulus. q=${q} is not prime.`);
  }
  const n = matrix.length;
  if (matrix.some((row) => row.length !== n)) {
    throw new QcrlError("Inverse expects a square matrix.");
  }
  const m = matrix.map((row, i) => {
    const next = row.map((value) => mod(value, q));
    for (let j = 0; j < n; j += 1) next.push(i === j ? 1 : 0);
    return next;
  });
  for (let col = 0; col < n; col += 1) {
    let pivot = -1;
    for (let row = col; row < n; row += 1) {
      if ((m[row]?.[col] ?? 0) !== 0) {
        pivot = row;
        break;
      }
    }
    if (pivot < 0) return null;
    if (pivot !== col) {
      const tmp = m[col];
      m[col] = m[pivot] ?? [];
      m[pivot] = tmp ?? [];
    }
    const inv = modInv(m[col]?.[col] ?? 0, q);
    const pivotRow = m[col];
    if (!pivotRow) return null;
    for (let c = col; c < 2 * n; c += 1) pivotRow[c] = mod((pivotRow[c] ?? 0) * inv, q);
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = m[row]?.[col] ?? 0;
      if (factor === 0) continue;
      for (let c = col; c < 2 * n; c += 1) {
        const target = m[row];
        if (!target) continue;
        target[c] = mod((target[c] ?? 0) - factor * (pivotRow[c] ?? 0), q);
      }
    }
  }
  return m.map((row) => row.slice(n));
}

export type SolveStatus = "unique" | "infinite" | "inconsistent";

export function rrefSolve(
  matrix: number[][],
  vector: number[],
  q: number,
): { status: SolveStatus; solution: number[] | null; rank: number } {
  if (!isPrime(q)) {
    throw new QcrlError(`Linear solving requires a prime modulus. q=${q} is not prime.`);
  }
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  if (vector.length !== rows) {
    throw new QcrlError(`System has ${rows} rows but ${vector.length} right-hand entries.`);
  }
  const m = matrix.map((row, i) => [...row.map((value) => mod(value, q)), mod(vector[i] ?? 0, q)]);
  let lead = 0;
  const pivots: number[] = [];
  for (let col = 0; col < cols && lead < rows; col += 1) {
    let pivot = -1;
    for (let row = lead; row < rows; row += 1) {
      if ((m[row]?.[col] ?? 0) !== 0) {
        pivot = row;
        break;
      }
    }
    if (pivot < 0) continue;
    if (pivot !== lead) {
      const tmp = m[lead];
      m[lead] = m[pivot] ?? [];
      m[pivot] = tmp ?? [];
    }
    const inv = modInv(m[lead]?.[col] ?? 0, q);
    const pivotRow = m[lead];
    if (!pivotRow) break;
    for (let c = col; c <= cols; c += 1) pivotRow[c] = mod((pivotRow[c] ?? 0) * inv, q);
    for (let row = 0; row < rows; row += 1) {
      if (row === lead) continue;
      const factor = m[row]?.[col] ?? 0;
      if (factor === 0) continue;
      for (let c = col; c <= cols; c += 1) {
        const target = m[row];
        if (!target) continue;
        target[c] = mod((target[c] ?? 0) - factor * (pivotRow[c] ?? 0), q);
      }
    }
    pivots.push(col);
    lead += 1;
  }
  for (let row = lead; row < rows; row += 1) {
    if ((m[row]?.[cols] ?? 0) !== 0) {
      return { status: "inconsistent", solution: null, rank: pivots.length };
    }
  }
  if (pivots.length < cols) {
    return { status: "infinite", solution: null, rank: pivots.length };
  }
  const solution = new Array<number>(cols).fill(0);
  pivots.forEach((col, i) => {
    solution[col] = m[i]?.[cols] ?? 0;
  });
  return { status: "unique", solution, rank: pivots.length };
}

export function normInf(values: number[], q?: number): number {
  let max = 0;
  for (const value of values) {
    const c = q === undefined ? Math.abs(Math.trunc(value)) : Math.abs(center(value, q));
    if (c > max) max = c;
  }
  return max;
}

export function norm2sq(values: number[], q?: number): number {
  let sum = 0;
  for (const value of values) {
    const c = q === undefined ? Math.trunc(value) : center(value, q);
    sum += c * c;
  }
  return sum;
}

export function formatPoly(coeffs: number[], q?: number): string {
  const parts: string[] = [];
  coeffs.forEach((raw, index) => {
    const value = q === undefined ? raw : center(raw, q);
    if (value === 0) return;
    const mag = Math.abs(value);
    const sign = value < 0 ? "−" : parts.length ? "+" : "";
    const body =
      index === 0 ? `${mag}` : mag === 1 ? (index === 1 ? "x" : `x^${index}`) : index === 1 ? `${mag}x` : `${mag}x^${index}`;
    parts.push(sign ? `${sign} ${body}` : body);
  });
  return parts.length ? parts.join(" ") : "0";
}

export function formatVec(values: number[], q?: number): string {
  const shown = values.map((value) => (q === undefined ? value : center(value, q)));
  return `(${shown.join(", ")})`;
}

export function parseIntegerList(text: string): number[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/[\s,]+/);
  return parts.map((part, index) => {
    if (!/^-?\d+$/.test(part)) {
      throw new QcrlError(
        `Could not read coefficient ${index + 1} (“${part}”). Use integers separated by commas.`,
      );
    }
    return Number(part);
  });
}

export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function stable(value: unknown): string {
  return JSON.stringify(value);
}
