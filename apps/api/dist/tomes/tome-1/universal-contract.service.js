"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalContractService = void 0;
const common_1 = require("@nestjs/common");
let UniversalContractService = class UniversalContractService {
    /**
     * Dispatcher: choisit le template selon porteType.
     */
    renderHtml(d, admin = {}) {
        switch ((d.porteType || "").toUpperCase()) {
            case "P3": return this.renderP3(d, admin);
            case "P4": return this.renderP4(d, admin);
            case "P5": return this.renderP5(d, admin);
            case "P6": return this.renderP6(d, admin);
            default:
                return this.renderGeneric(d, admin);
        }
    }
    // ── P3 — Contrat MOD ──────────────────────────────────────────────
    renderP3(d, admin) {
        const brief = d.brief || {};
        const quote = brief.quoteSnapshot || {};
        const corpsList = brief.corpsMetiers || [];
        const meta = quote.meta || {};
        const base = quote.base || {};
        const honos = quote.honoraires || {};
        return this.shell({
            title: "Contrat de Maîtrise d'Ouvrage Déléguée",
            subtitle: "P3 — MOD CITURBAREA",
            contratNumero: admin.contratNumero,
            d, admin,
            bodyHtml: `
        <h3>I — Objet</h3>
        <p>Le Maître d'Ouvrage <strong>${this.dash(d.raisonSociale || d.clientNom)}</strong> confie à
        <strong>CITURBAREA</strong> (représenté par ${this.dash(admin.archNom)}) la mission de
        <strong>Maîtrise d'Ouvrage Déléguée</strong> du projet :
        <em>${this.dash(d.title)}</em>${d.commune ? ` sis à ${this.dash(d.commune)}` : ""}.</p>

        <h3>II — Périmètre de la délégation</h3>
        <ul>
          <li>Convocation et coordination de tous les intervenants (BET, Bureau de Contrôle, entreprises)</li>
          <li>Pilotage détaillé par corps d'état (gros œuvre → second œuvre → finitions → équipements → VRD)</li>
          <li>Réunions de chantier hebdomadaires avec PV signés</li>
          <li>Émission des ordres de service, levée de réserves, attestations de conformité</li>
          <li>Gestion des appels de paiement et libération escrow</li>
          <li>Relations administratives (Rokhas, Protection Civile, ONE/ONEP, etc.)</li>
          <li>Tableau de bord client temps réel</li>
          <li>Réceptions provisoire + définitive + remise des clés</li>
        </ul>

        <h3>III — Caractéristiques du chantier</h3>
        ${this.metaTable([
                ["Catégorie de bâtiment (CNOA)", meta.categoryLabel],
                ["Surface plancher", base.surfacePlancherM2 ? `${this.fmt(base.surfacePlancherM2)} m²` : null],
                ["Nombre de bâtiments", base.nbBatiments && base.nbBatiments > 1 ? base.nbBatiments : null],
                ["Coût de construction estimé", base.coutRealisation ? `${this.fmt(base.coutRealisation)} DH H.T.` : null],
                ["Corps de métiers à coordonner", corpsList.length ? `${corpsList.length} lots` : null],
            ])}

        ${corpsList.length > 0 ? `
          <h3>IV — Liste des corps de métiers à coordonner</h3>
          <div style="background:#f9fafb;padding:12px 16px;font-size:11pt;line-height:1.7;border-left:3px solid #047857;">
            ${corpsList.map(c => `• ${c.replace(/_/g, " ")}`).join("<br/>")}
          </div>
        ` : ""}

        <h3>V — Honoraires</h3>
        <p>Les honoraires de Maîtrise d'Ouvrage Déléguée sont fixés à
        <strong>10% du coût de réalisation H.T.</strong> du projet, hors honoraires architecte
        et hors autres frais externes (laboratoires, géomètre, BET externe).</p>
        ${this.honoTable(honos)}

        <h3>VI — Paiements aux entreprises (escrow obligatoire)</h3>
        <p style="background:#fef3c7;padding:12px 16px;border-left:3px solid #92400e;font-size:11pt;line-height:1.7;">
        <strong>🔒 Escrow plateforme :</strong> tous les paiements aux entreprises intervenant sur le projet
        transitent EXCLUSIVEMENT via la plateforme CITURBAREA. Les fonds sont libérés par tranches après
        validation des PV de réception par corps de métier. Le Maître d'Ouvrage s'engage à n'effectuer
        aucun paiement direct à toute entreprise hors plateforme — en cas de manquement, le présent
        contrat est résilié de plein droit et CITURBAREA est dégagée de toute responsabilité.</p>

        <h3>VII — Délais</h3>
        <p>Délai global de pilotage : <strong>${admin.delaiJours ? `${admin.delaiJours} jours` : "_______________ jours"}</strong> à compter de la signature.</p>
        <p>Pénalité par jour de retard imputable à CITURBAREA :
        <strong>${admin.penaliteRetardPourcent != null ? `${admin.penaliteRetardPourcent}%` : "_____ %"}</strong>
        sur la phase concernée.</p>

        <h3>VIII — Litiges</h3>
        <p>En cas de litige, les parties s'engagent à recourir à une tentative d'arrangement à l'amiable
        avant toute saisine des tribunaux compétents du ressort du lieu d'exécution.</p>
      `,
        });
    }
    // ── P4 — Contrat Analyse foncière ─────────────────────────────────
    renderP4(d, admin) {
        const brief = d.brief || {};
        const quote = brief.quoteSnapshot || {};
        const meta = quote.meta || {};
        const amounts = quote.amounts || {};
        return this.shell({
            title: "Contrat de prestation — Analyse foncière",
            subtitle: `P4 — Pack ${meta.packLabel ?? "—"}`,
            contratNumero: admin.contratNumero,
            d, admin,
            bodyHtml: `
        <h3>I — Objet</h3>
        <p>Le Client <strong>${this.dash(d.raisonSociale || d.clientNom)}</strong> confie à
        <strong>CITURBAREA</strong> la prestation d'<strong>analyse foncière</strong>
        relative au bien suivant :</p>
        ${this.metaTable([
                ["Pack souscrit", meta.packLabel],
                ["Titre foncier", brief.titreFoncierNum],
                ["Adresse / lieu-dit", brief.adresse],
                ["Surface terrain", brief.surfaceTerrainM2 ? `${this.fmt(brief.surfaceTerrainM2)} m²` : null],
                ["Commune", d.commune],
                ["Prix de vente / acquisition", brief.prixVenteFoncierDH ? `${this.fmt(brief.prixVenteFoncierDH)} DH` : null],
                ["Nature usage prévu", brief.natureUsagePrevu],
            ])}

        <h3>II — Livrables</h3>
        ${quote.deliverables?.length ? `
          <ul>${quote.deliverables.map((dl) => `<li>${dl}</li>`).join("")}</ul>
        ` : "<p>Livrables conformes au pack souscrit.</p>"}

        <h3>III — Honoraires & paiement</h3>
        <p>Honoraires fixés à <strong>${meta.ratePct ?? "—"}</strong> du prix de vente / acquisition du foncier
        (plancher 3 000 DH H.T.).</p>
        ${this.metaTable([
                ["Calcul brut", amounts.computedHT ? `${this.fmt(amounts.computedHT)} DH` : null],
                ["Honoraires H.T.", amounts.totalHT ? `${this.fmt(amounts.totalHT)} DH` : null],
                ["TVA 20%", amounts.tva ? `${this.fmt(amounts.tva)} DH` : null],
                ["TTC", amounts.totalTTC ? `${this.fmt(amounts.totalTTC)} DH` : null],
            ])}
        <p><strong>Paiement intégral à la commande</strong>, avant lancement de l'analyse. Le rapport est livré
        en PDF watermarqué après confirmation du paiement et validation administrative CITURBAREA.</p>

        <h3>IV — Confidentialité & utilisation du rapport</h3>
        <p style="background:#fef3c7;padding:12px 16px;border-left:3px solid #92400e;font-size:11pt;line-height:1.7;">
        <strong>📄 Rapport exclusif CITURBAREA — utilisable sur autorisation écrite.</strong> Le rapport est marqué
        d'un filigrane indélébile et est destiné à l'usage exclusif du Client signataire pour ses décisions
        d'investissement. Toute reproduction, transmission à un tiers, publication ou utilisation à des fins
        commerciales sans autorisation écrite préalable de CITURBAREA est strictement interdite et expose le
        Client à des poursuites judiciaires.</p>

        <h3>V — Délais</h3>
        <p>Le rapport est livré sous <strong>${meta.deliveryDays ?? "_______"} jours ouvrables</strong>
        à compter de la confirmation du paiement.</p>

        <h3>VI — Limitations de responsabilité</h3>
        <p>Le rapport est délivré à titre informatif. CITURBAREA met en œuvre les diligences professionnelles
        usuelles mais ne peut être tenue responsable des décisions prises par le Client sur la base du rapport,
        ni des évolutions ultérieures du marché ou de la réglementation.</p>
      `,
        });
    }
    // ── P5 — Contrat Expertise ────────────────────────────────────────
    renderP5(d, admin) {
        const brief = d.brief || {};
        const quote = brief.quoteSnapshot || {};
        const meta = quote.meta || {};
        const amounts = quote.amounts || {};
        return this.shell({
            title: "Contrat de prestation — Rapport d'expertise",
            subtitle: `P5 — ${meta.reportLabel ?? brief.reportLabel ?? "—"}`,
            contratNumero: admin.contratNumero,
            d, admin,
            bodyHtml: `
        <h3>I — Objet</h3>
        <p>Le Client <strong>${this.dash(d.raisonSociale || d.clientNom)}</strong> confie à
        <strong>CITURBAREA</strong> la production du rapport d'expertise suivant :</p>
        ${this.metaTable([
                ["Type de rapport", meta.reportLabel || brief.reportLabel],
                ["Surface du bien", meta.surfaceLabel],
                ["Délai retenu", meta.delayLabel],
                ["Adresse du bien", brief.adresseBien],
                ["Commune", d.commune],
            ])}

        <h3>II — Livrables</h3>
        ${quote.deliverables?.length ? `
          <ul>${quote.deliverables.map((dl) => `<li>${dl}</li>`).join("")}</ul>
        ` : ""}

        <h3>III — Honoraires & paiement</h3>
        ${this.metaTable([
                ["Honoraires H.T.", amounts.totalHT ? `${this.fmt(amounts.totalHT)} DH` : null],
                ["TVA 20%", amounts.tva ? `${this.fmt(amounts.tva)} DH` : null],
                ["TTC", amounts.totalTTC ? `${this.fmt(amounts.totalTTC)} DH` : null],
                ["Délai de livraison", meta.deliveryDays ? `${meta.deliveryDays} jours ouvrables` : null],
            ])}
        <p><strong>Paiement intégral à la commande</strong>. La mission démarre à réception du paiement et
        des documents nécessaires fournis par le Client.</p>

        <h3>IV — Format livré</h3>
        <p>Le rapport est livré en format PDF signé numériquement par l'expert, watermarqué
        "Rapport exclusif CITURBAREA — utilisable sur autorisation écrite". Le rapport est destiné à
        l'usage exclusif du Client signataire.</p>

        <h3>V — Hors mission</h3>
        <p>La présente mission est <strong>one-shot</strong> et ne comprend AUCUN engagement de suivi
        post-livraison. Pour un accompagnement projet structuré, voir les portes P1 / P2 / P3 de
        CITURBAREA.</p>

        <h3>VI — Confidentialité</h3>
        <p>L'expert s'engage à respecter la confidentialité des informations recueillies. Le Client
        s'engage à ne pas reproduire, modifier ou publier tout ou partie du rapport sans autorisation
        écrite préalable de CITURBAREA.</p>
      `,
        });
    }
    // ── P6 — Contrat-cadre Prestataire/Fournisseur ────────────────────
    renderP6(d, admin) {
        const brief = d.brief || {};
        const isFournisseur = brief.p6Type === "FOURNISSEUR_MATERIAUX";
        const score = brief.scoreSnapshot || {};
        return this.shell({
            title: isFournisseur
                ? "Contrat-cadre Fournisseur de matériaux"
                : "Contrat-cadre Prestataire de services",
            subtitle: `P6 — Réseau CITURBAREA · Tier ${score.tier ?? "—"} · Score ${score.score ?? "—"}/100`,
            contratNumero: admin.contratNumero,
            d, admin,
            bodyHtml: `
        <h3>I — Identification du Prestataire</h3>
        ${this.metaTable([
                ["Raison sociale", d.raisonSociale],
                ["Représentant", d.representant || d.clientNom],
                ["RC", d.rc],
                ["ICE", d.ice],
                ["CNSS", d.cnss],
                ["Type de fiche", isFournisseur ? "Fournisseur de matériaux" : "Prestataire de services"],
                ["Classe BTP (METLE)", brief.classeBTP ? `Classe ${brief.classeBTP}` : null],
                ["Catégories d'agrément", brief.categoriesAgrement?.length ? brief.categoriesAgrement.join(", ") : null],
                ["N° agrément METLE", brief.agrementMetleNumero],
                ["Validité agrément", brief.agrementMetleValidite ? new Date(brief.agrementMetleValidite).toLocaleDateString("fr-MA") : null],
                ["Score CITURBAREA L7", score.score ? `${score.score}/100 (${score.tier})` : null],
                ["Ancienneté", brief.ancienneteAnnees ? `${brief.ancienneteAnnees} ans` : null],
            ])}

        <h3>II — Engagements du Prestataire</h3>
        <ul>
          <li>Respecter les règles déontologiques et professionnelles applicables à son secteur</li>
          <li>Maintenir à jour ses agréments, polices d'assurance (décennale, RC pro) et attestations
              fiscales/CNSS pendant toute la durée du contrat</li>
          <li>Communiquer EXCLUSIVEMENT via la messagerie de la plateforme CITURBAREA pour tout
              échange relatif à un dossier client (cf. règle anti-désintermédiation)</li>
          <li>Accepter les paiements EXCLUSIVEMENT via le mécanisme d'escrow CITURBAREA — aucun
              paiement direct du client final hors plateforme</li>
          <li>Informer immédiatement CITURBAREA de tout changement de classement, agrément ou
              situation administrative</li>
          ${isFournisseur ? `
            <li>Maintenir à jour son catalogue matériaux (prix, zones, délais, disponibilité)</li>
            <li>Honorer les commandes passées via la plateforme dans les délais affichés</li>
            <li>Signaler toute rupture de stock dès constatation</li>
          ` : `
            <li>Honorer les ordres de service émis dans le cadre des dossiers attribués</li>
            <li>Produire les PV de réception et photos de chantier dans les formats requis</li>
            <li>Accepter les contrôles qualité diligentés par CITURBAREA ou ses partenaires</li>
          `}
        </ul>

        <h3>III — Engagements de CITURBAREA</h3>
        <ul>
          <li>Référencer le Prestataire dans son réseau, visible côté clients dès validation administrative</li>
          <li>Lui proposer des dossiers compatibles avec sa classe, ses agréments et ses zones</li>
          <li>Sécuriser les paiements via escrow plateforme, libérés selon échéancier convenu</li>
          <li>Mettre à disposition un tableau de bord prestataire pour le suivi des dossiers, paiements,
              et catalogue${isFournisseur ? " / matériaux" : ""}</li>
          <li>Respecter la confidentialité des informations commerciales et financières du Prestataire</li>
        </ul>

        <h3>IV — Durée et révision du score L7</h3>
        <p>Le présent contrat-cadre est conclu pour une durée d'<strong>un (1) an</strong> renouvelable
        tacitement. Le score CITURBAREA L7 est recalculé automatiquement à chaque mise à jour de la
        fiche, et CITURBAREA se réserve le droit de réviser le tier (GOLD/SILVER/BRONZE) en fonction
        de la performance constatée sur les dossiers réalisés.</p>

        <h3>V — Résiliation</h3>
        <p>CITURBAREA peut résilier de plein droit le présent contrat-cadre en cas de :</p>
        <ul>
          <li>Manquement aux engagements ci-dessus</li>
          <li>Tentative de contournement de la plateforme (anti-désintermédiation)</li>
          <li>Plainte client fondée non résolue dans les 30 jours</li>
          <li>Expiration des agréments / polices d'assurance non renouvelées</li>
        </ul>
        <p>Dans ces cas, le statut peut basculer en BLACKLISTED et tous les dossiers en cours sont
        immédiatement gelés.</p>
      `,
        });
    }
    // ── Generic fallback (autres porteType inconnus) ──────────────────
    renderGeneric(d, admin) {
        return this.shell({
            title: "Contrat de prestation",
            subtitle: `${d.porteType || "—"}`,
            contratNumero: admin.contratNumero,
            d, admin,
            bodyHtml: `
        <h3>I — Objet</h3>
        <p>Le présent contrat lie <strong>${this.dash(d.raisonSociale || d.clientNom)}</strong>
        à <strong>CITURBAREA</strong> pour la prestation suivante :</p>
        <p><em>${this.dash(d.title)}</em></p>
        <p style="color:#92400e;background:#fef3c7;padding:10px 14px;border-radius:4px;font-size:11pt;">
        ⚠️ Template générique — la doctrine n'a pas encore de modèle spécifique pour la porte ${d.porteType}.
        À compléter par l'admin avant signature.</p>
      `,
        });
    }
    // ── Shell HTML commun (header, parties, footer, signatures) ───────
    shell(opts) {
        const today = new Date().toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });
        const dash = this.dash;
        return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>${opts.title} — ${dash(opts.d.title)}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none !important; } }
  body { font-family: "Times New Roman", Times, serif; color: #111; max-width: 760px; margin: 24px auto; padding: 0 32px 60px; line-height: 1.5; font-size: 12pt; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; z-index: 10; }
  .toolbar button { background: #047857; color: #fff; border: 0; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .toolbar button.secondary { background: #fff; color: #111; border: 1px solid #d1d5db; }
  h1 { font-size: 17pt; text-align: center; margin: 32px 0 6px; text-transform: uppercase; letter-spacing: 1px; color: #1f2937; }
  h2 { font-size: 13pt; text-align: center; margin: 6px 0 28px; font-weight: normal; color: #6b7280; }
  h3 { font-size: 13pt; margin: 24px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; color: #047857; }
  .party { background: #fafafa; border: 1px solid #e5e7eb; padding: 14px 18px; border-radius: 4px; margin-bottom: 14px; font-size: 11pt; }
  .party .role { color: #047857; font-weight: 700; text-transform: uppercase; font-size: 10pt; letter-spacing: 1px; margin-bottom: 8px; }
  table.meta { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt; }
  table.meta td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
  table.meta td.k { color: #6b7280; width: 40%; }
  table.meta td.v { color: #111; font-weight: 600; }
  table.honos { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt; }
  table.honos th, table.honos td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  table.honos th { background: #f3f4f6; font-weight: 700; }
  table.honos td.r { text-align: right; font-family: "DM Mono", "Courier New", monospace; }
  table.honos tr.total td { background: #d1fae5; font-weight: 700; }
  ul { padding-left: 24px; }
  ul li { margin: 4px 0; }
  .signature { display: flex; justify-content: space-around; margin-top: 56px; padding-top: 24px; border-top: 1px solid #d1d5db; }
  .signature .box { flex: 1; max-width: 320px; text-align: center; }
  .signature .box .label { font-size: 10pt; color: #6b7280; margin-bottom: 4px; }
  .signature .box .role { font-weight: 700; margin-bottom: 56px; }
  .signature .box .line { border-top: 1px solid #111; padding-top: 4px; font-size: 9pt; color: #6b7280; }
  .footer { text-align: center; color: #6b7280; font-size: 9pt; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>

<div class="toolbar no-print">
  <button onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
  <button class="secondary" onclick="window.close()">Fermer</button>
</div>

<h1>${opts.title}</h1>
<h2>${opts.subtitle}</h2>
<div style="text-align:center; margin-bottom: 24px; font-size: 11pt;">
  <strong>N° :</strong> ${dash(opts.contratNumero)} · <strong>Date :</strong> ${today}
</div>

<h3>Parties</h3>
<div class="party">
  <div class="role">Client</div>
  <table class="meta">
    <tr><td class="k">Nom / Raison sociale</td><td class="v">${dash(opts.d.raisonSociale || opts.d.clientNom)}</td></tr>
    ${opts.d.representant ? `<tr><td class="k">Représentant légal</td><td class="v">${dash(opts.d.representant)}</td></tr>` : ""}
    ${opts.d.rc ? `<tr><td class="k">RC</td><td class="v">${dash(opts.d.rc)}</td></tr>` : ""}
    ${opts.d.ice ? `<tr><td class="k">ICE</td><td class="v">${dash(opts.d.ice)}</td></tr>` : ""}
    ${opts.d.clientTel ? `<tr><td class="k">Téléphone</td><td class="v">${dash(opts.d.clientTel)}</td></tr>` : ""}
    ${opts.d.clientEmail ? `<tr><td class="k">Email</td><td class="v">${dash(opts.d.clientEmail)}</td></tr>` : ""}
  </table>
</div>

<div class="party">
  <div class="role">Prestataire</div>
  <table class="meta">
    <tr><td class="k">CITURBAREA · représenté par</td><td class="v">${dash(opts.admin.archNom)}</td></tr>
    ${opts.admin.archICE ? `<tr><td class="k">ICE</td><td class="v">${dash(opts.admin.archICE)}</td></tr>` : ""}
    ${opts.admin.archRC ? `<tr><td class="k">RC</td><td class="v">${dash(opts.admin.archRC)}</td></tr>` : ""}
    ${opts.admin.archDomicile ? `<tr><td class="k">Adresse</td><td class="v">${dash(opts.admin.archDomicile)}</td></tr>` : ""}
    ${opts.admin.archTel ? `<tr><td class="k">Téléphone</td><td class="v">${dash(opts.admin.archTel)}</td></tr>` : ""}
    ${opts.admin.archEmail ? `<tr><td class="k">Email</td><td class="v">${dash(opts.admin.archEmail)}</td></tr>` : ""}
  </table>
</div>

${opts.bodyHtml}

<div class="signature">
  <div class="box">
    <div class="label">Lu et accepté</div>
    <div class="role">Le Client</div>
    <div class="line">${dash(opts.d.raisonSociale || opts.d.clientNom)}</div>
  </div>
  <div class="box">
    <div class="label">Lu et accepté</div>
    <div class="role">CITURBAREA</div>
    <div class="line">${dash(opts.admin.archNom)}</div>
  </div>
</div>

<div class="footer">
  Contrat généré par CITURBAREA · ${today}<br/>
  Référence dossier : ${opts.d.id.slice(0, 12)}…
</div>

</body>
</html>`;
    }
    // ── Helpers ───────────────────────────────────────────────────────
    dash = (s) => (s == null || s === "" ? "_______________" : String(s));
    fmt = (n) => Number.isFinite(Number(n))
        ? new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(Number(n))
        : "—";
    metaTable(rows) {
        const filtered = rows.filter(([_, v]) => v != null && v !== "");
        if (filtered.length === 0)
            return "";
        return `<table class="meta">${filtered.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${this.dash(v)}</td></tr>`).join("")}</table>`;
    }
    honoTable(honos) {
        if (!honos || !honos.totalTTC)
            return "";
        return `<table class="honos">
      <tr><th>Honoraires H.T.</th><td class="r">${this.fmt(honos.totalHT)} DH</td></tr>
      <tr><th>TVA ${honos.tvaRate ? (honos.tvaRate * 100).toFixed(0) : "20"}%</th><td class="r">${this.fmt(honos.tva)} DH</td></tr>
      <tr class="total"><th>TTC</th><td class="r">${this.fmt(honos.totalTTC)} DH</td></tr>
    </table>`;
    }
};
exports.UniversalContractService = UniversalContractService;
exports.UniversalContractService = UniversalContractService = __decorate([
    (0, common_1.Injectable)()
], UniversalContractService);
