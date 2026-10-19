/// QCRL mathematical research engine.
/// Experimental mathematics — not production cryptography.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Ring {
    pub q: i64,
    pub n: usize,
    pub negacyclic: bool,
}

impl Ring {
    pub fn new(q: i64, n: usize, negacyclic: bool) -> Result<Self, String> {
        if !(2..=4096).contains(&q) {
            return Err("q must be between 2 and 4096".into());
        }
        if !(1..=12).contains(&n) {
            return Err("n must be between 1 and 12".into());
        }
        Ok(Self { q, n, negacyclic })
    }
}

pub fn modulo(a: i64, q: i64) -> i64 {
    assert!(q > 0, "modulus must be positive");
    a.rem_euclid(q)
}

pub fn gcd(mut a: i64, mut b: i64) -> i64 {
    while b != 0 {
        let r = a % b;
        a = b;
        b = r;
    }
    a.abs()
}

pub fn mod_inverse(a: i64, q: i64) -> Option<i64> {
    if q <= 1 {
        return None;
    }

    let (mut old_r, mut r) = (q, modulo(a, q));
    let (mut old_t, mut t) = (0_i64, 1_i64);

    while r != 0 {
        let quotient = old_r / r;
        (old_r, r) = (r, old_r - quotient * r);
        (old_t, t) = (t, old_t - quotient * t);
    }

    if old_r != 1 {
        None
    } else {
        Some(modulo(old_t, q))
    }
}

pub fn ring_mul(a: &[i64], b: &[i64], ring: Ring) -> Vec<i64> {
    assert!(ring.q >= 2 && ring.n >= 1);
    assert!(a.len() <= ring.n && b.len() <= ring.n);

    let mut result = vec![0_i64; ring.n];
    let q = ring.q as i128;

    for (i, &ai) in a.iter().enumerate() {
        for (j, &bj) in b.iter().enumerate() {
            let degree = i + j;
            let index = degree % ring.n;

            let wraps = degree / ring.n;
            let sign: i128 =
                if ring.negacyclic && wraps % 2 == 1 { -1 } else { 1 };

            let term = sign * (ai as i128) * (bj as i128);
            let updated = result[index] as i128 + term;
            result[index] = updated.rem_euclid(q) as i64;
        }
    }

    result
}

/// Apply the automorphism x -> x^k in Z_q[x]/(x^n + 1).
///
/// Valid only when gcd(k, 2n) == 1; otherwise the map is not a ring
/// automorphism (it collapses or fails to be bijective).
pub fn automorphism(a: &[i64], k: u64, ring: Ring) -> Result<Vec<i64>, String> {
    assert!(a.len() <= ring.n, "coefficient vector too long");

    if gcd(k as i64, (2 * ring.n) as i64) != 1 {
        return Err(format!(
            "x -> x^{} is not an automorphism of Z_{}[x]/(x^{}+1): \
             gcd({}, {}) != 1",
            k,
            ring.q,
            ring.n,
            k,
            2 * ring.n
        ));
    }

    let n = ring.n;
    let q = ring.q as i128;
    let mut out = vec![0_i64; n];

    for (d, &coeff) in a.iter().enumerate() {
        // x^d  ->  x^(d*k mod 2n), reduced using x^n = -1.
        let e = (d as u64 * k) % (2 * n as u64);
        let (index, sign): (usize, i128) = if (e as usize) < n {
            (e as usize, 1)
        } else {
            ((e as usize) - n, -1)
        };
        out[index] =
            ((out[index] as i128 + sign * coeff as i128).rem_euclid(q)) as i64;
    }

    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn negative_modular_reduction() {
        assert_eq!(modulo(-1, 17), 16);
    }

    #[test]
    fn modular_inverse() {
        assert_eq!(mod_inverse(3, 17), Some(6));
        assert_eq!(mod_inverse(8, 12), None);
    }

    #[test]
    fn greatest_common_divisor() {
        assert_eq!(gcd(8, 12), 4);
    }

    #[test]
    fn negacyclic_product() {
        let ring = Ring::new(5, 4, true).unwrap();

        let a = [1, 2, 0, 4];
        let b = [3, 0, 1, 1];

        assert_eq!(ring_mul(&a, &b, ring), vec![1, 2, 2, 0]);
    }

    #[test]
    fn cyclic_identity() {
        let ring = Ring::new(17, 4, false).unwrap();

        let a = [1, 2, 3, 4];
        let identity = [1, 0, 0, 0];

        assert_eq!(ring_mul(&a, &identity, ring), a);
    }

    #[test]
    fn sigma3_is_automorphism() {
        let ring = Ring::new(17, 4, true).unwrap();

        // x -> x^3 permutes monomials as:
        //   1 -> 1,  x -> x^3,  x^2 -> -x^2,  x^3 -> x
        let a = [1, 2, 3, 4];
        // expected: [a0, a3, -a2, a1] = [1, 4, -3, 2] = [1, 4, 14, 2] mod 17
        assert_eq!(automorphism(&a, 3, ring).unwrap(), vec![1, 4, 14, 2]);
    }

    #[test]
    fn sigma3_is_a_ring_homomorphism() {
        let ring = Ring::new(17, 4, true).unwrap();
        let a = [1, 2, 3, 4];
        let b = [5, 0, 2, 7];

        let lhs = automorphism(&ring_mul(&a, &b, ring), 3, ring).unwrap();
        let rhs = ring_mul(
            &automorphism(&a, 3, ring).unwrap(),
            &automorphism(&b, 3, ring).unwrap(),
            ring,
        );
        assert_eq!(lhs, rhs, "σ3 must commute with multiplication");
    }

    #[test]
    fn sigma3_squares_to_identity() {
        let ring = Ring::new(17, 4, true).unwrap();
        let a = [1, 2, 3, 4];
        let once = automorphism(&a, 3, ring).unwrap();
        let twice = automorphism(&once, 3, ring).unwrap();
        assert_eq!(twice, a, "σ3 ∘ σ3 = id since 3^2 = 9 ≡ 1 mod 8");
    }

    #[test]
    fn invalid_automorphism_rejected() {
        let ring = Ring::new(17, 4, true).unwrap();
        let a = [1, 2, 3, 4];
        // x -> x^2 is NOT an automorphism mod x^4 + 1.
        assert!(automorphism(&a, 2, ring).is_err());
    }
}
