/**
 * Smoke test P0.2 — State Machine Tome-3
 *
 * Usage: npx tsx scripts/smoke-test-p0.2.ts
 *
 * Scenarios:
 *   1. Bootstrap owner (GET /auth/dev/ensure-owner)
 *   2. Login (POST /auth/login)
 *   3. Create dossier (POST /p2/dossier/create)
 *   4. DRAFT → SUBMITTED  → expect 200
 *   5. SUBMITTED → APPROVED (invalid) → expect 422
 *   6. SUBMITTED → IN_REVIEW with CLIENT role → expect 403
 *   7. GET /p3/project/fake-id/history → expect 404
 */

const BASE = "http://localhost:4000";
const OWNER_EMAIL = "owner@citurbarea.local";
const OWNER_PASS = "ChangeMeNow!";

let PASS = 0;
let FAIL = 0;

function result(label: string, ok: boolean, detail?: string) {
  const icon = ok ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon}  ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? PASS++ : FAIL++;
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function run() {
  console.log("\n══════════════════════════════════════════");
  console.log("  Smoke Test P0.2 — State Machine Tome-3");
  console.log("══════════════════════════════════════════\n");

  // ── 1. Bootstrap owner ──────────────────────────────────────────────────────
  const bootstrap = await request("GET", "/auth/dev/ensure-owner");
  result(
    "1. Bootstrap owner",
    bootstrap.status === 200 && bootstrap.data?.ok === true,
    `status=${bootstrap.status}`,
  );
  if (bootstrap.status !== 200) {
    console.log("   API inaccessible ou DB down — arrêt du test.");
    console.log(`   Réponse: ${JSON.stringify(bootstrap.data)}`);
    summary();
    return;
  }

  // ── 2. Login ────────────────────────────────────────────────────────────────
  const login = await request("POST", "/auth/login", {
    email: OWNER_EMAIL,
    password: OWNER_PASS,
  });
  const token: string | undefined = login.data?.access_token;
  result(
    "2. Login OWNER",
    (login.status === 200 || login.status === 201) && !!token,
    `status=${login.status}`,
  );
  if (!token) {
    console.log(`   Pas de token — réponse: ${JSON.stringify(login.data)}`);
    summary();
    return;
  }

  // ── 3. Create dossier ───────────────────────────────────────────────────────
  const create = await request(
    "POST",
    "/p2/dossier/create",
    { title: "Smoke Test P0.2", commune: "Casablanca", payload: {} },
    token,
  );
  const dossierId: string | undefined = create.data?.dossier?.id;
  result(
    "3. Create dossier",
    create.status === 201 && !!dossierId,
    `status=${create.status} id=${dossierId ?? "none"}`,
  );
  if (!dossierId) {
    console.log(`   Pas de dossier — réponse: ${JSON.stringify(create.data)}`);
    summary();
    return;
  }

  // ── 4. DRAFT → SUBMITTED (valid, CLIENT allowed) ─────────────────────────
  const submit = await request(
    "POST",
    `/p3/dossier/${dossierId}/transition`,
    { toStatus: "SUBMITTED" },
    token,
  );
  result(
    "4. Transition DRAFT → SUBMITTED",
    submit.status === 200 && submit.data?.ok === true,
    `status=${submit.status}`,
  );
  if (submit.status !== 200) {
    console.log(`   Réponse: ${JSON.stringify(submit.data)}`);
  }

  // ── 5. SUBMITTED → APPROVED (invalid transition) ─────────────────────────
  const invalid = await request(
    "POST",
    `/p3/dossier/${dossierId}/transition`,
    { toStatus: "APPROVED" },
    token,
  );
  result(
    "5. Transition SUBMITTED → APPROVED (doit être 422)",
    invalid.status === 422,
    `status=${invalid.status} code=${invalid.data?.code ?? invalid.data?.error ?? "?"}`,
  );

  // ── 6. SUBMITTED → IN_REVIEW avec rôle CLIENT (doit être 403) ────────────
  //    Le JWT est OWNER mais actorType dans le controller default = "CLIENT"
  //    SUBMITTED → IN_REVIEW requiert OPS/OPERATOR/ADMIN → 403 attendu
  const forbidden = await request(
    "POST",
    `/p3/dossier/${dossierId}/transition`,
    { toStatus: "IN_REVIEW" },
    token,
  );
  result(
    "6. Transition SUBMITTED → IN_REVIEW, acteur CLIENT (doit être 403)",
    forbidden.status === 403,
    `status=${forbidden.status} code=${forbidden.data?.code ?? forbidden.data?.error ?? "?"}`,
  );

  // ── 7. Historique projet inexistant (doit être 404) ──────────────────────
  const hist = await request("GET", "/p3/project/non-existent-id/history", undefined, token);
  result(
    "7. Historique projet inexistant (doit être 404)",
    hist.status === 404,
    `status=${hist.status}`,
  );

  summary();
}

function summary() {
  console.log(`\n──────────────────────────────────────────`);
  console.log(`  Résultat : ${PASS} PASS  /  ${FAIL} FAIL`);
  console.log(`──────────────────────────────────────────\n`);
  if (FAIL > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Erreur fatale:", err.message ?? err);
  process.exit(1);
});
