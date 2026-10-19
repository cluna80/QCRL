use axum::{
    Router,
    extract::Json,
    http::{Method, StatusCode},
    routing::{get, post},
};
use qcrl_math::{Ring, automorphism, gcd, mod_inverse, modulo, ring_mul};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tower_http::cors::{Any, CorsLayer};

#[derive(Deserialize)]
struct SearchRequest {
    q: i64,
    n: usize,
    relation: String,
    seed: u32,
    candidates: usize,
    #[serde(rename = "kMin")]
    k_min: usize,
    #[serde(rename = "kMax")]
    k_max: usize,
}

#[derive(Deserialize)]
struct AutomorphismRequest {
    coeffs: Vec<i64>,
    k: u64,
    q: i64,
    n: usize,
}

#[derive(Deserialize)]
struct LweRequest {
    n: usize,
    m: usize,
    q: i64,
    seed: u32,
    error_bound: i64,
    secret_bound: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LweResponse {
    engine: &'static str,
    matrix_a: Vec<Vec<i64>>,
    b: Vec<i64>,
    planted_secret: Vec<i64>,
    planted_error: Vec<i64>,
    recovery_attempted: bool,
    recovery_succeeded: bool,
    matches_planted_secret: bool,
    recovered_secret: Option<Vec<i64>>,
    candidates_checked: usize,
    search_space: Option<usize>,
    fingerprint: String,
}

#[derive(Deserialize)]
struct NormRequest {
    coeffs: Vec<i64>,
    q: i64,
    n: usize,
    relation: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NormMeasure {
    l_inf: i64,
    l2_squared: i64,
    hamming_weight: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NormProfileEntry {
    k: usize,
    l_inf: i64,
    l2_squared: i64,
    hamming_weight: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NormResponse {
    engine: &'static str,
    canonical_coeffs: Vec<i64>,
    l_inf: i64,
    l2_squared: i64,
    hamming_weight: usize,
    dense_bits: usize,
    sparse_bits: usize,
    compression_ratio: Option<f64>,
    gamma1: i64,
    gamma2: f64,
    within_gamma1: bool,
    within_gamma2: bool,
    is_short: bool,
    norm_profile: Vec<NormProfileEntry>,
}

#[derive(Serialize)]
struct LweFingerprint<'a> {
    matrix_a: &'a [Vec<i64>],
    b: &'a [i64],
    planted_secret: &'a [i64],
    planted_error: &'a [i64],
}

#[derive(Serialize)]
struct SearchResponse {
    results: Vec<RankedCandidate>,
}

#[derive(Serialize)]
struct RankedCandidate {
    rank: usize,
    score: u8,
    #[serde(flatten)]
    candidate: CandidateReport,
}

#[derive(Clone, Serialize)]
struct CandidateReport {
    id: String,
    kind: &'static str,
    k: Option<usize>,
    additive: bool,
    unital: bool,
    multiplicative: bool,
    bijective: bool,
    #[serde(rename = "preservesEquality")]
    preserves_equality: bool,
    counterexample: Option<String>,
    #[serde(rename = "denseBits")]
    dense_bits: usize,
    #[serde(rename = "compactBits")]
    compact_bits: Option<usize>,
    #[serde(rename = "nonzeroEntries")]
    nonzero_entries: usize,
    #[serde(rename = "applyCost")]
    apply_cost: String,
    accepted: bool,
    reason: String,
    classification: &'static str,
}

struct CandidateSpec {
    id: String,
    kind: &'static str,
    k: Option<usize>,
    matrix: Vec<Vec<i64>>,
    compact_bits: Option<usize>,
    apply_cost: String,
}

fn error(status: StatusCode, message: impl Into<String>) -> (StatusCode, Json<Value>) {
    (status, Json(json!({ "error": message.into() })))
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn apply_automorphism(
    Json(request): Json<AutomorphismRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let ring = Ring::new(request.q, request.n, true)
        .map_err(|message| error(StatusCode::BAD_REQUEST, message))?;
    if request.coeffs.len() > ring.n {
        return Err(error(
            StatusCode::BAD_REQUEST,
            format!(
                "Expected at most {} coefficients, received {}.",
                ring.n,
                request.coeffs.len()
            ),
        ));
    }
    match automorphism(&request.coeffs, request.k, ring) {
        Ok(result) => Ok(Json(json!({ "result": result }))),
        Err(message) => Err(error(StatusCode::BAD_REQUEST, message)),
    }
}

async fn generate_lwe(
    Json(request): Json<LweRequest>,
) -> Result<Json<LweResponse>, (StatusCode, Json<Value>)> {
    if !(1..=64).contains(&request.n) || !(1..=256).contains(&request.m) {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "n must be 1..64 and m must be 1..256",
        ));
    }
    if !(2..=4096).contains(&request.q) {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "q must be between 2 and 4096",
        ));
    }
    if !(0..=4096).contains(&request.error_bound) || !(0..=4096).contains(&request.secret_bound) {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "error_bound and secret_bound must be between 0 and 4096",
        ));
    }

    let mut rng = Mulberry32::new(request.seed);
    let matrix_a: Vec<Vec<i64>> = (0..request.m)
        .map(|_| (0..request.n).map(|_| rng.below(request.q)).collect())
        .collect();
    let planted_secret: Vec<i64> = (0..request.n)
        .map(|_| rng.below(request.secret_bound * 2 + 1) - request.secret_bound)
        .collect();
    let planted_error: Vec<i64> = (0..request.m)
        .map(|_| rng.below(request.error_bound * 2 + 1) - request.error_bound)
        .collect();
    let b: Vec<i64> = matrix_a
        .iter()
        .zip(&planted_error)
        .map(|(row, &error_value)| {
            let dot = row
                .iter()
                .zip(&planted_secret)
                .map(|(&a, &secret)| a as i128 * secret as i128)
                .sum::<i128>();
            (dot + error_value as i128).rem_euclid(request.q as i128) as i64
        })
        .collect();

    let recovery_attempted = request.n <= 4 && request.secret_bound <= 2;
    let search_space =
        recovery_attempted.then(|| (request.secret_bound * 2 + 1).pow(request.n as u32) as usize);
    let mut candidates_checked = 0;
    let mut recovered_secret = None;
    let mut matches_planted_secret = false;
    if let Some(space) = search_space {
        let span = request.secret_bound * 2 + 1;
        for encoded in 0..space {
            let mut value = encoded;
            let candidate: Vec<i64> = (0..request.n)
                .map(|_| {
                    let coefficient = (value % span as usize) as i64 - request.secret_bound;
                    value /= span as usize;
                    coefficient
                })
                .collect();
            candidates_checked += 1;
            if candidate_fits_lwe(&candidate, &matrix_a, &b, request.q, request.error_bound) {
                if recovered_secret.is_none() {
                    recovered_secret = Some(candidate.clone());
                }
                if candidate == planted_secret {
                    recovered_secret = Some(candidate);
                    matches_planted_secret = true;
                }
            }
        }
    }

    let fingerprint_payload = LweFingerprint {
        matrix_a: &matrix_a,
        b: &b,
        planted_secret: &planted_secret,
        planted_error: &planted_error,
    };
    let fingerprint_json =
        serde_json::to_string(&fingerprint_payload).expect("LWE fingerprint payload serializes");

    Ok(Json(LweResponse {
        engine: "rust",
        matrix_a,
        b,
        planted_secret,
        planted_error,
        recovery_attempted,
        recovery_succeeded: recovered_secret.is_some(),
        matches_planted_secret,
        recovered_secret,
        candidates_checked,
        search_space,
        fingerprint: fnv1a(&fingerprint_json),
    }))
}

