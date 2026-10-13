/**
 * /projet/:jeton puis /projet — espace projet d'un membre invité (noindex).
 * Le jeton du lien est échangé contre un cookie de session signé (HttpOnly),
 * puis retiré de l'adresse (history.replaceState) : il ne reste ni dans
 * l'historique ni dans un référent.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_MEMBRE, echangerJeton, moi, sortir, type Membre } from "./api";
import { erreur, role } from "./libelles";
import VueProjet from "./VueProjet";

function useMetaPrivee() {
  useEffect(() => {
    const ajouts = [["robots", "noindex, nofollow"], ["referrer", "no-referrer"]].map(([n, c]) => {
      const m = document.createElement("meta");
      m.name = n; m.content = c;
      document.head.appendChild(m);
      return m;
    });
    document.title = "Espace projet | CITURBAREA";
    return () => ajouts.forEach((m) => m.remove());
  }, []);
}

export default function EspaceProjet() {
  useMetaPrivee();
  const { jeton } = useParams();
  const naviguer = useNavigate();
  const [etat, setEtat] = useState<{ membre: Membre; projet: { id: string; titre: string } } | null>(null);
  const [err, setErr] = useState("");
  const fait = useRef(false);

  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    void (async () => {
      if (jeton) {
        const r = await echangerJeton(jeton);
        // Le jeton quitte l'adresse dans tous les cas.
        naviguer("/projet", { replace: true });
        if (!r.ok) { setErr(r.error); return; }
      }
      const m = await moi();
      if (m.ok) setEtat(m.data); else setErr(m.error === "non_connecte" ? "sans_session" : m.error);
    })();
  }, [jeton, naviguer]);

  if (err) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold text-[#0B1B3A]">Espace projet</h1>
        <p className="mt-2 text-slate-700">{err === "sans_session" ? "Ouvrez le lien d'accès personnel que l'architecte vous a envoyé (WhatsApp ou e-mail)." : erreur(err)}</p>
      </main>
    );
  }
  if (!etat) return <main className="mx-auto max-w-xl px-4 py-12 text-slate-500" aria-busy="true">Ouverture de votre espace projet…</main>;

  const quitter = async () => { await sortir(); setEtat(null); setErr("sans_session"); };
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <VueProjet base={BASE_MEMBRE} projetId={etat.projet.id} entete={
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>CITURBAREA · espace projet privé · {etat.membre.nom} ({role(etat.membre.role)})</span>
          <button type="button" onClick={() => void quitter()} className="min-h-[44px] px-2 font-semibold text-slate-700">Se déconnecter</button>
        </div>
      } />
    </main>
  );
}
