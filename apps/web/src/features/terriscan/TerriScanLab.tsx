// TerriScanLab.tsx — Laboratoire Data Live RA-CUE-ULV
//
// Composant doctoral pour la thèse Y. AT-TARASSI (UIT Kénitra, FSHS, LTED).
// Article A1 → Habitat International (IF=7.0), v5.2_FINAL_v2 anonymisé.
// 217 valeurs numériques de la matrice CUE — concordance totale avec le
// référentiel BLOC 2-3 (audit 20 agents 2026-05-28).

import './terriscan-tokens.css'
import { useState, useRef } from "react"

// ─── INTERFACES TYPESCRIPT ─────────────────────────────────────────

interface Entity {
  id: string
  name: string
  flag: string
  country: string
  rank: number
  scue: number
  saf: number | null
  sde: number
  smc: number
  sgu: number
  sdf: number
  srt: number
  sps: number
  cov: string
  model: string
  pop: string
  borda: number
  c1c6: string
}

interface KmstSub {
  name: string
  pop: string
  w: number
  wc: string
  scue: number
  smc?: number
  sgu?: number
  sdf?: number
  srt?: number
  sps?: number
  note: string
}

interface AgentRow {
  id: string
  batch: string
  label: string
  ok: boolean | null
  delta: boolean
  msg: string
}

interface BordaRank {
  e: string
  borda: number
  equal: number
  entropy: number
  variance: number
  CRITIC: number
}

type SubGroup = "saf" | "sde" | "smc" | "sgu" | "sdf" | "srt" | "sps"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

// ─── DONNÉES DOCTORALES (preserve bit-for-bit du référentiel BLOC 2) ─

const ENTITIES: Entity[] = [
  { id:"BINH_DUONG", name:"Binh Duong", flag:"🇻🇳", country:"Vietnam", rank:1, scue:0.673, saf:0.982, sde:0.548, smc:1.000, sgu:0.630, sdf:0.538, srt:0.814, sps:0.444, cov:"35/37", model:"PPP", pop:"300K", borda:36, c1c6:"5.0/6" },
  { id:"NEW_CAIRO",  name:"New Cairo",  flag:"🇪🇬", country:"Égypte",   rank:2, scue:0.522, saf:null,  sde:0.573, smc:0.304, sgu:0.950, sdf:0.444, srt:0.428, sps:0.909, cov:"20/37", model:"Top-down", pop:"500K", borda:32, c1c6:"5.0/6" },
  { id:"KMST",      name:"KMST (pivot)",flag:"🇲🇦", country:"Maroc",    rank:3, scue:0.505, saf:null,  sde:0.487, smc:0.482, sgu:0.457, sdf:0.889, srt:0.366, sps:0.817, cov:"23/37", model:"Mixte",    pop:"700K", borda:28, c1c6:"pivot" },
  { id:"SHEIKH",    name:"Sheikh Zayed",flag:"🇪🇬", country:"Égypte",   rank:4, scue:0.494, saf:0.827, sde:0.325, smc:0.392, sgu:0.329, sdf:0.800, srt:0.662, sps:0.094, cov:"37/37", model:"Top-down", pop:"750K", borda:22, c1c6:"4.5/6" },
  { id:"DIAMNIADIO",name:"Diamniadio", flag:"🇸🇳", country:"Sénégal",  rank:5, scue:0.487, saf:null,  sde:0.582, smc:0.304, sgu:0.580, sdf:0.400, srt:0.490, sps:0.596, cov:"22/37", model:"Top-down", pop:"480K", borda:22, c1c6:"5.5/6" },
  { id:"MANTA",     name:"Manta",      flag:"🇪🇨", country:"Équateur", rank:6, scue:0.455, saf:0.442, sde:0.398, smc:0.319, sgu:0.566, sdf:0.459, srt:0.869, sps:0.149, cov:"37/37", model:"Mixte",    pop:"380K", borda:16, c1c6:"6.0/6" },
  { id:"SEKONDI",   name:"Sekondi-Tak.",flag:"🇬🇭",country:"Ghana",    rank:7, scue:0.360, saf:0.434, sde:0.173, smc:0.227, sgu:0.491, sdf:0.455, srt:0.657, sps:0.105, cov:"37/37", model:"Mixte",    pop:"560K", borda:12, c1c6:"5.0/6" },
  { id:"BOUAKE",    name:"Bouaké",     flag:"🇨🇮", country:"Côte d'Ivoire",rank:8,scue:0.288,saf:0.336,sde:0.102,smc:0.204,sgu:0.204,sdf:0.496,srt:0.566,sps:0.133,cov:"37/37",model:"Top-down",pop:"720K",borda:8,c1c6:"5.0/6"},
  { id:"PEMBA",     name:"Pemba-Metuge",flag:"🇲🇿",country:"Mozambique",rank:9, scue:0.182, saf:0.035, sde:0.034, smc:0.157, sgu:0.133, sdf:0.263, srt:0.464, sps:0.244, cov:"37/37", model:"PPP",      pop:"320K", borda:4,  c1c6:"5.5/6" },
]

const KMST_SUBS: KmstSub[] = [
  { name:"Kénitra",   pop:"~450K", w:0.643, wc:"64.3%", scue:0.745, smc:0.800, sgu:1.000, sdf:1.000, srt:0.433, sps:0.833, note:"PA 2024 annulé — COS/CUS non définis. SKAD (2024) gère l'infrastructure en substitution au conseil communal élu." },
  { name:"Mehdiya",   pop:"~50K",  w:0.071, wc:"7.1%",  scue:0.381, smc:0.237, sgu:0.407, sdf:0.000, srt:0.634, sps:0.300, note:"PA 2018 valide (→2028). Pôle touristico-portuaire. SKAD mandate étendu corniche + Avenue Kasbah." },
  { name:"Sidi Taibi",pop:"~220K", w:0.286, wc:"28.6%", scue:0.241, smc:0.244, sgu:0.000, sdf:0.375, srt:0.400, sps:0.167, note:"PA 2005 expiré. Croissance 6%/an. VSB Al Omrane partiel. Bir Rami Sud: 25K→300K MAD (4-12×). Signal pré-déplacement actif." },
]

