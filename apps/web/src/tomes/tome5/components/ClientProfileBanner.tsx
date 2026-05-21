import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { apiFetch } from "../../tome4/apiClient";

/**
 * ClientProfileBanner — bandeau « profil non abouti ».
 *
 * Doctrine : un compte CLIENT créé par le formulaire d'inscription simple
 * (nom / prénom / téléphone / mot de passe) n'a pas encore renseigné les
 * cases projet exigées par la qualification P1 (région, commune, type de
 * projet, surface, budget, délai…). Tant que cette qualification n'est pas
 * soumise pour au moins un dossier, le profil est considéré « non abouti ».
 *
 * Critère : profil abouti ⇔ au moins un dossier du user a un statut
 * différent de DRAFT (donc soumis au moins une fois).
 */
type DossierLite = { id: string; status: string };

export default function ClientProfileBanner() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!auth.isAuthed) { setLoading(false); return; }
    if (auth.role && auth.role !== "CLIENT") { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const resp: any = await apiFetch("/p2/dossier");
        const items: DossierLite[] = resp?.items ?? resp?.dossiers ?? (Array.isArray(resp) ? resp : []);
        const hasSubmitted = items.some(d => d.status && d.status !== "DRAFT");
        if (!cancelled) setProfileComplete(hasSubmitted);
      } catch {
        if (!cancelled) setProfileComplete(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth.isAuthed, auth.role]);

  if (!auth.isAuthed) return null;
  if (auth.role && auth.role !== "CLIENT") return null;
  if (loading) return null;
  if (profileComplete) return null;

  return (
    <div style={S.banner}>
      <div style={S.icon}>!</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.title}>Votre profil client est non abouti</div>
        <div style={S.body}>
          Pour activer votre espace, complétez la qualification de votre projet :
          région, commune, type de projet, surface, budget et délai — les mêmes
          informations que celles exigées par la Porte 1.
        </div>
      </div>
      <button onClick={() => navigate("/p1")} style={S.btn}>
        Compléter mon profil →
      </button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  banner: {
    display: "flex", alignItems: "center", gap: 14,
    background: "#FFF8E1", border: "1px solid #F4C430",
    borderLeft: "4px solid #C9A227",
    padding: "14px 18px", borderRadius: 10,
    margin: "0 0 18px", maxWidth: 1200,
  },
  icon: {
    width: 32, height: 32, borderRadius: "50%",
    background: "#C9A227", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 18, flexShrink: 0,
  },
  title: { fontSize: 14.5, fontWeight: 700, color: "#0B1B3A" },
  body:  { fontSize: 12.5, color: "#5b4a1a", marginTop: 2, lineHeight: 1.45 },
  btn: {
    background: "#0B1B3A", color: "#fff",
    border: 0, padding: "10px 18px", borderRadius: 6,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap", flexShrink: 0,
  },
};
