import { Injectable } from "@nestjs/common";

/**
 * P2ContractService — génère le HTML imprimable du contrat type unifié d'Architecte
 *
 * Source: Contrat type unifié d'Architecte CONSTRUCTION (Secteur Privé)
 * Version adoptée par le Conseil National de l'Ordre des Architectes
 * Lors de la réunion statutaire du 28 février 2024
 *
 * Le template HTML reproduit MOT POUR MOT le document Word officiel CNOA 2024.
 * Couvre toutes les portes P1/P2 (le contrat type est unifié, non spécifique au type
 * de projet).
 *
 * Variables remplies depuis:
 *   - Dossier (Prisma): client, projet, quote snapshot
 *   - AdminParams: architecte (MOEuvre), délais, pénalités, contrat n°
 */

export type AdminContractParams = {
  // N° contrat (séquence ou manuel)
  contratNumero?: string;
  // CROA territorialement compétent
  croaName?: string;
  croaTel?: string;
  croaFax?: string;
  croaEmail?: string;
  // MOEuvre — architecte signataire (CITURBAREA)
  archNom?: string;
  archCIN?: string;
  archCINDelivreA?: string;
  archCINDate?: string;
  archDomicile?: string;
  archAutorisation?: string;
  archAutorisationAnnee?: string;
  archICE?: string;
  archRC?: string;
  archCNSS?: string;
  archTel?: string;
  archFax?: string;
  archEmail?: string;
  // MO — détails supplémentaires
  moClientDelivreA?: string;
  moClientDateCIN?: string;
  moAgissantQualite?: string;
  moFax?: string;
  // Délais (article 8)
  delaiEtudesJours?: number;
  delaiTravauxMois?: number;
  // Pénalités
  penaliteMOPourcentJour?: number;
  penaliteMOEPourcentJour?: number;
  // Annexes
  excludeAnnexe1?: boolean;
  // Phases (article 7) — taux % par phase et cumul %
  phaseRates?: {
    A1?: number; A2?: number; A3?: number; A4?: number; A5?: number;
    B1?: number; B2?: number; B3?: number; B4?: number;
    C1?: number; C2?: number; C3?: number;
  };
};

export type DossierContractData = {
  id: string;
  // Identité MO
  clientNom?: string;
  clientCIN?: string;
  clientTel?: string;
  clientEmail?: string;
  raisonSociale?: string | null;
  representant?: string;
  rc?: string;
  ice?: string;
  cnss?: string;
  clientDomicile?: string;
  // Projet
  title?: string;
  commune?: string;
  prefecture?: string;
  natureProjet?: string;
  surfaceTerrainM2?: number;
  surfacePlancherM2?: number;
  titreFoncierNum?: string;
  // CUS / COS / Hauteur
  cus?: number;
  cos?: number;
  hauteurMoyenne?: number;
  rLevel?: number;
  // Brief P2 (depuis payload.brief)
  brief?: {
    sectionP2?: string;
    categoryCode?: string;
    categoryLabel?: string;
    surfacePlancherM2?: number;
    nbBatiments?: number;
    surfaceTerrainHa?: number;
    followMode?: string;
    quoteSnapshot?: any;
  };
  createdAt?: Date | string;
};