fn candidate_fits_lwe(
    secret: &[i64],
    matrix: &[Vec<i64>],
    b: &[i64],
    q: i64,
    error_bound: i64,
) -> bool {
    matrix.iter().zip(b).all(|(row, &sample)| {
        let dot = row
            .iter()
            .zip(secret)
            .map(|(&a, &coefficient)| a as i128 * coefficient as i128)
            .sum::<i128>();
        let residual = (sample as i128 - dot).rem_euclid(q as i128) as i64;
        let centered = if residual > q / 2 {
            residual - q
        } else {
            residual
        };
        centered.abs() <= error_bound
    })
}

async fn track_norms(
    Json(request): Json<NormRequest>,
) -> Result<Json<NormResponse>, (StatusCode, Json<Value>)> {
    let negacyclic = match request.relation.as_str() {
        "negacyclic" => true,
        "cyclic" => false,
        _ => {
            return Err(error(
                StatusCode::BAD_REQUEST,
                "relation must be cyclic or negacyclic",
            ));
        }
    };
    let ring = Ring::new(request.q, request.n, negacyclic)
        .map_err(|message| error(StatusCode::BAD_REQUEST, message))?;
    if request.coeffs.len() > 256 {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "coeffs may contain at most 256 values",
        ));
    }

    let canonical_residues = reduce_polynomial(&request.coeffs, ring);
    let canonical_coeffs: Vec<i64> = canonical_residues
        .iter()
        .map(|&coefficient| centered(coefficient, ring.q))
        .collect();
    let measure = measure_norms(&canonical_coeffs);
    let gamma1 = 1 << 17;
    let gamma2 = (ring.q - 1) as f64 / 88.0;
    let within_gamma1 = measure.l_inf < gamma1;
    let within_gamma2 = (measure.l_inf as f64) < gamma2;
    let dense_bits = ring.n * ceil_log2(ring.q as usize);
    let sparse_bits = measure.hamming_weight * (ceil_log2(ring.n) + ceil_log2(ring.q as usize));
    let compression_ratio = if sparse_bits == 0 {
        None
    } else {
        Some(dense_bits as f64 / sparse_bits as f64)
    };
    let mut norm_profile = Vec::new();
    let max_exponent = if ring.negacyclic { 2 * ring.n } else { ring.n };
    for k in 1..=max_exponent {
        let accepted = if ring.negacyclic {
            gcd(k as i64, (2 * ring.n) as i64) == 1
        } else {
            gcd(k as i64, ring.n as i64) == 1
        };
        if !accepted {
            continue;
        }
        let transformed = if ring.negacyclic {
            automorphism(&canonical_residues, k as u64, ring)
                .map_err(|message| error(StatusCode::BAD_REQUEST, message))?
        } else {
            apply_cyclic_automorphism(&canonical_residues, k, ring)
        };
        let centered_transformed: Vec<i64> = transformed
            .iter()
            .map(|&coefficient| centered(coefficient, ring.q))
            .collect();
        let transformed_measure = measure_norms(&centered_transformed);
        norm_profile.push(NormProfileEntry {
            k,
            l_inf: transformed_measure.l_inf,
            l2_squared: transformed_measure.l2_squared,
            hamming_weight: transformed_measure.hamming_weight,
        });
    }

    Ok(Json(NormResponse {
        engine: "rust",
        canonical_coeffs,
        l_inf: measure.l_inf,
        l2_squared: measure.l2_squared,
        hamming_weight: measure.hamming_weight,
        dense_bits,
        sparse_bits,
        compression_ratio,
        gamma1,
        gamma2,
        within_gamma1,
        within_gamma2,
        is_short: within_gamma1 && within_gamma2,
        norm_profile,
    }))
}

