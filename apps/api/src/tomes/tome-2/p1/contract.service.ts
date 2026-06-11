import { Injectable } from "@nestjs/common";
import { P2ContractService, DossierContractData, AdminContractParams } from "../p2/contract.service";

/**
 * P1ContractService — génère le HTML imprimable du contrat type unifié d'Architecte
 * (CNOA Construction 2024) pour les dossiers P1 (particulier).
 *
 * Le template est strictement le même que pour P2 : le contrat type unifié CNOA
 * s'applique à tout projet de construction (particulier comme promoteur).
 * Seule la collecte des données diffère :
 *   - MO P1 = particulier (Nom + CIN principal) — sauf personne morale
 *   - MO P2 = société (Raison sociale + RC + ICE)
 *
 * Le rendu HTML est délégué à P2ContractService.renderContractHtml().
 * Ce service apporte la couche d'adaptation P1 (build DossierContractData
 * depuis un dossier P1) + la page de consentement client self-service.
 */
@Injectable()
export class P1ContractService {
  constructor(private readonly p2Contract: P2ContractService) {}

  /**
   * Construit les données de contrat depuis un dossier P1 + son payload.
   * Tolérant aux formes ; champs manquants → "_______________" dans le HTML.
   */
  buildContractData(dossier: any): DossierContractData {
    const payload: any = (dossier?.payload && typeof dossier.payload === "object") ? dossier.payload : {};
    const brief: any = payload.brief || {};
    const projet: any = payload.projet || brief.projet || {};

    // Surface plancher : priorité au champ explicite, sinon quoteSnapshot, sinon brief
    const surfacePlancherM2 =
      (typeof payload.surfacePlancher === "number" ? payload.surfacePlancher : undefined) ??
      (typeof brief.surfacePlancherM2 === "number" ? brief.surfacePlancherM2 : undefined) ??
      (typeof projet.surfacePlancherM2 === "number" ? projet.surfacePlancherM2 : undefined);

    // Type de projet P1 → libellé lisible pour le récap contrat
    const projectTypeLabel = (() => {
      const t = (brief.projectType || projet.projectType || projet.type || "").toLowerCase();
      if (t === "villa") return "Villa individuelle";
      if (t === "immeuble") return "Maison à étages (R+) — usage familial";
      if (t === "ferme_urbaine") return "Ferme urbaine";
      if (t === "renovation") return "Rénovation / Décoration";
      return projet.title || dossier.title || "Projet de construction";
    })();

    const titleFinal = dossier.title || projectTypeLabel;

    return {
      id: dossier.id,
      // Identité MO — P1 : particulier (CIN), ou personne morale si déclaré
      clientNom: dossier.clientNom ?? undefined,
      clientCIN: payload.clientCIN ?? brief.cin ?? undefined,
      clientEmail: dossier.clientEmail ?? undefined,
      clientTel: dossier.clientTel ?? undefined,
      raisonSociale: dossier.raisonSociale ?? null,
      representant: payload.representant,
      rc: payload.rc,
      ice: payload.ice,
      cnss: payload.cnss,
      // Projet
      title: titleFinal,
      commune: dossier.commune ?? brief.commune ?? undefined,
      natureProjet: projectTypeLabel,
      surfaceTerrainM2: typeof payload.surfaceTerrainM2 === "number" ? payload.surfaceTerrainM2
        : typeof brief.terrainArea === "number" ? brief.terrainArea
        : undefined,
      surfacePlancherM2,
      titreFoncierNum: payload.titreFoncierNum ?? brief.tfNumber,
      // Brief synthétisé pour le bloc honoraires (section P1)
      brief: {
        sectionP2: undefined,   // P1 = pas de section P2
        categoryCode: brief.projectType,
        categoryLabel: projectTypeLabel,
        surfacePlancherM2,
        nbBatiments: 1,
        surfaceTerrainHa: undefined,
        followMode: brief.followMode || payload.followMode,
        quoteSnapshot: payload.quoteSnapshot || brief.quoteSnapshot,
      },
      createdAt: dossier.createdAt,
    };
  }

  /**
   * Construit les paramètres administrateur depuis une query string.
   * Format identique à P2 (cohérence) : ?archNom=...&archCIN=...&contratNumero=...
   */
  buildAdminParams(q: Record<string, any>): AdminContractParams {
    return {
      contratNumero: q.contratNumero,
      croaName: q.croaName,
      archNom: q.archNom,
      archCIN: q.archCIN,
      archDomicile: q.archDomicile,
      archAutorisation: q.archAutorisation,
      archAutorisationAnnee: q.archAutorisationAnnee,
      archICE: q.archICE,
      archRC: q.archRC,
      archCNSS: q.archCNSS,
      archTel: q.archTel,
      archEmail: q.archEmail,
      delaiEtudesJours: q.delaiEtudesJours ? Number(q.delaiEtudesJours) : undefined,
      delaiTravauxMois: q.delaiTravauxMois ? Number(q.delaiTravauxMois) : undefined,
      penaliteMOPourcentJour: q.penaliteMOPourcentJour ? Number(q.penaliteMOPourcentJour) : undefined,
      penaliteMOEPourcentJour: q.penaliteMOEPourcentJour ? Number(q.penaliteMOEPourcentJour) : undefined,
    };
  }