const AGENTS: AgentRow[] = [
  { id:"A1",  batch:"A", label:"Cronbach α hiérarchie",        ok:true,  delta:true,  msg:"BCa [0.512;0.957] B=2000 = intervalle principal. Percentile [0.444;0.938] B=1000 = comparabilité. NOUVEAU FINAL_v2: α₂₇=0.892 [0.531;0.943] excluant CUE-DF/RT, ρ(37,27)=0.998 — argument lower-bound renforcé. Justification Feldt/Sijtsma intégrée ✓" },
  { id:"A2",  batch:"A", label:"Spearman ρ matrice",           ok:true,  delta:false, msg:"6 paires non-redondantes C(4,2)=6 ✓. ρ=1.000 exact equal×CRITIC expliqué: 'identical rank orderings on this 37×9 matrix, not uniform weights' — formulation anti-Saltelli solide. mean=0.989 >> seuil Saisana 0.85 ✓" },
  { id:"A3",  batch:"A", label:"Borda mécanique & AHP M2",     ok:true,  delta:true,  msg:"max=36 = 4×rank9 ✓. BINH_DUONG=36, tie DIAMNIADIO/SHEIKH=22 par swap entropy/variance ✓. NOUVEAU FINAL_v2: triangulation AHP-Saaty M2 nommée explicitement — top-2 et bottom-3 convergents. 'Convergence two methodologically different approaches' ✓" },
  { id:"A4",  batch:"A", label:"Poids KMST & arithmétique",    ok:true,  delta:false, msg:"w_K+w_M+w_S = 0.643+0.071+0.286 = 1.000 ✓. Panel mean: (5.5+5.0+4.5+5.0+5.5+5.0+5.0+6.0)÷8 = 41.5÷8 = 5.1875 ≈ 5.19 ✓. Shannon J: J_continent=0.67 (assumé, motivé causalement), J_model=0.95, J_age=0.82 ✓" },
  { id:"A5",  batch:"A", label:"AHP CR cascade",               ok:true,  delta:false, msg:"CR inter-axes=0.013 <0.10 §3.1 ✓. 22 matrices CR<0.05, médiane=0.034. Cohérence §3.1/§5.2 ✓. Aczél & Saaty (1983) + Saaty (1980/1990/2008) cités ✓" },
  { id:"A6",  batch:"B", label:"Références APA-7 critiques",   ok:true,  delta:false, msg:"Lees (2024) doi:10.1111/1468-2427.13240 IJURR ✓. Portelli & Lees (2018) zenodo DOI ✓. Bogaert (2011) doi:10.1111/j.1467-7660.2011.01694.x ✓. Mullins & Shwayri (2016) JUrban Technology doi:10.1080/10630732 ✓" },
  { id:"A7",  batch:"B", label:"⚠ Sireci + Rubio ABSENTS",     ok:false, delta:false, msg:"🔴 BLOQUANT — Sireci (1998) Social Indicators Research 45(1):83-117 ET Rubio et al. (2003) Social Work Research 27(2):94-104 cités en §6.3(g) — ABSENTS de la liste des références FINAL_v2. Correction identique demandée depuis v5.2. À insérer avant soumission Habitat International." },
  { id:"A8",  batch:"B", label:"⚠ Wali reform — source ?",     ok:null,  delta:true,  msg:"🟡 Footnote §3.2: 'Parliament was in advanced deliberation on a reform to Organic Law 111-14' sans citation. NOUVEAU FINAL_v2: footnote très développée (excellent contexte théorique). Recommandation: citer MAP (Agence Maghreb Arabe Presse) ou bulletin officiel pour ancrer la claim. Non-bloquant mais expose à reviewer." },
  { id:"A9",  batch:"B", label:"SKAD + Al Omrane sources",     ok:true,  delta:true,  msg:"NOUVEAU FINAL_v2: SKAD (2024) documenté avec Conseil Régional RSK proceedings ✓. Al Omrane opérations nommées: Jnane 1,2,3,4, Zitouna, Sania, péréquation mécanisme ✓. Primary sourcing différé à A3-KMST (Cities) ✓" },
  { id:"A10", batch:"B", label:"Rent gap sourcing",             ok:true,  delta:true,  msg:"NOUVEAU FINAL_v2: 25K-50K → 200K-300K MAD (4-12× appréciation) sourcé: professional knowledge + Avito.ma + Mubawab.ma (2024) ✓. Smith (1979/1987) rent gap theory intégré ✓. Note 1EUR=10.8MAD(2024) ✓. Transfert via attestations administratives (sans titre foncier) documenté ✓" },
  { id:"A11", batch:"C", label:"CUE-DF/RT retention Lawshe",   ok:true,  delta:true,  msg:"NOUVEAU FINAL_v2: Lawshe (1975) CVR framework cité explicitement pour content validity pre-Delphi ✓. Sireci (1998) + Rubio (2003) cités comme protocoles pré-Delphi (mais ABSENTS des refs — A7). Temporal heterogeneity: Hoyt (1933) + DiPasquale & Wheaton (1996) ✓. SUPP_A1_DF_RT_temporal_heterogeneity_v5.md ✓" },
  { id:"A12", batch:"C", label:"KMO omission justification",    ok:true,  delta:false, msg:"N≥5p: 37×5=185 >> 9 ✓. Matrice 37×37 rank-déficiente (rank≤n-1=8) ✓. Kaiser (1974) <0.50 = 'unacceptable' ✓. Bartlett sphéricité déferré A4-COMPARATIF ✓. 'Does not weaken validation' justifié Saisana+Greco ✓" },
  { id:"A13", batch:"C", label:"Bootstrap CI consistency",      ok:true,  delta:false, msg:"BCa B=2000 bias-accelerated Efron (1987) influence-function jackknife ✓. Percentile B=1000 backwards comparabilité ✓. Asymmetric lower=0.444 expliqué: right-skewed distribution Feldt (1987) pour petits n ✓. Upper=0.938 = boundary informative ✓" },
  { id:"A14", batch:"C", label:"27-indicateurs [NOUVEAU v2]",   ok:true,  delta:true,  msg:"EXCLUSIVEMENT FINAL_v2 — Recomputation 27 ind (excl. CUE-DF+RT): α₂₇=0.892 BCa [0.531;0.943] ✓. ρ(37,27)=0.998 rank-stability ✓. Top-2 Borda et KMST rank3/9 invariants ✓. Argument: 'global α sur 37 reste l'indicateur principal' renforcé ✓" },
  { id:"A15", batch:"C", label:"Règles agrégation KMST",        ok:true,  delta:false, msg:"Somme: 5 ind flux absolus (DF1, PS2,3,4,5) ✓. Binary threshold≥0.5: CUE-GU1 PDAU ✓. Pop-weighted mean: 31 ind restants ✓. 5+1+31=37 ✓. Fallback legacy KMST-aggregate si no sub-unit data ✓" },
  { id:"A16", batch:"D", label:"Sidi Taibi 220K estimation",    ok:true,  delta:false, msg:"RGPH 2024 est. explicitement labelé ✓. HCP (2024) cité ✓. Kénitra ~450K + Mehdiya ~50K + Sidi Taibi ~220K ≈ 720K cohérent avec C1 ≤800K ✓. Gros œuvre habité (éphasage) documenté avec non-conformités permis d'habiter ✓" },
  { id:"A17", batch:"D", label:"New Cairo rank-2 robustness",   ok:true,  delta:false, msg:"Coverage 20/37. S_CUE_available=0.601 (6 sub-groups vérifiés: DE+MC+GU+DF+RT+PS) ✓. Rank-2 maintenu sous 5 stratégies: complete case, axis-mean, k-NN k=3, k-NN k=5, MI Rubin (1987) ✓. Range [0.516;0.601] ✓" },
  { id:"A18", batch:"D", label:"Gouvernance paradoxe KMST",     ok:true,  delta:true,  msg:"NOUVEAU FINAL_v2: Kenitra GU=1.000 intra-KMST mais PA 2024 annulé — paradoxe explicitement analysé ✓. Recentralisation: SKAD substituant conseil communal = matérialisation RA-axis ✓. Wali reform: 'de facto recentralisation within formal decentralisation' ✓" },
  { id:"A19", batch:"E", label:"⚠ Figures vectorielles absentes",ok:false,delta:false, msg:"🔴 BLOQUANT — 6 placeholders '[Figure — voir version finale avec figures vectorielles]' ENCORE PRÉSENTS dans FINAL_v2. Figures 1-6 doivent être insérées: (1) Architecture conceptuelle RA-CUE-ULV, (2) Protocole sélection 37→22→8, (3) Distribution géographique n=9, (4) Heatmap CUE 9×7, (5) Spearman+Borda, (6) Carte KMST 3 communes." },
  { id:"A20", batch:"E", label:"Editorial & déclarations",       ok:true,  delta:false, msg:"Word count ~12,500 main text cohérent ✓. AI disclosure: 'Claude (Anthropic) as AI-assisted writing tool' ✓. Funding: none ✓. Ethics: no human subjects ✓. Data: Zenodo DOI upon acceptance ✓. Conflict: none ✓. Double-blind: auteur+affiliations redacted ✓" },
]

