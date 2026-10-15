/**
 * Espace client (/mon-espace) — « Devis et factures » d'un dossier (spec §8.1–8.3).
 * Consultation des devis émis et des factures avec leur état de règlement,
 * téléchargement PDF / DOCX (générés dans le navigateur), acceptation en ligne
 * horodatée avec choix du pack, valant ordre de service. Paiements par phase :
 * chaque phase démarre après paiement de son échéance. FR / AR, mobile d'abord.
 * Serveur : /api/client/dossiers/<id>/facturation. Documents émis par CITURBAREA / HSE DECO,
 * sans coordonnée de tiers.
 */
import React, { useCallback, useEffect, useState } from "react";
import { formatDH } from "../../domain/honoraires/decimal";
import { mentionEmpreinte, type DocumentDevis } from "../../domain/honoraires/documentDevis";
import { telecharger } from "../../domain/honoraires/rendu/telecharger";

type Devis = {
  id: string; numero: string | null; statut: string; presentation: string; dateEmission: string | null; dateAcceptation: string | null;
  montantTotal: string | null; montantAccepte: string | null; pack: string | null; document: DocumentDevis | null; hash: string | null;
  options: Array<{ code: string; libelle: string; montantHT: string }>; packs: Array<{ code: string; libelle: string; montantHT: string; mention: string | null }>;
};
type Facture = { id: string; numero: string; type: string; statut: string; dateEmission: string; dateEcheance: string; netAPayer: string; paye: string; restant: string; enRetard: boolean; document: DocumentDevis | null; hash: string | null };
type Phase = { phase: string; libelle: string; statut: string; du: string; paye: string; restant: string; estime: boolean; datePaiementComplet: string | null };

const T = {
  fr: {
    titre: "Devis et factures", aucun: "Aucun devis ni facture pour le moment.", devis: "Devis", factures: "Factures", phases: "Paiements par phase",
    emis: "À accepter", accepte: "Accepté", facture: "Facturé", refuse: "Refusé", expire: "Expiré", ht: "HT", ttc: "TTC",
    choisirPack: "Choisissez votre pack (un seul)", options: "Prestations facultatives à commander", engagement: "J'accepte ce devis ; mon acceptation vaut ordre de service.",
    accepter: "Accepter le devis", acceptOk: "Devis accepté. L'échéancier de paiement apparaît ci-dessous.", paye: "Payé", reste: "Reste à payer", echeance: "Échéance",
    regle: "Réglée", aRegler: "À régler", enRetard: "En retard", partielle: "Partiellement réglée", annulee: "Annulée", avoir: "Avoir",
    sPhase: { NON_DUE: "Pas encore due", A_EMETTRE: "Facture à venir", EMISE: "À régler", PARTIELLE: "Partiellement réglée", PAYEE: "Payée", EN_RETARD: "En retard" } as Record<string, string>,
    note: "Chaque phase démarre après le paiement de son échéance, selon les modalités du contrat. Règlement auprès de CITURBAREA (HSE DECO).",
    estime: "montant estimé", le: "le",
  },
  ar: {
    titre: "عروض الأسعار والفواتير", aucun: "لا توجد عروض أسعار ولا فواتير حالياً.", devis: "عروض الأسعار", factures: "الفواتير", phases: "الأداءات حسب المرحلة",
    emis: "في انتظار الموافقة", accepte: "مقبول", facture: "مفوتر", refuse: "مرفوض", expire: "منتهي الصلاحية", ht: "دون احتساب الرسوم", ttc: "مع احتساب الرسوم",
    choisirPack: "اختر العرض (عرض واحد)", options: "خدمات اختيارية للطلب", engagement: "أوافق على عرض السعر هذا، وتعتبر موافقتي أمراً بالخدمة.",
    accepter: "الموافقة على العرض", acceptOk: "تمت الموافقة على العرض. يظهر جدول الأداء أدناه.", paye: "المؤدى", reste: "الباقي", echeance: "تاريخ الاستحقاق",
    regle: "مؤداة", aRegler: "للأداء", enRetard: "متأخرة", partielle: "مؤداة جزئياً", annulee: "ملغاة", avoir: "إشعار دائن",
    sPhase: { NON_DUE: "غير مستحقة بعد", A_EMETTRE: "فاتورة قادمة", EMISE: "للأداء", PARTIELLE: "مؤداة جزئياً", PAYEE: "مؤداة", EN_RETARD: "متأخرة" } as Record<string, string>,
    note: "تبدأ كل مرحلة بعد أداء الدفعة الخاصة بها، وفق شروط العقد. يتم الأداء لدى CITURBAREA (HSE DECO).",
    estime: "مبلغ تقديري", le: "بتاريخ",
  },
};

