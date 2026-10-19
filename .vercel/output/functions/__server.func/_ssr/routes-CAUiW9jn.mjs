import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Library, c as Gauge, i as ScrollText, l as Compass, n as ShieldAlert, o as Layers, r as Search, s as Grid2x2, u as Binary } from "../_libs/lucide-react.mjs";
import { a as ResponsiveContainer, i as Bar, n as YAxis, o as Tooltip, r as XAxis, t as BarChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CAUiW9jn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Finite-ring arithmetic for QCRL v0.1. Experimental mathematics, not a crypto library. */
var QCRL_VERSION = "0.1.0";
var QcrlError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "QcrlError";
	}
};
function mod(a, m) {
	if (!Number.isInteger(m) || m <= 0) throw new QcrlError(`Modulus must be a positive integer, received ${String(m)}.`);
	if (!Number.isFinite(a)) throw new QcrlError("Arithmetic received a non-finite number.");
	const r = Math.trunc(a) % m;
	return r < 0 ? r + m : r;
}
function egcd(a, b) {
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
	return {
		g: Math.abs(oldR),
		x: oldR < 0 ? -oldS : oldS,
		y: oldR < 0 ? -oldT : oldT
	};
}
function modInv(a, m) {
	const aa = mod(a, m);
	const { g, x } = egcd(aa, m);
	if (g !== 1) throw new QcrlError(`Inverse does not exist: gcd(${aa}, ${m}) = ${g}. ${aa} is not a unit modulo ${m}.`);
	return mod(x, m);
}
function modPow(base, exp, m) {
	if (!Number.isInteger(exp) || exp < 0) throw new QcrlError(`Exponent must be a non-negative integer, received ${String(exp)}.`);
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
function isPrime(n) {
	if (!Number.isInteger(n) || n < 2) return false;
	if (n % 2 === 0) return n === 2;
	for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
	return true;
}
function ceilLog2(n) {
	if (!Number.isInteger(n) || n < 1) throw new QcrlError(`ceilLog2 expects a positive integer, received ${String(n)}.`);
	let bits = 0;
	let v = n - 1;
	while (v > 0) {
		v = Math.floor(v / 2);
		bits += 1;
	}
	return Math.max(1, bits);
}
function center(value, q) {
	const m = mod(value, q);
	return m > q / 2 ? m - q : m;
}
function gcd(a, b) {
	return egcd(a, b).g;
}
/** Mulberry32. Same seed → same stream. Not a cryptographic generator. */
function mulberry32(seed) {
	if (!Number.isInteger(seed)) throw new QcrlError(`Seed must be an integer, received ${String(seed)}.`);
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function randBelow(rng, n) {
	if (!Number.isInteger(n) || n <= 0) throw new QcrlError(`Random bound must be a positive integer, received ${String(n)}.`);
	return Math.floor(rng() * n);
}
function trimPoly(coeffs) {
	let end = coeffs.length;
	while (end > 1 && coeffs[end - 1] === 0) end -= 1;
	return coeffs.slice(0, Math.max(1, end));
}
function polyDeg(coeffs) {
	const t = trimPoly(coeffs);
	if (t.length === 1 && t[0] === 0) return -1;
	return t.length - 1;
}
function polyMul(a, b, q) {
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
function polyRem(dividend, divisor, q) {
	if (!isPrime(q)) throw new QcrlError(`General polynomial reduction requires a prime modulus. q=${q} is not prime.`);
	const modP = trimPoly(divisor.map((c) => mod(c, q)));
	if (polyDeg(modP) < 0) throw new QcrlError("Cannot reduce by the zero polynomial.");
	const invLead = modInv(modP[modP.length - 1] ?? 0, q);
	let rest = trimPoly(dividend.map((c) => mod(c, q)));
	let guard = 0;
	while (polyDeg(rest) >= polyDeg(modP)) {
		guard += 1;
		if (guard > dividend.length + divisor.length + 8) throw new QcrlError("Polynomial reduction did not terminate. Check the divisor.");
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
function parseRing(q, n, relation) {
	if (!Number.isInteger(q) || q < 2 || q > 4096) throw new QcrlError(`Unsupported modulus q=${String(q)}. Use an integer from 2 to 4096.`);
	if (!Number.isInteger(n) || n < 1 || n > 12) throw new QcrlError(`Unsupported degree n=${String(n)}. Use an integer from 1 to 12.`);
	if (relation !== "negacyclic" && relation !== "cyclic") throw new QcrlError(`Unknown relation "${String(relation)}". Use negacyclic (x^n+1) or cyclic (x^n−1).`);
	return {
		q,
		n,
		r: relation === "cyclic" ? 1 : mod(-1, q)
	};
}
function relationLabel(ring) {
	return ring.r === 1 ? `x^${ring.n} − 1` : `x^${ring.n} + 1`;
}
function asCoeffs(values, n, q) {
	if (values.length > n) throw new QcrlError(`Expected at most ${n} coefficients, received ${values.length}.`);
	const out = new Array(n).fill(0);
	for (let i = 0; i < values.length; i += 1) {
		if (!Number.isFinite(values[i] ?? NaN)) throw new QcrlError(`Coefficient ${i} is not a finite number.`);
		out[i] = mod(values[i] ?? 0, q);
	}
	return out;
}
function ringAdd(a, b, ring) {
	const left = asCoeffs(a, ring.n, ring.q);
	const right = asCoeffs(b, ring.n, ring.q);
	return left.map((c, i) => mod(c + (right[i] ?? 0), ring.q));
}
function ringMul(a, b, ring) {
	const left = asCoeffs(a, ring.n, ring.q);
	const right = asCoeffs(b, ring.n, ring.q);
	const out = new Array(ring.n).fill(0);
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
function ringSubstitute(f, k, ring) {
	if (!Number.isInteger(k) || k < 0 || k > 64) throw new QcrlError(`Substitution exponent k=${String(k)} is outside 0..64.`);
	const coeffs = asCoeffs(f, ring.n, ring.q);
	const out = new Array(ring.n).fill(0);
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
function monomial(index, n) {
	const v = new Array(n).fill(0);
	if (index < 0 || index >= n) throw new QcrlError(`Monomial index ${index} is outside 0..${n - 1}.`);
	v[index] = 1;
	return v;
}
function vecEq(a, b) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
	return true;
}
function matVec(matrix, vector, q) {
	return matrix.map((row) => {
		if (row.length !== vector.length) throw new QcrlError(`Matrix row width ${row.length} does not match vector length ${vector.length}.`);
		let sum = 0;
		for (let i = 0; i < row.length; i += 1) sum = mod(sum + (row[i] ?? 0) * (vector[i] ?? 0), q);
		return sum;
	});
}
function matMul(a, b, q) {
	const rows = a.length;
	const mid = a[0]?.length ?? 0;
	const cols = b[0]?.length ?? 0;
	if (b.length !== mid) throw new QcrlError(`Cannot multiply ${rows}×${mid} by ${b.length}×${cols}.`);
	const out = [];
	for (let i = 0; i < rows; i += 1) {
		const row = [];
		for (let j = 0; j < cols; j += 1) {
			let sum = 0;
			for (let k = 0; k < mid; k += 1) sum = mod(sum + (a[i]?.[k] ?? 0) * (b[k]?.[j] ?? 0), q);
			row.push(sum);
		}
		out.push(row);
	}
	return out;
}
function detMod(matrix, q) {
	if (!isPrime(q)) throw new QcrlError(`Determinant over Z/${q}Z is only decided for prime q in v0.1.`);
	const n = matrix.length;
	if (matrix.some((row) => row.length !== n)) throw new QcrlError("Determinant expects a square matrix.");
	const m = matrix.map((row) => row.map((value) => mod(value, q)));
	let det = 1;
	for (let col = 0; col < n; col += 1) {
		let pivot = -1;
		for (let row = col; row < n; row += 1) if ((m[row]?.[col] ?? 0) !== 0) {
			pivot = row;
			break;
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
function matInv(matrix, q) {
	if (!isPrime(q)) throw new QcrlError(`Matrix inversion requires a prime modulus. q=${q} is not prime.`);
	const n = matrix.length;
	if (matrix.some((row) => row.length !== n)) throw new QcrlError("Inverse expects a square matrix.");
	const m = matrix.map((row, i) => {
		const next = row.map((value) => mod(value, q));
		for (let j = 0; j < n; j += 1) next.push(i === j ? 1 : 0);
		return next;
	});
	for (let col = 0; col < n; col += 1) {
		let pivot = -1;
		for (let row = col; row < n; row += 1) if ((m[row]?.[col] ?? 0) !== 0) {
			pivot = row;
			break;
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
function rrefSolve(matrix, vector, q) {
	if (!isPrime(q)) throw new QcrlError(`Linear solving requires a prime modulus. q=${q} is not prime.`);
	const rows = matrix.length;
	const cols = matrix[0]?.length ?? 0;
	if (vector.length !== rows) throw new QcrlError(`System has ${rows} rows but ${vector.length} right-hand entries.`);
	const m = matrix.map((row, i) => [...row.map((value) => mod(value, q)), mod(vector[i] ?? 0, q)]);
	let lead = 0;
	const pivots = [];
	for (let col = 0; col < cols && lead < rows; col += 1) {
		let pivot = -1;
		for (let row = lead; row < rows; row += 1) if ((m[row]?.[col] ?? 0) !== 0) {
			pivot = row;
			break;
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
	for (let row = lead; row < rows; row += 1) if ((m[row]?.[cols] ?? 0) !== 0) return {
		status: "inconsistent",
		solution: null,
		rank: pivots.length
	};
	if (pivots.length < cols) return {
		status: "infinite",
		solution: null,
		rank: pivots.length
	};
	const solution = new Array(cols).fill(0);
	pivots.forEach((col, i) => {
		solution[col] = m[i]?.[cols] ?? 0;
	});
	return {
		status: "unique",
		solution,
		rank: pivots.length
	};
}
function normInf(values, q) {
	let max = 0;
	for (const value of values) {
		const c = q === void 0 ? Math.abs(Math.trunc(value)) : Math.abs(center(value, q));
		if (c > max) max = c;
	}
	return max;
}
function norm2sq(values, q) {
	let sum = 0;
	for (const value of values) {
		const c = q === void 0 ? Math.trunc(value) : center(value, q);
		sum += c * c;
	}
	return sum;
}
function formatPoly(coeffs, q) {
	const parts = [];
	coeffs.forEach((raw, index) => {
		const value = q === void 0 ? raw : center(raw, q);
		if (value === 0) return;
		const mag = Math.abs(value);
		const sign = value < 0 ? "−" : parts.length ? "+" : "";
		const body = index === 0 ? `${mag}` : mag === 1 ? index === 1 ? "x" : `x^${index}` : index === 1 ? `${mag}x` : `${mag}x^${index}`;
		parts.push(sign ? `${sign} ${body}` : body);
	});
	return parts.length ? parts.join(" ") : "0";
}
function formatVec(values, q) {
	return `(${values.map((value) => q === void 0 ? value : center(value, q)).join(", ")})`;
}
function parseIntegerList(text) {
	const cleaned = text.trim();
	if (!cleaned) return [];
	return cleaned.split(/[\s,]+/).map((part, index) => {
		if (!/^-?\d+$/.test(part)) throw new QcrlError(`Could not read coefficient ${index + 1} (“${part}”). Use integers separated by commas.`);
		return Number(part);
	});
}
function stable(value) {
	return JSON.stringify(value);
}
/**
* QCRL v0.1 experiment runners.
* Finite checks are labeled as finite checks. Nothing here is a security proof.
*/
function assertSeed(seed) {
	if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) throw new QcrlError(`Seed must be an integer from 0 to 2147483647. Received ${String(seed)}.`);
}
var QUESTION = "Which polynomial maps on a small finite ring preserve addition, multiplication, and equality, while admitting a shorter description than a generic linear map?";
function requirePrime(q, where) {
	if (!isPrime(q)) throw new QcrlError(`${where} requires a prime modulus so linear algebra is decisive. q=${q} is not prime.`);
}
function denseBits(n, q) {
	return n * n * ceilLog2(q);
}
function matrixFromImages(images) {
	const n = images.length;
	return Array.from({ length: n }, (_, row) => images.map((image) => image[row] ?? 0));
}
function applyMatrix(matrix, vector, q) {
	return matVec(matrix, vector, q);
}
function nonzero(matrix) {
	let count = 0;
	for (const row of matrix) for (const value of row) if (value !== 0) count += 1;
	return count;
}
/** x ↦ x^k induces a ring endomorphism iff r^k ≡ r. Classical, re-checked below. */
function inducesEndomorphism(k, ring) {
	return modPow(ring.r, k, ring.q) === mod(ring.r, ring.q);
}
function predictedBijective(k, ring) {
	return inducesEndomorphism(k, ring) && gcdInt(k, ring.n) === 1;
}
function gcdInt(a, b) {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y !== 0) [x, y] = [y, x % y];
	return x;
}
function checkMultiplicative(apply, ring) {
	for (let i = 0; i < ring.n; i += 1) for (let j = 0; j < ring.n; j += 1) {
		const f = monomial(i, ring.n);
		const g = monomial(j, ring.n);
		const product = ringMul(f, g, ring);
		const left = apply(product);
		const right = ringMul(apply(f), apply(g), ring);
		if (!vecEq(left, right)) return {
			ok: false,
			counterexample: `f=${formatPoly(f)}, g=${formatPoly(g)}, fg=${formatPoly(product, ring.q)}, T(fg)=${formatPoly(left, ring.q)}, T(f)T(g)=${formatPoly(right, ring.q)}`
		};
	}
	return {
		ok: true,
		counterexample: null
	};
}
function analyze(input) {
	const { ring } = input;
	const apply = (vector) => applyMatrix(input.matrix, asCoeffs(vector, ring.n, ring.q), ring.q);
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
	if (unital && multiplicative.ok && !bijective) counterexample = `The map preserves + and × but det=${det}, so distinct inputs can collide. Equality is not preserved.`;
	if (!unital && !counterexample) counterexample = `T(1) = ${formatPoly(imageOne, ring.q)}, which is not 1.`;
	const accepted = unital && multiplicative.ok && bijective;
	let reason;
	if (accepted && input.compactBits !== null && input.compactBits < denseBits(ring.n, ring.q)) reason = `Preserves the ring operations and equality. Description is ${input.compactBits} bits versus ${denseBits(ring.n, ring.q)} bits for the dense matrix.`;
	else if (accepted) reason = "Preserves the ring operations and equality. No shorter description than the dense matrix was recorded.";
	else if (!multiplicative.ok) reason = "Rejected: multiplication is not preserved. A counterexample was found on the monomial basis.";
	else if (!unital) reason = "Rejected: the multiplicative identity is not fixed.";
	else reason = "Rejected: the map is a non-injective homomorphism, so equality is not preserved.";
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
		classification: accepted ? "verified-finite" : "rejected"
	};
}
function runDiscovery(q, n, relation, seed) {
	assertSeed(seed);
	requirePrime(q, "QCRL-EXP-001");
	const ring = parseRing(q, n, relation);
	if (!Number.isInteger(seed)) throw new QcrlError(`Seed must be an integer, received ${String(seed)}.`);
	const rng = mulberry32(seed);
	const candidates = [];
	for (let k = 0; k < ring.n; k += 1) {
		const images = Array.from({ length: ring.n }, (_, i) => ringSubstitute(monomial(i, ring.n), k, ring));
		candidates.push(analyze({
			id: `sigma-${k}`,
			kind: "power-substitution",
			k,
			matrix: matrixFromImages(images),
			ring,
			compactBits: ceilLog2(Math.max(2, ring.n)),
			applyCost: `${ring.n} placements (one per coefficient)`
		}));
	}
	const dropImages = Array.from({ length: ring.n }, (_, i) => {
		const image = new Array(ring.n).fill(0);
		if (i > 0) image[i - 1] = 1;
		return image;
	});
	candidates.push(analyze({
		id: "drop-constant",
		kind: "drop-constant",
		k: null,
		matrix: matrixFromImages(dropImages),
		ring,
		compactBits: null,
		applyCost: `${ring.n} copies, discarding the constant term's destination`
	}));
	const revImages = Array.from({ length: ring.n }, (_, i) => {
		const image = new Array(ring.n).fill(0);
		image[ring.n - 1 - i] = 1;
		return image;
	});
	candidates.push(analyze({
		id: "reversal",
		kind: "reversal",
		k: null,
		matrix: matrixFromImages(revImages),
		ring,
		compactBits: ring.n * ceilLog2(ring.n),
		applyCost: `${ring.n} placements`
	}));
	const seeded = Array.from({ length: ring.n }, () => Array.from({ length: ring.n }, () => randBelow(rng, ring.q)));
	candidates.push(analyze({
		id: "seeded-linear",
		kind: "seeded-linear",
		k: null,
		matrix: seeded,
		ring,
		compactBits: null,
		applyCost: `${ring.n * ring.n} multiplications`
	}));
	const criterionAgrees = candidates.filter((c) => c.kind === "power-substitution").every((c) => {
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
		counterexample: c.counterexample
	}));
	return {
		experimentId: "QCRL-EXP-001",
		version: QCRL_VERSION,
		question: QUESTION,
		definition: "A candidate T is a Z/qZ-linear map on coefficient vectors of R = Z/qZ[x]/(x^n − r). It is accepted only when T(1)=1, T(fg)=T(f)T(g) for every pair (checked on a monomial basis, which is exhaustive because both sides are bilinear), and T is bijective (so a=b iff T(a)=T(b)). Acceptance is not a claim of novelty or security.",
		ring: {
			q: ring.q,
			n: ring.n,
			r: ring.r,
			relation: relationLabel(ring)
		},
		seed,
		method: "Every map is stored as its matrix on the monomial basis, so additivity holds by construction. Multiplicativity is every pair x^i · x^j. Bijectivity is a non-zero determinant. Power substitutions are also compared with the classical rule: x ↦ x^k induces an endomorphism iff r^k ≡ r (mod q), and for r ∈ {±1} bijectivity is predicted iff that holds and gcd(k, n)=1.",
		candidates,
		acceptedIds: accepted.map((c) => c.id),
		rejectedIds: rejected.map((c) => c.id),
		preservingExample: nontrivial ? `${nontrivial.id}: ${nontrivial.reason}` : "No accepted map on this parameter set.",
		invalidExample: invalid ? `${invalid.id}: ${invalid.counterexample ?? invalid.reason}` : null,
		criterionAgrees,
		notes: [
			"A passing candidate is a verified finite-domain property of this exact ring. It is not labeled a discovery and it is not a cryptographic primitive.",
			"Statistical or algebraic success inside this bound says nothing about other parameters.",
			criterionAgrees ? "On this parameter set the basis check agrees with the classical endomorphism rule. That agreement is a finite verification, not a new theorem." : "The basis check disagreed with the classical prediction. Treat the prediction as wrong for these parameters and trust the explicit counterexample or determinant."
		],
		formalOnThisParameterSet: [
			"Additivity is by construction: each candidate is a matrix.",
			"Multiplicativity is settled for every ring element by the monomial-basis check, using bilinearity of both T(fg) and T(f)T(g).",
			"Bijectivity is the determinant over the field Z/qZ."
		],
		conjectures: criterionAgrees ? ["Conjecture, not a theorem of this lab: for every odd prime q and every n≤12, the same classical rule continues to match the basis check. v0.1 only verified the parameter set you just ran."] : ["The classical rule failed on this parameter set. Do not extrapolate it. The failed prediction is recorded rather than repaired silently."],
		fingerprint: stable(mathPayload)
	};
}
function sampleMatrix(rows, cols, q, rng) {
	return Array.from({ length: rows }, () => Array.from({ length: cols }, () => randBelow(rng, q)));
}
function sampleSmall(length, bound, rng) {
	const span = 2 * bound + 1;
	return Array.from({ length }, () => randBelow(rng, span) - bound);
}
function enumerateSmall(length, bound, visit) {
	const span = 2 * bound + 1;
	const total = span ** length;
	if (!Number.isFinite(total) || total > 1e5) throw new QcrlError(`Search space ${String(total)} exceeds the v0.1 cap of 100000. Reduce dimension or bound.`);
	const current = new Array(length).fill(0);
	for (let t = 0; t < total; t += 1) {
		let x = t;
		for (let i = 0; i < length; i += 1) {
			current[i] = x % span - bound;
			x = Math.floor(x / span);
		}
		visit(current);
	}
	return total;
}
function runLattice(input) {
	const { seed, n, m, q, bound, moduleN } = input;
	assertSeed(seed);
	if (!Number.isInteger(n) || n < 1 || n > 6) throw new QcrlError(`LWE secret length n=${String(n)} is unsupported. Use 1..6.`);
	if (!Number.isInteger(m) || m < n || m > 12) throw new QcrlError(`LWE sample count m=${String(m)} is unsupported. Use n..12.`);
	requirePrime(q, "The lattice demo");
	if (q > 251) throw new QcrlError(`Lattice demo modulus q=${q} is above the v0.1 cap of 251.`);
	if (!Number.isInteger(bound) || bound < 0 || bound > 2) throw new QcrlError(`Error bound B=${String(bound)} is unsupported. Use 0, 1, or 2.`);
	if (!Number.isInteger(moduleN) || moduleN < 2 || moduleN > 4) throw new QcrlError(`Module degree ${String(moduleN)} is unsupported. Use 2, 3, or 4.`);
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
		for (let i = 0; i < m; i += 1) if (Math.abs(center(mod((b[i] ?? 0) - (image[i] ?? 0), q), q)) > bound) return;
		solutionCount += 1;
		if (vecEq(guess.map((value) => mod(value, q)), secret)) recovered = true;
	});
	const zero = rrefSolve(a, as, q);
	const noisy = rrefSolve(a, b, q);
	const zeroMatches = zero.status === "unique" && zero.solution !== null && vecEq(zero.solution, secret);
	const noisyMatches = noisy.status === "unique" && noisy.solution !== null && vecEq(noisy.solution, secret);
	const ring = parseRing(q, moduleN, "negacyclic");
	const rank = 2;
	const moduleRng = mulberry32(seed ^ 20973);
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
	mulberry32(seed ^ 1301);
	const sisA = poly();
	const sisB = poly();
	let kernel = 0;
	let example = null;
	const sisSearched = enumerateSmall(moduleN * 2, 1, (guess) => {
		if (guess.every((value) => value === 0)) return;
		const z0 = guess.slice(0, moduleN).map((value) => mod(value, q));
		const z1 = guess.slice(moduleN).map((value) => mod(value, q));
		if (ringAdd(ringMul(sisA, z0, ring), ringMul(sisB, z1, ring), ring).every((value) => value === 0)) {
			kernel += 1;
			if (!example) example = `z0=${formatPoly(z0, q)}, z1=${formatPoly(z1, q)}`;
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
		module: {
			s0,
			s1,
			e0,
			e1,
			b0,
			b1
		},
		kernel,
		example
	};
	return {
		experimentId: "QCRL-LATTICE-TOY",
		version: QCRL_VERSION,
		seed,
		disclaimer: "Educational samples of the LWE, Module-LWE, and Module-SIS shapes on tiny parameters. They are not ML-DSA, not Module-LWE at a standardized security level, and not evidence for or against any production scheme.",
		lwe: {
			n,
			m,
			q,
			bound,
			secret: secret.map((value) => center(value, q)),
			error: error.map((value) => center(value, q)),
			sampleFingerprint: stable({
				a,
				b
			}),
			recovered,
			solutionCount,
			searchSpace,
			zeroErrorStatus: zeroMatches ? "With the error removed, elimination recovered the secret. The zero-error system is ordinary linear algebra." : `Zero-error system status: ${zero.status}. Rank ${zero.rank}. ${zeroMatches ? "matched" : "did not match"} the planted secret.`,
			noisyStatus: noisy.status === "inconsistent" ? "With the error left in, the overdetermined system is inconsistent. The sample is not an exact linear relation." : noisyMatches ? "The noisy system still produced the planted secret. That can happen when the error is zero or the extra rows do not bind." : `Noisy system status: ${noisy.status}. It did not return the planted secret.`,
			representationBits: m * n * width + m * width,
			secretNorm2: norm2sq(secret, q),
			secretText: formatVec(secret, q),
			matrix: a,
			sample: b.map((value) => center(value, q))
		},
		moduleLwe: {
			ring: relationLabel(ring),
			rank,
			secretNormInf: Math.max(normInf(s0, q), normInf(s1, q)),
			errorNormInf: Math.max(normInf(e0, q), normInf(e1, q)),
			recomputed: check0 && check1,
			publicBits: 6 * moduleN * width,
			polynomials: [
				{
					name: "s0",
					body: formatPoly(s0, q)
				},
				{
					name: "s1",
					body: formatPoly(s1, q)
				},
				{
					name: "e0",
					body: formatPoly(e0, q)
				},
				{
					name: "e1",
					body: formatPoly(e1, q)
				},
				{
					name: "b0",
					body: formatPoly(b0, q)
				},
				{
					name: "b1",
					body: formatPoly(b1, q)
				}
			]
		},
		moduleSis: {
			searched: sisSearched,
			nonzeroShortKernelVectors: kernel,
			example,
			note: kernel > 0 ? "A short non-zero kernel vector exists at this bound. Tiny Module-SIS instances are often easy; this does not measure asymptotic hardness." : "No non-zero kernel vector with coefficients in {−1, 0, 1} was found. That is a finite statement about this draw only."
		},
		fingerprint: stable(payload)
	};
}
/** Deliberately weak checksum. Output is 8 bits. Not a hash proposal. */
function toySumHash(bytes) {
	if (bytes.length > 64) throw new QcrlError("ToySum-8 refuses inputs longer than 64 bytes in v0.1.");
	let acc = 0;
	for (const byte of bytes) {
		if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new QcrlError(`ToySum-8 expected a byte 0..255, received ${String(byte)}.`);
		acc = acc + byte & 255;
	}
	return acc;
}
function runAttacks(seed) {
	assertSeed(seed);
	const rng = mulberry32(seed);
	const buckets = /* @__PURE__ */ new Map();
	let searched = 0;
	let collision = null;
	for (let left = 0; left < 16 && !collision; left += 1) for (let right = 0; right < 16; right += 1) {
		searched += 1;
		const message = [left, right];
		const digest = toySumHash(message);
		const previous = buckets.get(digest);
		if (previous && !vecEq(previous, message)) {
			collision = {
				left: previous,
				right: message,
				digest
			};
			break;
		}
		if (!previous) buckets.set(digest, message);
	}
	const avalancheByBit = new Array(8).fill(0);
	const trials = 48;
	let flips = 0;
	let observations = 0;
	for (let t = 0; t < trials; t += 1) {
		const message = Array.from({ length: 4 }, () => randBelow(rng, 256));
		const base = toySumHash(message);
		for (let bit = 0; bit < 32; bit += 1) {
			const mutated = message.slice();
			const index = Math.floor(bit / 8);
			mutated[index] = (mutated[index] ?? 0) ^ 1 << bit % 8;
			const delta = base ^ toySumHash(mutated);
			let count = 0;
			for (let o = 0; o < 8; o += 1) if (delta >> o & 1) {
				count += 1;
				avalancheByBit[o] += 1;
			}
			flips += count;
			observations += 1;
		}
	}
	const avalancheMean = observations === 0 ? 0 : flips / (observations * 8);
	const bitDenom = 1536;
	const avalancheRate = avalancheByBit.map((count) => count / bitDenom);
	const hist = new Array(256).fill(0);
	for (let a = 0; a < 16; a += 1) for (let b = 0; b < 16; b += 1) hist[toySumHash([a, b])] += 1;
	const expected = 1;
	let chi = 0;
	for (const count of hist) chi += (count - expected) ** 2 / expected;
	const again = toySumHash([
		1,
		2,
		3,
		4
	]);
	const deterministic = again === toySumHash([
		1,
		2,
		3,
		4
	]) && again === 10;
	let malformedRejected = false;
	let malformedMessage = "";
	try {
		toySumHash([1, 256]);
	} catch (error) {
		malformedRejected = true;
		malformedMessage = error instanceof Error ? error.message : "rejected";
	}
	const oneByteIdentity = [
		0,
		1,
		7,
		255
	].every((value) => toySumHash([value]) === value);
	return {
		experimentId: "QCRL-ATTACK-TOYHASH",
		version: QCRL_VERSION,
		seed,
		construction: "ToySum-8(b0, b1, …) = (b0 + b1 + …) mod 256. Built to be broken. It is registered only as a negative example.",
		knownWeakness: "Eight-bit modular sum: collisions, no diffusion, and an algebraic distinguisher.",
		collision,
		collisionSearched: searched,
		avalancheMean,
		avalancheByBit: avalancheRate,
		chiSquare: chi,
		chiSquareNote: "256 two-byte messages with bytes in 0..15 land in 256 bins. A uniform 8-bit function would put about one message per bin (chi-square near 255 for 255 degrees of freedom). ToySum-8 only produces sums 0..30, so most bins are empty. The statistic is a measurement, not a security proof — a uniform output can still be insecure.",
		deterministic,
		malformedRejected,
		malformedMessage,
		algebraicDistinguisher: oneByteIdentity ? "On one-byte messages ToySum-8 is the identity, so the output is the input. On two-byte messages the output is their sum, and h(a,b) − h(a,c) ≡ b − c (mod 256)." : "The expected one-byte identity failed. The construction did not match its definition.",
		classification: collision ? "rejected" : "empirical",
		disclaimer: "Finding this collision shows the toy is weak. Failing to find a collision, or seeing a flattering statistic, would still not establish cryptographic security.",
		fingerprint: stable({
			collision,
			deterministic,
			malformedRejected,
			avalancheMean: Number(avalancheMean.toFixed(6))
		})
	};
}
function bitsFor(q) {
	if (q < 2 || q > 256) throw new QcrlError(`Encoding demo supports modulus 2..256. Received q=${q}.`);
	return ceilLog2(q);
}
function writeBits(values, width) {
	const bits = values.length * width;
	const out = new Uint8Array(Math.ceil(bits / 8));
	values.forEach((value, index) => {
		for (let bit = 0; bit < width; bit += 1) {
			if ((value >> bit & 1) === 0) continue;
			const at = index * width + bit;
			out[at >> 3] = (out[at >> 3] ?? 0) | 1 << (at & 7);
		}
	});
	return out;
}
function readBits(bytes, count, width) {
	const values = [];
	for (let index = 0; index < count; index += 1) {
		let value = 0;
		for (let bit = 0; bit < width; bit += 1) {
			const at = index * width + bit;
			if ((bytes[at >> 3] ?? 0) & 1 << (at & 7)) value |= 1 << bit;
		}
		values.push(value);
	}
	return values;
}
function encodeCanonical(coeffs, q) {
	const width = bitsFor(q);
	return writeBits(coeffs.map((c) => mod(c, q)), width);
}
function decodeCanonical(bytes, n, q) {
	const width = bitsFor(q);
	const need = Math.ceil(n * width / 8);
	if (bytes.length < need) throw new QcrlError(`Canonical encoding is ${need} bytes; received ${bytes.length}.`);
	return readBits(bytes, n, width).map((value) => mod(value, q));
}
function encodeSparse(coeffs, q) {
	if (coeffs.length > 255) throw new QcrlError("Sparse encoding supports length ≤ 255.");
	const pairs = [];
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
function decodeSparse(bytes, n, q) {
	if (bytes.length < 1) throw new QcrlError("Sparse encoding is empty.");
	const count = bytes[0] ?? 0;
	if (bytes.length < 1 + count * 2) throw new QcrlError("Sparse encoding is truncated.");
	const out = new Array(n).fill(0);
	for (let i = 0; i < count; i += 1) {
		const index = bytes[1 + 2 * i] ?? 0;
		const value = bytes[2 + 2 * i] ?? 0;
		if (index >= n) throw new QcrlError(`Sparse index ${index} is outside 0..${n - 1}.`);
		out[index] = mod(value, q);
	}
	return out;
}
function timeUs(fn, iterations) {
	const started = nowMs();
	for (let i = 0; i < iterations; i += 1) fn();
	return (nowMs() - started) * 1e3 / iterations;
}
function nowMs() {
	if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
	return Date.now();
}
function encodingCase(label, coeffs, q) {
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
		decodeUs
	};
}
function runEncoding(seed, q, n) {
	assertSeed(seed);
	if (!Number.isInteger(n) || n < 2 || n > 32) throw new QcrlError(`Encoding length n=${String(n)} is unsupported. Use 2..32.`);
	if (!Number.isInteger(q) || q < 2 || q > 256) throw new QcrlError(`Encoding modulus q=${String(q)} is unsupported. Use 2..256.`);
	const rng = mulberry32(seed);
	const sparseCoeffs = new Array(n).fill(0);
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
		disclaimer: "These are lossless serializations of coefficient vectors. They are not cryptographic proof compression. A proof encoding would also have to preserve completeness, soundness, and zero-knowledge of a specified proof system. No such system is implemented here.",
		fingerprint: stable({
			sparse: {
				bytes: sparse.sparseBytes,
				ok: sparse.roundTripOk,
				poly: sparse.polynomial
			},
			dense: {
				bytes: dense.sparseBytes,
				ok: dense.roundTripOk,
				poly: dense.polynomial
			}
		})
	};
}
function runBenchmark(seed) {
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
		for (let i = 0; i < 4e3; i += 1) sink ^= toySumHash([
			i & 255,
			i >> 1 & 255,
			seed & 255
		]);
	});
	const detMs = elapsedMs(() => {
		const matrix = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => mod(left[r] ?? 1 + (right[c] ?? 0) + r + c, 17)));
		for (let i = 0; i < 300; i += 1) sink ^= detMod(matrix, 17);
	});
	if (sink === -2) throw new QcrlError("unreachable");
	const rows = [
		rowOf("Ring product in Z/17Z[x]/(x^8+1)", 1500, mulMs),
		rowOf("Power substitution σ_3", 800, subMs),
		rowOf("ToySum-8", 4e3, hashMs),
		rowOf("4×4 determinant mod 17", 300, detMs)
	];
	return {
		experimentId: "QCRL-BENCH",
		version: QCRL_VERSION,
		seed,
		rows,
		fingerprint: stable(rows.map((r) => r.name)),
		note: "Times are wall-clock measurements of this JavaScript engine on the current machine. They are not comparable to optimized native cryptography, and a faster toy is not a better primitive."
	};
}
function elapsedMs(fn) {
	const started = nowMs();
	fn();
	return nowMs() - started;
}
function rowOf(name, iterations, durationMs) {
	return {
		name,
		iterations,
		durationMs,
		perOpUs: durationMs * 1e3 / iterations
	};
}
function runSelfTest() {
	const checks = [];
	const push = (name, ok, detail) => checks.push({
		name,
		ok,
		detail
	});
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
		push("Non-unit is rejected", thrown, thrown ? "Inverse of 8 mod 12 raised a precise error." : "Expected a QcrlError.");
	} catch (error) {
		push("Non-unit is rejected", false, error instanceof Error ? error.message : "failed");
	}
	const ring = parseRing(5, 4, "negacyclic");
	const x3 = monomial(3, 4);
	const x = monomial(1, 4);
	const product = ringMul(x3, x, ring);
	push("x^3 · x = −1 in Z/5Z[x]/(x^4+1)", vecEq(product, [
		4,
		0,
		0,
		0
	]), `Computed ${formatPoly(product, 5)}.`);
	const bad = ringSubstitute(product, 2, ring);
	const left = ringMul(ringSubstitute(x3, 2, ring), ringSubstitute(x, 2, ring), ring);
	push("σ_2 is not multiplicative here", !vecEq(bad, left), `T(fg)=${formatPoly(bad, 5)}, T(f)T(g)=${formatPoly(left, 5)}.`);
	const discovery = runDiscovery(17, 4, "negacyclic", 7);
	const sigma1 = discovery.candidates.find((c) => c.id === "sigma-1");
	const sigma3 = discovery.candidates.find((c) => c.id === "sigma-3");
	const drop = discovery.candidates.find((c) => c.id === "drop-constant");
	push("σ_1 accepted", sigma1?.accepted === true, sigma1?.reason ?? "missing");
	push("σ_3 accepted on x^4+1", sigma3?.accepted === true, sigma3?.reason ?? "missing");
	push("drop-constant rejected", drop?.accepted === false && Boolean(drop?.counterexample), drop?.counterexample ?? "missing");
	push("Classical rule agrees", discovery.criterionAgrees, discovery.criterionAgrees ? "Basis check matches the prediction." : "Mismatch recorded.");
	const again = runDiscovery(17, 4, "negacyclic", 7);
	push("Same seed, same discovery", discovery.fingerprint === again.fingerprint, `Fingerprint ${discovery.fingerprint.slice(0, 18)}… matches.`);
	const lattice = runLattice({
		seed: 11,
		n: 2,
		m: 4,
		q: 17,
		bound: 1,
		moduleN: 2
	});
	const latticeAgain = runLattice({
		seed: 11,
		n: 2,
		m: 4,
		q: 17,
		bound: 1,
		moduleN: 2
	});
	push("Lattice sample repeats", lattice.fingerprint === latticeAgain.fingerprint, `Sample ${lattice.lwe.sampleFingerprint.slice(0, 18)}… matches.`);
	push("Module-LWE recomputes", lattice.moduleLwe.recomputed, "b = As + e was checked.");
	push("Bounded search finds the planted LWE secret", lattice.lwe.recovered, `${lattice.lwe.solutionCount} solution(s) inside the bound.`);
	const attacks = runAttacks(3);
	push("Toy collision found", attacks.collision !== null, attacks.collision ? `digest ${attacks.collision.digest}` : "none");
	push("Malformed byte rejected", attacks.malformedRejected, attacks.malformedMessage);
	push("Toy hash is deterministic", attacks.deterministic, "h(1,2,3,4) = 10 twice.");
	const encoding = runEncoding(1, 17, 8);
	push("Encodings round-trip", encoding.sparse.roundTripOk && encoding.dense.roundTripOk, `sparse ${encoding.sparse.sparseBytes} bytes, dense sparse-form ${encoding.dense.sparseBytes} bytes.`);
	let unsupported = false;
	try {
		runDiscovery(9, 4, "negacyclic", 1);
	} catch (error) {
		unsupported = error instanceof QcrlError && /prime/.test(error.message);
	}
	push("Composite modulus is refused", unsupported, unsupported ? "Clear error for q=9." : "Expected a refusal.");
	return checks;
}
function environmentMeta() {
	const nav = typeof navigator === "undefined" ? void 0 : navigator;
	return {
		cpuArchitecture: nav?.platform || "unavailable",
		deviceMemoryGb: nav?.deviceMemory ?? null,
		runtime: nav ? "browser javascript" : "javascript",
		runtimeDetail: nav?.userAgent ?? "engine",
		sourceCommit: "unavailable",
		peakMemory: "unavailable",
		python: "not used in this edition",
		rustc: "not used in this edition"
	};
}
function bytesOf(value) {
	return new TextEncoder().encode(stable(value)).length;
}
function compareFingerprints(left, right) {
	if (left === right) return {
		equivalent: true,
		detail: "Mathematical fingerprints match. Timings are allowed to differ."
	};
	return {
		equivalent: false,
		detail: "Fingerprints differ. These runs are not the same mathematical output."
	};
}
function matrixDemo(q) {
	requirePrime(q, "The matrix demo");
	const a = [[1, 2], [3, 4]];
	return {
		product: matMul(a, [[5, 6], [7, 8]], q),
		determinant: detMod(a, q),
		inverse: matInv(a, q)
	};
}
var EXPERIMENTS = [
	{
		id: "QCRL-EXP-001",
		tab: "discovery",
		index: "01",
		title: "Algebraic transformations",
		summary: "Search small polynomial maps that preserve addition, multiplication, and equality, and compare description length with a dense matrix."
	},
	{
		id: "QCRL-LATTICE-TOY",
		tab: "lattice",
		index: "02",
		title: "Toy lattice shapes",
		summary: "Sample LWE, Module-LWE, and Module-SIS at sizes a laptop can exhaust. Not ML-DSA."
	},
	{
		id: "QCRL-ATTACK-TOYHASH",
		tab: "attacks",
		index: "03",
		title: "ToySum-8",
		summary: "A checksum built to fail. The attack panel exhibits a collision and an algebraic distinguisher."
	},
	{
		id: "QCRL-ENCODE-TOY",
		tab: "encoding",
		index: "04",
		title: "Coefficient encodings",
		summary: "Compare a dense bit-pack with a sparse index list. Lossless data encoding, not proof compression."
	}
];
var CANDIDATES = [
	{
		id: "QCRL-CAND-0001",
		version: "0.1.0",
		name: "Power substitution σ_k",
		category: "Algebraic transformation",
		definition: "On R = Z/qZ[x]/(x^n − r), σ_k sends f(x) to f(x^k), reduced back into degree less than n.",
		purpose: "Ask whether a ring automorphism can be stored as an exponent instead of an n×n matrix.",
		io: "One ring element in, one ring element out.",
		parameters: "Prime q ≤ 4096, degree n ≤ 12, relation x^n±1, exponent k.",
		assumptions: "Coefficient vectors are the unique representatives of degree less than n. Bijectivity uses that Z/qZ is a field.",
		security: "No security goal. This is not proposed as a primitive.",
		weaknesses: "Even exponents on x^n+1 fail multiplicativity. Exponents sharing a factor with n fail injectivity.",
		status: "Experimental. Finite checks only."
	},
	{
		id: "QCRL-CAND-0002",
		version: "0.1.0",
		name: "ToySum-8",
		category: "Hash candidate, deliberately weak",
		definition: "Sum of the input bytes, reduced modulo 256.",
		purpose: "Give the attack module a construction whose weakness is known in advance.",
		io: "A list of bytes in, one byte out.",
		parameters: "Output width fixed at 8 bits. Inputs longer than 64 bytes are refused.",
		assumptions: "None cryptographic. The function is deterministic and public.",
		security: "Hypothesis under test: none. It was constructed to be insecure.",
		weaknesses: "Trivial collisions, no avalanche, identity on one-byte inputs, linear difference on two-byte inputs.",
		status: "Rejected. Broken by an explicit collision."
	},
	{
		id: "QCRL-CAND-0003",
		version: "0.1.0",
		name: "Sparse coefficient list",
		category: "Lossless encoding",
		definition: "A count followed by (index, value) pairs for the non-zero coefficients, compared with a fixed-width bit-pack.",
		purpose: "Measure representation size, encode time, and decode time, and check that decoding restores the polynomial.",
		io: "Coefficient vector in, byte string out, coefficient vector back.",
		parameters: "Modulus 2..256, length 2..32.",
		assumptions: "The modulus and length are known to the decoder.",
		security: "None. There is no proof system, so completeness, soundness, and zero-knowledge are not in play.",
		weaknesses: "Dense inputs get larger. The encoding leaks the zero pattern.",
		status: "Measurement tool. Not a cryptographic object."
	}
];
var HYPOTHESES = [
	{
		id: "H-001",
		title: "Classical automorphism rule",
		statement: "On R = Z/qZ[x]/(x^n − r) with r = ±1 and q an odd prime, x ↦ x^k induces an automorphism exactly when r^k ≡ r and gcd(k, n) = 1.",
		standing: "Classical. Each discovery run checks it against a full monomial basis. Agreement on one parameter set is a finite verification, not a new theorem. A disagreement would be recorded and would override the prediction."
	},
	{
		id: "H-002",
		title: "ToySum-8 is not collision resistant",
		statement: "Distinct byte strings with the same sum modulo 256 share a digest.",
		standing: "Settled by exhibition. One collision is enough to reject collision resistance for this function."
	},
	{
		id: "H-003",
		title: "Sparsity can shrink a coefficient vector",
		statement: "When a polynomial has two non-zero coefficients, the index list is shorter than the dense bit-pack, and decoding returns the same element.",
		standing: "A measurement about serialization. It says nothing about proof size in a cryptographic proof system."
	}
];
var RULES = [
	"Experimental maps are not production cryptography.",
	"The lab holds no signing keys, wallets, or consensus credentials.",
	"Nothing here is deployed, and nothing is labeled post-quantum secure.",
	"Search spaces, degrees, and moduli are capped. Unsupported parameters return an explicit error.",
	"A candidate that passes is a verified property of that finite ring, or an empirical note. It is not automatically a discovery.",
	"Failed candidates and their counterexamples are kept.",
	"The same seed repeats the same mathematical output. Timings may move."
];
var ROADMAP = [
	"A second implementation of the ring arithmetic, used only as an independent checker.",
	"Stored sweeps across a declared parameter box, with disagreements kept as first-class results.",
	"Harder caps and a visible budget when an enumeration is refused.",
	"Still no production API, no key generation meant for deployment, and no claim that a toy sample is ML-DSA."
];
var STORAGE_KEY = "qcrl-runs-v1";
function makeRun(input) {
	const env = environmentMeta();
	return {
		id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `run-${Date.now().toString(36)}`,
		version: QCRL_VERSION,
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		outputBytes: bytesOf(input.detail),
		cpuArchitecture: env.cpuArchitecture,
		deviceMemoryGb: env.deviceMemoryGb,
		runtime: env.runtime,
		runtimeDetail: env.runtimeDetail,
		sourceCommit: env.sourceCommit,
		peakMemory: env.peakMemory,
		python: env.python,
		rustc: env.rustc,
		...input
	};
}
function loadRuns() {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isRun).slice(0, 40);
	} catch {
		return [];
	}
}
function saveRuns(runs) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 40)));
}
function isRun(value) {
	if (!value || typeof value !== "object") return false;
	const row = value;
	return typeof row.id === "string" && typeof row.experimentId === "string" && typeof row.fingerprint === "string";
}
function runsToCsv(runs) {
	const lines = [[
		"id",
		"experimentId",
		"version",
		"seed",
		"params",
		"timestamp",
		"durationMs",
		"testResult",
		"classification",
		"fingerprint",
		"outputBytes",
		"cpuArchitecture",
		"deviceMemoryGb",
		"runtime",
		"sourceCommit",
		"peakMemory",
		"summary"
	].join(",")];
	for (const run of runs) {
		const cells = [
			run.id,
			run.experimentId,
			run.version,
			String(run.seed),
			run.paramsLabel,
			run.timestamp,
			run.durationMs.toFixed(3),
			run.testResult,
			run.classification,
			run.fingerprint,
			String(run.outputBytes),
			run.cpuArchitecture,
			run.deviceMemoryGb === null ? "unavailable" : String(run.deviceMemoryGb),
			run.runtime,
			run.sourceCommit,
			run.peakMemory,
			run.summary
		];
		lines.push(cells.map(csvCell).join(","));
	}
	return lines.join("\n");
}
function csvCell(value) {
	return `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replaceAll("\"", "\"\"")}"`;
}
function runMarkdown(run) {
	return [
		`# ${run.experimentId}`,
		"",
		run.summary,
		"",
		`- Version: ${run.version}`,
		`- Seed: ${run.seed}`,
		`- Parameters: ${run.paramsLabel}`,
		`- Result: ${run.testResult}`,
		`- Classification: ${run.classification}`,
		`- Duration: ${run.durationMs.toFixed(2)} ms`,
		`- Output size: ${run.outputBytes} bytes`,
		`- Fingerprint: ${run.fingerprint}`,
		`- Timestamp: ${run.timestamp}`,
		`- Runtime: ${run.runtime}`,
		`- CPU architecture: ${run.cpuArchitecture}`,
		`- Device memory (GB): ${run.deviceMemoryGb ?? "unavailable"}`,
		`- Source commit: ${run.sourceCommit}`,
		`- Peak memory: ${run.peakMemory}`,
		`- Python: ${run.python}`,
		`- Rustc: ${run.rustc}`,
		"",
		"The fingerprint is the mathematical output. Durations are measurements and may change between repeats.",
		"A passing result is not a security claim.",
		""
	].join("\n");
}
function downloadText(filename, contents, type) {
	const blob = new Blob([contents], { type });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
function timeCall(fn) {
	const started = performance.now();
	return {
		value: fn(),
		durationMs: performance.now() - started
	};
}
function PrimaryButton(props) {
	const { className = "", type = "button", ...rest } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: `inline-flex min-h-11 items-center justify-center bg-brass px-4 text-sm font-medium text-brass-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 ${className}`,
		...rest
	});
}
function QuietButton(props) {
	const { className = "", type = "button", ...rest } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: `inline-flex min-h-11 items-center justify-center border border-line bg-panel px-4 text-sm text-paper transition-colors duration-200 hover:border-brass disabled:opacity-50 ${className}`,
		...rest
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex min-w-0 flex-col gap-2 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono text-xs tracking-widest text-muted",
			children: label
		}), children]
	});
}
var controlClass = "min-h-11 w-full border border-line bg-ink px-3 font-mono text-sm text-paper";
function TextInput(props) {
	const { className = "", ...rest } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: `${controlClass} ${className}`,
		...rest
	});
}
function SelectInput(props) {
	const { className = "", children, ...rest } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		className: `${controlClass} ${className}`,
		...rest,
		children
	});
}
function Metric({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border border-line bg-ink px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-widest text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 font-mono text-lg tabular-nums text-paper",
			children: value
		})]
	});
}
function Callout({ tone, title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "border border-line bg-panel-2 p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: `font-mono text-xs tracking-widest ${tone === "sage" ? "text-sage" : tone === "oxide" ? "text-oxide" : tone === "brass" ? "text-brass" : "text-muted"}`,
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 text-sm text-paper",
			children
		})]
	});
}
function ErrorNote({ message }) {
	if (!message) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: "alert",
		className: "border border-line bg-panel-2 px-3 py-3 text-sm text-oxide",
		children: message
	});
}
function SectionIntro({ kicker, title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "max-w-3xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-widest text-brass",
				children: kicker
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-2 text-2xl font-medium tracking-tight text-paper",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 text-sm text-muted",
				children
			})
		]
	});
}
function readInt(text, label) {
	const trimmed = text.trim();
	if (!/^-?\d+$/.test(trimmed)) throw new Error(`${label} must be an integer.`);
	return Number(trimmed);
}
function fail$5(error) {
	return error instanceof Error ? error.message : "The attack demo failed.";
}
function AttackPanel({ save }) {
	const [seed, setSeed] = (0, import_react.useState)("9");
	const [error, setError] = (0, import_react.useState)("");
	const [report, setReport] = (0, import_react.useState)(null);
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
				summary: timed.value.collision ? `Collision at digest ${timed.value.collision.digest}: [${timed.value.collision.left.join(", ")}] and [${timed.value.collision.right.join(", ")}].` : "No collision was exhibited.",
				fingerprint: timed.value.fingerprint,
				detail: timed.value
			});
		} catch (caught) {
			setReport(null);
			setError(fail$5(caught));
		}
	}
	const chart = report?.avalancheByBit.map((rate, index) => ({
		bit: `b${index}`,
		rate
	})) ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
				kicker: "ATTACKS",
				title: "A checksum that was built to break",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "ToySum-8 adds bytes modulo 256. The panel looks for a collision, measures avalanche, and states the linear relation that makes the statistic unnecessary. A flattering chart would still not be a security proof." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-wrap items-end gap-3 border border-line bg-panel p-4 md:p-6",
				onSubmit: (event) => {
					event.preventDefault();
					run();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-full sm:w-40",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Seed",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: seed,
							onChange: (event) => setSeed(event.target.value),
							inputMode: "numeric"
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrimaryButton, {
					type: "submit",
					children: "Run attack demo"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
			report ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, {
						tone: "oxide",
						title: "KNOWN WEAKNESS",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.construction }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2",
							children: report.knownWeakness
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: "brass",
						title: "ALGEBRAIC DISTINGUISHER",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.algebraicDistinguisher })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 md:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Collision",
								value: report.collision ? "Found" : "None"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Digest",
								value: report.collision ? String(report.collision.digest) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Messages tried",
								value: String(report.collisionSearched)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Mean bit flip",
								value: `${(report.avalancheMean * 100).toFixed(1)}%`
							})
						]
					}),
					report.collision ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-sm text-paper",
						children: [
							"[",
							report.collision.left.join(", "),
							"] and [",
							report.collision.right.join(", "),
							"] both hash to",
							" ",
							report.collision.digest,
							"."
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border border-line bg-panel p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs tracking-widest text-muted",
								children: "AVALANCHE BY OUTPUT BIT"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Fraction of one-bit input flips that flipped each output bit. A diffusing function sits near one half. ToySum-8 does not."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4 h-56",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
										data: chart,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
												dataKey: "bit",
												stroke: "var(--color-muted)",
												tick: {
													fill: "var(--color-muted)",
													fontSize: 12
												}
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
												domain: [0, 1],
												stroke: "var(--color-muted)",
												tick: {
													fill: "var(--color-muted)",
													fontSize: 12
												}
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
												contentStyle: {
													background: "var(--color-panel)",
													border: "1px solid var(--color-line)",
													color: "var(--color-paper)"
												},
												formatter: (value) => [`${(Number(value) * 100).toFixed(1)}%`, "Flip rate"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
												dataKey: "rate",
												fill: "var(--color-brass)"
											})
										]
									})
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, {
						tone: "muted",
						title: "OUTPUT DISTRIBUTION",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Chi-square statistic ",
							report.chiSquare.toFixed(1),
							"."
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2",
							children: report.chiSquareNote
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 md:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
							tone: report.deterministic ? "sage" : "oxide",
							title: "DETERMINISM",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.deterministic ? "The same input hashed to the same byte twice." : "Determinism failed." })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
							tone: report.malformedRejected ? "sage" : "oxide",
							title: "MALFORMED INPUT",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.malformedMessage })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: report.disclaimer
					})
				]
			}) : null
		]
	});
}
function fail$4(error) {
	return error instanceof Error ? error.message : "Discovery failed.";
}
function DiscoveryPanel({ save }) {
	const [q, setQ] = (0, import_react.useState)("17");
	const [n, setN] = (0, import_react.useState)("4");
	const [seed, setSeed] = (0, import_react.useState)("20261015");
	const [relation, setRelation] = (0, import_react.useState)("negacyclic");
	const [error, setError] = (0, import_react.useState)("");
	const [report, setReport] = (0, import_react.useState)(null);
	const [repeat, setRepeat] = (0, import_react.useState)("");
	function run() {
		setError("");
		setRepeat("");
		try {
			const timed = timeCall(() => runDiscovery(readInt(q, "Modulus"), readInt(n, "Degree"), relation, readInt(seed, "Seed")));
			setReport(timed.value);
			save({
				experimentId: timed.value.experimentId,
				seed: timed.value.seed,
				paramsLabel: `${timed.value.ring.relation}, q=${timed.value.ring.q}, n=${timed.value.ring.n}`,
				durationMs: timed.durationMs,
				testResult: timed.value.criterionAgrees ? "pass" : "fail",
				classification: timed.value.criterionAgrees ? "verified-finite" : "rejected",
				summary: `${timed.value.acceptedIds.length} accepted, ${timed.value.rejectedIds.length} rejected. ${timed.value.preservingExample ?? ""}`,
				fingerprint: timed.value.fingerprint,
				detail: timed.value
			});
		} catch (caught) {
			setReport(null);
			setError(fail$4(caught));
		}
	}
	function runTwice() {
		setError("");
		try {
			const first = timeCall(() => runDiscovery(readInt(q, "Modulus"), readInt(n, "Degree"), relation, readInt(seed, "Seed")));
			const second = timeCall(() => runDiscovery(readInt(q, "Modulus"), readInt(n, "Degree"), relation, readInt(seed, "Seed")));
			setReport(first.value);
			const same = first.value.fingerprint === second.value.fingerprint;
			setRepeat(same ? `Repeated with seed ${first.value.seed}. Fingerprints match (${first.value.fingerprint.slice(0, 16)}…). Times ${first.durationMs.toFixed(2)} ms and ${second.durationMs.toFixed(2)} ms.` : "The two runs disagreed. Do not treat either as stable.");
			for (const timed of [first, second]) save({
				experimentId: timed.value.experimentId,
				seed: timed.value.seed,
				paramsLabel: `${timed.value.ring.relation}, q=${timed.value.ring.q}, n=${timed.value.ring.n}`,
				durationMs: timed.durationMs,
				testResult: same ? "pass" : "fail",
				classification: "verified-finite",
				summary: same ? "Repeat produced the same mathematical fingerprint." : "Repeat diverged.",
				fingerprint: timed.value.fingerprint,
				detail: timed.value
			});
		} catch (caught) {
			setError(fail$4(caught));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
				kicker: "QCRL-EXP-001",
				title: "Algebraic transformation and representation efficiency",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The question is whether a linear map on a small polynomial ring can preserve addition, multiplication, and equality while occupying fewer bits than its dense matrix. Acceptance is a finite-domain fact. It is not a discovery certificate and not a security claim." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3 border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4 md:p-6",
				onSubmit: (event) => {
					event.preventDefault();
					run();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Prime q",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: q,
							onChange: (event) => setQ(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Degree n",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: n,
							onChange: (event) => setN(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Seed",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: seed,
							onChange: (event) => setSeed(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Relation",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectInput, {
							value: relation,
							onChange: (event) => setRelation(event.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "negacyclic",
								children: "x^n + 1"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "cyclic",
								children: "x^n − 1"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrimaryButton, {
							type: "submit",
							children: "Run search"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuietButton, {
							onClick: runTwice,
							children: "Repeat with the same seed"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
			repeat ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
				tone: "sage",
				title: "REPRODUCIBILITY",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: repeat })
			}) : null,
			report ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-3xl text-sm italic text-paper",
						children: report.question
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-3xl text-sm text-muted",
						children: report.definition
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 md:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Accepted",
								value: String(report.acceptedIds.length)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Rejected",
								value: String(report.rejectedIds.length)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Ring",
								value: report.ring.relation
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Criterion",
								value: report.criterionAgrees ? "Agrees" : "Disagrees"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: "sage",
						title: "PRESERVING EXAMPLE",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.preservingExample })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: "oxide",
						title: "INVALID EXAMPLE",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.invalidExample })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto border border-line",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-xl text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-panel-2 font-mono text-xs tracking-widest text-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-3 font-medium",
										children: "Map"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-3 font-medium",
										children: "×"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-3 font-medium",
										children: "1:1"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-3 font-medium",
										children: "Compact bits"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-3 font-medium",
										children: "Dense bits"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-3 font-medium",
										children: "Decision"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: report.candidates.map((candidate) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-line align-top",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "px-3 py-3 font-mono text-xs",
										children: [candidate.id, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-1 block text-muted",
											children: candidate.applyCost
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-3 font-mono",
										children: candidate.multiplicative ? "yes" : "no"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-3 font-mono",
										children: candidate.bijective ? "yes" : "no"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-3 font-mono tabular-nums",
										children: candidate.compactBits ?? "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-3 font-mono tabular-nums",
										children: candidate.denseBits
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: `px-3 py-3 ${candidate.accepted ? "text-sage" : "text-oxide"}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: candidate.accepted ? "Accepted" : "Rejected" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 text-paper",
												children: candidate.reason
											}),
											candidate.counterexample ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-2 font-mono text-xs text-muted",
												children: candidate.counterexample
											}) : null
										]
									})
								]
							}, candidate.id)) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: "brass",
						title: "VERIFIED ON THIS PARAMETER SET",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex flex-col gap-2",
							children: report.formalOnThisParameterSet.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: "oxide",
						title: "CONJECTURE — NOT A THEOREM",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex flex-col gap-2",
							children: report.conjectures.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-2 text-sm text-muted",
						children: report.notes.map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: note }, note))
					})
				]
			}) : null
		]
	});
}
function fail$3(error) {
	return error instanceof Error ? error.message : "Encoding failed.";
}
function CaseBlock({ item }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border border-line bg-panel p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-widest text-brass",
				children: item.label.toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-mono text-sm text-paper",
				children: item.polynomial
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						label: "Canonical bytes",
						value: String(item.canonicalBytes)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						label: "Sparse bytes",
						value: String(item.sparseBytes)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						label: "Sparse / canonical",
						value: item.ratio.toFixed(2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						label: "Round trip",
						value: item.roundTripOk ? "Exact" : "Failed"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 font-mono text-xs text-muted",
				children: [
					"Encode ",
					item.encodeUs.toFixed(2),
					" µs, decode ",
					item.decodeUs.toFixed(2),
					" µs, mean of 400 calls."
				]
			})
		]
	});
}
function EncodingPanel({ save }) {
	const [seed, setSeed] = (0, import_react.useState)("3");
	const [q, setQ] = (0, import_react.useState)("17");
	const [n, setN] = (0, import_react.useState)("16");
	const [error, setError] = (0, import_react.useState)("");
	const [report, setReport] = (0, import_react.useState)(null);
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
				detail: timed.value
			});
		} catch (caught) {
			setReport(null);
			setError(fail$3(caught));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
				kicker: "ENCODING",
				title: "Lossless size, not proof compression",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Two byte layouts of the same coefficient vector: a fixed-width pack, and a list of the non-zero positions. Decoding must return the original element. This does not preserve a proof, because there is no proof." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3 border border-line bg-panel p-4 sm:grid-cols-3 md:p-6",
				onSubmit: (event) => {
					event.preventDefault();
					run();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Seed",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: seed,
							onChange: (event) => setSeed(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "q",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: q,
							onChange: (event) => setQ(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Length",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: n,
							onChange: (event) => setN(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sm:col-span-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrimaryButton, {
							type: "submit",
							children: "Measure encodings"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
			report ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				"aria-live": "polite",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
					tone: "brass",
					title: "WHAT THIS IS NOT",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.disclaimer })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 lg:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CaseBlock, { item: report.sparse }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CaseBlock, { item: report.dense })]
				})]
			}) : null
		]
	});
}
function fail$2(error) {
	return error instanceof Error ? error.message : "The lattice experiment failed.";
}
function LatticePanel({ save }) {
	const [seed, setSeed] = (0, import_react.useState)("11");
	const [n, setN] = (0, import_react.useState)("2");
	const [m, setM] = (0, import_react.useState)("4");
	const [q, setQ] = (0, import_react.useState)("17");
	const [bound, setBound] = (0, import_react.useState)("1");
	const [moduleN, setModuleN] = (0, import_react.useState)("2");
	const [error, setError] = (0, import_react.useState)("");
	const [report, setReport] = (0, import_react.useState)(null);
	function run() {
		setError("");
		try {
			const timed = timeCall(() => runLattice({
				seed: readInt(seed, "Seed"),
				n: readInt(n, "Secret length"),
				m: readInt(m, "Samples"),
				q: readInt(q, "Modulus"),
				bound: readInt(bound, "Bound"),
				moduleN: readInt(moduleN, "Module degree")
			}));
			setReport(timed.value);
			save({
				experimentId: timed.value.experimentId,
				seed: timed.value.seed,
				paramsLabel: `LWE n=${timed.value.lwe.n} m=${timed.value.lwe.m} q=${timed.value.lwe.q} B=${timed.value.lwe.bound}; module n=${timed.value.moduleLwe.ring}`,
				durationMs: timed.durationMs,
				testResult: timed.value.lwe.recovered && timed.value.moduleLwe.recomputed ? "pass" : "fail",
				classification: "verified-finite",
				summary: timed.value.lwe.recovered ? `Bounded search found the planted secret. ${timed.value.lwe.solutionCount} vector(s) fit the error bound.` : "Bounded search did not find the planted secret.",
				fingerprint: timed.value.fingerprint,
				detail: timed.value
			});
		} catch (caught) {
			setReport(null);
			setError(fail$2(caught));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
				kicker: "LATTICES",
				title: "Toy LWE, Module-LWE, and Module-SIS",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "These are the shapes of the problems, at sizes small enough to enumerate. They are not ML-DSA and they are not a security level." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3 border border-line bg-panel p-4 sm:grid-cols-3 lg:grid-cols-6 md:p-6",
				onSubmit: (event) => {
					event.preventDefault();
					run();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Seed",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: seed,
							onChange: (event) => setSeed(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "LWE n",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: n,
							onChange: (event) => setN(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Samples m",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: m,
							onChange: (event) => setM(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "q",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: q,
							onChange: (event) => setQ(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Bound B",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: bound,
							onChange: (event) => setBound(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Module n",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: moduleN,
							onChange: (event) => setModuleN(event.target.value),
							inputMode: "numeric"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sm:col-span-3 lg:col-span-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrimaryButton, {
							type: "submit",
							children: "Run lattice sample"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
			report ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: "brass",
						title: "BOUNDARY",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.disclaimer })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 md:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Secret",
								value: report.lwe.secretText
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Solutions in bound",
								value: String(report.lwe.solutionCount)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Secret found",
								value: report.lwe.recovered ? "Yes" : "No"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Sample bits",
								value: String(report.lwe.representationBits)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: report.lwe.recovered ? "sage" : "oxide",
						title: "EXHAUSTIVE SEARCH",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Every secret in [−B, B]^n was tested. The search space was ",
							report.lwe.searchSpace,
							". Error coordinates:",
							" ",
							report.lwe.error.join(", "),
							"."
						] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, {
						tone: "muted",
						title: "ZERO ERROR VERSUS NOISE",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.lwe.zeroErrorStatus }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2",
							children: report.lwe.noisyStatus
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border border-line bg-panel p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs tracking-widest text-muted",
								children: ["MODULE-LWE OVER ", report.moduleLwe.ring]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-sm text-paper",
								children: [
									"Recomputed b = As + e: ",
									report.moduleLwe.recomputed ? "yes" : "no",
									". Secret ∞-norm",
									" ",
									report.moduleLwe.secretNormInf,
									", error ∞-norm ",
									report.moduleLwe.errorNormInf,
									". Public size about",
									" ",
									report.moduleLwe.publicBits,
									" bits."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-3 flex flex-col gap-1 font-mono text-sm",
								children: report.moduleLwe.polynomials.map((poly) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
									poly.name,
									" = ",
									poly.body
								] }, poly.name))
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, {
						tone: "muted",
						title: "MODULE-SIS AT COEFFICIENTS IN −1, 0, 1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Searched ",
								report.moduleSis.searched,
								" short vectors. Non-zero kernel vectors:",
								" ",
								report.moduleSis.nonzeroShortKernelVectors,
								"."
							] }),
							report.moduleSis.example ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 font-mono text-sm",
								children: report.moduleSis.example
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2",
								children: report.moduleSis.note
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("pre", {
						className: "overflow-x-auto border border-line bg-ink p-4 font-mono text-xs text-paper",
						children: [
							report.lwe.matrix.map((row) => row.join(" ")).join("\n"),
							"\n",
							"b = ",
							report.lwe.sample.join(" ")
						]
					})
				]
			}) : null
		]
	});
}
function fail$1(error) {
	return error instanceof Error ? error.message : "The calculation failed.";
}
function relationCoeffs(n, q, relation) {
	const coeffs = new Array(n + 1).fill(0);
	coeffs[0] = relation === "cyclic" ? mod(-1, q) : 1;
	coeffs[n] = 1;
	return coeffs;
}
function MathPanel({ save }) {
	const [aText, setAText] = (0, import_react.useState)("3");
	const [bText, setBText] = (0, import_react.useState)("14");
	const [mText, setMText] = (0, import_react.useState)("17");
	const [fText, setFText] = (0, import_react.useState)("1, 1");
	const [gText, setGText] = (0, import_react.useState)("1, -1");
	const [qText, setQText] = (0, import_react.useState)("5");
	const [nText, setNText] = (0, import_react.useState)("4");
	const [relation, setRelation] = (0, import_react.useState)("negacyclic");
	const [vectorText, setVectorText] = (0, import_react.useState)("1, -1, 2");
	const [error, setError] = (0, import_react.useState)("");
	const [view, setView] = (0, import_react.useState)(null);
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
					inverse = fail$1(caught);
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
					matrix = fail$1(caught);
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
					agree: same ? `Polynomial remainder and the ${relationLabel(ring)} product agree.` : "The two reduction paths disagreed. Treat the result as a bug, not a conjecture.",
					matrix,
					norm: `∞-norm ${normInf(vector)}, squared Euclidean norm ${norm2sq(vector)}.`,
					fingerprintSource: {
						sum: mod(a + b, m),
						product: mod(a * b, m),
						reduced,
						viaRing
					}
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
				detail: rest
			});
		} catch (caught) {
			setView(null);
			setError(fail$1(caught));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
			kicker: "ARITHMETIC",
			title: "Modular, polynomial, and matrix operations",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Integers, polynomials, and 2×2 matrices over a small modulus. Inverses are returned only when they exist. The polynomial panel reduces by x^n−1 or x^n+1 and checks that path against the ring product." })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-4 border border-line bg-panel p-4 md:p-6",
				onSubmit: (event) => {
					event.preventDefault();
					compute();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-widest text-muted",
						children: "INTEGERS"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "a",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
									value: aText,
									onChange: (event) => setAText(event.target.value),
									inputMode: "numeric"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "b",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
									value: bText,
									onChange: (event) => setBText(event.target.value),
									inputMode: "numeric"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Modulus",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
									value: mText,
									onChange: (event) => setMText(event.target.value),
									inputMode: "numeric"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-widest text-muted",
						children: "POLYNOMIALS"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "f coefficients, low degree first",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: fText,
							onChange: (event) => setFText(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "g coefficients",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: gText,
							onChange: (event) => setGText(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "q",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
									value: qText,
									onChange: (event) => setQText(event.target.value),
									inputMode: "numeric"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "n",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
									value: nText,
									onChange: (event) => setNText(event.target.value),
									inputMode: "numeric"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Relation",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectInput, {
									value: relation,
									onChange: (event) => setRelation(event.target.value),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "negacyclic",
										children: "x^n + 1"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "cyclic",
										children: "x^n − 1"
									})]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Vector for norms",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: vectorText,
							onChange: (event) => setVectorText(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrimaryButton, {
							type: "submit",
							children: "Compute"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuietButton, {
							onClick: () => {
								setAText("8");
								setBText("3");
								setMText("12");
							},
							children: "Load a non-unit"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-4 border border-line bg-panel p-4 md:p-6",
				"aria-live": "polite",
				children: view ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "a + b",
								value: view.sum
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "a × b",
								value: view.product
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "a − b",
								value: view.difference
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "gcd(a, modulus)",
								value: view.gcdText
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
						tone: "muted",
						title: "INVERSE",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-sm",
							children: view.inverse
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, {
						tone: "muted",
						title: "POLYNOMIALS",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Sum ", view.polySum] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2",
								children: ["Product ", view.polyProduct]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2",
								children: ["Reduced ", view.reduced]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2",
								children: view.agree
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, {
						tone: "muted",
						title: "MATRIX AND NORM",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: view.matrix }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-mono text-sm",
							children: view.norm
						})]
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Compute writes the residues, the inverse or the reason it does not exist, and a cross-check of the two reduction paths. The result is appended to the run ledger."
				})
			})]
		})]
	});
}
function fail(error) {
	return error instanceof Error ? error.message : "The measurement failed.";
}
function BenchPanel({ save, runs, onClear }) {
	const [seed, setSeed] = (0, import_react.useState)("1");
	const [error, setError] = (0, import_react.useState)("");
	const [report, setReport] = (0, import_react.useState)(null);
	const [leftId, setLeftId] = (0, import_react.useState)("");
	const [rightId, setRightId] = (0, import_react.useState)("");
	function run() {
		setError("");
		try {
			const timed = timeCall(() => runBenchmark(readInt(seed, "Seed")));
			setReport(timed.value);
			save({
				experimentId: timed.value.experimentId,
				seed: timed.value.seed,
				paramsLabel: "ring product, substitution, ToySum-8, 4×4 determinant",
				durationMs: timed.durationMs,
				testResult: "pass",
				classification: "empirical",
				summary: timed.value.rows.map((row) => `${row.name}: ${row.perOpUs.toFixed(2)} µs`).join(" · "),
				fingerprint: timed.value.fingerprint,
				detail: timed.value
			});
		} catch (caught) {
			setReport(null);
			setError(fail(caught));
		}
	}
	const left = runs.find((run) => run.id === leftId);
	const right = runs.find((run) => run.id === rightId);
	const comparison = left && right ? compareFingerprints(left.fingerprint, right.fingerprint) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
				kicker: "RECORDS",
				title: "Measurements and the run ledger",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Durations are wall-clock readings from this page. They are not comparable to a tuned native library, and a faster toy is not a better primitive. Unavailable fields stay unavailable." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-wrap items-end gap-3 border border-line bg-panel p-4 md:p-6",
				onSubmit: (event) => {
					event.preventDefault();
					run();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-full sm:w-40",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Seed",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: seed,
							onChange: (event) => setSeed(event.target.value),
							inputMode: "numeric"
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrimaryButton, {
					type: "submit",
					children: "Measure"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
			report ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "overflow-x-auto border border-line",
				"aria-live": "polite",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-xl text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-panel-2 font-mono text-xs tracking-widest text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Operation"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Iterations"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Total ms"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Per call µs"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: report.rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3",
								children: row.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3 font-mono tabular-nums",
								children: row.iterations
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3 font-mono tabular-nums",
								children: row.durationMs.toFixed(2)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3 font-mono tabular-nums",
								children: row.perOpUs.toFixed(2)
							})
						]
					}, row.name)) })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "border-t border-line px-3 py-3 text-sm text-muted",
					children: report.note
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 border border-line bg-panel p-4 md:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-lg font-medium",
							children: "Ledger"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuietButton, {
									onClick: () => downloadText("qcrl-runs.json", JSON.stringify(runs, null, 2), "application/json"),
									disabled: runs.length === 0,
									children: "JSON"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuietButton, {
									onClick: () => downloadText("qcrl-runs.csv", runsToCsv(runs), "text/csv"),
									disabled: runs.length === 0,
									children: "CSV"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuietButton, {
									onClick: onClear,
									disabled: runs.length === 0,
									children: "Clear ledger"
								})
							]
						})]
					}),
					runs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "No runs yet. Compute any experiment and it will be listed here, on this browser only."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-xl text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "font-mono text-xs tracking-widest text-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 pr-3 font-medium",
										children: "When"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 pr-3 font-medium",
										children: "Experiment"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 pr-3 font-medium",
										children: "Seed"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 pr-3 font-medium",
										children: "ms"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 font-medium",
										children: "Result"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: runs.map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-line align-top",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pr-3 font-mono text-xs text-muted",
										children: run.timestamp.slice(0, 19)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-3 pr-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-mono text-xs",
											children: run.experimentId
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-muted",
											children: run.summary
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pr-3 font-mono tabular-nums",
										children: run.seed
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pr-3 font-mono tabular-nums",
										children: run.durationMs.toFixed(2)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: `py-3 ${run.testResult === "pass" ? "text-sage" : "text-oxide"}`,
										children: run.testResult
									})
								]
							}, run.id)) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 md:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "First run",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectInput, {
								value: leftId,
								onChange: (event) => setLeftId(event.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Select"
								}), runs.map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: run.id,
									children: [
										run.experimentId,
										" · ",
										run.timestamp.slice(11, 19)
									]
								}, run.id))]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Second run",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectInput, {
								value: rightId,
								onChange: (event) => setRightId(event.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Select"
								}), runs.map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: run.id,
									children: [
										run.experimentId,
										" · ",
										run.timestamp.slice(11, 19)
									]
								}, run.id))]
							})
						})]
					}),
					comparison && left && right ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Callout, {
						tone: comparison.equivalent ? "sage" : "oxide",
						title: "COMPARISON",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: comparison.detail }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2",
								children: [
									left.durationMs.toFixed(2),
									" ms versus ",
									right.durationMs.toFixed(2),
									" ms. Same experiment:",
									" ",
									left.experimentId === right.experimentId ? "yes" : "no",
									". Same seed: ",
									left.seed === right.seed ? "yes" : "no",
									"."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuietButton, {
									onClick: () => downloadText(`${left.experimentId}.md`, `${runMarkdown(left)}\n${runMarkdown(right)}`, "text/markdown"),
									children: "Download comparison"
								})
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Choose two ledger rows to compare fingerprints. Timings are allowed to differ."
					})
				]
			})
		]
	});
}
function RegistryPanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
			kicker: "REGISTRY",
			title: "Candidates, including the one that is supposed to fail",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Every entry carries its assumptions and its weaknesses. Security lines are hypotheses, or an explicit refusal to make one." })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-col gap-4",
			children: CANDIDATES.map((candidate) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "border border-line bg-panel p-4 md:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-baseline justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-lg font-medium",
							children: candidate.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs text-muted",
							children: [
								candidate.id,
								" · v",
								candidate.version
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: `mt-2 font-mono text-xs tracking-widest ${candidate.status.startsWith("Rejected") ? "text-oxide" : "text-brass"}`,
						children: candidate.status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
						className: "mt-4 grid gap-4 sm:grid-cols-2",
						children: [
							["Category", candidate.category],
							["Definition", candidate.definition],
							["Purpose", candidate.purpose],
							["Input / output", candidate.io],
							["Parameters", candidate.parameters],
							["Assumptions", candidate.assumptions],
							["Security hypothesis", candidate.security],
							["Known weaknesses", candidate.weaknesses]
						].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "font-mono text-xs tracking-widest text-muted",
							children: label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 text-sm text-paper",
							children: value
						})] }, label))
					})
				]
			}, candidate.id))
		})]
	});
}
function NotesPanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
				kicker: "NOTES",
				title: "What this laboratory will and will not say",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Mathematical discovery first, a finite check second, and a cryptographic interpretation only after evidence that this version does not claim to have." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: RULES.map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "border border-line bg-panel px-4 py-3 text-sm",
					children: rule
				}, rule))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-4",
				children: HYPOTHESES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "border border-line bg-panel p-4 md:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs tracking-widest text-brass",
							children: item.id
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-2 text-lg font-medium",
							children: item.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm",
							children: item.statement
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: item.standing
						})
					]
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
				tone: "muted",
				title: "THREAT MODEL, VERSION 0.1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The adversary is the person running the experiment. The targets are local toy constructions and generated samples. There is no protocol, no key, and no side channel to measure. Statistical tests are reported as statistics. They do not establish security, and the attack page says so next to the numbers." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border border-line bg-panel p-4 md:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-lg font-medium",
					children: "Roadmap for 0.2"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-col gap-2 text-sm text-muted",
					children: ROADMAP.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: item }, item))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
				tone: "brass",
				title: "THIS EDITION",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The v0.1 program — modular arithmetic, the bounded search, the toy lattice shapes, the broken checksum, the encodings, and the ledger — runs in the page. Runs stay in this browser. Commit hash and peak memory are marked unavailable rather than invented. A native toolchain and a second computer-algebra checker are later work, not a result this page pretends to have." })
			})
		]
	});
}
var NAV = [
	{
		id: "lab",
		label: "Laboratory",
		icon: Compass
	},
	{
		id: "math",
		label: "Arithmetic",
		icon: Binary
	},
	{
		id: "lattice",
		label: "Lattices",
		icon: Grid2x2
	},
	{
		id: "discovery",
		label: "Discovery",
		icon: Search
	},
	{
		id: "attacks",
		label: "Attacks",
		icon: ShieldAlert
	},
	{
		id: "encoding",
		label: "Encoding",
		icon: Layers
	},
	{
		id: "bench",
		label: "Records",
		icon: Gauge
	},
	{
		id: "registry",
		label: "Registry",
		icon: Library
	},
	{
		id: "notes",
		label: "Notes",
		icon: ScrollText
	}
];
function LabApp() {
	const [tab, setTab] = (0, import_react.useState)("lab");
	const [runs, setRuns] = (0, import_react.useState)([]);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [checks, setChecks] = (0, import_react.useState)(null);
	const [env, setEnv] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setRuns(loadRuns());
		setEnv(environmentMeta());
		const math = runSelfTest();
		let storageOk = false;
		let storageDetail = "localStorage is unavailable.";
		try {
			const key = "qcrl-doctor-probe";
			localStorage.setItem(key, "1");
			storageOk = localStorage.getItem(key) === "1";
			localStorage.removeItem(key);
			storageDetail = storageOk ? "A probe key was written and read back." : "The probe key did not round-trip.";
		} catch (error) {
			storageDetail = error instanceof Error ? error.message : storageDetail;
		}
		setChecks([
			...math,
			{
				name: "Run ledger storage",
				ok: storageOk,
				detail: storageDetail
			},
			{
				name: "Timers",
				ok: typeof performance !== "undefined" && typeof performance.now === "function",
				detail: "performance.now is available for durations."
			}
		]);
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		saveRuns(runs);
	}, [ready, runs]);
	function save(input) {
		setRuns((current) => [makeRun(input), ...current].slice(0, 40));
	}
	const passed = checks?.filter((check) => check.ok).length ?? 0;
	const failed = checks ? checks.length - passed : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-ink text-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "border-b border-line",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-end md:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-3xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs tracking-widest text-brass",
								children: "QCRL · VERSION 0.1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-2 text-3xl font-medium tracking-tight md:text-4xl",
								children: "Qattice research lab"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 max-w-2xl text-sm text-muted md:text-base",
								children: "A bounded instrument for algebraic experiments. A passing check is not a theorem, and it is not a security proof."
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-muted",
						children: "QCRL-EXP-001 · local only"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lab-rule h-6 border-t border-line",
					"aria-hidden": "true"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto max-w-6xl px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex min-w-0 gap-2 overflow-x-auto py-4",
					"aria-label": "Laboratory sections",
					children: NAV.map((item) => {
						const Icon = item.icon;
						const active = tab === item.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-current": active ? "page" : void 0,
							onClick: () => setTab(item.id),
							className: `inline-flex min-h-11 shrink-0 items-center gap-2 border px-3 text-sm ${active ? "border-brass bg-brass text-brass-ink" : "border-line bg-panel text-muted"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: "size-4",
								"aria-hidden": "true"
							}), item.label]
						}, item.id);
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto flex min-w-0 max-w-6xl flex-col gap-6 px-4 pb-16",
				children: [
					tab === "lab" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabHome, {
						checks,
						env,
						passed,
						failed,
						onOpen: (next) => setTab(next)
					}) : null,
					tab === "math" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MathPanel, { save }) : null,
					tab === "lattice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LatticePanel, { save }) : null,
					tab === "discovery" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiscoveryPanel, { save }) : null,
					tab === "attacks" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttackPanel, { save }) : null,
					tab === "encoding" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EncodingPanel, { save }) : null,
					tab === "bench" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BenchPanel, {
						save,
						runs,
						onClear: () => setRuns([])
					}) : null,
					tab === "registry" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RegistryPanel, {}) : null,
					tab === "notes" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotesPanel, {}) : null
				]
			})
		]
	});
}
function LabHome({ checks, env, passed, failed, onOpen }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "max-w-3xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-widest text-brass",
						children: "DOCTOR"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-2 text-2xl font-medium tracking-tight",
						children: "Environment and integrity"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: "The doctor reruns the finite checks: inverses, a negacyclic product, an accepted automorphism, a planted invalid map, a repeated seed, a toy collision, and a round-trip encoding."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Status, {
						label: "Checks passed",
						value: checks ? String(passed) : "…",
						tone: "sage"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Status, {
						label: "Checks failed",
						value: checks ? String(failed) : "…",
						tone: failed ? "oxide" : "sage"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Status, {
						label: "Runtime",
						value: env?.runtime ?? "Checking",
						tone: "brass"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border border-line bg-panel",
				children: checks ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: checks.map((check) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "border-b border-line px-4 py-3 last:border-b-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm",
							children: check.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: `font-mono text-xs tracking-widest ${check.ok ? "text-sage" : "text-oxide"}`,
							children: check.ok ? "PASS" : "FAIL"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: check.detail
					})]
				}, check.name)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 py-6 text-sm text-muted",
					children: "Checking the arithmetic engine…"
				})
			}),
			env ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
						label: "CPU",
						value: env.cpuArchitecture
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
						label: "Memory GB",
						value: env.deviceMemoryGb === null ? "unavailable" : String(env.deviceMemoryGb)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
						label: "Source commit",
						value: env.sourceCommit
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
						label: "Peak memory",
						value: env.peakMemory
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl font-medium",
					children: "Registered experiments"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-3 md:grid-cols-2",
					children: EXPERIMENTS.map((experiment) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => onOpen(experiment.tab),
						className: "border border-line bg-panel p-4 text-left",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs tracking-widest text-brass",
								children: [
									experiment.index,
									" · ",
									experiment.id
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-lg font-medium",
								children: experiment.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: experiment.summary
							})
						]
					}, experiment.id))
				})]
			})
		]
	});
}
function Status({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border border-line bg-panel px-4 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-widest text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: `mt-2 font-mono text-2xl tabular-nums ${tone === "sage" ? "text-sage" : tone === "oxide" ? "text-oxide" : "text-brass"}`,
			children: value
		})]
	});
}
function Fact({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border border-line px-4 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "font-mono text-xs tracking-widest text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "mt-1 text-sm",
			children: value
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabApp, {});
}
//#endregion
export { Home as component };
