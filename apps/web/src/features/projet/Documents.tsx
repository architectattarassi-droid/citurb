/**
 * Documents et PV types d'un jalon : formulaire généré depuis le ModeleDocument
 * (sections, champs, tableaux, cases, choix, photos), signatures horodatées par
 * membre connecté, impression A4 (en-tête projet + jalon + date ; l'espace
 * projet est privé, l'impression y est voulue : aucun filigrane).
 */
import { useEffect, useState } from "react";
import type { ChampModele, ModeleDocument } from "../../domain/referentiel/types";
import { creerDocument, enregistrerDocument, signerDocument, urlFichier, type DetailJalon, type DocumentRempli } from "./api";
import { dateHeure, dateLongue, erreur, role } from "./libelles";

const BTN = "inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-50";

/** Impression : seule la zone .zone-impression est imprimée, en A4. */
const STYLE_IMPRESSION = `
@media print {
  @page { size: A4; margin: 14mm 12mm; }
  body.impression-projet * { visibility: hidden !important; }
  body.impression-projet .zone-impression, body.impression-projet .zone-impression * { visibility: visible !important; }
  body.impression-projet .zone-impression { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; border: 0 !important; box-shadow: none !important; font-size: 11pt; color: #000; }
  body.impression-projet .pas-imprime { display: none !important; }
  body.impression-projet .zone-impression table { border-collapse: collapse; width: 100%; }
  body.impression-projet .zone-impression th, body.impression-projet .zone-impression td { border: 1px solid #555; padding: 3px 5px; }
  body.impression-projet .zone-impression section { break-inside: avoid; }
}`;

function imprimer() {
  document.body.classList.add("impression-projet");
  const fin = () => { document.body.classList.remove("impression-projet"); window.removeEventListener("afterprint", fin); };
  window.addEventListener("afterprint", fin);
  window.print();
  window.setTimeout(fin, 1000);
}

export default function Documents({ base, projetId, d, projetTitre, onMaj }: { base: string; projetId: string; d: DetailJalon; projetTitre: string; onMaj: () => Promise<void> }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [e, setE] = useState("");
  if (!d.modeles.length) return <p className="text-slate-500">Aucun document type prévu pour ce jalon dans le référentiel.</p>;

  const nouveau = async (m: ModeleDocument) => {
    const r = await creerDocument(base, projetId, d.jalon.code, m.id);
    if (!r.ok) { setE(erreur(r.error)); return; }
    setE("");
    await onMaj();
    setOuvert(r.data.document.id);
  };

  const doc = ouvert ? d.documents.find((x) => x.id === ouvert) : null;
  if (doc) {
    const m = d.modeles.find((x) => x.id === doc.modeleId);
    if (m) return <Formulaire base={base} projetId={projetId} d={d} m={m} doc={doc} projetTitre={projetTitre} onFermer={() => setOuvert(null)} onMaj={onMaj} />;
  }

  return (
    <div className="grid gap-3">
      <style>{STYLE_IMPRESSION}</style>
      {d.modeles.map((m) => {
        const remplis = d.documents.filter((x) => x.modeleId === m.id);
        return (
          <article key={m.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="m-0 text-base font-semibold text-[#0B1B3A]">{m.titre}</h3>
            <p className="m-0 mt-1 text-sm text-slate-600">{m.objet}</p>
            <p className="m-0 mt-1 text-xs text-slate-500">Signataires : {m.signataires.map(role).join(", ")}</p>
            <ul className="m-0 mt-2 grid list-none gap-1 p-0">
              {remplis.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setOuvert(x.id)} className="flex min-h-[44px] w-full items-center justify-between rounded-lg bg-slate-50 px-3 text-left text-sm">
                    <span>{x.statut === "SIGNE" ? "Signé" : "Brouillon"} · {dateHeure(x.createdAt)}{x.auteurNom ? ` · ${x.auteurNom}` : ""}</span>
                    <span className="text-xs text-slate-500">{x.signatures.length} signature(s)</span>
                  </button>
                </li>
              ))}
            </ul>
            {d.droits.rediger && <button type="button" onClick={() => void nouveau(m)} className={`${BTN} mt-2 bg-[#0B1B3A] text-white`}>Remplir un nouveau document</button>}
          </article>
        );
      })}
      {e && <p role="alert" className="text-sm text-red-700">{e}</p>}
    </div>
  );
}