const date = (s: string | null, ar: boolean) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`).toLocaleDateString(ar ? "ar-MA" : "fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function DevisFactures({ dossierId, langue = "fr" }: { dossierId: string; langue?: "fr" | "ar" }) {
  const t = T[langue], ar = langue === "ar";
  const [v, setV] = useState<{ devis: Devis[]; factures: Facture[]; phases: Phase[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const url = `/api/client/dossiers/${encodeURIComponent(dossierId)}/facturation`;
  const charger = useCallback(async () => {
    const r = await fetch(url, { cache: "no-store", credentials: "same-origin" }).catch(() => null);
    const j = r?.ok ? await r.json() : null;
    setV(j ? { devis: j.devis ?? [], factures: j.factures ?? [], phases: j.phases ?? [] } : { devis: [], factures: [], phases: [] });
  }, [url]);
  useEffect(() => { void charger(); }, [charger]);
  if (!v) return null;
  if (!v.devis.length && !v.factures.length) return <p style={S.doux}>{t.aucun}</p>;

  const statutDevis: Record<string, string> = { EMIS: t.emis, ACCEPTE: t.accepte, FACTURE: t.facture, REFUSE: t.refuse, EXPIRE: t.expire };
  const statutFacture = (f: Facture) => (f.type === "AVOIR" ? t.avoir : f.statut === "REGLEE" ? t.regle : f.statut === "ANNULEE" ? t.annulee : f.enRetard ? t.enRetard : f.statut === "PARTIELLEMENT_REGLEE" ? t.partielle : t.aRegler);
  const Boutons = ({ d, h }: { d: DocumentDevis | null; h: string | null }) => d ? (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button style={S.btnLien} onClick={() => telecharger(d, mentionEmpreinte(h), "pdf")}>PDF</button>
      <button style={S.btnLien} onClick={() => telecharger(d, mentionEmpreinte(h), "docx")}>DOCX</button>
    </span>
  ) : null;

  return (
    <div dir={ar ? "rtl" : "ltr"}>
      {message && <div style={S.ok}>{message}</div>}
      {v.devis.length > 0 && <h3 style={S.h3}>{t.devis}</h3>}
      {v.devis.map((d) => (
        <div key={d.id} style={S.ligne}>
          <div style={S.entete}>
            <strong>{d.numero}</strong>
            <span style={S.badge}>{statutDevis[d.statut] ?? d.statut}</span>
            <span style={{ marginInlineStart: "auto" }}>{d.montantAccepte ? `${formatDH(d.montantAccepte)} ${t.ht}` : d.montantTotal && d.presentation !== "PACKS" ? `${formatDH(d.montantTotal)} ${t.ht}` : ""}</span>
          </div>
          <div style={S.petit}>{date(d.dateEmission, ar)}{d.dateAcceptation ? ` — ${t.accepte} ${t.le} ${date(d.dateAcceptation, ar)}` : ""} <Boutons d={d.document} h={d.hash} /></div>
          {d.statut === "EMIS" && <AccepterEnLigne d={d} t={t} url={url} onFait={async () => { setMessage(t.acceptOk); await charger(); }} />}
        </div>
      ))}

      {v.phases.length > 0 && (
        <>
          <h3 style={S.h3}>{t.phases}</h3>
          <p style={S.petit}>{t.note}</p>
          {v.phases.map((p) => (
            <div key={p.phase} style={S.ligne}>
              <div style={S.entete}>
                <span>{p.libelle}</span>
                <span style={{ ...S.badge, background: p.statut === "PAYEE" ? "#EEF2E8" : p.statut === "EN_RETARD" ? "#FBEAEA" : "#EEF1F7", color: p.statut === "PAYEE" ? "#4B5E3F" : p.statut === "EN_RETARD" ? "#C00000" : "#1F3864" }}>{t.sPhase[p.statut] ?? p.statut}</span>
              </div>
              <div style={S.petit}>{formatDH(p.du)} {t.ttc}{p.estime ? ` (${t.estime})` : ""} · {t.paye} {formatDH(p.paye)} · {t.reste} {formatDH(p.restant)}{p.datePaiementComplet ? ` · ${t.le} ${date(p.datePaiementComplet, ar)}` : ""}</div>
            </div>
          ))}
        </>
      )}

      {v.factures.length > 0 && <h3 style={S.h3}>{t.factures}</h3>}
      {v.factures.map((f) => (
        <div key={f.id} style={S.ligne}>
          <div style={S.entete}>
            <strong>{f.numero}</strong>
            <span style={{ ...S.badge, color: f.enRetard ? "#C00000" : undefined }}>{statutFacture(f)}</span>
            <span style={{ marginInlineStart: "auto" }}>{formatDH(f.netAPayer)} {t.ttc}</span>
          </div>
          <div style={S.petit}>
            {date(f.dateEmission, ar)}{f.type !== "AVOIR" && ` · ${t.echeance} ${date(f.dateEcheance, ar)} · ${t.paye} ${formatDH(f.paye)} · ${t.reste} ${formatDH(f.restant)}`} <Boutons d={f.document} h={f.hash} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AccepterEnLigne({ d, t, url, onFait }: { d: Devis; t: (typeof T)["fr"]; url: string; onFait: () => void }) {
  const [pack, setPack] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [engage, setEngage] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const packs = d.presentation === "PACKS";
  const pret = engage && (!packs || pack);
  const envoyer = async () => {
    setOccupe(true); setErreur(null);
    const r = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "accepter", devisId: d.id, pack: pack || null, commandees: options }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setOccupe(false);
    if (!r?.ok) { setErreur(j.message || "Erreur"); return; }
    onFait();
  };
  return (
    <div style={{ marginTop: 8, padding: 10, background: "#FAF7F2", borderRadius: 8 }}>
      {packs && (
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 8px" }}>
          <legend style={S.petit}>{t.choisirPack}</legend>
          {d.packs.map((p) => (
            <label key={p.code} style={S.choix}>
              <input type="radio" name={`pack-${d.id}`} checked={pack === p.code} onChange={() => setPack(p.code)} />
              <span><strong>{p.libelle}</strong> — {formatDH(p.montantHT)} {t.ht}{p.mention && <span style={{ display: "block", color: "#C00000", fontSize: 13 }}>{p.mention}</span>}</span>
            </label>
          ))}
        </fieldset>
      )}
      {d.options.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 8px" }}>
          <legend style={S.petit}>{t.options}</legend>
          {d.options.map((o) => (
            <label key={o.code} style={S.choix}>
              <input type="checkbox" checked={options.includes(o.code)} onChange={(e) => setOptions((x) => (e.target.checked ? [...x, o.code] : x.filter((c) => c !== o.code)))} />
              <span>{o.libelle} — {formatDH(o.montantHT)} {t.ht}</span>
            </label>
          ))}
        </fieldset>
      )}
      <label style={S.choix}><input type="checkbox" checked={engage} onChange={(e) => setEngage(e.target.checked)} /> <span>{t.engagement}</span></label>
      {erreur && <div style={{ color: "#C00000", fontSize: 14, margin: "6px 0" }}>{erreur}</div>}
      <button style={{ ...S.btn, opacity: pret && !occupe ? 1 : 0.5 }} disabled={!pret || occupe} onClick={() => void envoyer()}>{t.accepter}</button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  h3: { fontSize: 16, color: "#1F3864", margin: "14px 0 6px" },
  doux: { color: "#595959", margin: "0 0 6px", fontSize: 15 },
  petit: { fontSize: 13, color: "#595959", lineHeight: 1.6 },
  ligne: { padding: "10px 0", borderBottom: "1px solid #F0F0F0" },
  entete: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 15 },
  badge: { fontSize: 12, padding: "2px 8px", borderRadius: 10, background: "#EEF1F7", color: "#1F3864" },
  btnLien: { background: "none", border: "none", color: "#1F3864", textDecoration: "underline", cursor: "pointer", fontSize: 14, minHeight: 32, padding: 0 },
  btn: { background: "#1F3864", color: "#fff", border: 0, borderRadius: 8, padding: "10px 16px", fontSize: 15, minHeight: 44, cursor: "pointer" },
  choix: { display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, margin: "6px 0", minHeight: 32 },
  ok: { background: "#EEF2E8", color: "#4B5E3F", padding: 10, borderRadius: 8, margin: "8px 0", fontSize: 14 },
};