const SYSTEM_PROMPT = `Tu es TerriScan Research Assistant, l'IA du Laboratoire Data Live RA-CUE-ULV (Université Ibn Tofaïl Kénitra, FSHS, Labo Aménagement du Territoire, 2026). Thèse: Pr. AL KARKOURI Jamal (directeur), Pr. MIMOUNI Najate (co-encadrante). Soutenance: été 2026.

FRAMEWORK TRI-AXIAL:
- RA (Régionalisation Avancée) 30%, 8 groupes, 74 indicateurs — institutionnel
- CUE (Centralités Urbaines Émergentes) 40%, 7 groupes, 37 indicateurs — fonctionnel [VALIDÉ]
- ULV (Usages Locaux & Vie urbaine) 30%, 7 groupes, 31 indicateurs — expérientiel
- Total: 142 indicateurs, 22 groupes, AHP CR=0.013

MATRICE CUE (n=9, min-max, equal-weight):
R1 Binh Duong VN: S=0.673 AF=0.982 DE=0.548 MC=1.000 GU=0.630 DF=0.538 RT=0.814 PS=0.444 Borda=36
R2 New Cairo EG: S=0.522 AF=NA DE=0.573 MC=0.304 GU=0.950 DF=0.444 RT=0.428 PS=0.909 Borda=32 cov=20/37
R3 KMST MA: S=0.505 AF=NA DE=0.487 MC=0.482 GU=0.457 DF=0.889 RT=0.366 PS=0.817 Borda=28 cov=23/37
R4 Sheikh Zayed EG: S=0.494 AF=0.827 DE=0.325 MC=0.392 GU=0.329 DF=0.800 RT=0.662 PS=0.094 Borda=22
R5 Diamniadio SN: S=0.487 AF=NA DE=0.582 MC=0.304 GU=0.580 DF=0.400 RT=0.490 PS=0.596 Borda=22
R6 Manta EC: S=0.455 AF=0.442 DE=0.398 MC=0.319 GU=0.566 DF=0.459 RT=0.869 PS=0.149 Borda=16
R7 Sekondi-Takoradi GH: S=0.360 AF=0.434 DE=0.173 MC=0.227 GU=0.491 DF=0.455 RT=0.657 PS=0.105 Borda=12
R8 Bouaké CI: S=0.288 AF=0.336 DE=0.102 MC=0.204 GU=0.204 DF=0.496 RT=0.566 PS=0.133 Borda=8
R9 Pemba-Metuge MZ: S=0.182 AF=0.035 DE=0.034 MC=0.157 GU=0.133 DF=0.263 RT=0.464 PS=0.244 Borda=4

VALIDATION STATISTIQUE (Article A1 Habitat International IF=7.0):
- Cronbach α=0.880 BCa[0.512;0.957]B=2000 (primary) Percentile[0.444;0.938]B=1000
- α₂₇=0.892 BCa[0.531;0.943] (excl. CUE-DF+RT) ρ(37,27)=0.998
- Spearman ρ inter-méthodes: min=0.983 mean=0.989 max=1.000
- Borda top-2 invariant: BINH_DUONG+NEW_CAIRO toutes 4 méthodes

INTRA-KMST (sous-unités normalisées entre elles):
- Kénitra ~450K w=0.643: S=0.745 MC=0.800 GU=1.000 DF=1.000 RT=0.433 PS=0.833 [PA 2024 annulé]
- Mehdiya ~50K w=0.071: S=0.381 MC=0.237 GU=0.407 DF=0.000 RT=0.634 PS=0.300 [PA 2018 valide]
- Sidi Taibi ~220K w=0.286: S=0.241 MC=0.244 GU=0.000 DF=0.375 RT=0.400 PS=0.167 [PA 2005 expiré]

SIGNAL PRÉ-DÉPLACEMENT BIR RAMI SUD:
- CUE-DF=0.889 (pression foncière élevée) + CUE-RT=0.366 (résilience faible)
- Al Omrane opérations: Jnane 1-4, Zitouna, Sania — péréquation lots sociaux vs marché
- Rent gap: 25K-50K MAD → 200K-300K MAD (4-12× appréciation sans titre foncier)
- SKAD (SDL Wali) substituant conseil communal depuis 2024 = recentralisation de facto
- Gros œuvre habité (éphasage) + permis d'habiter non-conformes documentés

CORRECTIONS BLOQUANTES SOUMISSION:
1. AJOUTER: Sireci, S. G. (1998). Social Indicators Research, 45(1-3), 83-117.
2. AJOUTER: Rubio, D. M. et al. (2003). Social Work Research, 27(2), 94-104.
3. INSÉRER: 6 figures vectorielles (actuellement placeholders)
4. RECOMMANDÉ: citer MAP ou Parlement.ma pour Wali reform claim

PIPELINE ARTICLES:
A1 Habitat International IF=7.0 — CUE validation [PRÊT sauf corrections]
A2 Journal of Urban Affairs — RA axis (couverture 38%, cible Q3 2026)
A3 Cities IF=6.5 — ULV + KMST empirique (couverture 45%)
A4 Land Use Policy IF=6.1 — panel étendu n=37-50, Bartlett, Delphi
A5 World Development IF=6.9 — Transferability Score
A6 CEUS IF=7.8 — TerriScan API computable (open-source MIT)

Réponds en français, précis, orienté Q1. Tu maîtrises chaque valeur de la matrice, chaque choix méthodologique, chaque nuance statistique et chaque limitation déclarée.`