function Formulaire({ base, projetId, d, m, doc, projetTitre, onFermer, onMaj }: {
  base: string; projetId: string; d: DetailJalon; m: ModeleDocument; doc: DocumentRempli; projetTitre: string; onFermer: () => void; onMaj: () => Promise<void>;
}) {
  const [valeurs, setValeurs] = useState<Record<string, unknown>>(doc.valeurs);
  const [etat, setEtat] = useState<"" | "modifie" | "ok">("");
  const [e, setE] = useState("");
  useEffect(() => { setValeurs(doc.valeurs); }, [doc.id, doc.valeurs]);
  const editable = d.droits.rediger && doc.signatures.length === 0;
  const peutSigner = d.droits.signerModeles.includes(m.id);
  const fixer = (id: string, v: unknown) => { setValeurs((x) => ({ ...x, [id]: v })); setEtat("modifie"); };

  const enregistrer = async () => {
    const r = await enregistrerDocument(base, projetId, doc.id, valeurs);
    if (!r.ok) { setE(erreur(r.error)); return; }
    setE(""); setEtat("ok");
    await onMaj();
  };
  const signer = async () => {
    if (etat === "modifie") await enregistrer();
    const r = await signerDocument(base, projetId, doc.id);
    setE(r.ok ? "" : erreur(r.error));
    await onMaj();
  };

  return (
    <div>
      <style>{STYLE_IMPRESSION}</style>
      <div className="pas-imprime mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={onFermer} className={`${BTN} border border-slate-300 bg-white text-slate-800`}>← Documents</button>
        {editable && <button type="button" onClick={() => void enregistrer()} disabled={etat !== "modifie"} className={`${BTN} bg-[#0B1B3A] text-white`}>{etat === "ok" ? "Enregistré" : "Enregistrer"}</button>}
        {peutSigner && <button type="button" onClick={() => void signer()} className={`${BTN} bg-emerald-600 text-white`}>Signer</button>}
        <button type="button" onClick={imprimer} className={`${BTN} border border-slate-300 bg-white text-slate-800`}>Imprimer / PDF</button>
      </div>
      {e && <p role="alert" className="pas-imprime mb-2 text-sm text-red-700">{e}</p>}

      <div className="zone-impression rounded-xl border border-slate-200 bg-white p-4">
        <header className="mb-3 border-b border-slate-300 pb-2">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">CITURBAREA · {projetTitre}</p>
          <h2 className="m-0 mt-1 text-lg font-bold text-[#0B1B3A]">{m.titre}</h2>
          <p className="m-0 text-sm text-slate-700">Jalon : {d.jalon.titre} ({d.jalon.code})</p>
          <p className="m-0 text-xs text-slate-500">Document du {dateLongue(doc.createdAt)} · {doc.statut === "SIGNE" ? "signé" : "brouillon"} · réf. {doc.id}</p>
        </header>
        {m.sections.map((s) => (
          <section key={s.titre} className="mb-4">
            <h3 className="m-0 mb-2 text-base font-semibold text-[#0B1B3A]">{s.titre}</h3>
            <div className="grid gap-3">
              {s.champs.filter((c) => c.type !== "signature").map((c) => (
                <Champ key={c.id} c={c} v={valeurs[c.id]} editable={editable} onChange={(v) => fixer(c.id, v)} base={base} projetId={projetId} d={d} />
              ))}
            </div>
          </section>
        ))}
        <section className="mt-4">
          <h3 className="m-0 mb-2 text-base font-semibold text-[#0B1B3A]">Signatures</h3>
          <div className="grid grid-cols-2 gap-2">
            {m.signataires.map((r) => {
              const s = doc.signatures.filter((x) => x.role === r);
              return (
                <div key={r} className="min-h-[72px] rounded-lg border border-slate-300 p-2 text-sm">
                  <strong>{role(r)}</strong>
                  {s.length ? s.map((x) => <span key={`${x.membreId}-${x.le}`} className="block">{x.nom} — signé le {dateHeure(x.le)}</span>) : <span className="block text-slate-400">Non signé</span>}
                </div>
              );
            })}
            {doc.signatures.filter((x) => !m.signataires.includes(x.role)).map((x) => (
              <div key={`${x.membreId}-${x.le}`} className="min-h-[72px] rounded-lg border border-slate-300 p-2 text-sm"><strong>{role(x.role)}</strong><span className="block">{x.nom} — signé le {dateHeure(x.le)}</span></div>
            ))}
          </div>
        </section>
        {m.mentions?.length ? <footer className="mt-3 text-xs text-slate-600">{m.mentions.map((x) => <p key={x} className="m-0">{x}</p>)}</footer> : null}
      </div>
    </div>
  );
}