  /** Délègue le rendu HTML au template unifié P2. */
  renderContractHtml(data: DossierContractData, admin: AdminContractParams = {}): string {
    return this.p2Contract.renderContractHtml(data, admin);
  }

  /**
   * Page HTML de consentement pour le client en self-service.
   * Affichée quand le client n'a pas (encore) coché les 2 cases obligatoires.
   * Cible visuelle : sobre, type CC (ivoire / navy / or), pas de design system Tailwind ici
   * car servi en HTML standalone hors React.
   */
  renderConsentPage(dossierId: string, projectTitle: string): string {
    const escape = (s: string) => String(s).replace(/[<>&"]/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" } as any)[c]);
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Téléchargement de votre contrat — CITURBAREA</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 640px; margin: 48px auto; padding: 0 24px; color: #0B1B3A; line-height: 1.55; background: #FCFAF6; }
  h1 { font-size: 22px; margin-bottom: 8px; }
  h2 { font-size: 14px; color: #6b7280; font-weight: 500; margin-top: 0; }
  .card { background: #fff; border: 1px solid rgba(11,27,58,0.12); border-radius: 12px; padding: 28px; margin-top: 24px; }
  .consent { background: rgba(159,124,52,0.06); border-left: 3px solid #9F7C34; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  .consent label { display: block; cursor: pointer; font-size: 14px; padding: 8px 0; }
  .consent input[type=checkbox] { transform: scale(1.2); margin-right: 10px; vertical-align: middle; }
  .consent label.required::after { content: " *"; color: #B91C1C; font-weight: 700; }
  .actions { margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end; }
  button { padding: 12px 22px; border-radius: 8px; border: 0; cursor: pointer; font-size: 14px; font-weight: 600; }
  button.primary { background: #0B1B3A; color: #fff; }
  button.primary:disabled { background: #d1d5db; color: #6b7280; cursor: not-allowed; }
  button.secondary { background: transparent; color: #0B1B3A; border: 1px solid rgba(11,27,58,0.2); }
  .legal { font-size: 11px; color: #6b7280; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; line-height: 1.5; }
  .badge { display: inline-block; padding: 4px 10px; background: rgba(159,124,52,0.15); color: #9F7C34; border-radius: 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px; text-transform: uppercase; }
</style>
</head>
<body>

<div class="badge">📜 Contrat à télécharger</div>

<h1>Téléchargement de votre contrat type d'Architecte</h1>
<h2>Projet : ${escape(projectTitle)}</h2>

<div class="card">
  <p>
    Avant de télécharger votre contrat type unifié d'Architecte (CNOA Construction 2024)
    pré-rempli avec les données de votre dossier, vous devez confirmer les deux engagements
    suivants :
  </p>

  <form id="consentForm" method="GET" action="">
    <div class="consent">
      <label class="required">
        <input type="checkbox" id="c_data" name="consent_data" value="true" required/>
        Je certifie sur l'honneur la véracité des données fournies dans mon dossier
        (identité, foncier, projet, surfaces, budget) — un faux serment expose à des
        sanctions civiles et pénales.
      </label>
      <label class="required">
        <input type="checkbox" id="c_usage" name="consent_usage" value="true" required/>
        Je m'engage à n'utiliser ce contrat que pour les besoins du dépôt de mon
        dossier d'autorisation de construire auprès de la commune et du suivi de
        mon chantier — toute autre utilisation est strictement interdite.
      </label>
    </div>

    <div class="actions">
      <button type="button" class="secondary" onclick="history.back()">Annuler</button>
      <button type="submit" class="primary" id="btn_dl" disabled>📥 Télécharger mon contrat</button>
    </div>
  </form>

  <div class="legal">
    Conformément à la loi 09-08 (protection des données personnelles, Maroc), votre
    consentement (horodaté + adresse IP + user-agent) est enregistré dans votre dossier
    à des fins de traçabilité juridique. Le contrat généré porte la mention
    « CITURBAREA — Plateforme d'orchestration architecturale ».
  </div>
</div>

<script>
(function () {
  var f = document.getElementById('consentForm');
  var btn = document.getElementById('btn_dl');
  var c1 = document.getElementById('c_data');
  var c2 = document.getElementById('c_usage');
  function refresh() { btn.disabled = !(c1.checked && c2.checked); }
  c1.addEventListener('change', refresh);
  c2.addEventListener('change', refresh);
})();
</script>

</body>
</html>`;
  }
}
