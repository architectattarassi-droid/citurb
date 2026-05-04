import { Injectable } from "@nestjs/common";

/**
 * ContractService — génère le HTML imprimable du contrat type unifié d'Architecte
 *
 * Source: Contrat type unifié d'Architecte CONSTRUCTION (CNOA, version du 28 février 2024)
 * Couvre les sections P2: IMM, GR, EPIG, AMG.
 * Pour LOT: utilisera contractLotissement() (à coder dans v2).
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
  // MOEuvre — architecte signataire (CITURBAREA)
  archNom?: string;
  archCIN?: string;
  archDomicile?: string;
  archAutorisation?: string;
  archAutorisationAnnee?: string;
  archICE?: string;
  archRC?: string;
  archCNSS?: string;
  archTel?: string;
  archEmail?: string;
  // Délais (article 8)
  delaiEtudesJours?: number;
  delaiTravauxMois?: number;
  // Pénalités
  penaliteMOPourcentJour?: number;
  penaliteMOEPourcentJour?: number;
  // Annexes
  excludeAnnexe1?: boolean;
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
  // Projet
  title?: string;
  commune?: string;
  natureProjet?: string;
  surfaceTerrainM2?: number;
  surfacePlancherM2?: number;
  titreFoncierNum?: string;
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
    const fmt = (n: any) => Number.isFinite(Number(n))
      ? new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(Number(n))
      : "_______________";
    const dash = (s: any) => (s == null || s === "" ? "_______________" : String(s));
    const today = new Date().toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });

    // Architecte par défaut: CITURBAREA placeholder
    const archNom = admin.archNom || "[À COMPLÉTER PAR ADMIN]";
    const croaName = admin.croaName || "______________________";

    const projectTitle = d.title || `${meta.sectionLabel || "Projet"} — ${d.commune || ""}`;

    const honorairesHT = honoraires.totalHT;
    const honorairesTTC = honoraires.totalTTC;
    const tvaRate = honoraires.tvaRate ?? 0.2;
    const tva = honoraires.tva;
    const breakdown = honoraires.breakdown ?? {};

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Contrat type unifié d'Architecte — ${dash(d.title)}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none !important; } }
  body { font-family: "Times New Roman", Times, serif; color: #111; max-width: 760px; margin: 24px auto; padding: 0 32px 60px; line-height: 1.45; font-size: 12pt; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; z-index: 10; }
  .toolbar button { background: #b45309; color: #fff; border: 0; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .toolbar button.secondary { background: #fff; color: #111; border: 1px solid #d1d5db; }
  h1 { font-size: 16pt; text-align: center; margin: 24px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
  h2 { font-size: 14pt; text-align: center; margin: 6px 0 32px; font-weight: normal; }
  h3 { font-size: 13pt; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; }
  .ref { background: #f9fafb; border-left: 3px solid #b45309; padding: 12px 16px; font-size: 10.5pt; line-height: 1.5; margin: 14px 0; }
  .ref b { color: #92400e; }
  .party { background: #fafafa; border: 1px solid #e5e7eb; padding: 14px 18px; border-radius: 4px; margin-bottom: 14px; font-size: 11pt; }
  .party .role { color: #b45309; font-weight: 700; text-transform: uppercase; font-size: 10pt; letter-spacing: 1px; margin-bottom: 8px; }
  .party table { width: 100%; border-collapse: collapse; }
  .party td { padding: 4px 6px; vertical-align: top; }
  .party td.k { color: #6b7280; width: 30%; font-weight: 500; }
  .party td.v { font-weight: 600; }
  table.honos { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11pt; }
  table.honos th, table.honos td { border: 1px solid #d1d5db; padding: 8px 12px; }
  table.honos th { background: #f3f4f6; text-align: left; font-weight: 700; }
  table.honos td.r { text-align: right; font-family: "DM Mono", "Courier New", monospace; }
  table.honos tr.total td { background: #fef3c7; font-weight: 700; }
  ol.articles { padding-left: 0; counter-reset: art; list-style: none; }
  ol.articles > li { counter-increment: art; margin: 18px 0; }
  ol.articles > li::before { content: "Article " counter(art) " : "; font-weight: 700; }
  .signature { display: flex; justify-content: space-around; margin-top: 64px; }
  .signature .box { flex: 1; max-width: 320px; text-align: center; }
  .signature .box .label { font-size: 10pt; color: #6b7280; margin-bottom: 4px; }
  .signature .box .role { font-weight: 700; margin-bottom: 60px; }
  .signature .box .line { border-top: 1px solid #111; padding-top: 4px; font-size: 9pt; color: #6b7280; }
  .visa-zone { margin-top: 48px; padding: 18px 22px; border: 2px dashed #b45309; border-radius: 6px; text-align: center; }
  .visa-zone .title { color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10pt; margin-bottom: 6px; }
  .footer { text-align: center; color: #6b7280; font-size: 9pt; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  small { color: #6b7280; }
</style>
</head>
<body>

<div class="toolbar no-print">
  <button onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
  <button class="secondary" onclick="window.close()">Fermer</button>
</div>

<h1>Contrat type unifié d'Architecte</h1>
<h2>Construction (Secteur Privé)</h2>
<div style="text-align:center; margin-bottom: 24px; font-size: 11pt;">
  <strong>N° :</strong> ${dash(admin.contratNumero)}<br/>
  <small>Version adoptée par le Conseil National de l'Ordre des Architectes — Réunion statutaire du 28 février 2024</small>
</div>

<div class="ref">
  <b>Conseil Régional de l'Ordre des Architectes :</b> ${croaName}<br/>
  <b>Date de génération :</b> ${today}
</div>

<h3>I — Parties au contrat</h3>

<div class="party">
  <div class="role">Maître d'Ouvrage</div>
  <table>
    <tr><td class="k">Nom / Raison sociale</td><td class="v">${dash(d.raisonSociale || d.clientNom)}</td></tr>
    ${d.representant ? `<tr><td class="k">Représentant légal</td><td class="v">${dash(d.representant)}</td></tr>` : ""}
    <tr><td class="k">CIN</td><td class="v">${dash(d.clientCIN)}</td></tr>
    <tr><td class="k">RC</td><td class="v">${dash(d.rc)}</td></tr>
    <tr><td class="k">ICE</td><td class="v">${dash(d.ice)}</td></tr>
    <tr><td class="k">CNSS</td><td class="v">${dash(d.cnss)}</td></tr>
    <tr><td class="k">Téléphone</td><td class="v">${dash(d.clientTel)}</td></tr>
    <tr><td class="k">Email</td><td class="v">${dash(d.clientEmail)}</td></tr>
  </table>
  <div style="margin-top:8px;font-size:10pt;color:#6b7280;">Désigné ci-après par <em>« le Maître d'Ouvrage »</em></div>
</div>

<div class="party">
  <div class="role">Architecte — Maître d'Œuvre</div>
  <table>
    <tr><td class="k">Nom et prénom</td><td class="v">${dash(archNom)}</td></tr>
    <tr><td class="k">CIN</td><td class="v">${dash(admin.archCIN)}</td></tr>
    <tr><td class="k">Domicilié à</td><td class="v">${dash(admin.archDomicile)}</td></tr>
    <tr><td class="k">Autorisé à exercer sous le n°</td><td class="v">${dash(admin.archAutorisation)}${admin.archAutorisationAnnee ? ` du ${admin.archAutorisationAnnee}` : ""}</td></tr>
    <tr><td class="k">ICE</td><td class="v">${dash(admin.archICE)}</td></tr>
    <tr><td class="k">RC</td><td class="v">${dash(admin.archRC)}</td></tr>
    <tr><td class="k">CNSS</td><td class="v">${dash(admin.archCNSS)}</td></tr>
    <tr><td class="k">Téléphone</td><td class="v">${dash(admin.archTel)}</td></tr>
    <tr><td class="k">Email</td><td class="v">${dash(admin.archEmail)}</td></tr>
  </table>
  <div style="margin-top:8px;font-size:10pt;color:#6b7280;">Désigné ci-après par <em>« l'Architecte — Maître d'Œuvre »</em></div>
</div>

<p style="text-align:center; margin: 28px 0; font-style: italic;">Il a été convenu d'un commun accord ce qui suit :</p>

<h3>II — Textes de référence</h3>
<div class="ref" style="font-size:10pt;">
  <ul style="margin:0; padding-left: 20px;">
    <li>Dahir formant code des obligations et contrats du 12 août 1913</li>
    <li>Loi n° 016-89 du 10 septembre 1993 relative à l'exercice de la profession d'architecte</li>
    <li>Loi n° 25-90 (lotissements) et Loi n° 12-90 (urbanisme), telles qu'amendées par la loi n° 66-12 du 19/09/2016</li>
    <li>Loi n°02-2000 (droits d'auteur), modifiée par la loi n° 34-05 et la loi n° 79-12</li>
    <li>Règlement intérieur en vigueur de l'Ordre National des Architectes</li>
    <li>Loi n°104-12 sur la liberté des prix et de la concurrence</li>
    <li>Accord d'entente à l'amiable Conseil de la Concurrence / CNOA du 22 février 2022</li>
    <li>Annexe n°1 au présent contrat — détail des missions et obligations des deux parties</li>
  </ul>
</div>

<h3>III — Prescriptions spécifiques</h3>

<ol class="articles">

  <li><strong>Objet du contrat</strong> — Le Maître d'Ouvrage confie à l'Architecte la mission de concevoir et suivre l'exécution jusqu'à son terme du projet de :
    <div style="margin-top:8px; padding: 10px 14px; background: #f9fafb; border-left: 3px solid #b45309;">
      <strong>${dash(projectTitle)}</strong><br/>
      ${d.titreFoncierNum ? `Sur un terrain objet du Titre Foncier n° ${d.titreFoncierNum}<br/>` : ""}
      ${d.surfaceTerrainM2 ? `D'une superficie de ${fmt(d.surfaceTerrainM2)} m²<br/>` : ""}
      Sis à : ${dash(d.commune)}<br/>
      ${meta.categoryLabel ? `Catégorie (barème CNOA Annexe 2) : ${meta.categoryLabel}<br/>` : ""}
      ${meta.section ? `Section P2 : ${meta.sectionLabel}` : ""}
    </div>
  </li>

  <li><strong>Mission obligatoire de l'Architecte</strong> — Conformément à l'article 17 du Règlement Intérieur de l'Ordre National des Architectes, la mission comprend :
    <ul>
      <li>Concevoir ou modifier l'œuvre architecturale</li>
      <li>Établir tous documents architecturaux graphiques et écrits relatifs à la conception ou à la modification, en particulier ceux à fournir à la commune pour l'obtention du permis de construire</li>
      <li>Veiller à la conformité des études techniques réalisées par les ingénieurs spécialisés "NE VARIETUR"</li>
      <li>Suivre les travaux de construction et en contrôler la conformité avec les plans architecturaux et les indications de l'autorisation de construire</li>
      <li>Établir une attestation déclarant l'achèvement des travaux et la conformité aux plans autorisés en vue de l'obtention du permis d'habiter</li>
    </ul>
  </li>

  <li><strong>Obligations du Maître d'Ouvrage</strong> — Le Maître d'Ouvrage s'engage à fournir tous les documents juridiques et techniques nécessaires (titre foncier, levés topographiques, études de sol, plans des ingénieurs spécialisés, etc.) et à respecter le programme et le budget définis ci-après. Il assume seul son droit de construire sur le terrain support du projet et communique tous renseignements relatifs à la propriété, aux limites séparatives, mitoyennetés et servitudes. Il souscrit l'assurance "RC et travaux" et toute assurance prévue par la loi.
  </li>

  <li><strong>Présentation du projet — Estimation provisoire des travaux</strong>
    <table class="honos">
      <tr><th>Surface plancher (y compris sous-sol)</th><td class="r">${fmt(base.surfacePlancherM2 ?? d.surfacePlancherM2)} m²</td></tr>
      ${base.nbBatiments && base.nbBatiments > 1 ? `<tr><th>Nombre de bâtiments</th><td class="r">${base.nbBatiments}</td></tr>` : ""}
      <tr><th>Catégorie de bâtiment (barème CNOA Annexe 2)</th><td class="r">${dash(meta.categoryLabel)}</td></tr>
      <tr><th>Coût de construction au m² (DH HT)</th><td class="r">${fmt(base.coutConstructionM2)} DH/m²</td></tr>
      <tr class="total"><th>Estimation provisoire des travaux H.T.</th><td class="r">${fmt(base.coutTravauxEstime)} DH</td></tr>
    </table>
    <small>Cette estimation est provisoire ; le montant réel sera révisé après adjudication conformément à l'article 5.</small>
  </li>

  <li><strong>Honoraires de l'Architecte</strong> — Les honoraires sont fixés à <strong>${honoraires.rate ? (honoraires.rate * 100).toFixed(0) : "5"}%</strong> du montant total des travaux H.T. (toutes taxes comprises hors TVA, conformément au barème CNOA).
    <table class="honos">
      <tr><th>Honoraires H.T.</th><td class="r">${fmt(honorairesHT)} DH</td></tr>
      <tr><th>TVA ${(tvaRate * 100).toFixed(0)}%</th><td class="r">${fmt(tva)} DH</td></tr>
      <tr class="total"><th>Total honoraires TTC</th><td class="r">${fmt(honorairesTTC)} DH</td></tr>
    </table>
    <small>Tout avenant au projet, modifiant en hausse ou en baisse le montant réel des travaux et les honoraires engendrés, devra être soumis au visa et à l'approbation des parties concernées (Maître d'Ouvrage, Architecte, Conseil Régional de l'Ordre des Architectes).</small>
  </li>

  <li><strong>Modification du projet</strong> — Toute modification souhaitée par le Maître d'Ouvrage pendant le cours des travaux devra recueillir l'accord de l'Architecte et l'autorisation des autorités compétentes. Les frais de plans modificatifs sont à la charge du Maître d'Ouvrage. Les frais relatifs aux modifications demandées par le Maître d'Ouvrage seront arrêtés en commun accord entre ce dernier et l'Architecte.
  </li>

  <li><strong>Échelonnement des missions et règlement des honoraires</strong>
    <table class="honos">
      <thead>
        <tr><th>Phase</th><th>Mission</th><th class="r">Taux</th><th class="r">Montant DH HT</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>A</strong></td><td>Esquisse + Avant-Projet Sommaire (APS) + Dépôt et obtention de l'autorisation de construire + Avis conforme</td><td class="r">40%</td><td class="r">${fmt(breakdown.phaseA_esquisseAutorisation)}</td></tr>
        <tr><td><strong>B</strong></td><td>Avant-Projet Détaillé (APD) + Plans d'exécution + Dossier de Consultation des Entreprises (DCE) + Adjudication</td><td class="r">30%</td><td class="r">${fmt(breakdown.phaseB_dceCps)}</td></tr>
        <tr><td><strong>C</strong></td><td>Direction et suivi des travaux ${meta.followMode === "PHOTOS" ? "(suivi par photos plateforme)" : "(suivi physique)"} + Réceptions + Attestations conformité</td><td class="r">${meta.followMode === "PHOTOS" ? "10%" : "30%"}</td><td class="r">${fmt(breakdown.phaseC_suivi)}</td></tr>
        <tr class="total"><td colspan="2">Total honoraires H.T.</td><td class="r">${honoraires.rate ? (honoraires.rate * 100).toFixed(0) : "5"}%</td><td class="r">${fmt(honorairesHT)}</td></tr>
      </tbody>
    </table>
  </li>

  <li><strong>Délais</strong> — Les délais d'établissement des études et ceux nécessaires à la réalisation des travaux sont fixés d'un commun accord :
    <ul>
      <li>Délai pour la remise des études (jusqu'à obtention de l'autorisation de construire) : <strong>${admin.delaiEtudesJours ? `${admin.delaiEtudesJours} jours ouvrables` : "_______________ jours ouvrables"}</strong></li>
      <li>Délai pour la réalisation des travaux : <strong>${admin.delaiTravauxMois ? `${admin.delaiTravauxMois} mois` : "_______________ mois"}</strong></li>
      <li>Pénalité par jour ouvrable de retard côté Architecte (sur honoraires phase concernée) : <strong>${admin.penaliteMOEPourcentJour != null ? `${admin.penaliteMOEPourcentJour}%` : "_____ %"}</strong></li>
      <li>Pénalité par jour de retard côté Maître d'Ouvrage (sur règlement des notes d'honoraires) : <strong>${admin.penaliteMOPourcentJour != null ? `${admin.penaliteMOPourcentJour}%` : "_____ %"}</strong></li>
    </ul>
    <small>Au-delà de ces délais, les dispositions des articles 6 (retards) du chapitre III de l'Annexe 1 seraient appliquées.</small>
  </li>

  <li><strong>Litiges</strong> — En cas de litige, les deux parties s'engagent à recourir à l'avis du Conseil Régional de l'Ordre des Architectes (${croaName}) dans une première tentative d'arrangement à l'amiable avant de soumettre, le cas échéant, le litige devant les tribunaux compétents.
  </li>

</ol>

<h3>Récapitulatif</h3>
<div style="background:#fef3c7; border-radius:6px; padding: 16px 20px; font-size: 11pt;">
  Le présent contrat est convenu librement d'un commun accord entre le Maître d'Ouvrage et l'Architecte pour un montant global d'honoraires toutes taxes comprises de :<br/><br/>
  <strong style="font-size: 14pt; color: #92400e;">${fmt(honorairesTTC)} DH TTC</strong><br/>
  <small>(${honorairesTTC ? numberToFrenchWords(honorairesTTC) + " dirhams toutes taxes comprises" : "_______________"})</small><br/><br/>
  <small>Le présent montant d'honoraires sera mis à jour en fonction du coût réel des travaux après adjudication.</small>
</div>

<div class="signature">
  <div class="box">
    <div class="label">Signé : (Lu et accepté)</div>
    <div class="role">L'Architecte — Maître d'Œuvre</div>
    <div class="line">${dash(archNom)}</div>
  </div>
  <div class="box">
    <div class="label">Signé : (Lu et accepté)</div>
    <div class="role">Le Maître d'Ouvrage</div>
    <div class="line">${dash(d.raisonSociale || d.clientNom)}</div>
  </div>
</div>

<div class="visa-zone">
  <div class="title">Visa du Conseil Régional de l'Ordre des Architectes</div>
  <div style="font-size:10pt; color:#6b7280;">${croaName}</div>
  <div style="height: 80px; margin-top: 16px;"></div>
  <div style="font-size:9pt; color:#6b7280;">Cachet et signature du Président du CROA — délai max 15 jours calendaires (Chap. V Règlement Intérieur CNOA 2024)</div>
</div>

<div class="footer">
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
