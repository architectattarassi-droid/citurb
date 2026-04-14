import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import P1Dashboard from "./P1Dashboard";
import RokhasPhaseTimeline from "../../../../tomes/tome2/RokhasPhaseTimeline";
import { loadDossier, deleteDossier, updateDossierApiStatus } from "./dossier.store";
import { useAuth } from "../../../tome5/AuthProvider";
import { apiFetch } from "../../../tome4/apiClient";

/**
 * P1Dossier
 * - Affiche la landing "dossier" post-pack.
 * - Storage-first : charge le dossier local (append-only).
 * - S3 : enrichit avec les données API si dossierId disponible.
 * - Si aucun dossier : retourne vers /p1 (tunnel).
 */
export default function P1Dossier() {
  const auth = useAuth();
  const userId = auth.userId || "anon";
  const dossier = useMemo(() => loadDossier(userId), [userId]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [apiPack, setApiPack] = useState<{ packSelected?: string; packPriceMAD?: any } | null>(null);
  const [opsNote, setOpsNote] = useState<string | null>(null);

  // S3: dossierId — depuis localStorage (stocké par P1Packs après /p2/dossier/create)
  const dossierId = searchParams.get("dossier")
    || (auth.userId ? localStorage.getItem(`citurbarea:p1:dossierId:${auth.userId}:v1`) : null);

  useEffect(() => {
    if (!dossierId || !auth.isAuthed) return;
    apiFetch(`/p2/dossier/${dossierId}`)
      .then((resp: any) => {
        const d = resp?.dossier ?? resp;
        if (d?.status) setApiStatus(d.status);
        if (d?.id && d?.status) updateDossierApiStatus(userId, d.id, d.status);
        if (d?.opsNote) setOpsNote(d.opsNote);
        if (d?.packSelected) setApiPack({ packSelected: d.packSelected, packPriceMAD: d.packPriceMAD });
      })
      .catch(() => { /* silencieux */ });
  }, [dossierId, auth.isAuthed]);

  const handleReset = useCallback(() => {
    deleteDossier(userId);
    navigate("/p1", { replace: true });
  }, [userId, navigate]);

  if (!dossier) return <Navigate to="/p1" replace />;

  return (
    <>
      {(apiStatus || apiPack) && (
        <div style={{ padding: "6px 20px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd", display: "flex", gap: 16, fontSize: 12, color: "#0369a1" }}>
          {apiStatus && <span><b>Statut DB :</b> {apiStatus}</span>}
          {apiPack?.packSelected && <span><b>Pack :</b> {apiPack.packSelected}{apiPack.packPriceMAD ? ` — ${apiPack.packPriceMAD.toLocaleString("fr-FR")} MAD` : ""}</span>}
        </div>
      )}
      {(apiStatus === 'NEEDS_CHANGES' || apiStatus === 'REJECTED') && opsNote && (
        <div style={{ margin: "12px 20px", padding: '10px 14px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, fontSize: 13, color: '#854d0e' }}>
          <strong>Message de votre architecte :</strong><br />
          {opsNote}
        </div>
      )}
      {dossierId && <RokhasPhaseTimeline dossierId={dossierId} mode="client" />}
      <P1Dashboard dossier={dossier} onReset={handleReset} dossierId={dossierId ?? undefined} />
    </>
  );
}