// ─── HELPERS ────────────────────────────────────────────────────────

function heat(v: number | null | undefined): { bg: string; tx: string } {
  if (v===null||v===undefined) return {bg:"#f1efe8",tx:"#888787"}
  if (v>=0.85) return {bg:"#1D9E75",tx:"#04342C"}
  if (v>=0.70) return {bg:"#5DCAA5",tx:"#04342C"}
  if (v>=0.50) return {bg:"#9FE1CB",tx:"#085041"}
  if (v>=0.35) return {bg:"#E1F5EE",tx:"#085041"}
  if (v>=0.20) return {bg:"#faeeda",tx:"#412402"}
  return {bg:"#FAECE7",tx:"#4A1B0C"}
}

const SG: SubGroup[] = ["saf","sde","smc","sgu","sdf","srt","sps"]
const SGLB: Record<SubGroup, string> = {saf:"AF",sde:"DE",smc:"MC",sgu:"GU",sdf:"DF",srt:"RT",sps:"PS"}
const SGFULL: Record<SubGroup, string> = {saf:"Accessibilité fonctionnelle",sde:"Diversification éco.",smc:"Morphologie & compacité",sgu:"Gouvernance intégrée",sdf:"Dynamiques foncières",srt:"Résilience territoriale",sps:"Positionnement stratégique"}

type BordaMethod = "equal" | "entropy" | "variance" | "CRITIC"
const BORDA_METHODS: BordaMethod[] = ["equal","entropy","variance","CRITIC"]
const BORDA_RANKS: BordaRank[] = [
  {e:"Binh Duong",borda:36,equal:1,entropy:1,variance:1,CRITIC:1},
  {e:"New Cairo", borda:32,equal:2,entropy:2,variance:2,CRITIC:2},
  {e:"KMST",      borda:28,equal:3,entropy:3,variance:3,CRITIC:3},
  {e:"Diamniadio",borda:22,equal:5,entropy:4,variance:4,CRITIC:5},
  {e:"Sheikh Z.", borda:22,equal:4,entropy:5,variance:5,CRITIC:4},
  {e:"Manta",     borda:16,equal:6,entropy:6,variance:6,CRITIC:6},
  {e:"Sekondi",   borda:12,equal:7,entropy:7,variance:7,CRITIC:7},
  {e:"Bouaké",    borda:8, equal:8,entropy:8,variance:8,CRITIC:8},
  {e:"Pemba",     borda:4, equal:9,entropy:9,variance:9,CRITIC:9},
]
const RHO: number[][] = [[1.000,0.983,0.983,1.000],[0.983,1.000,1.000,0.983],[0.983,1.000,1.000,0.983],[1.000,0.983,0.983,1.000]]

