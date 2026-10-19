export const EXPERIMENTS = [
  {
    id: "QCRL-EXP-001",
    tab: "discovery" as const,
    index: "01",
    title: "Algebraic transformations",
    summary: "Search small polynomial maps that preserve addition, multiplication, and equality, and compare description length with a dense matrix.",
  },
  {
    id: "QCRL-LATTICE-TOY",
    tab: "lattice" as const,
    index: "02",
    title: "Toy lattice shapes",
    summary: "Sample LWE, Module-LWE, and Module-SIS at sizes a laptop can exhaust. Not ML-DSA.",
  },
  {
    id: "QCRL-ATTACK-TOYHASH",
    tab: "attacks" as const,
    index: "03",
    title: "ToySum-8",
    summary: "A checksum built to fail. The attack panel exhibits a collision and an algebraic distinguisher.",
  },
  {
    id: "QCRL-ENCODE-TOY",
    tab: "encoding" as const,
    index: "04",
    title: "Coefficient encodings",
    summary: "Compare a dense bit-pack with a sparse index list. Lossless data encoding, not proof compression.",
  },
];

export const CANDIDATES = [
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
    status: "Experimental. Finite checks only.",
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
    status: "Rejected. Broken by an explicit collision.",
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
    status: "Measurement tool. Not a cryptographic object.",
  },
];

export const HYPOTHESES = [
  {
    id: "H-001",
    title: "Classical automorphism rule",
    statement:
      "On R = Z/qZ[x]/(x^n − r) with r = ±1 and q an odd prime, x ↦ x^k induces an automorphism exactly when r^k ≡ r and gcd(k, n) = 1.",
    standing:
      "Classical. Each discovery run checks it against a full monomial basis. Agreement on one parameter set is a finite verification, not a new theorem. A disagreement would be recorded and would override the prediction.",
  },
  {
    id: "H-002",
    title: "ToySum-8 is not collision resistant",
    statement: "Distinct byte strings with the same sum modulo 256 share a digest.",
    standing: "Settled by exhibition. One collision is enough to reject collision resistance for this function.",
  },
  {
    id: "H-003",
    title: "Sparsity can shrink a coefficient vector",
    statement:
      "When a polynomial has two non-zero coefficients, the index list is shorter than the dense bit-pack, and decoding returns the same element.",
    standing: "A measurement about serialization. It says nothing about proof size in a cryptographic proof system.",
  },
];

export const RULES = [
  "Experimental maps are not production cryptography.",
  "The lab holds no signing keys, wallets, or consensus credentials.",
  "Nothing here is deployed, and nothing is labeled post-quantum secure.",
  "Search spaces, degrees, and moduli are capped. Unsupported parameters return an explicit error.",
  "A candidate that passes is a verified property of that finite ring, or an empirical note. It is not automatically a discovery.",
  "Failed candidates and their counterexamples are kept.",
  "The same seed repeats the same mathematical output. Timings may move.",
];

export const ROADMAP = [
  "A second implementation of the ring arithmetic, used only as an independent checker.",
  "Stored sweeps across a declared parameter box, with disagreements kept as first-class results.",
  "Harder caps and a visible budget when an enumeration is refused.",
  "Still no production API, no key generation meant for deployment, and no claim that a toy sample is ML-DSA.",
];