fn reduce_polynomial(coeffs: &[i64], ring: Ring) -> Vec<i64> {
    let mut reduced = vec![0; ring.n];
    for (degree, &coefficient) in coeffs.iter().enumerate() {
        let wraps = degree / ring.n;
        let sign = if ring.negacyclic && wraps % 2 == 1 {
            -1_i128
        } else {
            1
        };
        let index = degree % ring.n;
        reduced[index] =
            (reduced[index] as i128 + sign * coefficient as i128).rem_euclid(ring.q as i128) as i64;
    }
    reduced
}

fn apply_cyclic_automorphism(coeffs: &[i64], k: usize, ring: Ring) -> Vec<i64> {
    let mut output = vec![0_i64; ring.n];
    for (degree, &coefficient) in coeffs.iter().enumerate() {
        let index = (degree * k) % ring.n;
        output[index] = (output[index] + coefficient).rem_euclid(ring.q);
    }
    output
}

fn centered(value: i64, q: i64) -> i64 {
    let reduced = modulo(value, q);
    if reduced > q / 2 {
        reduced - q
    } else {
        reduced
    }
}

fn measure_norms(coeffs: &[i64]) -> NormMeasure {
    NormMeasure {
        l_inf: coeffs
            .iter()
            .map(|coefficient| coefficient.abs())
            .max()
            .unwrap_or(0),
        l2_squared: coeffs
            .iter()
            .map(|coefficient| coefficient * coefficient)
            .sum(),
        hamming_weight: coeffs
            .iter()
            .filter(|&&coefficient| coefficient != 0)
            .count(),
    }
}