// ─── ONGLET MATRICE CUE ─────────────────────────────────────────────

function MatrixTab() {
  const [sel, setSel] = useState<string | null>(null)
  const ent: Entity | undefined = sel ? ENTITIES.find(e=>e.id===sel) : undefined
  return (
    <div>
      <div style={{overflowX:"auto",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr>
              <th style={{textAlign:"left",padding:"6px 8px",fontSize:11,color:"var(--color-text-secondary)",fontWeight:500,borderBottom:"1px solid var(--color-border-tertiary)"}}>Entité</th>
              <th style={{padding:"6px 8px",fontSize:11,color:"var(--color-text-secondary)",fontWeight:500,borderBottom:"1px solid var(--color-border-tertiary)",background:"#E1F5EE"}}>S_CUE</th>
              {SG.map(g=><th key={g} style={{padding:"6px 8px",fontSize:11,color:"var(--color-text-secondary)",fontWeight:500,borderBottom:"1px solid var(--color-border-tertiary)"}}>{SGLB[g]}</th>)}
              <th style={{padding:"6px 8px",fontSize:11,color:"var(--color-text-secondary)",fontWeight:500,borderBottom:"1px solid var(--color-border-tertiary)"}}>Cov.</th>
            </tr>
          </thead>
          <tbody>
            {ENTITIES.map(e=>{
              const h = heat(e.scue)
              const isKMST = e.id==="KMST"
              return (
                <tr key={e.id} onClick={()=>setSel(sel===e.id?null:e.id)}
                  style={{cursor:"pointer",background:sel===e.id?"#E6F1FB":(isKMST?"#fafaf5":"transparent"),borderLeft:isKMST?"3px solid #1D9E75":"3px solid transparent"}}>
                  <td style={{padding:"7px 8px",fontWeight:isKMST?500:400}}>
                    <span style={{fontSize:14,marginRight:4}}>{e.flag}</span>
                    <span style={{fontSize:12}}>R{e.rank} {e.name}</span>
                  </td>
                  <td style={{padding:"6px 8px",textAlign:"center",background:h.bg,color:h.tx,fontWeight:500,fontSize:12}}>
                    {e.scue.toFixed(3)}
                  </td>
                  {SG.map(g=>{
                    const v = e[g]
                    const c = heat(v)
                    return <td key={g} style={{padding:"6px 8px",textAlign:"center",background:c.bg,color:c.tx,fontSize:11}}>
                      {v===null?"—":v.toFixed(3)}
                    </td>
                  })}
                  <td style={{padding:"6px 8px",textAlign:"center",fontSize:11,color:"var(--color-text-secondary)"}}>{e.cov}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {ent && (
        <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:14,borderLeft:"3px solid #1D9E75"}}>
          <p style={{margin:"0 0 8px",fontWeight:500,fontSize:13}}>{ent.flag} {ent.name} — {ent.country}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
            {[{k:"Population",v:ent.pop},{k:"Modèle",v:ent.model},{k:"C1-C6",v:ent.c1c6},{k:"Borda",v:ent.borda+"/36"},{k:"Couverture",v:ent.cov},{k:"Rang",v:`${ent.rank}/9`}].map(({k,v})=>(
              <div key={k} style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)",padding:"8px 10px",border:"0.5px solid var(--color-border-tertiary)"}}>
                <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>{k}</p>
                <p style={{margin:0,fontSize:13,fontWeight:500}}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
            {SG.map(g=>{
              const v = ent[g]
              const c = heat(v)
              return <span key={g} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:c.bg,color:c.tx}}>
                {SGFULL[g]}: {v===null?"n/a":v.toFixed(3)}
              </span>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ONGLET KMST INTRA ──────────────────────────────────────────────

function KMSTTab() {
  return (
    <div>
      <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:12,marginBottom:12,border:"0.5px solid var(--color-border-tertiary)"}}>
        <p style={{margin:"0 0 4px",fontSize:12,fontWeight:500}}>KMST agrégé (pivot inter-panel)</p>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[{k:"S_CUE",v:"0.505"},{k:"DF (signal)",v:"0.889"},{k:"RT",v:"0.366"},{k:"PS",v:"0.817"},{k:"Rang",v:"3/9"},{k:"Borda",v:"28/36"}].map(({k,v})=>(
            <div key={k}>
              <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>{k}</p>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>{v}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:16}}>
        {KMST_SUBS.map(c=>(
          <div key={c.name} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <p style={{margin:0,fontSize:13,fontWeight:500}}>{c.name}</p>
              <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{c.pop} · w={c.wc}</span>
            </div>
            <div style={{background:heat(c.scue).bg,color:heat(c.scue).tx,borderRadius:6,padding:"6px 10px",textAlign:"center",marginBottom:8}}>
              <p style={{margin:0,fontSize:10}}>S_CUE (intra)</p>
              <p style={{margin:0,fontSize:20,fontWeight:500}}>{c.scue.toFixed(3)}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
              {(["smc","sgu","sdf","srt","sps"] as const).map(g=>{
                const v = c[g]
                const cl = heat(v)
                return <div key={g} style={{background:cl.bg,color:cl.tx,borderRadius:4,padding:"3px 5px",textAlign:"center"}}>
                  <p style={{margin:0,fontSize:9}}>{SGLB[g]}</p>
                  <p style={{margin:0,fontSize:11,fontWeight:500}}>{v===undefined?"—":v.toFixed(3)}</p>
                </div>
              })}
            </div>
            <p style={{margin:"8px 0 0",fontSize:10,color:"var(--color-text-secondary)",lineHeight:1.5}}>{c.note}</p>
          </div>
        ))}
      </div>
      <div style={{background:"#FAECE7",borderRadius:"var(--border-radius-md)",padding:12,borderLeft:"3px solid #D85A30"}}>
        <p style={{margin:"0 0 4px",fontSize:12,fontWeight:500,color:"#993C1D"}}>Signal pré-déplacement — Bir Rami Sud</p>
        <p style={{margin:0,fontSize:11,color:"#712B13",lineHeight:1.6}}>
          CUE-DF=0.889 (pression foncière max) + CUE-RT=0.366 (résilience faible) = configuration pré-déplacement active.
          Lots cédés 25K-50K MAD → marché 200K-300K MAD (<b>4-12×</b> sans titre foncier).
          Mécanisme péréquation Al Omrane: formalisation foncière → pression vente → déplacement silencieux.
          Smith (1979) rent gap formation: 15-20 ans avant visibilité dans données prix. TerriScan détecte en amont.
        </p>
      </div>
    </div>
  )
}

// ─── ONGLET BORDA + SPEARMAN ────────────────────────────────────────

function BordaTab() {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:500}}>Borda count (4 méthodes × 9 entités, max=36)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
              <th style={{textAlign:"left",padding:"5px 6px",fontWeight:500,color:"var(--color-text-secondary)"}}>Entité</th>
              <th style={{padding:"5px 6px",fontWeight:500,color:"var(--color-text-secondary)"}}>Borda</th>
              {BORDA_METHODS.map(m=><th key={m} style={{padding:"5px 6px",fontWeight:500,color:"var(--color-text-secondary)"}}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {BORDA_RANKS.map((r,i)=>(
              <tr key={r.e} style={{background:i<2?"#E1F5EE":i===2?"#fafaf5":"transparent"}}>
                <td style={{padding:"5px 6px",fontWeight:i<2?500:400}}>{i+1}. {r.e}</td>
                <td style={{padding:"5px 6px",textAlign:"center",fontWeight:500}}>{r.borda}</td>
                {BORDA_METHODS.map(m=>{
                  const v: number = r[m]
                  return <td key={m} style={{padding:"5px 6px",textAlign:"center",color:v<=2?"#0F6E56":v>=8?"#D85A30":"var(--color-text-primary)"}}>{v}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{margin:"6px 0 0",fontSize:10,color:"var(--color-text-secondary)"}}>Top-2 invariant toutes méthodes ✓ · Swap Diamniadio/Sheikh rang 4-5 (entropy/variance) ✓</p>
      </div>
      <div>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:500}}>Matrice Spearman ρ (6 paires non-redondantes)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
              <th style={{padding:"5px 6px",fontWeight:500,color:"var(--color-text-secondary)"}}></th>
              {BORDA_METHODS.map(m=><th key={m} style={{padding:"5px 6px",fontWeight:500,color:"var(--color-text-secondary)"}}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {RHO.map((row,i)=>(
              <tr key={i}>
                <td style={{padding:"5px 6px",fontWeight:500,color:"var(--color-text-secondary)"}}>{BORDA_METHODS[i]}</td>
                {row.map((v,j)=>{
                  const isOne = v===1.000
                  return <td key={j} style={{padding:"5px 6px",textAlign:"center",background:i===j?"#f1efe8":isOne?"#E1F5EE":"var(--color-background-primary)",fontWeight:isOne?500:400,color:isOne?"#0F6E56":"var(--color-text-primary)"}}>
                    {v.toFixed(3)}
                  </td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {[{k:"ρ min",v:"0.983"},{k:"ρ mean",v:"0.989"},{k:"ρ max",v:"1.000"}].map(({k,v})=>(
            <div key={k} style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"8px 10px",textAlign:"center"}}>
              <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>{k}</p>
              <p style={{margin:0,fontSize:14,fontWeight:500,color:"#0F6E56"}}>{v}</p>
            </div>
          ))}
        </div>
        <p style={{margin:"8px 0 0",fontSize:10,color:"var(--color-text-secondary)"}}>ρ=1.000 equal×CRITIC et entropy×variance exact (identical rank orderings, not uniform weights) — robustesse anti-Saltelli (2019) ✓</p>
      </div>
    </div>
  )
}

// ─── ONGLET STATISTIQUES ────────────────────────────────────────────

interface AlphaRow { sg: string; a: number; ci: string | null; bca: string | null; ok: boolean | null }

function StatsTab() {
  const alphas: AlphaRow[] = [
    {sg:"Global CUE (37 ind.)",a:0.880,ci:"[0.444;0.938]",bca:"[0.512;0.957]",ok:true},
    {sg:"CUE-AF (6 ind.)",a:0.940,ci:"[0.484;0.983]",bca:null,ok:true},
    {sg:"CUE-PS (5 ind.)",a:0.726,ci:"[0.396;0.875]",bca:null,ok:true},
    {sg:"CUE-GU (5 ind.)",a:0.675,ci:"[−0.020;0.823]",bca:null,ok:null},
    {sg:"CUE-DE (6 ind.)",a:0.546,ci:"[−0.903;0.817]",bca:null,ok:null},
    {sg:"CUE-MC (5 ind.)",a:0.318,ci:"[−2.236;0.726]",bca:null,ok:null},
    {sg:"CUE-RT (5 ind.)",a:0.171,ci:"[−2.253;0.666]",bca:null,ok:false},
    {sg:"CUE-DF (5 ind.)",a:0.041,ci:"[−7.337;0.536]",bca:null,ok:false},
    {sg:"27 ind. (excl. DF+RT)",a:0.892,ci:null,bca:"[0.531;0.943]",ok:true},
  ]
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,marginBottom:14}}>
        {[{k:"α global",v:"0.880",sub:"BCa [0.512;0.957]",c:"#1D9E75"},{k:"ρ mean",v:"0.989",sub:"min 0.983, max 1.000",c:"#378ADD"},{k:"Borda top-2",v:"Invariant",sub:"toutes 4 méthodes",c:"#533AB7"},{k:"n panel",v:"9",sub:"KMST + 8 benchmarks",c:"#BA7517"}].map(({k,v,sub,c})=>(
          <div key={k} style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"10px 12px"}}>
            <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>{k}</p>
            <p style={{margin:"2px 0 0",fontSize:16,fontWeight:500,color:c}}>{v}</p>
            <p style={{margin:0,fontSize:9,color:"var(--color-text-secondary)"}}>{sub}</p>
          </div>
        ))}
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
            <th style={{textAlign:"left",padding:"6px 8px",fontWeight:500,color:"var(--color-text-secondary)"}}>Sous-groupe</th>
            <th style={{padding:"6px 8px",fontWeight:500,color:"var(--color-text-secondary)"}}>α</th>
            <th style={{padding:"6px 8px",fontWeight:500,color:"var(--color-text-secondary)"}}>CI₉₅% percentile</th>
            <th style={{padding:"6px 8px",fontWeight:500,color:"var(--color-text-secondary)"}}>BCa (B=2000)</th>
            <th style={{padding:"6px 8px",fontWeight:500,color:"var(--color-text-secondary)"}}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {alphas.map(r=>(
            <tr key={r.sg} style={{borderBottom:"0.5px solid var(--color-border-tertiary)",background:r.sg.includes("Global")||r.sg.includes("27")?"#E1F5EE":"transparent"}}>
              <td style={{padding:"6px 8px",fontWeight:r.sg.includes("Global")||r.sg.includes("27")?500:400}}>{r.sg}</td>
              <td style={{padding:"6px 8px",textAlign:"center",fontWeight:500}}>{r.a.toFixed(3)}</td>
              <td style={{padding:"6px 8px",textAlign:"center",fontSize:10,color:"var(--color-text-secondary)"}}>{r.ci||"—"}</td>
              <td style={{padding:"6px 8px",textAlign:"center",fontSize:10,color:"var(--color-text-secondary)"}}>{r.bca||"—"}</td>
              <td style={{padding:"6px 8px",textAlign:"center"}}>{r.ok===true?"✅ valide":r.ok===false?"🔴 à valider A4":"🟡 exploratoire"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{margin:"8px 0 0",fontSize:10,color:"var(--color-text-secondary)"}}>KMO non reporté (n=9 &lt;&lt; N≥5p=185, Hair 2010). Bartlett déferré A4-COMPARATIF (n=37-50). α global = indicateur principal de validité per Saisana (2005) + Greco (2019).</p>
    </div>
  )
}

// ─── ONGLET AUDIT 20 AGENTS ─────────────────────────────────────────

function AuditTab() {
  const [open, setOpen] = useState<string | null>(null)
  const batches = ["A","B","C","D","E"]
  const blabels: Record<string, string> = {A:"Cohérence statistique",B:"Intégrité bibliographique",C:"Cohérence méthodologique",D:"Intégrité empirique",E:"Editorial & déclarations"}
  const errors = AGENTS.filter(a=>a.ok===false).length
  const warns = AGENTS.filter(a=>a.ok===null).length
  const oks = AGENTS.filter(a=>a.ok===true).length
  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{background:"#FAECE7",borderRadius:"var(--border-radius-md)",padding:"8px 14px",border:"1px solid #F5C4B3"}}>
          <p style={{margin:0,fontSize:11,color:"#993C1D"}}>🔴 Bloquants: {errors}</p>
        </div>
        <div style={{background:"#FAEEDA",borderRadius:"var(--border-radius-md)",padding:"8px 14px",border:"1px solid #FAC775"}}>
          <p style={{margin:0,fontSize:11,color:"#854F0B"}}>🟡 Recommandés: {warns}</p>
        </div>
        <div style={{background:"#EAF3DE",borderRadius:"var(--border-radius-md)",padding:"8px 14px",border:"1px solid #C0DD97"}}>
          <p style={{margin:0,fontSize:11,color:"#3B6D11"}}>✅ Validés: {oks}</p>
        </div>
        <div style={{background:"#E6F1FB",borderRadius:"var(--border-radius-md)",padding:"8px 14px",border:"1px solid #B5D4F4"}}>
          <p style={{margin:0,fontSize:11,color:"#185FA5"}}>🔵 Nouveautés FINAL_v2: {AGENTS.filter(a=>a.delta).length}</p>
        </div>
      </div>
      {batches.map(b=>(
        <div key={b} style={{marginBottom:10}}>
          <p style={{margin:"0 0 6px",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)"}}>Batch {b} — {blabels[b]}</p>
          {AGENTS.filter(a=>a.batch===b).map(a=>{
            const isOpen = open===a.id
            const statusBg = a.ok===false?"#FAECE7":a.ok===null?"#FAEEDA":"#EAF3DE"
            const statusBd = a.ok===false?"#F5C4B3":a.ok===null?"#FAC775":"#C0DD97"
            return (
              <div key={a.id} onClick={()=>setOpen(isOpen?null:a.id)}
                style={{background:statusBg,border:`0.5px solid ${statusBd}`,borderRadius:"var(--border-radius-md)",padding:"8px 12px",marginBottom:4,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <p style={{margin:0,fontSize:12}}>
                    <span style={{fontWeight:500,marginRight:6}}>{a.id}</span>
                    {a.label}
                    {a.delta&&<span style={{marginLeft:6,fontSize:10,background:"#E6F1FB",color:"#185FA5",padding:"1px 6px",borderRadius:10}}>new v2</span>}
                  </p>
                  <span style={{fontSize:11}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&<p style={{margin:"6px 0 0",fontSize:11,lineHeight:1.6,color:"var(--color-text-secondary)"}}>{a.msg}</p>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── ONGLET ASSISTANT IA (Anthropic direct fetch) ───────────────────

function AssistantTab() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [input, setInput] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const ref = useRef<HTMLDivElement | null>(null)

  async function send() {
    const q = input.trim()
    if(!q||loading) return
    setInput("")
    const newMsgs: ChatMessage[] = [...msgs, {role:"user",content:q}]
    setMsgs(newMsgs)
    setLoading(true)
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": ((import.meta as { env?: { VITE_ANTHROPIC_API_KEY?: string } }).env?.VITE_ANTHROPIC_API_KEY) ?? "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:SYSTEM_PROMPT,
          messages:newMsgs.map(m=>({role:m.role,content:m.content}))
        })
      })
      const data = await res.json()
      const reply: string = data.content?.find((c: { type: string })=>c.type==="text")?.text || "Erreur de réponse."
      setMsgs([...newMsgs,{role:"assistant",content:reply}])
    } catch(e) {
      const err = e as Error
      setMsgs([...newMsgs,{role:"assistant",content:"Erreur API: "+err.message}])
    }
    setLoading(false)
    setTimeout(()=>ref.current?.scrollTo(0,9999),100)
  }

  const starters = ["Pourquoi KMST est classé rank 3 et non 4 ?","Quelle est l'implication méthodologique du ρ=1.000 entre equal et CRITIC ?","Explique le signal pré-déplacement Bir Rami Sud avec les scores CUE","Quelles sont les 3 corrections bloquantes avant soumission Habitat International ?","Pourquoi CUE-DF a un α=0.041 malgré une validité théorique forte ?"]

  return (
    <div style={{display:"flex",flexDirection:"column",height:480}}>
      <div ref={ref} style={{flex:1,overflowY:"auto",marginBottom:10,display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0&&(
          <div style={{padding:12}}>
            <p style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:10}}>Questions suggérées :</p>
            {starters.map((s,i)=>(
              <button key={i} onClick={()=>{setInput(s)}} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",marginBottom:5,fontSize:11,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer",color:"var(--color-text-primary)"}}>
                ↗ {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{padding:"10px 12px",borderRadius:"var(--border-radius-md)",background:m.role==="user"?"var(--color-background-info)":"var(--color-background-secondary)",maxWidth:"90%",alignSelf:m.role==="user"?"flex-end":"flex-start",fontSize:12,lineHeight:1.6,color:"var(--color-text-primary)"}}>
            {m.content}
          </div>
        ))}
        {loading&&<div style={{padding:"10px 12px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",alignSelf:"flex-start",fontSize:12,color:"var(--color-text-secondary)"}}>Analyse en cours…</div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Pose une question sur la matrice CUE, KMST, les stats…"
          style={{flex:1,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",fontSize:12,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
        <button onClick={send} disabled={loading} style={{padding:"8px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",cursor:loading?"not-allowed":"pointer",fontSize:12,color:"var(--color-text-primary)"}}>
          {loading?"…":"Envoyer ↗"}
        </button>
      </div>
    </div>
  )
}

// ─── SHELL TABS + APP ───────────────────────────────────────────────

const TABS = [
  {id:"matrix",label:"Matrice CUE"},
  {id:"kmst",label:"KMST"},
  {id:"borda",label:"Borda / ρ"},
  {id:"stats",label:"Statistiques"},
  {id:"audit",label:"Audit 20A"},
  {id:"assistant",label:"Assistant RA"},
]

export default function TerriScanLab() {
  const [tab, setTab] = useState<string>("matrix")
  const errors = AGENTS.filter(a=>a.ok===false).length
  return (
    <div style={{padding:"0 0 20px",fontFamily:"var(--font-sans)"}}>
      <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"14px 18px",marginBottom:14,border:"0.5px solid var(--color-border-tertiary)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <p style={{margin:0,fontSize:14,fontWeight:500}}>TerriScan · Laboratoire Data Live — v5.2_FINAL_v2</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"var(--color-text-secondary)"}}>CUE · Centralités Urbaines Émergentes · Thèse Ibn Tofaïl · 2026</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#EAF3DE",color:"#3B6D11"}}>α=0.880 ✓</span>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#E6F1FB",color:"#185FA5"}}>ρ≥0.983</span>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#EEEDFE",color:"#3C3489"}}>Borda top-2 invariant</span>
            {errors>0&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#FAECE7",color:"#993C1D"}}>🔴 {errors} bloquants</span>}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:tab===t.id?"var(--color-background-primary)":"transparent",color:tab===t.id?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:tab===t.id?500:400,fontSize:12,cursor:"pointer"}}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",padding:18,border:"0.5px solid var(--color-border-tertiary)"}}>
        {tab==="matrix"&&<MatrixTab/>}
        {tab==="kmst"&&<KMSTTab/>}
        {tab==="borda"&&<BordaTab/>}
        {tab==="stats"&&<StatsTab/>}
        {tab==="audit"&&<AuditTab/>}
        {tab==="assistant"&&<AssistantTab/>}
      </div>
      <p style={{margin:"8px 0 0",fontSize:9,color:"var(--color-text-secondary)",textAlign:"center"}}>RA-CUE-ULV · Université Ibn Tofaïl Kénitra · FSHS · Labo Aménagement du Territoire · Géo-Environnement &amp; Développement · 28/05/2026</p>
    </div>
  )
}
