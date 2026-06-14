import React, { useEffect, useState } from "react";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000";

type Incident = {
  id: string;
  code: string;
  severity: string;
  createdAt: string;
};

type Dossier = {
  id: string;
  title: string;
  status: string;
  commune: string | null;
  projectType: string | null;
  facades: number | null;
  createdAt: string;
};

export default function OpsApp() {
  const [email, setEmail] = useState("owner@citurbarea.local");
  // Dev default password matches API bootstrap default (see /auth/dev/ensure-owner)
  const [password, setPassword] = useState("ChangeMeNow!");
  const [token, setToken] = useState<string | null>(localStorage.getItem("ops_token"));
  const [role, setRole] = useState<string | null>(localStorage.getItem("ops_role"));
  const [meEmail, setMeEmail] = useState<string | null>(localStorage.getItem("ops_email"));

  const [view, setView] = useState<"dossiers" | "incidents">("dossiers");

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [dossierDetail, setDossierDetail] = useState<any | null>(null);

  const [newTitle, setNewTitle] = useState("Mon dossier");
  const [newCommune, setNewCommune] = useState("Kénitra");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchIncidents(t?: string) {
    const auth = t ?? token;
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ops/incidents`, {
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDossiers(t?: string) {
    const auth = t ?? token;
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/p2/dossier`, {
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDossiers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dossiers");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDossierDetail(id: string, t?: string) {
    const auth = t ?? token;
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/p2/dossier/${id}`, {
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDossierDetail(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dossier detail");
    } finally {
      setLoading(false);
    }
  }

  async function createDossier() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/p2/dossier/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle?.trim() || "Mon dossier",
          commune: newCommune?.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      await fetchDossiers(token);
      if (created?.id) {
        setSelectedDossierId(created.id);
        await fetchDossierDetail(created.id, token);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to create dossier");
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setToken(data.accessToken);
      setRole(data.role);
      setMeEmail(data.email);
      localStorage.setItem("ops_token", data.accessToken);
      localStorage.setItem("ops_role", data.role);
      localStorage.setItem("ops_email", data.email);
      await Promise.all([fetchIncidents(data.accessToken), fetchDossiers(data.accessToken)]);
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setRole(null);
    setMeEmail(null);
    setIncidents([]);
    setDossiers([]);
    setSelectedDossierId(null);
    setDossierDetail(null);
    localStorage.removeItem("ops_token");
    localStorage.removeItem("ops_role");
    localStorage.removeItem("ops_email");
  }

  useEffect(() => {
    if (token) {
      fetchDossiers();
      fetchIncidents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!token) {
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
        <h1 style={{ textAlign: "center" }}>CITURBAREA OPS</h1>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Login (OWNER / ADMIN / OPS)</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <button
            onClick={login}
            disabled={loading}
            style={{ width: "100%", padding: 10, fontWeight: 700 }}
          >
            {loading ? "Loading…" : "Login"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Dev bootstrap (à faire une seule fois) :
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <a href="http://localhost:4000/auth/dev/ensure-owner" target="_blank" rel="noreferrer">
                http://localhost:4000/auth/dev/ensure-owner
              </a>
              <button
                onClick={() => navigator.clipboard.writeText("http://localhost:4000/auth/dev/ensure-owner")}
              >
                Copy
              </button>
            </div>

            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
              <a
                href="http://localhost:4000/auth/dev/reset-owner-password"
                target="_blank"
                rel="noreferrer"
              >
                http://localhost:4000/auth/dev/reset-owner-password
              </a>
              <span style={{ opacity: 0.8 }}>(reset mot de passe DEV)</span>
            </div>

            <div style={{ marginTop: 6, opacity: 0.9 }}>
              DEV credentials: <b>owner@citurbarea.local</b> / <b>ChangeMeNow!</b>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 10, border: "1px solid #d00", color: "#d00" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>CITURBAREA OPS</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>
            {meEmail} ({role})
          </span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #d00", color: "#d00" }}>{error}</div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setView("dossiers")} disabled={view === "dossiers"}>
          Dossiers
        </button>
        <button onClick={() => setView("incidents")} disabled={view === "incidents"}>
          Incidents
        </button>
        <span style={{ marginLeft: 10, opacity: 0.7 }}>{loading ? "Loading…" : ""}</span>
      </div>

      {view === "dossiers" && (
        <>
          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => fetchDossiers()}>Refresh</button>
            <span style={{ opacity: 0.8 }}>Créer :</span>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titre"
              style={{ minWidth: 240, padding: 8 }}
            />
            <input
              value={newCommune}
              onChange={(e) => setNewCommune(e.target.value)}
              placeholder="Commune"
              style={{ minWidth: 180, padding: 8 }}
            />
            <button onClick={createDossier} disabled={loading}>
              Create dossier
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Title</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Status</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => {
                        setSelectedDossierId(d.id);
                        setDossierDetail(null);
                        fetchDossierDetail(d.id);
                      }}
                      style={{ cursor: "pointer", background: selectedDossierId === d.id ? "#f7f7f7" : undefined }}
                    >
                      <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                        {d.title}
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{d.commune ?? ""}</div>
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{d.status}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{d.createdAt}</td>
                    </tr>
                  ))}
                  {!loading && dossiers.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, opacity: 0.7 }}>
                        No dossiers yet. Create one above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Dossier details</div>
                {!selectedDossierId && <div style={{ opacity: 0.7 }}>Select a dossier.</div>}
                {selectedDossierId && !dossierDetail && !loading && (
                  <div style={{ opacity: 0.7 }}>No details loaded.</div>
                )}
                {dossierDetail && (
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12 }}>
                    {JSON.stringify(dossierDetail, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {view === "incidents" && (
        <>
          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => fetchIncidents()}>Refresh</button>
          </div>
          <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>id</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>code</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>severity</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>createdAt</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{i.id}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{i.code}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{i.severity}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{i.createdAt}</td>
                </tr>
              ))}

              {!loading && incidents.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 12, opacity: 0.7 }}>
                    No incidents.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
