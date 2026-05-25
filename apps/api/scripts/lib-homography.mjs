/**
 * lib-homography.mjs — calcul d'homographie 2D à partir de 4+ points
 *
 * Pour chaque correspondance (x, y) → (x', y') (pixel → WGS84 ou tout autre
 * plan affine 2D), on résout le système linéaire DLT :
 *
 *   [ x  y  1  0  0  0  -x*x'  -y*x' ]   [ h00 ]     [ x' ]
 *   [ 0  0  0  x  y  1  -x*y'  -y*y' ] * [ h01 ]  =  [ y' ]
 *                                          …             …
 *
 * Avec 4 points → 8 équations / 8 inconnues (h22=1 fixé). Solveur Gauss avec
 * partial pivoting. 6+ points = moindres carrés via équation normale A^T A x = A^T b.
 *
 * Pas de dépendance externe (Node.js pur). Réutilisable pour tous les PoCs
 * de vectorisation PDF DGI.
 */

/** Résout un système n×n A x = b par élimination de Gauss avec pivot partiel.  */
export function solveLinearSystem(A, b) {
  const n = A.length;
  // Matrice augmentée
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i;
    let maxAbs = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxAbs) {
        maxAbs = Math.abs(M[k][i]);
        maxRow = k;
      }
    }
    if (maxAbs < 1e-12) throw new Error(`Système singulier à la ligne ${i}`);
    if (maxRow !== i) [M[i], M[maxRow]] = [M[maxRow], M[i]];
    // Élimination
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
    }
  }
  // Back-substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
    x[i] = sum / M[i][i];
  }
  return x;
}

/**
 * Calcule l'homographie 3×3 (8 DOF, h22=1) depuis 4+ paires de points.
 * @param {Array<[number,number]>} src  Points source (pixel par ex.)
 * @param {Array<[number,number]>} dst  Points destination (WGS84 lng/lat par ex.)
 * @returns {number[][]} matrice 3×3 (lignes [h00..h02], [h10..h12], [h20,h21,1])
 */
export function computeHomography(src, dst) {
  if (src.length !== dst.length) throw new Error("src.length doit égaler dst.length");
  if (src.length < 4) throw new Error("Minimum 4 correspondances requises");

  const n = src.length;
  // Système 2n × 8
  const A = [];
  const b = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = src[i];
    const [xp, yp] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * xp, -y * xp]);
    b.push(xp);
    A.push([0, 0, 0, x, y, 1, -x * yp, -y * yp]);
    b.push(yp);
  }

  let h;
  if (n === 4) {
    // Système exactement déterminé 8×8
    h = solveLinearSystem(A, b);
  } else {
    // Moindres carrés via équation normale : (A^T A) h = A^T b
    const AT = transpose(A);
    const ATA = matMul(AT, A);
    const ATb = matVecMul(AT, b);
    h = solveLinearSystem(ATA, ATb);
  }
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
}

/** Applique une homographie à un point (x, y) → (x', y') */
export function applyHomography(H, x, y) {
  const denom = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(denom) < 1e-12) return [NaN, NaN];
  return [
    (H[0][0] * x + H[0][1] * y + H[0][2]) / denom,
    (H[1][0] * x + H[1][1] * y + H[1][2]) / denom,
  ];
}

/** Calcule l'erreur de reprojection RMS sur les points GCPs */
export function reprojectionError(H, src, dst) {
  let sumSq = 0;
  for (let i = 0; i < src.length; i++) {
    const [px, py] = applyHomography(H, src[i][0], src[i][1]);
    const dx = px - dst[i][0], dy = py - dst[i][1];
    sumSq += dx * dx + dy * dy;
  }
  return Math.sqrt(sumSq / src.length);
}

function transpose(M) {
  const r = M.length, c = M[0].length;
  const T = Array.from({ length: c }, () => new Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = M[i][j];
  return T;
}
function matMul(A, B) {
  const r = A.length, c = B[0].length, k = B.length;
  const C = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    let s = 0; for (let m = 0; m < k; m++) s += A[i][m] * B[m][j];
    C[i][j] = s;
  }
  return C;
}
function matVecMul(A, v) {
  return A.map(row => row.reduce((s, a, i) => s + a * v[i], 0));
}
