/**
 * ChiffrageGadget — estimation lot par lot (villa, maison, immeuble, mixte).
 * Formulaire progressif en 3 étapes, résultat instantané (moteur local
 * domain/chiffrage), détail lot → ouvrages → quantités × prix modifiables,
 * hypothèses éditables, impression du DQE.
 *
 * Utilisé par la page publique /chiffrage (variante "public", avec capture de
 * lead) et par le back-office /cc/simulateur (variante "cc").
 */
import React, { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { useLang } from "../../i18n/i18n";
import { standingLabel } from "../../command-center/modules/dossiers/costRangesMA";
import {
  HYPOTHESES, INCERTITUDE_QTE, LOTS_FINITION, MATERIAUX, MAIN_OEUVRE, STANDINGS, TYPE_GRILLE, TVA,
  chiffrer, coherence, comparerStandings,
  REGIMES, regimeParDefaut,
  type LigneDQE, type LotFinition, type NatureSol, type ParcelleChiffrage, type ProjetInput, type Regime, type Resultat, type TypeBatiment,
} from "../../domain/chiffrage";
import type { Standing, TypeProjet } from "../../command-center/modules/dossiers/costRangesMA";
import { GAMMES_LIBELLES, VILLES, texte } from "./textes";
import DqeImprimable from "./DqeImprimable";

const GOLD = "#C9A227";
export const fmtDH = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ")} DH`;
const pct = (x: number) => `${Math.round(x * 100)} %`;
const dec = (n: number, d = 2) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
/** La feuille de style globale habille les <button> et les <a> : on neutralise pour les boutons-liens. */
const LIEN: React.CSSProperties = { background: "none", border: 0, padding: 0, boxShadow: "none" };

const BROUILLON = "citurbarea:chiffrage:v2";

const m2 = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("fr-FR")} m²`;

/** Sous-type par défaut pour la règle parcelle (CES) selon le type de projet. */
export function parcelleParDefaut(type: TypeBatiment): ParcelleChiffrage {
  if (type === "VILLA") return { villaType: "isolee" };
  if (type === "MAISON") return { immeubleType: "maison_ville", facades: 1 };
  if (type === "MIXTE") return { immeubleType: "rdc_commercial", facades: 2, galerie: true };
  return { immeubleType: "standard", facades: 2 };
}

export const PROJET_DEFAUT: ProjetInput = {
  type: "VILLA", ville: "Rabat", surfacePlancher: 200, niveaux: 2, standing: "ECONOMIQUE", sol: "BON", pente: 0,
  surfaceTerrain: 300, parcelle: { villaType: "isolee" },
  sousSol: null, nappe: false, chambres: 4, sallesDeBain: 3, terrasses: 12,
};

type Props = {
  variante?: "public" | "cc";
  initial?: Partial<ProjetInput>;
  /** Zone d'appel à l'action (formulaire de lead), rendue sous le résultat. */
  renderCta?: (r: Resultat, projet: ProjetInput) => React.ReactNode;
};

function lireBrouillon(): Partial<ProjetInput> | null {
  try {
    const s = localStorage.getItem(BROUILLON);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export default function ChiffrageGadget({ variante = "public", initial, renderCta }: Props) {
  const { lang } = useLang();
  const t = texte(lang);
  const [projet, setProjet] = useState<ProjetInput>(() => ({ ...PROJET_DEFAUT, ...(initial ? {} : lireBrouillon() ?? {}), ...(initial ?? {}) }));
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});
  const [voirHyp, setVoirHyp] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(BROUILLON, JSON.stringify({ ...projet, quantites: undefined })); } catch { /* stockage indisponible */ }
  }, [projet]);

  const maj = (patch: Partial<ProjetInput>) => setProjet((p) => ({ ...p, ...patch }));
  // Un changement de sous-type redonne la mitoyenneté par défaut (jumelée = 1 côté…).
  const majParcelle = (patch: Partial<ParcelleChiffrage>) => setProjet((p) => ({ ...p, parcelle: { ...p.parcelle, ...patch }, mitoyennete: undefined }));
  const differe = useDeferredValue(projet);
  const res = useMemo(() => chiffrer(differe), [differe]);
  const comp = useMemo(() => comparerStandings(differe), [differe]);
  const coh = useMemo(() => coherence(res), [res]);

  const allerA = (e: 1 | 2 | 3) => {
    // Passer une étape la valide : ses valeurs comptent comme renseignées.
    if (etape === 2 && e > 2 && !projet.etapes?.terrain) maj({ etapes: { ...projet.etapes, terrain: true } });
    setEtape(e);
  };

  const typeGrille = TYPE_GRILLE[projet.type];
  const collectif = projet.type === "IMMEUBLE" || projet.type === "MIXTE";

  return (
    <div className="text-slate-900">
      <style>{"@media print { body * { visibility: hidden !important; } #dqe-imprimable, #dqe-imprimable * { visibility: visible !important; } #dqe-imprimable { position: absolute; left: 0; top: 0; width: 100%; } }"}</style>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] print:hidden">
        {/* ── Formulaire ── */}
        <div>
          <ol className="mb-4 grid list-none grid-cols-3 gap-2 p-0" aria-label="Étapes">
            {([1, 2, 3] as const).map((e) => (
              <li key={e}>
                <button type="button" onClick={() => allerA(e)} aria-current={etape === e ? "step" : undefined}
                  className={`flex w-full min-h-[44px] items-center gap-2 rounded-lg border px-2 py-2 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${etape === e ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${etape === e ? "bg-[#C9A227] text-[#0B1B3A]" : "bg-slate-100"}`}>{e}</span>
                  <span className="leading-tight sm:hidden">{t(e === 1 ? "etape1" : e === 2 ? "etape2court" : "etape3court")}</span>
                  <span className="hidden leading-tight sm:inline">{t(e === 1 ? "etape1" : e === 2 ? "etape2" : "etape3")}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {etape === 1 && (
              <div className="grid gap-5">
                <Champ label={t("type")}>
                  {() => (
                    <Segments grille valeur={projet.type} options={(["VILLA", "MAISON", "IMMEUBLE", "MIXTE"] as TypeBatiment[]).map((v) => ({ v, l: t(`type.${v}` as never) }))}
                      onChange={(v) => maj(v === "IMMEUBLE" || v === "MIXTE"
                        ? { type: v, surfacePlancher: Math.max(projet.surfacePlancher, 600), niveaux: Math.max(projet.niveaux, 4), chambres: undefined, sallesDeBain: undefined, terrasses: 0, mitoyennete: undefined, parcelle: projet.parcelle ? parcelleParDefaut(v) : projet.parcelle }
                        : { type: v, niveaux: Math.min(projet.niveaux, 3), surfacePlancher: Math.min(projet.surfacePlancher, 600), chambres: projet.chambres ?? 4, sallesDeBain: projet.sallesDeBain ?? 3, mitoyennete: undefined, parcelle: projet.parcelle ? (v === "VILLA" && projet.parcelle.villaType ? projet.parcelle : parcelleParDefaut(v)) : projet.parcelle })} />
                  )}
                </Champ>
                {projet.parcelle && (projet.type === "VILLA" ? (
                  <Champ label={t("typeVilla")}>
                    {() => (
                      <Segments valeur={projet.parcelle?.villaType ?? "isolee"}
                        options={(["isolee", "jumelee", "bande"] as const).map((v) => ({ v, l: t(`villa.${v}` as never) }))}
                        onChange={(v) => majParcelle({ villaType: v })} />
                    )}
                  </Champ>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Champ label={t("typeImmeuble")}>
                      {(id) => (
                        <select id={id} className={INPUT} value={projet.parcelle?.immeubleType ?? "standard"} onChange={(e) => majParcelle({ immeubleType: e.target.value as never })}>
                          {(["standard", "maison_ville", "rdc_commercial"] as const).map((v) => <option key={v} value={v}>{t(`imm.${v}` as never)}</option>)}
                        </select>
                      )}
                    </Champ>
                    <Champ label={t("facades")}>
                      {() => <Segments valeur={Number(projet.parcelle?.facades ?? 2)} options={[{ v: 1, l: t("facade1") }, { v: 2, l: t("facade2") }]} onChange={(v) => majParcelle({ facades: v })} />}
                    </Champ>
                    {projet.parcelle?.immeubleType === "rdc_commercial" && (
                      <Bascule label={t("galerie")} actif={projet.parcelle?.galerie !== false} onChange={(on) => majParcelle({ galerie: on })} />
                    )}
                    {Number(projet.parcelle?.facades ?? 2) === 1 && (
                      <Champ label={t("cour")}>
                        {(id) => (
                          <select id={id} className={INPUT} value={projet.parcelle?.rdcCourMode ?? "unknown"} onChange={(e) => majParcelle({ rdcCourMode: e.target.value as never })}>
                            {(["unknown", "with_cour", "without_cour"] as const).map((v) => <option key={v} value={v}>{t(`cour.${v}` as never)}</option>)}
                          </select>
                        )}
                      </Champ>
                    )}
                    {Number(projet.parcelle?.facades ?? 2) === 1 && projet.parcelle?.rdcCourMode === "with_cour" && (
                      <Champ label={t("courSurface")}>
                        {(id) => <Nombre id={id} valeur={projet.parcelle?.courSurface} unite="m²" min={0} max={500} onChange={(v) => majParcelle({ courSurface: v })} />}
                      </Champ>
                    )}
                  </div>
                ))}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Champ label={t("ville")}>
                    {(id) => (
                      <select id={id} value={projet.ville ?? ""} onChange={(e) => maj({ ville: e.target.value })} className={INPUT}>
                        {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
                        <option value="">{t("autreVille")}</option>
                      </select>
                    )}
                  </Champ>
                  <Champ label={t("terrain")} aide={projet.surfaceTerrain ? undefined : `${t("auto")} : ${Math.round(res.geometrie.surfaceTerrain)} m²`}>
                    {(id) => <Nombre id={id} valeur={projet.surfaceTerrain} unite="m²" min={30} max={100000} pas={1} onChange={(v) => maj({ surfaceTerrain: v })} />}
                  </Champ>
                </div>
                <Champ label={t("niveaux")}>
                  {() => (
                    <Segments valeur={projet.niveaux}
                      options={(collectif ? [3, 4, 5, 6, 7, 8, 9] : [1, 2, 3]).map((n) => ({ v: n, l: n === 1 ? "RDC" : `R+${n - 1}` }))}
                      onChange={(n) => maj({ niveaux: n })} />
                  )}
                </Champ>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <Bascule label={t("sousSol")} actif={!!projet.sousSol} onChange={(on) => maj({ sousSol: on ? { profondeur: projet.sousSol?.profondeur ?? 3 } : null, nappe: on ? projet.nappe : false })} />
                  {projet.parcelle && <Bascule label={t("voieLarge")} actif={!!projet.parcelle.voieLarge} onChange={(on) => majParcelle({ voieLarge: on })} />}
                </div>

                {/* Surface plancher : règle parcelle du cabinet, ou saisie directe */}
                <div className="rounded-xl border border-[#C9A227]/60 bg-[#FBF6E7] p-4">
                  {res.decomposition ? (
                    <>
                      <p className="text-sm text-slate-700">{t("surfaceCalculee")}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[#0B1B3A]">{m2(res.geometrie.surfaceTotale)}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {t("emprise")} {m2(res.decomposition.rdc)} (CES {res.decomposition.ces.toLocaleString("fr-FR")} × {m2(projet.surfaceTerrain ?? 0)})
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        RDC {m2(res.decomposition.rdc)}
                        {res.decomposition.etages.map((s, i) => <span key={i}> + R+{i + 1} {m2(s)}</span>)}
                        {res.decomposition.sousSol > 0 && <> + {t("sousSol").toLowerCase()} {m2(res.decomposition.sousSol)}</>}
                        {" "}+ {t("forfait")} {m2(res.decomposition.forfait)}
                      </p>
                      <button type="button" style={LIEN} onClick={() => maj({ parcelle: null, surfacePlancher: res.input.surfacePlancher, emprise: res.geometrie.emprise })} className="mt-2 text-xs font-semibold text-[#0B1B3A] underline">{t("saisieDirecte")}</button>
                    </>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Champ label={t("surface")}>
                        {(id) => <Nombre id={id} valeur={projet.surfacePlancher} unite="m²" min={30} max={20000} pas={5} onChange={(v) => maj({ surfacePlancher: v ?? 0 })} />}
                      </Champ>
                      <Champ label={t("emprise")} aide={projet.emprise ? undefined : `${t("auto")} : ${Math.round(res.geometrie.emprise)} m²`}>
                        {(id) => <Nombre id={id} valeur={projet.emprise} unite="m²" min={20} max={20000} pas={5} onChange={(v) => maj({ emprise: v })} />}
                      </Champ>
                      <button type="button" style={LIEN} onClick={() => maj({ parcelle: parcelleParDefaut(projet.type), surfaceTerrain: projet.surfaceTerrain || 300, mitoyennete: undefined })} className="text-left text-xs font-semibold text-[#0B1B3A] underline sm:col-span-2">{t("calculParcelle")}</button>
                    </div>
                  )}
                </div>
                <Champ label={t("standing")}>
                  {() => (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {STANDINGS.map((s) => {
                        const c = comp.find((x) => x.standing === s);
                        const actif = projet.standing === s;
                        return (
                          <button key={s} type="button" aria-pressed={actif} onClick={() => maj({ standing: s, finitions: undefined })}
                            className={`min-h-[64px] rounded-lg border px-2 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${actif ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white hover:border-slate-400"}`}>
                            <span className="block text-sm font-semibold leading-tight">{standingLabel(typeGrille, s)}</span>
                            {c && <span className={`mt-1 block text-xs ${actif ? "text-[#E8D59A]" : "text-slate-500"}`}>≈ {Math.round(c.coutM2BatimentHT).toLocaleString("fr-FR")} DH/m²{c.regime === "TACHERON" ? ` · ${t("parTacheron")}` : ""}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Champ>
                <Champ label={t("regime")} aide={t("regimeAide")}>
                  {(id) => (
                    <select id={id} className={INPUT} value={projet.regime ?? ""} onChange={(e) => maj({ regime: (e.target.value || undefined) as Regime | undefined })}>
                      <option value="">{t("regimeAuto")} ({REGIMES[regimeParDefaut(projet.standing)].libelle.toLowerCase()})</option>
                      {(Object.keys(REGIMES) as Regime[]).map((r) => <option key={r} value={r}>{REGIMES[r].libelle}</option>)}
                    </select>
                  )}
                </Champ>
                {collectif ? (
                  <Champ label={t("logements")} aide={`${t("auto")} : ${res.geometrie.logements}`}>
                    {(id) => <Nombre id={id} valeur={projet.logements} min={1} max={200} onChange={(v) => maj({ logements: v })} />}
                  </Champ>
                ) : (
                  <div className="grid grid-cols-2 gap-5">
                    <Champ label={t("chambres")}>{(id) => <Nombre id={id} valeur={projet.chambres} min={1} max={12} onChange={(v) => maj({ chambres: v })} />}</Champ>
                    <Champ label={t("sdb")}>{(id) => <Nombre id={id} valeur={projet.sallesDeBain} min={1} max={10} onChange={(v) => maj({ sallesDeBain: v })} />}</Champ>
                  </div>
                )}
              </div>
            )}

            {etape === 2 && (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Champ label={t("hsp")}>
                    {(id) => <Nombre id={id} valeur={projet.hauteurSousPlafond} unite="m" min={2.5} max={5} pas={0.1} placeholder={(res.geometrie.hauteurEtage - (projet.hypotheses?.["geo.epaisseurPlancher"] ?? HYPOTHESES["geo.epaisseurPlancher"].valeur)).toFixed(2)} onChange={(v) => maj({ hauteurSousPlafond: v })} />}
                  </Champ>
                  <Champ label={t("mitoyennete")}>
                    {() => <Segments valeur={res.input.mitoyennete ?? (projet.type === "VILLA" ? 0 : 2)} options={[0, 1, 2, 3].map((n) => ({ v: n, l: String(n) }))} onChange={(n) => maj({ mitoyennete: n })} />}
                  </Champ>
                </div>
                <Champ label={t("sol")} aide={t("solInconnu")}>
                  {() => (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(["ROCHER", "BON", "MOYEN", "ARGILE_REMBLAI"] as NatureSol[]).map((s) => {
                        const actif = (projet.sol ?? "BON") === s;
                        return (
                          <button key={s} type="button" aria-pressed={actif} onClick={() => maj({ sol: s })}
                            className={`min-h-[64px] rounded-lg border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${actif ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white hover:border-slate-400"}`}>
                            <span className="block text-sm font-semibold">{t(`sol.${s}` as never)}</span>
                            <span className={`mt-0.5 block text-xs ${actif ? "text-slate-200" : "text-slate-500"}`}>{t(`solAide.${s}` as never)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Champ>
                <Champ label={`${t("pente")} : ${projet.pente ?? 0} %`}>
                  {(id) => <input id={id} type="range" min={0} max={35} step={1} value={projet.pente ?? 0} onChange={(e) => maj({ pente: Number(e.target.value) })} className="w-full accent-[#0B1B3A]" />}
                </Champ>
                <fieldset className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-800">{t("sousSol")}</legend>
                  <Bascule label={t("sousSol")} actif={!!projet.sousSol} onChange={(on) => maj({ sousSol: on ? { profondeur: 2.8 } : null, nappe: on ? projet.nappe : false })} />
                  {projet.sousSol && (
                    <div className="mt-4 grid gap-4">
                      <Champ label={`${t("profondeur")} : ${projet.sousSol.profondeur.toFixed(1).replace(".", ",")} m`}>
                        {(id) => <input id={id} type="range" min={2.2} max={7} step={0.1} value={projet.sousSol!.profondeur} onChange={(e) => maj({ sousSol: { ...projet.sousSol!, profondeur: Number(e.target.value) } })} className="w-full accent-[#0B1B3A]" />}
                      </Champ>
                      <Bascule label={t("nappe")} actif={!!projet.nappe} onChange={(on) => maj({ nappe: on })} />
                    </div>
                  )}
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  {!collectif && (
                    <Champ label={t("cloture")} aide={projet.cloture == null ? `${t("auto")} : ${Math.round(res.geometrie.cloture)} ml` : undefined}>
                      {(id) => <Nombre id={id} valeur={projet.cloture ?? undefined} unite="ml" min={0} max={2000} onChange={(v) => maj({ cloture: v ?? null })} />}
                    </Champ>
                  )}
                  <Champ label={t("terrasses")}>
                    {(id) => <Nombre id={id} valeur={projet.terrasses} unite="m²" min={0} max={2000} onChange={(v) => maj({ terrasses: v })} />}
                  </Champ>
                </div>
                <Bascule label={t("terrasseAccessible")} actif={!!projet.terrasseAccessible} onChange={(on) => maj({ terrasseAccessible: on })} />
              </div>
            )}

            {etape === 3 && (
              <div className="grid gap-5">
                <p className="text-sm text-slate-600">{t("finitionsAide")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LOTS_FINITION.map((lot) => {
                    const val = projet.finitions?.[lot] ?? projet.standing;
                    return (
                      <Champ key={lot} label={GAMMES_LIBELLES[lot].lot}>
                        {(id) => (
                          <select id={id} value={val} className={`${INPUT} ${projet.finitions?.[lot] ? "border-[#C9A227] bg-[#FBF6E7]" : ""}`}
                            onChange={(e) => maj({ finitions: { ...projet.finitions, [lot]: e.target.value as Standing } as Partial<Record<LotFinition, Standing>> })}>
                            {STANDINGS.map((s, i) => <option key={s} value={s}>{GAMMES_LIBELLES[lot].gammes[i]} — {standingLabel(typeGrille, s)}</option>)}
                          </select>
                        )}
                      </Champ>
                    );
                  })}
                </div>
                <fieldset className="grid gap-4 rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-800">{t("options")}</legend>
                  <Bascule label={t("clim")} actif={res.geometrie.climatisation} onChange={(on) => maj({ climatisation: on })} />
                  <Bascule label={t("solaire")} actif={res.geometrie.chauffeEauSolaire} onChange={(on) => maj({ chauffeEauSolaire: on })} />
                  <Bascule label={t("ascenseur")} actif={res.geometrie.ascenseur} onChange={(on) => maj({ ascenseur: on })} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Champ label={t("piscine")}>{(id) => <Nombre id={id} valeur={projet.piscine} unite="m²" min={0} max={300} onChange={(v) => maj({ piscine: v })} />}</Champ>
                    <Champ label={t("pv")}>{(id) => <Nombre id={id} valeur={projet.photovoltaiqueKwc} unite="kWc" min={0} max={100} onChange={(v) => maj({ photovoltaiqueKwc: v })} />}</Champ>
                    <Champ label={t("cuisine")}>{(id) => <Nombre id={id} valeur={projet.cuisineMl} unite="ml" min={0} max={30} onChange={(v) => maj({ cuisineMl: v })} />}</Champ>
                  </div>
                </fieldset>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" disabled={etape === 1} onClick={() => allerA((etape - 1) as 1 | 2)}
                className="min-h-[44px] rounded-lg px-4 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:invisible">← {t("precedent")}</button>
              {etape < 3 ? (
                <button type="button" onClick={() => allerA((etape + 1) as 2 | 3)}
                  className="min-h-[44px] rounded-lg bg-[#0B1B3A] px-5 text-sm font-semibold text-white hover:bg-[#13285a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]">{t("suivant")} →</button>
              ) : (
                <a href="#resultat-chiffrage" style={{ color: "#fff", textDecoration: "none" }} onClick={() => maj({ etapes: { ...projet.etapes, finitions: true } })}
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-[#0B1B3A] px-5 text-sm font-semibold text-white hover:bg-[#13285a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]">{t("voirResultat")} ↓</a>
              )}
            </div>
          </div>
        </div>

        {/* ── Résultat ── */}
        <aside id="resultat-chiffrage" className="scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
          <Resume res={res} t={t} />
          {renderCta && <div className="mt-4">{renderCta(res, projet)}</div>}
        </aside>
      </div>

      {/* ── Détail ── */}
      <div className="mt-8 grid gap-6 print:hidden">
        <Section titre={t("parLot")}>
          <BarresLots res={res} />
        </Section>

        <Section titre={t("comparaison")}>
          <BarresStandings comp={comp} actif={projet.standing} typeGrille={typeGrille} />
        </Section>

        <Section titre={t("detail")} action={
          <button type="button" onClick={() => window.print()} className="min-h-[40px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400">⎙ {t("imprimer")}</button>
        }>
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {res.lots.map((l) => {
              const ouvert = !!ouverts[l.lot.code];
              return (
                <div key={l.lot.code}>
                  <button type="button" aria-expanded={ouvert} onClick={() => setOuverts((o) => ({ ...o, [l.lot.code]: !ouvert }))} style={{ background: ouvert ? "#F8FAFC" : "#fff", border: 0, borderRadius: 0, boxShadow: "none", color: "inherit" }}
                    className="flex w-full min-h-[48px] items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C9A227]">
                    <span className="w-7 shrink-0 text-xs font-semibold text-slate-400">{l.lot.numero}</span>
                    <span className="flex-1 text-sm font-semibold">{l.lot.libelle}</span>
                    <span className="hidden text-xs text-slate-500 sm:inline">{pct(l.part)}</span>
                    <span className="text-sm font-semibold tabular-nums">{fmtDH(l.total)}</span>
                    <span aria-hidden className={`text-slate-400 transition ${ouvert ? "rotate-90" : ""}`}>›</span>
                  </button>
                  {ouvert && (
                    <div className="bg-slate-50 px-3 pb-3">
                      {l.lot.code === "INS"
                        ? <p className="py-2 text-sm text-slate-600">{pct(res.input.hypotheses?.["frais.installation"] ?? HYPOTHESES["frais.installation"].valeur)} des travaux (hypothèse frais.installation, poids INS de costRangesMA).</p>
                        : l.lignes.map((li) => <LigneOuvrage key={li.id} li={li} t={t} onQte={(q) => maj({ quantites: { ...projet.quantites, [li.id]: q } })} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {projet.quantites && Object.keys(projet.quantites).length > 0 && (
            <button type="button" onClick={() => maj({ quantites: undefined })} style={LIEN} className="mt-2 text-sm font-semibold text-[#0B1B3A] underline">{t("reinitialiser")} (quantités saisies)</button>
          )}
        </Section>

        <Section titre={t("hypotheses")} action={
          <button type="button" aria-expanded={voirHyp} onClick={() => setVoirHyp((v) => !v)} className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">{voirHyp ? "−" : "+"}</button>
        }>
          <p className="text-sm text-slate-600">{t("hypothesesAide")}</p>
          {voirHyp && <Hypotheses projet={projet} onChange={(h) => maj({ hypotheses: h })} t={t} />}
        </Section>

        <Section titre={t("controles")}>
          <ul className="grid list-none gap-2 p-0 text-sm">
            <li>
              <Pastille ok={coh.grille.ok} /> Coût du bâtiment ramené à Rabat-Salé-Kénitra : <b>{Math.round(coh.grille.coutM2RSK).toLocaleString("fr-FR")} DH/m²</b>
              {coh.grille.fourchette && <> — grille CITURBAREA 2026 {standingLabel(typeGrille, projet.standing)} : {coh.grille.fourchette[0].toLocaleString("fr-FR")}–{coh.grille.fourchette[1].toLocaleString("fr-FR")} DH/m²{!coh.grille.ok && ` (écart ${coh.grille.ecart > 0 ? "+" : ""}${Math.round(coh.grille.ecart * 100)} %)`}</>}
            </li>
            <li><Pastille ok={coh.partGrosOeuvre > 0.2 && coh.partGrosOeuvre < 0.65} /> Part du gros œuvre : <b>{pct(coh.partGrosOeuvre)}</b> (repères : 55-60 % en économique, 45-50 % en standard, 35-40 % en haut de gamme — EnginLoc 2026 ; cloisons, enduits intérieurs et chapes comptés en second œuvre)</li>
            <li><Pastille ok={coh.recoupements.every((r) => r.ok)} /> Prix d'ouvrage recoupés avec les prix posés du marché (règle des ±20 % du décret 2-22-431) : <b>{coh.recoupements.filter((r) => r.ok).length}/{coh.recoupements.length}</b> dans la tolérance.</li>
            {variante === "cc" && coh.alertes.map((a) => <li key={a} className="text-amber-800">⚠ {a}</li>)}
          </ul>
        </Section>

        <p className="text-xs leading-relaxed text-slate-500">{t("avertissement")} TVA : {TVA.note}</p>
      </div>

      {/* Barre mobile : total toujours visible */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-2 backdrop-blur lg:hidden print:hidden" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}>
        <a href="#resultat-chiffrage" style={{ textDecoration: "none" }} className="flex min-h-[44px] items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{t("travauxTTC")}<br /><span className="text-xs">±{Math.round(res.precision.global * 100)} %</span></span>
          <span className="text-lg font-bold tabular-nums text-[#0B1B3A]" aria-live="polite">{fmtDH(res.totalTTC)}</span>
        </a>
      </div>
      <div className="h-16 lg:hidden print:hidden" aria-hidden />

      <DqeImprimable res={res} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
const INPUT = "w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-[#0B1B3A] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40";

type T = ReturnType<typeof texte>;

function Champ({ label, aide, children }: { label: string; aide?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children(id)}
      {aide && <p className="mt-1 text-xs text-slate-500">{aide}</p>}
    </div>
  );
}

function Nombre({ id, valeur, onChange, unite, min, max, pas = 1, placeholder }: { id: string; valeur?: number; onChange: (v: number | undefined) => void; unite?: string; min?: number; max?: number; pas?: number; placeholder?: string }) {
  return (
    <div className="relative">
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={pas} placeholder={placeholder}
        value={valeur ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))}
        className={`${INPUT} ${unite ? "pr-12" : ""} tabular-nums`} />
      {unite && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">{unite}</span>}
    </div>
  );
}

function Segments<V extends string | number>({ valeur, options, onChange, grille }: { valeur: V; options: { v: V; l: string }[]; onChange: (v: V) => void; grille?: boolean }) {
  return (
    <div className={grille ? "grid grid-cols-2 gap-2 sm:grid-cols-4" : "flex flex-wrap gap-2"} role="group">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={valeur === o.v} onClick={() => onChange(o.v)}
          className={`min-h-[44px] min-w-[52px] flex-1 rounded-lg border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${valeur === o.v ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Bascule({ label, actif, onChange }: { label: string; actif: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input type="checkbox" role="switch" aria-label={label} checked={actif} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-[#0B1B3A] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C9A227] after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

function Section({ titre, action, children }: { titre: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#0B1B3A]">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Pastille({ ok }: { ok: boolean }) {
  return <span aria-label={ok ? "conforme" : "écart"} className={`me-1 inline-block rounded px-1.5 text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{ok ? "✓" : "!"}</span>;
}

function Resume({ res, t }: { res: Resultat; t: T }) {
  const n = res.precision.niveau;
  const lignesBudget: [string, number][] = [
    [t("travauxHT"), res.travauxHT],
    [t("aleas"), res.aleasHT],
    [t("tva"), res.tva],
    [t("honoraires"), res.honoraires.totalTTC],
    [t("taxes"), res.taxes.total],
    [t("raccordements"), res.fraisAnnexes.total],
  ];
  return (
    <div className="overflow-hidden rounded-2xl bg-[#0B1B3A] text-white shadow-lg">
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A227]">{t("resultat")}</p>
        <p className="mt-2 text-sm text-slate-300">{t("travauxTTC")}</p>
        <p className="text-3xl font-bold tabular-nums sm:text-4xl" aria-live="polite">{fmtDH(res.totalTTC)}</p>
        <p className="mt-1 text-sm text-slate-300">{t("coutM2", { v: Math.round(res.coutM2BatimentHT).toLocaleString("fr-FR") })}</p>
        <p className="mt-1 text-xs text-slate-400">{REGIMES[res.regime].libelle}</p>
        <p className="mt-1 text-sm text-slate-300">{t("fourchette", { min: fmtDH(res.fourchette.min * (1 + TVA.taux)), max: fmtDH(res.fourchette.max * (1 + TVA.taux)) })}</p>

        <div className="mt-4 rounded-xl bg-white/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t("precision")} — {t("niveau", { n })}</span>
            <span className="flex gap-1" aria-hidden>{[1, 2, 3].map((i) => <span key={i} className={`h-2 w-6 rounded-full ${i <= n ? "bg-[#C9A227]" : "bg-white/20"}`} />)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">{res.precision.libelle} : {t("precisionQte", { q: Math.round(res.precision.qte * 100) })}, {t("precisionPrix", { p: Math.round(res.precision.prix * 100) })}.</p>
          <p className="mt-1 text-xs text-slate-400">{t("precisionAide")}</p>
        </div>

        {res.impacts.length > 0 && (
          <ul className="mt-4 grid list-none gap-2 p-0">
            {res.impacts.map((i) => (
              <li key={i.cle} className="rounded-xl border border-[#C9A227]/50 bg-[#C9A227]/10 p-3 text-sm leading-snug">
                {i.cle === "sous_sol" && t("impactSousSol", { m: fmtDH(i.montantHT), s: fmtDH(i.dontSoutenement) })}
                {i.cle === "sol" && t("impactSol", { m: fmtDH(i.montantHT) })}
                {i.cle === "pente" && t("impactPente", { m: fmtDH(i.montantHT), s: fmtDH(i.dontSoutenement) })}
                <span className="block text-xs text-slate-300">{i.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-white/5 p-5">
        <p className="mb-2 text-sm font-semibold">{t("budget")}</p>
        <dl className="grid gap-1 text-sm">
          {lignesBudget.map(([l, v]) => (
            <div key={l} className="flex justify-between gap-3"><dt className="text-slate-300">{l}</dt><dd className="tabular-nums">{fmtDH(v)}</dd></div>
          ))}
          <div className="mt-2 flex justify-between gap-3 border-t border-white/20 pt-2 text-base font-bold"><dt>{t("budgetTotal")}</dt><dd className="tabular-nums text-[#E8D59A]">{fmtDH(res.budgetTTC)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

/** Barres horizontales, une série (magnitude par lot) : libellé et valeur en texte, info-bulle native. */
function BarresLots({ res }: { res: Resultat }) {
  const max = Math.max(...res.lots.map((l) => l.total));
  return (
    <ul className="grid list-none gap-2 p-0">
      {res.lots.map((l) => (
        <li key={l.lot.code} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[minmax(0,15rem)_1fr_7.5rem]" title={`${l.lot.libelle} : ${fmtDH(l.total)} (${pct(l.part)})`}>
          <span className="truncate text-slate-700">{l.lot.libelle}</span>
          <span className="h-3 rounded-full bg-slate-100">
            <span className="block h-3 rounded-full bg-[#0B1B3A]" style={{ width: `${Math.max(1.5, (l.total / max) * 100)}%` }} />
          </span>
          <span className="text-right tabular-nums text-slate-800">{Math.round(l.total / 1000).toLocaleString("fr-FR")} k<span className="ms-1 text-xs text-slate-500">{pct(l.part)}</span></span>
        </li>
      ))}
    </ul>
  );
}

function BarresStandings({ comp, actif, typeGrille }: { comp: ReturnType<typeof comparerStandings>; actif: Standing; typeGrille: TypeProjet }) {
  const max = Math.max(...comp.map((c) => c.travauxHT));
  return (
    <ul className="grid list-none gap-2 p-0">
      {comp.map((c) => (
        <li key={c.standing} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[minmax(0,15rem)_1fr_10rem]">
          <span className={`truncate ${c.standing === actif ? "font-bold text-[#0B1B3A]" : "text-slate-700"}`}>{standingLabel(typeGrille, c.standing)}</span>
          <span className="h-3 rounded-full bg-slate-100">
            <span className="block h-3 rounded-full" style={{ width: `${(c.travauxHT / max) * 100}%`, background: c.standing === actif ? GOLD : "#94A3B8" }} />
          </span>
          <span className="text-right tabular-nums">{fmtDH(c.totalTTC)}<span className="block text-xs text-slate-500">{Math.round(c.coutM2BatimentHT).toLocaleString("fr-FR")} DH HT/m²</span></span>
        </li>
      ))}
    </ul>
  );
}

const TAGS: Record<string, string> = { sous_sol: "sous-sol", soutenement: "soutènement", sol: "sol", pente: "pente", option: "option" };
const ORIGINE: Record<string, string> = { ratio: "ratio", parametrique: "métré", saisie: "saisi" };

function LigneOuvrage({ li, t, onQte }: { li: LigneDQE; t: T; onQte: (q: number) => void }) {
  const [sd, setSd] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-slate-200 py-3 last:border-0">
      <div className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_7rem_8rem]">
        <div className="col-span-3 min-w-0 sm:col-span-1">
          <p className="text-sm font-medium leading-snug">{li.libelle}</p>
          <p className="text-xs text-slate-500">{li.formule}</p>
          <p className="mt-1 flex flex-wrap gap-1">
            <span className="rounded bg-white px-1.5 text-[11px] text-slate-600 ring-1 ring-slate-200" title={`Incertitude quantités ±${Math.round(INCERTITUDE_QTE[li.origine] * 100)} %`}>{ORIGINE[li.origine]}</span>
            {li.tags.map((tg) => <span key={tg} className="rounded bg-[#C9A227]/15 px-1.5 text-[11px] text-[#6b5410]">{TAGS[tg]}</span>)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <label htmlFor={id} className="sr-only">{t("quantiteSaisie")}</label>
          <input id={id} type="number" inputMode="decimal" min={0} step="any" value={li.qte} onChange={(e) => onQte(Math.max(0, Number(e.target.value) || 0))}
            className="w-full min-h-[40px] rounded-md border border-slate-300 bg-white px-2 text-right text-base tabular-nums focus:border-[#0B1B3A] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40" />
          <span className="w-8 text-xs text-slate-500">{li.unite}</span>
        </div>
        <p className="text-sm tabular-nums text-slate-600 sm:text-right">× {fmtDH(li.pu)}</p>
        <p className="text-right text-sm font-semibold tabular-nums">{fmtDH(li.montant)}</p>
      </div>
      <button type="button" aria-expanded={sd} onClick={() => setSd((v) => !v)} style={LIEN} className="mt-1 text-xs font-semibold text-[#0B1B3A] underline">{t("sousDetail")} ({li.ouvrage})</button>
      {sd && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-2 text-left">Composant (par {li.unite})</th><th className="p-2 text-right">Qté</th><th className="p-2 text-right">PU HT</th><th className="p-2 text-right">Montant</th><th className="p-2 text-left">{t("sources")}</th></tr>
            </thead>
            <tbody>
              {li.prix.sousDetail.map((c, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{c.libelle}{c.note && <span className="block text-slate-400">{c.note}</span>}</td>
                  <td className="p-2 text-right tabular-nums">{c.nature === "PM" ? "5 %" : `${(+c.qte.toFixed(3)).toLocaleString("fr-FR")} ${c.unite}`}</td>
                  <td className="p-2 text-right tabular-nums">{c.nature === "PM" ? "" : dec(c.pu)}</td>
                  <td className="p-2 text-right tabular-nums">{dec(c.montant)}</td>
                  <td className="p-2"><Fiab f={c.fiabilite} /> <span className="text-slate-500">{c.sourceIds.join(", ") || (c.nature === "OUV" ? "sous-ouvrage" : "")}</span></td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 font-semibold"><td className="p-2" colSpan={3}>Déboursé sec</td><td className="p-2 text-right tabular-nums">{dec(li.prix.debourseSec)}</td><td /></tr>
              <tr><td className="p-2" colSpan={3}>× K {dec(li.prix.k)} {li.prix.ouvrage.sousTraite ? "(sous-traitance : coordination)" : "(frais de chantier, frais généraux, aléas et bénéfice)"}, régionalisé</td><td className="p-2 text-right font-semibold tabular-nums">{dec(li.pu)}</td><td className="p-2 text-slate-500">{Math.round(li.puMin)}–{Math.round(li.puMax)}</td></tr>
            </tbody>
          </table>
          {li.prix.ouvrage.note && <p className="border-t border-slate-100 p-2 text-xs text-slate-500">{li.prix.ouvrage.note}</p>}
        </div>
      )}
    </div>
  );
}

function Fiab({ f }: { f: string }) {
  const c = f === "A" ? "bg-emerald-100 text-emerald-800" : f === "B" ? "bg-sky-100 text-sky-800" : f === "C" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-900";
  return <span title={f === "H" ? "hypothèse" : `fiabilité ${f}`} className={`inline-block rounded px-1 font-bold ${c}`}>{f}</span>;
}

function Hypotheses({ projet, onChange, t }: { projet: ProjetInput; onChange: (h: Record<string, number> | undefined) => void; t: T }) {
  const groupes = useMemo(() => {
    const g: Record<string, typeof HYPOTHESES[string][]> = {};
    for (const h of Object.values(HYPOTHESES)) (g[h.groupe] ??= []).push(h);
    return g;
  }, []);
  const val = projet.hypotheses ?? {};
  return (
    <div className="mt-3 grid gap-4">
      {Object.entries(groupes).map(([groupe, hs]) => (
        <fieldset key={groupe}>
          <legend className="mb-2 text-sm font-semibold text-slate-800">{groupe}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {hs.map((h) => {
              const modifie = val[h.id] !== undefined;
              return (
                <label key={h.id} className={`grid grid-cols-[1fr_7rem] items-center gap-2 rounded-lg border p-2 text-sm ${modifie ? "border-[#C9A227] bg-[#FBF6E7]" : "border-slate-200"}`}>
                  <span><span className="block leading-snug">{h.libelle}</span><span className="text-xs text-slate-500">{h.source.note} · plage {h.min}–{h.max} {h.unite}</span></span>
                  <input type="number" step="any" min={h.min} max={h.max} value={val[h.id] ?? h.valeur}
                    onChange={(e) => onChange({ ...val, [h.id]: Number(e.target.value) })}
                    className="min-h-[40px] w-full rounded-md border border-slate-300 bg-white px-2 text-right text-base tabular-nums" />
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span>Prix élémentaires : {Object.keys(MATERIAUX).length} matériaux et {Object.keys(MAIN_OEUVRE).length} métiers sourcés (docs/prix/recherche).</span>
        {projet.hypotheses && <button type="button" onClick={() => onChange(undefined)} style={LIEN} className="font-semibold text-[#0B1B3A] underline">{t("reinitialiser")}</button>}
      </div>
    </div>
  );
}