@Injectable()
export class P2ContractService {
  renderContractHtml(d: DossierContractData, admin: AdminContractParams = {}): string {
    const q = d.brief?.quoteSnapshot;
    const honoraires = q?.honoraires ?? {};
    const meta = q?.meta ?? {};
    const base = q?.base ?? {};

    // Helpers d'affichage
    const fmt = (n: any) => Number.isFinite(Number(n))
      ? new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(Number(n))
      : "……………………………";
    const dash = (s: any) => (s == null || s === "" ? "……………………………" : String(s));
    const dashShort = (s: any) => (s == null || s === "" ? "……………………" : String(s));
    const dashPct = (n: any) => (n == null || n === "" ? "……" : `${Number(n).toFixed(2)}`);
    const today = new Date().toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });

    // Architecte par défaut: CITURBAREA placeholder
    const archNom = admin.archNom || "……………………………………………………………………………";
    const croaName = admin.croaName || "……………………………………………………………………………";
    const croaTel = admin.croaTel || "…………………………………";
    const croaFax = admin.croaFax || "…………………………………";
    const croaEmail = admin.croaEmail || "…………………………………………………";

    // Project title
    const projectTitle = d.title || `${meta.sectionLabel || "Projet"} — ${d.commune || ""}`;
    const natureProjet = d.natureProjet || projectTitle;

    // Surfaces & coûts
    const surfaceTerrain = d.surfaceTerrainM2 ?? base.surfaceTerrainM2;
    const surfacePlancher = d.surfacePlancherM2 ?? base.surfacePlancherM2;
    const coutM2 = base.coutConstructionM2;
    const coutTravaux = base.coutTravauxEstime;
    const categoryLabel = meta.categoryLabel || d.brief?.categoryLabel;

    // Honoraires
    const honorairesHT = honoraires.totalHT;
    const honorairesTTC = honoraires.totalTTC;
    const tvaRate = honoraires.tvaRate ?? 0.2;
    const tva = honoraires.tva;
    const honosTauxPct = honoraires.rate != null ? (honoraires.rate * 100).toFixed(2) : "5,00";

    // Phases rates (par défaut : barème standard CNOA 40%/30%/30%)
    const pr = admin.phaseRates || {};
    const r = (v: any, def: string) => v != null ? `${Number(v).toFixed(2)}` : def;
    const cumul = (vals: any[]) => {
      let s = 0; const out: string[] = [];
      for (const v of vals) {
        if (v != null) { s += Number(v); out.push(s.toFixed(2)); }
        else out.push("……");
      }
      return out;
    };
    const cumA = cumul([pr.A1, pr.A2, pr.A3, pr.A4, pr.A5]);
    const cumB = cumul([pr.B1, pr.B2, pr.B3, pr.B4]).map(x => x); // continued cumul not yet computed

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Contrat type unifié d'Architecte — ${dash(d.title)}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none !important; } }
  body { font-family: "Times New Roman", Times, serif; color: #111; max-width: 820px; margin: 24px auto; padding: 0 32px 60px; line-height: 1.5; font-size: 11.5pt; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; z-index: 10; }
  .toolbar button { background: #b45309; color: #fff; border: 0; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .toolbar button.secondary { background: #fff; color: #111; border: 1px solid #d1d5db; }
  .cnoa-header { text-align: center; font-size: 10pt; line-height: 1.4; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px double #999; }
  .cnoa-header .cr-line { margin-top: 6px; text-align: left; }
  h1 { font-size: 18pt; text-align: center; margin: 32px 0 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  h1.subtitle { font-size: 14pt; margin: 4px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .num-contrat { text-align: center; font-size: 12pt; margin: 12px 0 6px; }
  .version-mention { text-align: center; font-style: italic; font-size: 10.5pt; color: #555; margin-bottom: 28px; line-height: 1.4; }
  .entre, .et-entre { text-align: center; font-style: italic; font-size: 11.5pt; margin: 14px 0 8px; font-weight: 600; }
  .party-block { margin: 0 0 18px; padding: 0 0 0 12px; border-left: 3px solid #b45309; font-size: 11.5pt; line-height: 1.7; }
  .party-block p { margin: 4px 0; }
  .party-label { font-size: 10pt; color: #6b7280; font-style: italic; text-align: center; margin: 12px 0; }
  .convention { text-align: center; font-weight: 600; margin: 28px 0; padding: 12px; background: #fef3c7; border-radius: 4px; }
  h2 { font-size: 13pt; margin: 32px 0 12px; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 6px; border-bottom: 2px solid #b45309; color: #92400e; font-weight: 700; }
  ol.textref { padding-left: 24px; font-size: 10.5pt; line-height: 1.55; }
  ol.textref li { margin: 6px 0; }
  h3.article-title { font-size: 12.5pt; margin: 28px 0 10px; font-weight: 700; color: #92400e; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
  p.article-body { margin: 8px 0; text-align: justify; }
  ul.bullets { padding-left: 24px; margin: 8px 0; }
  ul.bullets li { margin: 6px 0; text-align: justify; }
  .sub-section { margin: 14px 0 8px; font-weight: 700; font-style: italic; }
  table.consistance { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt; }
  table.consistance td { padding: 6px 8px; border-bottom: 1px dotted #d1d5db; }
  table.consistance td.label { width: 60%; }
  table.consistance td.val { font-weight: 600; }
  table.honos-calcul { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt; }
  table.honos-calcul td { padding: 6px 8px; }
  table.honos-calcul td.label { color: #555; }
  table.honos-calcul td.val { text-align: right; font-weight: 600; font-family: "DM Mono", "Courier New", monospace; }
  table.honos-calcul tr.total td { background: #fef3c7; font-weight: 700; border-top: 2px solid #b45309; border-bottom: 2px solid #b45309; }
  table.phases { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  table.phases th, table.phases td { border: 1px solid #999; padding: 6px 8px; vertical-align: middle; }
  table.phases th { background: #f3f4f6; text-align: center; font-weight: 700; font-size: 10pt; }
  table.phases td.c { text-align: center; }
  table.phases td.phase { text-align: center; font-weight: 700; background: #fafafa; font-size: 12pt; }
  table.phases tr.phase-row td.phase { background: #fef3c7; }
  .montant-final { background: #fef3c7; border-radius: 6px; padding: 18px 22px; margin: 32px 0; font-size: 11.5pt; line-height: 1.6; }
  .montant-final strong { font-size: 13.5pt; color: #92400e; }
  .signatures { margin-top: 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .sig-box { text-align: center; padding: 12px; }
  .sig-box .label { font-size: 9pt; color: #6b7280; font-style: italic; margin-bottom: 4px; }
  .sig-box .role { font-weight: 700; margin-bottom: 90px; }
  .sig-box .line { border-top: 1px solid #111; padding-top: 4px; font-size: 9pt; color: #6b7280; }
  .visa-zone { margin: 48px auto 0; max-width: 540px; padding: 18px 22px; border: 2px dashed #b45309; border-radius: 6px; text-align: center; }
  .visa-zone .title { color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10pt; margin-bottom: 6px; }
  .footer-note { text-align: center; color: #6b7280; font-size: 9pt; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  .filled { font-weight: 600; }
  .underline-fill { border-bottom: 1px dotted #999; padding: 0 4px; min-width: 100px; display: inline-block; }
</style>
</head>
<body>

<div class="toolbar no-print">
  <button onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
  <button class="secondary" onclick="window.close()">Fermer</button>
</div>

<!-- ───────── EN-TÊTE CNOA ───────── -->
<div class="cnoa-header">
  <strong>Conseil National de l'Ordre des Architectes</strong><br/>
  C5, Résidence Moulay Ismaïl – Square Washington - RABAT<br/>
  Tél. 05.37.26.29.82 - Fax 05.37.26.29.83 / E-mail : conseilnationaldesarchitectes@gmail.com
  <div class="cr-line">
    <strong>CR de</strong> ${croaName}<br/>
    <strong>Tél.</strong> ${croaTel} / <strong>Fax</strong> ${croaFax}<br/>
    <strong>E-mail :</strong> ${croaEmail}
  </div>
</div>

<h1>CONTRAT TYPE UNIFIE D'ARCHITECTE</h1>
<h1 class="subtitle">CONSTRUCTION (SECTEUR PRIVÉ)</h1>
<div class="num-contrat"><strong>N° :</strong> ${dash(admin.contratNumero)}</div>
<div class="version-mention">
  Version adoptée par le Conseil National de l'Ordre des Architectes<br/>
  Lors de la réunion statutaire du 28 Février 2024
</div>

<!-- ───────── PARTIES ───────── -->
<p class="entre">Entre</p>

<div class="party-block">
  <p>Mme./M. <span class="filled">${dash(d.raisonSociale || d.clientNom)}</span>
  ${d.representant ? `Représentant <span class="filled">${dash(d.representant)}</span>` : ""}
  agissant en qualité de : <span class="filled">${dash(admin.moAgissantQualite)}</span></p>
  <p>C.I.N N° : <span class="filled">${dash(d.clientCIN)}</span>
  Délivré à <span class="filled">${dash(admin.moClientDelivreA)}</span>
  le <span class="filled">${dash(admin.moClientDateCIN)}</span></p>
  <p>Domicilié à : <span class="filled">${dash(d.clientDomicile)}</span></p>
  <p>Tél : <span class="filled">${dash(d.clientTel)}</span>
  Fax : <span class="filled">${dash(admin.moFax)}</span></p>
  <p>E-Mail : <span class="filled">${dash(d.clientEmail)}</span></p>
  ${d.rc || d.ice || d.cnss ? `<p>RC : <span class="filled">${dash(d.rc)}</span> &nbsp;|&nbsp; ICE : <span class="filled">${dash(d.ice)}</span> &nbsp;|&nbsp; CNSS : <span class="filled">${dash(d.cnss)}</span></p>` : ""}
</div>
<p class="party-label">Désigné ci-après par « <em>le maître de l'ouvrage</em> » ;</p>
<p class="entre">D'une part,</p>

<p class="entre">Et,</p>

<div class="party-block">
  <p>Mme/M. <span class="filled">${archNom}</span>, Architecte Inscrit à l'Ordre National des Architectes,</p>
  <p>et autorisé à exercer sous le n° <span class="filled">${dash(admin.archAutorisation)}</span>
  du <span class="filled">${dash(admin.archAutorisationAnnee)}</span></p>
  <p>Domicilié à <span class="filled">${dash(admin.archDomicile)}</span></p>
  <p>ICE n° : <span class="filled">${dash(admin.archICE)}</span> &nbsp; RC. n° <span class="filled">${dash(admin.archRC)}</span> &nbsp; C.N.S.S. n° <span class="filled">${dash(admin.archCNSS)}</span></p>
  <p>Tél : <span class="filled">${dash(admin.archTel)}</span> &nbsp; Fax : <span class="filled">${dash(admin.archFax)}</span></p>
  <p>E-Mail : <span class="filled">${dash(admin.archEmail)}</span></p>
</div>
<p class="party-label">Désigné ci-après par « <em>architecte - maître de l'œuvre</em> » ;</p>
<p class="entre">D'autre Part.</p>

<p class="convention">Il a été convenu d'un commun accord ce qui suit :</p>

<!-- ───────── TEXTES DE REFERENCE ───────── -->
<h2>Textes de référence</h2>
<ol class="textref">
  <li>Dahir formant code des obligations et contrats du 12 août 1913 ;</li>
  <li>Loi n° 016/89 du 10 septembre 1993 relative à l'exercice de la profession d'architecte et à l'institution de l'Ordre National des Architectes ;</li>
  <li>Loi n° 25-90 du 17 juin 1992 relative aux lotissements, groupes d'habitations et morcellements et la Loi n° 12-90 du 17 juin 1992 relative à l'urbanisme, telles qu'elles ont été amendées par la loi n° 66-12 du 19/09/2016 relative au contrôle et répression des infractions en matière d'urbanisme et de construction ;</li>
  <li>Loi n° 02-2000 relative aux droits d'auteur et droits voisins, telle qu'elle a été modifiée et complétée par la loi n° 34-05 du 14 février 2006 et la loi n° 79-12 du 20 mai 2014 ;</li>
  <li>Le règlement intérieur en vigueur de l'Ordre National des Architectes ;</li>
  <li>Loi n° 104-12 sur la liberté des prix et de la concurrence telle que modifiée et complétée par la loi 40.21 ;</li>
  <li>L'accord d'entente à l'amiable signé entre le Conseil de la Concurrence et le Conseil National de l'Ordre des Architectes en date du 22 février 2022 ;</li>
  <li>Annexe n°1 au présent contrat d'architecte détaillant les missions et les obligations des deux parties.</li>
</ol>

<!-- ───────── ARTICLE 1 ───────── -->
<h3 class="article-title">Article 1 : Objet du contrat</h3>
<p class="article-body">
  Le maître d'ouvrage, Mme./M. <span class="filled">${dash(d.raisonSociale || d.clientNom)}</span>,
  confie à Mme/M. <span class="filled">${archNom}</span>, architecte (ou représentant légal du groupement ou société d'architectes),
  la mission de concevoir et suivre l'exécution jusqu'à son terme du projet de :
</p>
<p class="article-body filled" style="padding: 8px 14px; background: #f9fafb; border-left: 3px solid #b45309;">
  ${dash(natureProjet)}
</p>
<p class="article-body">
  Sur un terrain objet du Titre Foncier n° : <span class="filled">${dash(d.titreFoncierNum)}</span>
  d'une superficie de : <span class="filled">${fmt(surfaceTerrain)} m²</span>
</p>
<p class="article-body">
  Sis à : <span class="filled">${dash(d.commune)}</span>
</p>
<p class="article-body">
  Préfecture : <span class="filled">${dash(d.prefecture)}</span>
  &nbsp;&nbsp; Commune : <span class="filled">${dash(d.commune)}</span>
</p>
<p class="article-body">Selon les modalités détaillées ci-après.</p>

<!-- ───────── ARTICLE 2 ───────── -->
<h3 class="article-title">Article 2 : Missions Obligatoires de l'architecte</h3>
<p class="article-body">
  L'Architecte sert, en toute conscience les intérêts de son client, conformément aux dispositions légales en vigueur notamment la loi n° 16.89, et le règlement intérieur de l'Ordre National des Architectes.
</p>
<p class="article-body">
  — L'architecte se doit disposer de moyens humains et matériels pour accomplir les missions prévues dans le contrat signé entre l'architecte et le client.
</p>
<p class="article-body">
  La mission de l'Architecte, telle que détaillée dans les articles 1 et 3 en annexe n°1, comporte :
</p>
<ul class="bullets">
  <li>Concevoir ou modifier l'œuvre architecturale.</li>
  <li>Établir tous documents architecturaux graphiques et écrits relatifs à la conception ou la modification de la construction, en particulier ceux à fournir à la commune pour l'obtention du permis de construire conformément à la réglementation en vigueur.</li>
  <li>Veiller à la conformité des études techniques réalisées par les ingénieurs spécialisés avec la conception architecturale et les plans autorisés « NE VARIETUR ».</li>
  <li>Suivre les travaux de construction, et en contrôler la conformité avec les plans architecturaux et les indications de l'autorisation de construire, et établir une attestation déclarant l'achèvement des travaux et la conformité aux plans autorisés en vue d'obtention du permis d'habiter.</li>
</ul>

<!-- ───────── ARTICLE 3 ───────── -->
<h3 class="article-title">Article 3 : Obligations du maître d'ouvrage</h3>
<p class="article-body">
  M. <span class="filled">${dash(d.raisonSociale || d.clientNom)}</span> en tant que maître d'ouvrage, s'engage avec l'Architecte pour les missions définies dans l'article 2 du présent contrat. Il lui notifie par écrit les éléments et phases de ces missions ; chaque phase est réceptionnée et approuvée par écrit par le maître d'ouvrage, et vaut ordre service pour la phase suivante. Le maître d'ouvrage peut désigner une personne physique ayant qualité pour le représenter et donner toutes informations à l'Architecte.
</p>
<p class="article-body">
  Il appartient au seul maître de l'ouvrage de justifier, à l'égard des tiers, de son droit de construire sur le terrain support du projet. Sous son entière responsabilité, il communique à l'architecte tous renseignements relatifs à la propriété, aux limites séparatives, mitoyennetés et servitudes, aux baux et règlements de copropriété, etc.
</p>
<div class="sub-section">Programme</div>
<p class="article-body">
  Le maître d'ouvrage fournit à l'Architecte le programme détaillé de l'opération projetée, permettant de définir tous les éléments de la composition, leur importance, leurs relations et leurs exigences particulières.
</p>
<p class="article-body">
  Le programme doit être compatible avec le terrain dont dispose le maître de l'ouvrage. Si les constructions à réaliser sont assujetties à des normes ou prescriptions particulières, le programme doit comporter la référence précise des textes définissant ces sujétions.
</p>
<p class="article-body">La validation de l'esquisse le cas échéant vaut validation du programme.</p>
<p class="article-body">Le maître d'ouvrage s'engage à :</p>
<ul class="bullets">
  <li>Fournir à l'architecte tous les documents nécessaires à la conception et à l'établissement des plans demandés (plans topographiques et parcellaires, études des sols, relevés, etc.) conformément à l'article 4 en annexe n°1, ainsi que toute pièce administrative à verser au dossier de demande d'autorisation de construire.</li>
  <li>Il est tenu de faire dresser, à ses frais, par des ingénieurs spécialisés, les études techniques imposées par les règlements en vigueur (plans coté, plans de béton armé, électricité, plomberie, chauffage, climatisation, notice de sécurité incendie, étude d'impact etc.).</li>
  <li>Il notifie à l'architecte par écrit la date souhaitée pour l'ouverture de chantier afin que ce dernier annonce la déclaration d'ouverture de chantier et le commencement des travaux.</li>
  <li>Il permettra aux agents de l'administration et du Conseil Régional de l'Ordre National des Architectes de procéder aux visites et contrôles qu'ils jugent utiles, chacun dans la limite de ses prérogatives.</li>
  <li>Outre l'obligation de l'identification du chantier (Affichage), il est tenu de garder sur les lieux des travaux, une copie des plans autorisés « NE VARIETUR » et de réserver à l'architecte un lieu sécurisé pour que ce dernier y tienne le cahier de chantier.</li>
</ul>
<div class="sub-section">3-2 Responsabilité, sécurité et assurance</div>
<p class="article-body">
  Le maître d'ouvrage veille à ce que les intervenants (architecte et ingénieurs spécialisés) souscrivent à une assurance professionnelle couvrant leurs responsabilités professionnelles conformément aux lois et règlements en vigueur, l'entreprise quant à elle devra obligatoirement souscrire à une assurance tout risque chantier « RC et travaux » et toute assurance prévue par la loi. L'Architecte n'assumera les responsabilités professionnelles définies par les lois et règlements en vigueur que dans la mesure de ses fautes professionnelles. Il ne pourra être tenu pour responsable des fautes commises par d'autres intervenants.
</p>

<!-- ───────── ARTICLE 4 ───────── -->
<h3 class="article-title">Article 4 : Présentation du Projet et Estimation Provisoire des Travaux</h3>
<div class="sub-section">Consistance du projet :</div>
<table class="consistance">
  <tr><td class="label">a — Superficie totale du terrain :</td><td class="val">${fmt(surfaceTerrain)} m²</td></tr>
  <tr><td class="label">b — Superficie de plancher y compris sous-sol :</td><td class="val">${fmt(surfacePlancher)} m²</td></tr>
  <tr><td class="label">c — Coefficient d'utilisation du sol (CUS) :</td><td class="val">${dashShort(d.cus)}</td></tr>
  <tr><td class="label">d — Coefficient d'occupation du sol (COS) :</td><td class="val">${dashShort(d.cos)}</td></tr>
  <tr><td class="label">e — Hauteur moyenne des constructions :</td><td class="val">${dashShort(d.hauteurMoyenne)} ${d.rLevel != null ? `(R + ${d.rLevel})` : "(R + ……)"}</td></tr>
</table>

<div class="sub-section">Estimation provisoire des travaux (valable jusqu'à la connaissance du montant réel total des travaux) :</div>
<p class="article-body">
  Catégorie de bâtiment <small>(*)</small> : <span class="filled">${dash(categoryLabel)}</span>
  &nbsp;&nbsp;&nbsp; au prix de <span class="filled">${fmt(coutM2)} DHS / m²</span>
</p>
<p class="article-body">
  Surfaces couvertes hors œuvre : <span class="filled">${fmt(surfacePlancher)} m²</span>
  &nbsp;×&nbsp; <span class="filled">${fmt(coutM2)} DHS/m²</span>
  &nbsp;=&nbsp; <span class="filled" style="color:#92400e;font-weight:700;">${fmt(coutTravaux)} DHS</span>
</p>

<!-- ───────── ARTICLE 5 ───────── -->
<h3 class="article-title">Article 5 : Honoraires de l'Architecte - Avenant</h3>
<p class="article-body">
  Les honoraires de l'architecte sont fixés librement et en commun accord avec le maître d'ouvrage, en tenant compte de la mission de l'architecte, de l'importance des prestations demandées « missions complémentaires », et de la catégorie du projet.
</p>
<p class="article-body">
  Les honoraires sont calculés sur la base d'un taux d'honoraires de <span class="filled">${honosTauxPct}</span> pour cent (<span class="filled">${honosTauxPct} %</span>) du montant réel total des travaux toutes taxes comprises, la TVA sur les honoraires étant en sus.
</p>
<p class="article-body">
  Tout avenant au projet, objet du présent contrat, modifiant en hausse ou en baisse le montant réel des travaux et les honoraires engendrés devra être soumis au visa et approbation des parties concernées (le maître d'ouvrage, l'architecte, Conseil Régional de l'Ordre des Architectes).
</p>

<div class="sub-section">Calcul des honoraires :</div>
<p class="article-body">
  Jusqu'à passation des marchés des travaux, le calcul des honoraires de l'architecte sera établi sur la base de l'estimation provisoire du projet, établie par l'architecte et approuvée par le maître d'ouvrage, conformément au barème des coûts de construction élaboré par l'administration, et adopté par le Conseil National de l'Ordre des Architectes, et qui est donné en annexe au présent contrat. Les prix au mètre carré qui y figurent indiquent la base minimale des coûts de construction au mètre carré, relatifs à chaque catégorie de bâtiments.
</p>

<table class="honos-calcul">
  <tr><td class="label">Superficie totale du plancher couvert en m² :</td><td class="val">${fmt(surfacePlancher)} m²</td></tr>
  <tr><td class="label">Coût moyen des travaux tout corps d'état en DHS/m² :</td><td class="val">${fmt(coutM2)} DHS</td></tr>
  <tr><td class="label">Estimation provisoire en DHS :</td><td class="val">${fmt(coutTravaux)} DHS</td></tr>
  <tr><td class="label">Montant des honoraires = ${fmt(coutTravaux)} DHS × ${honosTauxPct} % :</td><td class="val">${fmt(honorairesHT)} DHS Hors TVA</td></tr>
  <tr><td class="label">TVA en vigueur (${(tvaRate * 100).toFixed(0)} %) = ${fmt(honorairesHT)} DHS × ${(tvaRate * 100).toFixed(0)} % :</td><td class="val">${fmt(tva)} DHS</td></tr>
  <tr class="total"><td class="label">Total honoraires TTC à percevoir :</td><td class="val">${fmt(honorairesTTC)} DHS</td></tr>
</table>

<p class="article-body" style="font-style: italic; color: #6b7280; font-size: 10pt;">
  <strong>NB :</strong> Le présent montant d'honoraires peut être mis à jour en rapport avec le coût réel des travaux.
</p>

<!-- ───────── ARTICLE 6 ───────── -->
<h3 class="article-title">Article 6 : Modification du projet</h3>
<p class="article-body">
  Dans le cas où pendant le cours des travaux, le maître d'ouvrage désirerait la modification, la diminution ou l'augmentation des constructions, l'architecte devra s'y conformer.
</p>
<p class="article-body">
  Toute modification devra se faire avec l'accord de l'architecte - maître d'œuvre, et l'autorisation des autorités compétentes. Les plans modificatifs correspondants se feront à la charge du maître de l'ouvrage.
</p>
<p class="article-body">
  Les frais relatifs à ces modifications demandées par le maître d'ouvrage seront arrêtés en commun accord entre ce dernier et l'architecte.
</p>

<!-- ───────── ARTICLE 7 — Échelonnement + Tableau ───────── -->
<h3 class="article-title">Article 7 : Échelonnement des missions de l'architecte - Modalités de règlement des Honoraires</h3>
<p class="article-body">
  Les modalités de règlement de l'architecte sont établies librement et d'un commun accord entre le maître d'ouvrage et l'architecte en fonction de l'échelonnement des missions telles que figurées au tableau ci-dessous :
</p>

<table class="phases">
  <thead>
    <tr>
      <th>Phase</th>
      <th></th>
      <th>Contenu de la phase / Missions</th>
      <th>Taux %</th>
      <th>Cumul en %</th>
      <th>Base de calcul des honoraires</th>
      <th>Délai de Remise de Documents ou d'exécution des travaux</th>
      <th>Nombre exemplaires à fournir au MO</th>
    </tr>
  </thead>
  <tbody>
    <tr class="phase-row"><td class="phase" rowspan="5">A</td><td class="c">1</td><td>Signature du Contrat</td><td class="c">${r(pr.A1, "……")}</td><td class="c">${cumA[0]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">2 exp</td></tr>
    <tr><td class="c">2</td><td>Études préliminaires (esquisses)</td><td class="c">${r(pr.A2, "……")}</td><td class="c">${cumA[1]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">2 exp</td></tr>
    <tr><td class="c">3</td><td>Remise Avant-Projet Sommaire (APS)</td><td class="c">${r(pr.A3, "……")}</td><td class="c">${cumA[2]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">2 exp</td></tr>
    <tr><td class="c">4</td><td>Remise du dossier de demande d'autorisation de construire</td><td class="c">${r(pr.A4, "……")}</td><td class="c">${cumA[3]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">Dépôt + 1 exp</td></tr>
    <tr><td class="c">5</td><td>Obtention de l'avis conforme</td><td class="c">${r(pr.A5, "……")}</td><td class="c">${cumA[4]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">2 exp</td></tr>

    <tr class="phase-row"><td class="phase" rowspan="4">B</td><td class="c">1</td><td>Établissement Avant-projet détaillé (APD)</td><td class="c">${r(pr.B1, "……")}</td><td class="c">${cumB[0]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">2 exp</td></tr>
    <tr><td class="c">2</td><td>Remise des plans détails d'exécution (PE)</td><td class="c">${r(pr.B2, "……")}</td><td class="c">${cumB[1]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">2 exp</td></tr>
    <tr><td class="c">3</td><td>Dossier de consultations entreprises (DCE)</td><td class="c">${r(pr.B3, "……")}</td><td class="c">${cumB[2]}</td><td>Estimation de l'Architecte</td><td>……………</td><td class="c">2 exp</td></tr>
    <tr><td class="c">4</td><td>Adjudication marchés des travaux</td><td class="c">${r(pr.B4, "……")}</td><td class="c">${cumB[3]}</td><td>Montant du ou des marchés</td><td>……………</td><td class="c">2 exp</td></tr>

    <tr class="phase-row"><td class="phase" rowspan="3">C</td><td class="c">1</td><td>Direction et Suivi des travaux</td><td class="c">${r(pr.C1, "……")}</td><td class="c">……</td><td>Montant décompte / travaux</td><td>……………</td><td class="c">2 exp</td></tr>
    <tr><td class="c">2</td><td>À la réception provisoire (le cas échéant *) ou délivrance de l'attestation de conformité et de fin des travaux</td><td class="c">${r(pr.C2, "……")}</td><td class="c">……</td><td>Montant décompte définitif</td><td>……………</td><td class="c">P.V. / 3 exp</td></tr>
    <tr><td class="c">3</td><td>À la réception définitive (le cas échéant *)</td><td class="c">${r(pr.C3, "……")}</td><td class="c">……</td><td>Montant décompte définitif</td><td>……………</td><td class="c">P.V. / 3 exp</td></tr>
  </tbody>
</table>

<p style="font-style: italic; font-size: 9.5pt; color: #6b7280; margin: 8px 0;">
  <strong>*</strong> Le projet, objet du contrat, peut faire l'objet soit d'une seule réception sanctionnée par une attestation de conformité ou de deux réceptions « à la demande du maître d'ouvrage », un provisoire et l'autre définitive avec une période entre les deux ne dépassant pas une année.
</p>

<!-- ───────── ARTICLE 8 ───────── -->
<h3 class="article-title">Article 8 : Délais</h3>
<p class="article-body">
  Les délais pour l'établissement des études et ceux nécessaires à la réalisation des travaux seront fixés d'un commun accord entre l'architecte et le maître d'ouvrage, et portés sur le tableau de l'article 7 ci-dessus.
</p>
<p class="article-body">
  L'architecte effectuera personnellement ses visites de chantier, et pourra se faire représenter par une personne qualifiée de son cabinet.
</p>
<p class="article-body">
  Les délais pour la réalisation des travaux sont fixés à : <span class="filled">${admin.delaiTravauxMois != null ? `${admin.delaiTravauxMois} mois` : "……………… (………… mois)"}</span>.
</p>
<p class="article-body">
  Délai pour la remise des études (jusqu'à obtention de l'autorisation de construire) : <span class="filled">${admin.delaiEtudesJours != null ? `${admin.delaiEtudesJours} jours ouvrables` : "……………… jours ouvrables"}</span>.
</p>
${(admin.penaliteMOEPourcentJour != null || admin.penaliteMOPourcentJour != null) ? `
<p class="article-body">
  Pénalité par jour ouvrable de retard côté Architecte (sur honoraires phase concernée) : <span class="filled">${admin.penaliteMOEPourcentJour != null ? `${admin.penaliteMOEPourcentJour} %` : "……… %"}</span>.<br/>
  Pénalité par jour de retard côté Maître d'Ouvrage (sur règlement des notes d'honoraires) : <span class="filled">${admin.penaliteMOPourcentJour != null ? `${admin.penaliteMOPourcentJour} %` : "……… %"}</span>.
</p>` : ""}
<p class="article-body">Au-delà de ces délais, seraient appliquées les dispositions susmentionnées.</p>

<!-- ───────── ARTICLE 9 ───────── -->
<h3 class="article-title">Article 9 : Litiges</h3>
<p class="article-body">
  En cas de litige, les deux parties s'engagent à recourir à l'avis du Conseil Régional de l'Ordre des Architectes (${croaName}) dans une première tentative d'arrangement à l'amiable avant de soumettre, le cas échéant, le litige devant les tribunaux compétents.
</p>

<!-- ───────── RÉCAPITULATIF FINAL ───────── -->
<div class="montant-final">
  <p><strong>Objet de l'Opération :</strong> Projet de <span class="filled">${dash(natureProjet)}</span></p>
  <p>Le présent contrat est convenu librement d'un commun accord entre le maître d'ouvrage et l'Architecte pour un montant global d'honoraire toutes taxes comprises de :</p>
  <p style="text-align: center; margin-top: 12px;">
    <strong>${fmt(honorairesTTC)} DHS TTC</strong>
    &nbsp;(en chiffres)<br/>
    <em>${honorairesTTC ? `« ${numberToFrenchWords(honorairesTTC)} dirhams toutes taxes comprises »` : "……………………………………………………………… (en lettres)"}</em>
  </p>
  <p style="font-style: italic; font-size: 10pt; color: #555; margin-top: 14px;">
    <strong>NB :</strong> Le présent montant d'honoraires sera mis à jour en fonction du coût réel des travaux.
  </p>
  <p style="font-style: italic; font-size: 10pt; color: #555;">
    Le Maître d'Ouvrage ayant pris connaissance des termes du contrat unifié, des annexes n°1 et 2, ainsi que les textes et lois auxquels il se réfère.
  </p>
</div>

<!-- ───────── SIGNATURES ───────── -->
<div class="signatures">
  <div class="sig-box">
    <div class="label">(1) Signé : (Lu et accepté)</div>
    <div class="role">L'Architecte — Maître de l'Œuvre</div>
    <div class="line">${dash(archNom)}</div>
  </div>
  <div class="sig-box">
    <div class="label">(2) Signé : (Lu et accepté)</div>
    <div class="role">Le Maître de l'Ouvrage</div>
    <div class="line">${dash(d.raisonSociale || d.clientNom)}</div>
  </div>
</div>

<div class="visa-zone">
  <div class="title">(3) Visa du Conseil Régional de l'Ordre des Architectes du lieu du projet</div>
  <div style="font-size: 10pt; color: #6b7280; margin: 6px 0;">${croaName}</div>
  <div style="height: 90px;"></div>
  <div style="font-size: 9pt; color: #6b7280;">Cachet et signature du Président du CROA</div>
</div>

<div class="footer-note">
  Contrat généré par CITURBAREA · Plateforme d'orchestration architecturale · ${today}<br/>
  Conforme au modèle adopté par le Conseil National de l'Ordre des Architectes du 28 février 2024
</div>

</body>
</html>`;
  }
}

/**
 * Convertit un nombre en lettres françaises (basique, jusqu'à quelques millions).
 * Suffisant pour des honoraires usuels.
 */
function numberToFrenchWords(n: number): string {
  if (!Number.isFinite(n)) return "";
  n = Math.round(n);
  if (n === 0) return "zéro";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  const under1000 = (n: number): string => {
    const out: string[] = [];
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (h === 1) out.push("cent");
    else if (h > 1) out.push(`${units[h]} cent${r === 0 ? "s" : ""}`);
    if (r === 0) return out.join(" ");
    if (r < 10) out.push(units[r]);
    else if (r < 20) out.push(teens[r - 10]);
    else {
      const t = Math.floor(r / 10);
      const u = r % 10;
      if (t === 7 || t === 9) {
        out.push(`${tens[t]}-${teens[u]}`);
      } else if (t === 8 && u === 0) {
        out.push("quatre-vingts");
      } else {
        out.push(`${tens[t]}${u === 1 && t < 8 ? " et un" : u > 0 ? `-${units[u]}` : ""}`);
      }
    }
    return out.join(" ");
  };
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions > 0) parts.push(`${millions === 1 ? "un" : under1000(millions)} million${millions > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(`${thousands === 1 ? "" : under1000(thousands) + " "}mille`.trim());
  if (rest > 0) parts.push(under1000(rest));
  return parts.join(" ");
}