fn fnv1a(value: &str) -> String {
    let mut hash = 0x811c9dc5_u32;
    for byte in value.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(0x01000193);
    }
    format!("{hash:08x}")
}

async fn search(
    Json(request): Json<SearchRequest>,
) -> Result<Json<SearchResponse>, (StatusCode, Json<Value>)> {
    let negacyclic = match request.relation.as_str() {
        "negacyclic" => true,
        "cyclic" => false,
        _ => {
            return Err(error(
                StatusCode::BAD_REQUEST,
                "relation must be 'negacyclic' or 'cyclic'",
            ));
        }
    };
    let ring = Ring::new(request.q, request.n, negacyclic)
        .map_err(|message| error(StatusCode::BAD_REQUEST, message))?;
    if !is_prime(ring.q) {
        return Err(error(
            StatusCode::BAD_REQUEST,
            format!(
                "QCRL-EXP-001 requires a prime modulus. q={} is not prime.",
                ring.q
            ),
        ));
    }
    if request.candidates > 256 {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "candidates must be between 0 and 256",
        ));
    }
    if request.k_min > request.k_max || request.k_max > 64 {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "kMin and kMax must satisfy 0 <= kMin <= kMax <= 64",
        ));
    }

    let mut specs = Vec::with_capacity(request.k_max - request.k_min + 1 + 2 + request.candidates);
    for k in request.k_min..=request.k_max {
        let images = (0..ring.n)
            .map(|degree| substitute_monomial(degree, k, ring))
            .collect();
        specs.push(CandidateSpec {
            id: format!("sigma-{k}"),
            kind: "power-substitution",
            k: Some(k),
            matrix: matrix_from_images(images),
            compact_bits: Some(ceil_log2(ring.n.max(2))),
            apply_cost: format!("{} placements (one per coefficient)", ring.n),
        });
    }

    let drop_images = (0..ring.n)
        .map(|degree| {
            let mut image = vec![0; ring.n];
            if degree > 0 {
                image[degree - 1] = 1;
            }
            image
        })
        .collect();
    specs.push(CandidateSpec {
        id: "drop-constant".into(),
        kind: "drop-constant",
        k: None,
        matrix: matrix_from_images(drop_images),
        compact_bits: None,
        apply_cost: format!(
            "{} copies, discarding the constant term's destination",
            ring.n
        ),
    });

    let reverse_images = (0..ring.n)
        .map(|degree| {
            let mut image = vec![0; ring.n];
            image[ring.n - 1 - degree] = 1;
            image
        })
        .collect();
    specs.push(CandidateSpec {
        id: "reversal".into(),
        kind: "reversal",
        k: None,
        matrix: matrix_from_images(reverse_images),
        compact_bits: Some(ring.n * ceil_log2(ring.n.max(2))),
        apply_cost: format!("{} placements", ring.n),
    });

    let mut rng = Mulberry32::new(request.seed);
    for index in 0..request.candidates {
        let matrix = (0..ring.n)
            .map(|_| (0..ring.n).map(|_| rng.below(ring.q)).collect())
            .collect();
        specs.push(CandidateSpec {
            id: if request.candidates == 1 {
                "seeded-linear".into()
            } else {
                format!("seeded-linear-{index}")
            },
            kind: "seeded-linear",
            k: None,
            matrix,
            compact_bits: None,
            apply_cost: format!("{} multiplications", ring.n * ring.n),
        });
    }

    let mut ranked: Vec<(u8, CandidateReport)> = specs
        .par_iter()
        .map(|spec| analyze(spec, ring))
        .map(|candidate| {
            let score = u8::from(candidate.accepted) * 100
                + u8::from(candidate.unital) * 10
                + u8::from(candidate.multiplicative) * 5
                + u8::from(candidate.bijective);
            (score, candidate)
        })
        .collect();
    ranked.sort_by(|left, right| {
        right
            .0
            .cmp(&left.0)
            .then_with(|| left.1.id.cmp(&right.1.id))
    });

    let results = ranked
        .into_iter()
        .enumerate()
        .map(|(index, (score, candidate))| RankedCandidate {
            rank: index + 1,
            score,
            candidate,
        })
        .collect();
    Ok(Json(SearchResponse { results }))
}

