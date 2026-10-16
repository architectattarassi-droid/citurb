/**
 * Un seul accès pour le client : depuis /mon-espace, il ouvre l'espace projet (chantier) de son
 * dossier — jalons, PV à signer, photos et fichiers — sans second lien ni second mot de passe.
 * Serveur : GET /api/client/projets, POST /api/client/projets/<id>/ouvrir (functions/_lib/projetsClient.ts).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Projet = { id: string; titre: string; dossierId: string };
const T = {
  fr: { titre: "Espace chantier", texte: "Suivi des travaux : étapes, contrôles et PV à signer, photos et fichiers.", ouvrir: "Ouvrir l'espace chantier", erreur: "Ouverture impossible pour le moment." },
  ar: { titre: "فضاء الورش", texte: "تتبع الأشغال: المراحل، المراقبة والمحاضر للتوقيع، الصور والملفات.", ouvrir: "فتح فضاء الورش", erreur: "تعذر الفتح حالياً." },
};

export default function AccesChantier({ dossierId, langue = "fr" }: { dossierId: string; langue?: "fr" | "ar" }) {
  const t = T[langue];
  const naviguer = useNavigate();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => {
    void fetch("/api/client/projets", { credentials: "same-origin", cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((j) => setProjets((j?.projets ?? []).filter((p: Projet) => p.dossierId === dossierId))).catch(() => undefined);
  }, [dossierId]);
  if (!projets.length) return null;
  const ouvrir = async (id: string) => {
    setOccupe(true); setErreur(null);
    const r = await fetch(`/api/client/projets/${encodeURIComponent(id)}/ouvrir`, { method: "POST", credentials: "same-origin" }).catch(() => null);
    setOccupe(false);
    if (r?.ok) naviguer("/projet"); else setErreur(t.erreur);
  };
  return (
    <section style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 16, margin: "12px 0" }} dir={langue === "ar" ? "rtl" : "ltr"}>
      <h2 style={{ fontSize: 17, margin: "0 0 6px", color: "#1F3864" }}>{t.titre}</h2>
      <p style={{ margin: "0 0 10px", color: "#475467", fontSize: 14 }}>{t.texte}</p>
      {projets.map((p) => (
        <button key={p.id} type="button" disabled={occupe} onClick={() => void ouvrir(p.id)}
          style={{ minHeight: 44, padding: "8px 16px", borderRadius: 8, border: "1px solid #1F3864", background: "#1F3864", color: "#fff", fontWeight: 600, cursor: "pointer", marginInlineEnd: 8 }}>
          {t.ouvrir}{projets.length > 1 ? ` — ${p.titre}` : ""}
        </button>
      ))}
      {erreur && <p style={{ color: "#B42318", fontSize: 13.5 }}>{erreur}</p>}
    </section>
  );
}