const INPUT = "w-full rounded-lg border border-slate-300 p-2 text-base disabled:bg-slate-50 disabled:text-slate-800";

function Champ({ c, v, editable, onChange, base, projetId, d }: { c: ChampModele; v: unknown; editable: boolean; onChange: (v: unknown) => void; base: string; projetId: string; d: DetailJalon }) {
  const lib = <span className="mb-1 block text-sm font-medium text-slate-800">{c.libelle}{c.obligatoire ? " *" : ""}</span>;
  const aide = c.aide ? <span className="pas-imprime mt-1 block text-xs text-slate-500">{c.aide}</span> : null;
  switch (c.type) {
    case "texte": return <label className="block">{lib}<input className={INPUT} disabled={!editable} value={String(v ?? "")} maxLength={500} onChange={(e) => onChange(e.target.value)} />{aide}</label>;
    case "texte_long": return <label className="block">{lib}<textarea className={INPUT} disabled={!editable} rows={4} value={String(v ?? "")} maxLength={5000} onChange={(e) => onChange(e.target.value)} />{aide}</label>;
    case "nombre": return <label className="block">{lib}<input className={INPUT} disabled={!editable} inputMode="decimal" value={v == null ? "" : String(v)} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} />{aide}</label>;
    case "date": return <label className="block">{lib}<input type="date" className={INPUT} disabled={!editable} value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} />{aide}</label>;
    case "case": return (
      <label className="flex min-h-[44px] items-center gap-3">
        <input type="checkbox" className="h-6 w-6" disabled={!editable} checked={v === true} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm text-slate-800">{c.libelle}</span>
      </label>
    );
    case "choix": return (
      <fieldset className="m-0 border-0 p-0">{lib}
        <div className="flex flex-wrap gap-2">
          {(c.options ?? []).map((o) => (
            <label key={o} className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-sm ${v === o ? "border-[#0B1B3A] bg-slate-100 font-semibold" : "border-slate-300"}`}>
              <input type="radio" name={c.id} disabled={!editable} checked={v === o} onChange={() => onChange(o)} />{o}
            </label>
          ))}
        </div>{aide}
      </fieldset>
    );
    case "tableau": {
      const cols = c.colonnes?.length ? c.colonnes : ["Valeur"];
      const lignes = Array.isArray(v) ? (v as string[][]) : [];
      const aff = editable ? [...lignes, cols.map(() => "")] : lignes;
      const maj = (i: number, k: number, x: string) => {
        const n = aff.map((l) => [...l]);
        n[i][k] = x;
        onChange(n.filter((l) => l.some(Boolean)));
      };
      return (
        <div>{lib}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead><tr>{cols.map((h) => <th key={h} className="border border-slate-300 bg-slate-50 p-1 text-left">{h}</th>)}</tr></thead>
              <tbody>
                {aff.map((l, i) => (
                  <tr key={i}>{cols.map((_, k) => (
                    <td key={k} className="border border-slate-300 p-0">
                      {editable ? <input className="min-h-[40px] w-full border-0 p-1 text-base" value={l[k] ?? ""} maxLength={500} onChange={(e) => maj(i, k, e.target.value)} aria-label={`${cols[k]} ligne ${i + 1}`} /> : <span className="block p-1">{l[k]}</span>}
                    </td>
                  ))}</tr>
                ))}
                {!aff.length && <tr><td colSpan={cols.length} className="border border-slate-300 p-1 text-slate-400">—</td></tr>}
              </tbody>
            </table>
          </div>{aide}
        </div>
      );
    }
    case "photo": {
      const ids = Array.isArray(v) ? (v as string[]) : [];
      const photos = d.fichiers.filter((f) => f.type.startsWith("image/"));
      return (
        <div>{lib}
          <div className="grid grid-cols-4 gap-1">
            {(editable ? photos : photos.filter((f) => ids.includes(f.id))).map((f) => (
              <button key={f.id} type="button" disabled={!editable} onClick={() => onChange(ids.includes(f.id) ? ids.filter((x) => x !== f.id) : [...ids, f.id])}
                className={`aspect-square overflow-hidden rounded border-4 ${ids.includes(f.id) ? "border-emerald-500" : "border-transparent"}`}>
                <img src={urlFichier(base, projetId, f.id)} alt={f.nom} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {editable && !photos.length && <span className="block text-xs text-slate-500">Déposez d'abord des photos dans l'onglet « Photos » du jalon.</span>}
          {aide}
        </div>
      );
    }
    default: return null;
  }
}