fn analyze(spec: &CandidateSpec, ring: Ring) -> CandidateReport {
    let image_one: Vec<i64> = (0..ring.n).map(|row| spec.matrix[row][0]).collect();
    let one: Vec<i64> = (0..ring.n).map(|index| i64::from(index == 0)).collect();
    let unital = image_one == one;

    let mut counterexample = None;
    let mut multiplicative = true;
    'basis: for i in 0..ring.n {
        for j in 0..ring.n {
            let left_input = basis_product(i, j, ring);
            let left = apply_matrix(&spec.matrix, &left_input, ring);
            let right = ring_mul(
                &apply_matrix(&spec.matrix, &basis(i, ring.n), ring),
                &apply_matrix(&spec.matrix, &basis(j, ring.n), ring),
                ring,
            );
            if left != right {
                multiplicative = false;
                counterexample = Some(format!(
                    "f={}, g={}, fg={}, T(fg)={}, T(f)T(g)={}",
                    format_poly(&basis(i, ring.n), None),
                    format_poly(&basis(j, ring.n), None),
                    format_poly(&left_input, Some(ring.q)),
                    format_poly(&left, Some(ring.q)),
                    format_poly(&right, Some(ring.q))
                ));
                break 'basis;
            }
        }
    }

    let determinant = determinant_mod(&spec.matrix, ring.q);
    let bijective = determinant != 0;
    let preserves_equality = bijective;
    if unital && multiplicative && !bijective {
        counterexample = Some(format!(
            "The map preserves + and × but det={determinant}, so distinct inputs can collide. Equality is not preserved."
        ));
    }
    if !unital && counterexample.is_none() {
        counterexample = Some(format!(
            "T(1) = {}, which is not 1.",
            format_poly(&image_one, Some(ring.q))
        ));
    }

    let accepted = unital && multiplicative && bijective;
    let dense_bits = ring.n * ring.n * ceil_log2(ring.q as usize);
    let reason = if accepted
        && spec
            .compact_bits
            .is_some_and(|compact| compact < dense_bits)
    {
        format!(
            "Preserves the ring operations and equality. Description is {} bits versus {} bits for the dense matrix.",
            spec.compact_bits.unwrap(),
            dense_bits
        )
    } else if accepted {
        "Preserves the ring operations and equality. No shorter description than the dense matrix was recorded.".into()
    } else if !multiplicative {
        "Rejected: multiplication is not preserved. A counterexample was found on the monomial basis.".into()
    } else if !unital {
        "Rejected: the multiplicative identity is not fixed.".into()
    } else {
        "Rejected: the map is a non-injective homomorphism, so equality is not preserved.".into()
    };

    CandidateReport {
        id: spec.id.clone(),
        kind: spec.kind,
        k: spec.k,
        additive: true,
        unital,
        multiplicative,
        bijective,
        preserves_equality,
        counterexample,
        dense_bits,
        compact_bits: spec.compact_bits,
        nonzero_entries: spec
            .matrix
            .iter()
            .flatten()
            .filter(|&&value| value != 0)
            .count(),
        apply_cost: spec.apply_cost.clone(),
        accepted,
        reason,
        classification: if accepted {
            "verified-finite"
        } else {
            "rejected"
        },
    }
}

fn substitute_monomial(degree: usize, k: usize, ring: Ring) -> Vec<i64> {
    let power = degree * k;
    let wraps = power / ring.n;
    let index = power % ring.n;
    let mut image = vec![0; ring.n];
    image[index] = if ring.negacyclic && wraps % 2 == 1 {
        ring.q - 1
    } else {
        1
    };
    image
}

fn matrix_from_images(images: Vec<Vec<i64>>) -> Vec<Vec<i64>> {
    let n = images.len();
    (0..n)
        .map(|row| images.iter().map(|image| image[row]).collect())
        .collect()
}

fn apply_matrix(matrix: &[Vec<i64>], vector: &[i64], ring: Ring) -> Vec<i64> {
    (0..ring.n)
        .map(|row| {
            modulo(
                (0..ring.n)
                    .map(|column| matrix[row][column] as i128 * vector[column] as i128)
                    .sum::<i128>() as i64,
                ring.q,
            )
        })
        .collect()
}

fn basis(index: usize, n: usize) -> Vec<i64> {
    let mut vector = vec![0; n];
    vector[index] = 1;
    vector
}

fn basis_product(i: usize, j: usize, ring: Ring) -> Vec<i64> {
    ring_mul(&basis(i, ring.n), &basis(j, ring.n), ring)
}

fn determinant_mod(matrix: &[Vec<i64>], q: i64) -> i64 {
    let n = matrix.len();
    let mut values: Vec<Vec<i64>> = matrix
        .iter()
        .map(|row| row.iter().map(|&value| modulo(value, q)).collect())
        .collect();
    let mut determinant = 1_i64;
    for column in 0..n {
        let Some(pivot) = (column..n).find(|&row| values[row][column] != 0) else {
            return 0;
        };
        if pivot != column {
            values.swap(pivot, column);
            determinant = modulo(-determinant, q);
        }
        let pivot_value = values[column][column];
        determinant = modulo((determinant as i128 * pivot_value as i128) as i64, q);
        let inverse = mod_inverse(pivot_value, q).expect("nonzero field element is invertible");
        for row in column + 1..n {
            let factor = modulo((values[row][column] as i128 * inverse as i128) as i64, q);
            for col in column + 1..n {
                values[row][col] = modulo(
                    (values[row][col] as i128 - factor as i128 * values[column][col] as i128)
                        as i64,
                    q,
                );
            }
        }
    }
    determinant
}

fn format_poly(coeffs: &[i64], q: Option<i64>) -> String {
    let mut parts = Vec::new();
    for (degree, &coefficient) in coeffs.iter().enumerate() {
        let value = q.map_or(coefficient, |modulus| {
            let reduced = modulo(coefficient, modulus);
            if reduced > modulus / 2 {
                reduced - modulus
            } else {
                reduced
            }
        });
        if value == 0 {
            continue;
        }
        let magnitude = value.abs();
        let body = match degree {
            0 => magnitude.to_string(),
            1 if magnitude == 1 => "x".into(),
            1 => format!("{magnitude}x"),
            _ if magnitude == 1 => format!("x^{degree}"),
            _ => format!("{magnitude}x^{degree}"),
        };
        let sign = if value < 0 {
            "−"
        } else if parts.is_empty() {
            ""
        } else {
            "+"
        };
        parts.push(if sign.is_empty() {
            body
        } else {
            format!("{sign} {body}")
        });
    }
    if parts.is_empty() {
        "0".into()
    } else {
        parts.join(" ")
    }
}

fn ceil_log2(value: usize) -> usize {
    (usize::BITS - (value - 1).leading_zeros()).max(1) as usize
}

fn is_prime(value: i64) -> bool {
    if value < 2 {
        return false;
    }
    if value % 2 == 0 {
        return value == 2;
    }
    let mut divisor = 3_i64;
    while divisor <= value / divisor {
        if value % divisor == 0 {
            return false;
        }
        divisor += 2;
    }
    true
}

struct Mulberry32(u32);

impl Mulberry32 {
    fn new(seed: u32) -> Self {
        Self(seed)
    }

    fn next(&mut self) -> u32 {
        self.0 = self.0.wrapping_add(0x6d2b79f5);
        let mut value = self.0;
        value = (value ^ (value >> 15)).wrapping_mul(value | 1);
        value ^= value.wrapping_add((value ^ (value >> 7)).wrapping_mul(value | 61));
        value ^ (value >> 14)
    }

    fn below(&mut self, bound: i64) -> i64 {
        ((self.next() as f64 / 4_294_967_296.0) * bound as f64).floor() as i64
    }
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);
    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/search", post(search))
        .route("/api/automorphism", post(apply_automorphism))
        .route("/api/lwe", post(generate_lwe))
        .route("/api/norms", post(track_norms))
        .layer(cors);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("bind 0.0.0.0:3001");
    axum::serve(listener, app)
        .await
        .expect("serve QCRL backend");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn health_reports_ok() {
        let Json(response) = health().await;
        assert_eq!(response["status"], "ok");
    }

    #[tokio::test]
    async fn search_returns_ranked_candidate_reports_for_requested_range() {
        let Json(response) = search(Json(SearchRequest {
            q: 17,
            n: 4,
            relation: "negacyclic".into(),
            seed: 7,
            candidates: 1,
            k_min: 2,
            k_max: 5,
        }))
        .await
        .unwrap();
        assert_eq!(response.results.len(), 7);
        assert!(
            response
                .results
                .windows(2)
                .all(|pair| pair[0].rank < pair[1].rank)
        );
        assert!(
            response
                .results
                .iter()
                .any(|result| { result.candidate.id == "sigma-3" && result.candidate.accepted })
        );
        assert!(
            !response
                .results
                .iter()
                .any(|result| result.candidate.id == "sigma-1")
        );
        assert!(
            response
                .results
                .iter()
                .any(|result| result.candidate.id == "sigma-5")
        );
    }

    #[tokio::test]
    async fn search_rejects_an_inverted_exponent_range() {
        let result = search(Json(SearchRequest {
            q: 17,
            n: 4,
            relation: "negacyclic".into(),
            seed: 7,
            candidates: 1,
            k_min: 5,
            k_max: 4,
        }))
        .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn automorphism_returns_coefficients() {
        let Json(response) = apply_automorphism(Json(AutomorphismRequest {
            coeffs: vec![1, 2, 3, 4],
            k: 3,
            q: 17,
            n: 4,
        }))
        .await
        .unwrap();
        assert_eq!(response["result"], json!([1, 4, 14, 2]));
    }

    #[tokio::test]
    async fn lwe_recovers_seeded_small_instance() {
        let Json(response) = generate_lwe(Json(LweRequest {
            n: 2,
            m: 8,
            q: 17,
            seed: 12345,
            error_bound: 1,
            secret_bound: 1,
        }))
        .await
        .unwrap();
        assert!(response.recovery_attempted);
        assert!(response.recovery_succeeded);
        assert!(response.matches_planted_secret);
        assert_eq!(response.candidates_checked, 9);
        assert_eq!(response.search_space, Some(9));
        assert_eq!(response.matrix_a.len(), 8);
        assert_eq!(response.b.len(), 8);
    }

    #[tokio::test]
    async fn norms_match_centered_negacyclic_calculation() {
        let Json(response) = track_norms(Json(NormRequest {
            coeffs: vec![1, -3, 2, 0, -1],
            q: 17,
            n: 4,
            relation: "negacyclic".into(),
        }))
        .await
        .unwrap();
        assert_eq!(response.canonical_coeffs, vec![2, -3, 2, 0]);
        assert_eq!(response.l_inf, 3);
        assert_eq!(response.l2_squared, 17);
        assert_eq!(response.hamming_weight, 3);
        assert_eq!(
            response
                .norm_profile
                .iter()
                .map(|entry| entry.k)
                .collect::<Vec<_>>(),
            vec![1, 3, 5, 7]
        );
    }

    #[test]
    fn seeded_search_is_stable_and_ranked() {
        let payload = SearchRequest {
            q: 17,
            n: 4,
            relation: "negacyclic".into(),
            seed: 7,
            candidates: 1,
            k_min: 0,
            k_max: 3,
        };
        let ring = Ring::new(payload.q, payload.n, true).unwrap();
        let mut specs = Vec::new();
        for k in 0..ring.n {
            specs.push(CandidateSpec {
                id: format!("sigma-{k}"),
                kind: "power-substitution",
                k: Some(k),
                matrix: matrix_from_images(
                    (0..ring.n)
                        .map(|degree| substitute_monomial(degree, k, ring))
                        .collect(),
                ),
                compact_bits: Some(2),
                apply_cost: "4 placements (one per coefficient)".into(),
            });
        }
        let reports: Vec<_> = specs.iter().map(|spec| analyze(spec, ring)).collect();
        assert!(
            reports
                .iter()
                .any(|candidate| candidate.id == "sigma-3" && candidate.accepted)
        );
        assert!(reports.iter().all(|candidate| candidate.additive));
    }

    #[test]
    fn mulberry_matches_frontend_sequence() {
        let mut rng = Mulberry32::new(1);
        assert_eq!(
            (0..4).map(|_| rng.below(17)).collect::<Vec<_>>(),
            vec![10, 0, 8, 16]
        );
    }
}
