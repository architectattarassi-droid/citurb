import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// NOTE: this file lives at src/tomes/tome3/portals/p1/
// To reach src/infrastructure/* and src/application/* we need 4 ".." segments.
import { readJSON, writeJSON } from "../../../../infrastructure/storage";
import { STORAGE_KEYS } from "../../../../infrastructure/storage/keys";
import { resolveUserId } from "../../../../application/p1/startQualification";
import { createDossier } from "../../../../application/p1/createDossier";
import { useT, useLang, tVanilla, getStoredLang, LANG_CHANGE_EVENT, type Lang } from "../../../../i18n/i18n";
import FichesPrestations from "../../../../components/fiches-prestations/FichesPrestations";

/**
 * P1Landing
 * - Reconstitution fidèle de la landing HTML historique, sans iframe/srcDoc.
 * - Doctrine: UI inchangée, logique isolée et déterministe, scroll contrôlé.
 * - i18n (2026-05) : les littéraux JSX sont traduits via le namespace
 *   portes.p1.lp.* (FR / AR / EN). Le bloc useEffect imperatif manipule
 *   encore des chaînes FR via .textContent (chemin DOM legacy) — à migrer
 *   dans une itération dédiée (orchestrateur de labels stable côté store).
 */
export default function P1Landing() {
  const navigate = useNavigate();
  const t = useT();
  const { lang, setLang } = useLang();

  useEffect(() => {
    // ---------- i18n vanilla (lang-aware sans render React) ----------
    // tt() lit la langue courante à chaque appel (via localStorage), de sorte
    // qu'un changement de langue + ré-execution des syncs (cf. LANG_CHANGE_EVENT
    // listener plus bas) suffit à mettre à jour les labels manipulés en DOM
    // imperatif (b.textContent = ...).
    const tt = (key: string, vars?: Record<string, string | number>) =>
      tVanilla(key, vars, getStoredLang());
    const localeFor = (l: string): string =>
      l === "ar" ? "ar-MA" : l === "en" ? "en-US" : "fr-FR";

    // ---------- Helpers DOM ----------
    const byId = (id: string) => document.getElementById(id);
    const qs = (sel: string) => document.querySelector(sel) as HTMLElement | null;
    const qsa = (sel: string) => Array.from(document.querySelectorAll(sel)) as HTMLElement[];

    // Doctrine (B5): no automatic scroll. If we need to guide the user, we can
    // focus elements without scrolling.
    const focusNoScroll = (el: HTMLElement | null) => {
      if (!el) return;
      try {
        // Ensure focusable
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        (el as any).focus?.({ preventScroll: true });
      } catch {
        // Best effort
        (el as any).focus?.();
      }
    };

    // Controlled scroll helpers (only triggered by explicit user click handlers)
    const scrollToId = (id: string, block: ScrollLogicalPosition = 'start') => {
      const el = byId(id);
      if (!el) return;
      try {
        el.scrollIntoView({ behavior: 'smooth', block });
      } catch {
        // Best effort
        (el as any).scrollIntoView?.();
      }
    };

    const focusFirstVisibleField = (containerId: string) => {
      const root = byId(containerId);
      if (!root) return;
      const first = root.querySelector(
        "input:not([type='hidden']), select, textarea, button"
      ) as HTMLElement | null;
      focusNoScroll(first);
    };

    // ---------- State (storage-first local) ----------
    const userId = resolveUserId(null);
    const KEY = STORAGE_KEYS.p1Draft(userId);
    const OTP_OK_KEY = `citurbarea:p1:otp_ok:${userId}:v1`;
    type Draft = {
      type?: "villa" | "immeuble" | "renovation" | "ferme_urbaine";
      // Typologies
      villaType?: string;
      immeubleType?: string;
      // Immeuble niveau (R+)
      rLevel?: string;
      // Façades (auto-lock possible sur villa)
      facades?: number;

      // Rénovation / Décoration / Transformation
      renoKind?: "renovation" | "decoration" | "transformation";
      // Support du projet en rénovation : villa ou immeuble
      renoBaseType?: "villa" | "immeuble";

      // piloté par les 3 boutons du hero
      planMode?: 'type' | 'personnalise' | 'qualification';

      // ── Champs SP v2 (2026-06) — utilisés par computeSP ────────────────
      /** Largeur de la voie devant le projet (m). ≥12m → coef étage 1.1 */
      voieLargeur?: number;
      /** Pour immeuble 1 façade : 'with_cour' | 'without_cour' | 'unknown' */
      rdcCourMode?: 'with_cour' | 'without_cour' | 'unknown';
      /** Surface de la cour saisie (m²) si rdcCourMode='with_cour' */
      courSurface?: number;
      /** Galerie pour RDC commercial : 'yes' (CES 0.7) ou 'no' (CES 1.0) */
      galerieRdc?: 'yes' | 'no';
      /** Mode ferme urbaine : 'rapide' (2% terrain) ou 'libre' (surface saisie) */
      fermeMode?: 'rapide' | 'libre';
      /** Surface bâtie en mode libre ferme urbaine (m²) */
      fermeSurface?: number;
      /** Surface terrain en hectares pour ferme urbaine */
      fermeHectares?: number;

      // extensible sans casser l’UI
      [k: string]: any;
    };

    const load = (): Draft => {
      return readJSON<Draft>(KEY, {});
    };

    const save = (d: Draft) => {
      writeJSON(KEY, d);
    };

    const getProjectTypeCtaLabel = (mode: Draft['planMode']) => {
      if (mode === 'type') return tt('p1.lp.imperative.cta_type');
      if (mode === 'personnalise') return tt('p1.lp.imperative.cta_perso');
      return tt('p1.lp.imperative.cta_start');
    };

    const syncProjectTypeCtas = () => {
      const label = getProjectTypeCtaLabel(draft.planMode);
      qsa<HTMLButtonElement>('.project-type-btn').forEach((b) => {
        b.textContent = label;
      });
    };

    const scrollToPillars = () => {
      // scroll uniquement sur clic utilisateur
      byId('pillars')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const scrollToAnalyse = () => scrollToId("details_anchor");

    let draft: Draft = load();

    const applyVisibility = () => {
      const v = byId('bar_villa');
      const i = byId('bar_immeuble');
      const r = byId('bar_reno');

      const effectiveType =
        draft.type === 'renovation' ? (draft.renoBaseType || undefined) : draft.type;

      // Bars principaux
      const showVilla = effectiveType === 'villa';
      const showImmeuble = effectiveType === 'immeuble';
      const showReno = draft.type === 'renovation';

      if (v) (v as HTMLElement).style.display = showVilla ? 'block' : 'none';
      if (i) (i as HTMLElement).style.display = showImmeuble ? 'block' : 'none';
      if (r) (r as HTMLElement).style.display = showReno ? 'block' : 'none';

      // Blocks spécifiques immeuble (si présents)
      const mv = qs('#maison_ville_block');
      const rdc = qs('#rdc_commercial_block');
      if (mv) (mv as HTMLElement).style.display = (effectiveType === 'immeuble' && draft.immeubleType === 'maison_ville') ? 'block' : 'none';
      if (rdc) (rdc as HTMLElement).style.display = (effectiveType === 'immeuble' && draft.immeubleType === 'rdc_commercial') ? 'block' : 'none';

      // Visibilité annexes (dans le markup actuel)
      const facWrap = byId('facades_wrap');
      const galWrap = byId('galerie_wrap');
      const mdvWrap = byId('mdv_fields');
      const commonWrap = byId('immeuble_common_wrap');
      const rdcWrap = byId('rdc_commercial_wrap');

      if (facWrap) (facWrap as HTMLElement).style.display = (effectiveType === 'immeuble') ? 'block' : 'none';
      // Common block contains basement + budget selection (needed for villa + immeuble + rénovation support)
      if (commonWrap) (commonWrap as HTMLElement).style.display = (effectiveType === 'immeuble' || effectiveType === 'villa') ? 'block' : 'none';

      if (galWrap) (galWrap as HTMLElement).style.display = (effectiveType === 'immeuble' && draft.immeubleType === 'rdc_commercial') ? 'block' : 'none';
      if (mdvWrap) (mdvWrap as HTMLElement).style.display = (effectiveType === 'immeuble' && draft.immeubleType === 'maison_ville') ? 'block' : 'none';
      if (rdcWrap) (rdcWrap as HTMLElement).style.display = (effectiveType === 'immeuble' && draft.immeubleType === 'rdc_commercial') ? 'block' : 'none';

      // Plan mode visual feedback
      qsa('[data-planmode]').forEach((b) => {
        const m = (b as HTMLElement).getAttribute('data-planmode');
        b.classList.toggle('selected', !!m && m === draft.planMode);
      });

      // Sync valeurs des selects façades depuis le draft (évite "non actif" après changement de support)
      const selVilla = byId('q_villa_facades') as HTMLSelectElement | null;
      if (selVilla) {
        const target = (draft.villaFacadesChoice ?? '') as string;
        if (selVilla.value !== target) selVilla.value = target;
      }
      const selIm = byId('q_facades') as HTMLSelectElement | null;
      if (selIm) {
        const target = (draft.facadesChoice ?? '') as string;
        if (selIm.value !== target) selIm.value = target;
      }

      // CTA des cartes suit le service demandé
      syncProjectTypeCtas();
    };

    // Bind plan mode buttons (Plan type / Personnalise / Qualification)
    qsa('[data-planmode]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = (btn as HTMLElement).getAttribute('data-planmode') as any;
        draft.planMode = mode;
        save(draft);
        // Feedback
        qsa('[data-planmode]').forEach((b) => {
          b.classList.remove('selected');
          b.classList.remove('cit-selected');
        });
        btn.classList.add('selected');
        btn.classList.add('cit-selected');
        // Update CTA + scroll target by mode
        syncProjectTypeCtas();

        // UX demandé : au clic sur l’un des 3 boutons du hero, on amène uniquement
        // l’utilisateur vers "Trois piliers structurels". Le scroll vers les champs
        // ne se fait qu’après qu’il choisisse une des 3 cartes (villa/immeuble/réno).
        scrollToPillars();
        // Focus indicatif (sans scroll) pour guider l’œil.
        window.setTimeout(() => focusNoScroll(qs('#price-card-villa') || qs('#project_types')), 300);
      });
    });

    // Apply initial visibility based on stored draft.
    // IMPORTANT: refreshBudgetOptions() depends on BANDS/roundMAD/computeSP,
    // which are declared later in this effect. Calling it here can trigger a
    // TDZ ReferenceError ("Cannot access 'BANDS' before initialization").
    applyVisibility();

    // ---------- Lang buttons (must not be dead) ----------
    const setLang = (lang: "fr" | "ar" | "en") => {
      writeJSON("citurbarea:lang:v1", lang);
      document.body.dir = lang === "ar" ? "rtl" : "ltr";
      // Visual active state (no layout change)
      qsa(".lang-btn").forEach((b) => {
        const isActive = (b.getAttribute("data-lang") || "fr") === lang;
        b.classList.toggle("active", isActive);
        // inline style swap (keeps same dimensions)
        (b as HTMLElement).style.background = isActive ? "linear-gradient(135deg,#C9A227,#E6C75B)" : "white";
        (b as HTMLElement).style.color = isActive ? "white" : "#0B1B3A";
        (b as HTMLElement).style.border = isActive ? "none" : "1px solid rgba(201,162,39,0.3)";
      });
    };

    // init from storage
    const initialLang = (() => {
      return readJSON<any>("citurbarea:lang:v1", "fr") || "fr";
    })();
    setLang(initialLang);
    qsa(".lang-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const lang = (b.getAttribute("data-lang") || "fr") as any;
        setLang(lang);
      });
    });

    // ---------- Visual selection (sans changer le design) ----------
    const markSelected = (groupSelector: string, btn: HTMLElement) => {
      // Remove selection from all buttons AND (if present) their closest cards.
      qsa(groupSelector).forEach(b => {
        b.classList.remove("cit-selected");
        b.classList.remove("selected");
        const card = (b as HTMLElement).closest?.(".price-card") as HTMLElement | null;
        if (card) card.classList.remove("cit-selected");
      });
      // Apply selection to button + card (visual feedback required by doctrine).
      btn.classList.add("cit-selected");
      btn.classList.add("selected");
      const card = btn.closest?.(".price-card") as HTMLElement | null;
      if (card) card.classList.add("cit-selected");
    };

    // ---------- Villa facade auto-lock ----------
    const setFacadeAuto = (n: number | undefined) => {
      if (!n) return;
      draft.facades = n;
      save(draft);

      // Si le DOM contient des boutons façades, on les met à jour visuellement.
      const map: Record<number, string> = {
        1: tt('p1.lp.imperative.facade_1'),
        2: tt('p1.lp.imperative.facade_2'),
        3: tt('p1.lp.imperative.facade_3'),
        4: tt('p1.lp.imperative.facade_4'),
      };
      const label = map[n];
      if (!label) return;

      // Le markup historique contient des boutons "façades" (texte).
      const facadeBtns = qsa("[data-fac]").filter(b => (b as any).dataset?.fac === String(n));
      if (facadeBtns.length) {
        markSelected("[data-fac]", facadeBtns[0]);
        // lock other choices
        qsa("[data-fac]").forEach(b => { (b as HTMLButtonElement).disabled = (b !== facadeBtns[0]); });
      }
    };

    // ---------- Identité: personne physique / morale (affichage conditionnel) ----------
    const syncPersonTypeVisibility = () => {
      const pt = (byId('q_person_type') as HTMLSelectElement | null)?.value || '';
      const showPhys = pt === 'physique';
      const showMoral = pt === 'morale';

      const phys = byId('phys_id_wrap');
      const physNum = byId('phys_id_number_wrap');
      const moralName = byId('moral_name_wrap');
      const moralForm = byId('moral_form_wrap');
      const moralIce = byId('moral_ice_wrap');
      const moralRc = byId('moral_rc_wrap');

      if (phys) phys.style.display = showPhys ? 'block' : 'none';
      // le numéro n'apparaît que si type pièce choisi
      const idType = (byId('q_phys_id_type') as HTMLSelectElement | null)?.value || '';
      if (physNum) physNum.style.display = (showPhys && !!idType) ? 'block' : 'none';

      if (moralName) moralName.style.display = showMoral ? 'block' : 'none';
      if (moralForm) moralForm.style.display = showMoral ? 'block' : 'none';
      if (moralIce) moralIce.style.display = showMoral ? 'block' : 'none';
      if (moralRc) moralRc.style.display = showMoral ? 'block' : 'none';
    };

    // initial + listeners
    const personTypeEl = byId('q_person_type') as HTMLSelectElement | null;
    const physIdTypeEl = byId('q_phys_id_type') as HTMLSelectElement | null;
    if (personTypeEl) {
      personTypeEl.addEventListener('change', () => {
        draft.personType = personTypeEl.value || undefined;
        // reset champs selon type
        if (draft.personType === 'physique') {
          draft.companyName = undefined; draft.companyForm = undefined; draft.companyICE = undefined; draft.companyRC = undefined;
        }
        if (draft.personType === 'morale') {
          draft.physIdType = undefined; draft.physIdNumber = undefined;
        }
        save(draft);
        syncPersonTypeVisibility();
      });
    }
    if (physIdTypeEl) {
      physIdTypeEl.addEventListener('change', () => {
        draft.physIdType = physIdTypeEl.value || undefined;
        save(draft);
        syncPersonTypeVisibility();
      });
    }
    // run once after mount
    setTimeout(syncPersonTypeVisibility, 0);

    // ---------- Bindings: identité & contact (persist draft) ----------
    // These fields are used later in Packs/Dossier pages (member view). Without persisting them,
    // the user arrives to offers with "Demandeur: —".
    const bindInput = (id: string, key: string) => {
      const el = byId(id) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return;
      // hydrate
      if ((draft as any)[key] && !el.value) el.value = String((draft as any)[key]);
      const handler = () => {
        const v = (el.value || "").trim();
        (draft as any)[key] = v || undefined;
        save(draft);
        if (id === 'q_area') refreshBudgetOptions();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    };

    const bindSelect = (id: string, key: string) => {
      const el = byId(id) as HTMLSelectElement | null;
      if (!el) return;
      if ((draft as any)[key] && !el.value) el.value = String((draft as any)[key]);
      el.addEventListener('change', () => {
        const v = (el.value || "").trim();
        (draft as any)[key] = v || undefined;
        save(draft);
        if (id === 'q_basement') refreshBudgetOptions();
      });
    };

    // ── Budget Engine (Mode A) ─────────────────────────────────────────────
    // Doctrine UI: on affiche uniquement des budgets globaux en MAD.
    // Plage élargie 2026-06 : 1 500 → 25 000 DH/m² pour couvrir tous les budgets
    // (logement basique → ultra-luxe). Granularité fine en bas, paliers larges
    // en haut où la sensibilité au prix est moindre.
    const BANDS: Array<{ min: number; max: number }> = [
      { min: 1500,  max: 2000  },  // Très économique (basique)
      { min: 2000,  max: 2500  },  // Très économique +
      { min: 2500,  max: 3000  },  // Économique (logement social)
      { min: 3000,  max: 3500  },
      { min: 3500,  max: 4000  },  // Standing entrée
      { min: 4000,  max: 4500  },
      { min: 4500,  max: 5000  },  // Standing
      { min: 5000,  max: 5500  },
      { min: 5500,  max: 6500  },  // Haut standing
      { min: 6500,  max: 8000  },  // Premium
      { min: 8000,  max: 10000 },  // Premium +
      { min: 10000, max: 13000 },  // Luxe
      { min: 13000, max: 18000 },  // Ultra-luxe
      { min: 18000, max: 25000 },  // Top of market
    ];

    const roundMAD = (n: number) => {
      // arrondi propre pour affichage (10 000 MAD)
      const step = 10000;
      return Math.max(step, Math.round(n / step) * step);
    };

    // Declared as a function (hoisted) because computeSP() may be executed
    // by initial effects before const-initializers are evaluated.
    function parseRLevel(r?: string): number | undefined {
      // R1/R2/R3/R4 → 1..4
      if (!r) return undefined;
      const m = String(r).match(/R(\d+)/i);
      if (!m) return undefined;
      const n = parseInt(m[1], 10);
      return Number.isFinite(n) ? n : undefined;
    }

    // Forfait fixe ajouté à toute SP : cage d'escalier + buanderie + terrasse
    // (24 m² total — règle métier 2026-06).
    const FORFAIT_ADDONS_M2 = 24;

    /**
     * Cour minimum réglementaire au Maroc selon le nombre d'étages.
     * Utilisée quand l'user déclare "RDC AVEC cour" mais ne précise pas (ou < min).
     */
    function courMinReglementaire(eFloors: number): number {
      if (eFloors <= 1) return 9;    // R+1
      if (eFloors === 2) return 16;  // R+2
      if (eFloors === 3) return 20;  // R+3
      return 24;                     // R+4+ : "fond de cour" placeholder, à étudier (flag UI)
    }

    function computeSP(): number | null {
      const areaEl = byId('q_area') as HTMLInputElement | null;
      const st = areaEl ? Number(areaEl.value || NaN) : NaN;
      if (!Number.isFinite(st) || st <= 0) return null;

      const basementEl = byId('q_basement') as HTMLSelectElement | null;
      const basementVal = (basementEl?.value || '').trim();
      // Le sous-sol influence la SP, mais on ne bloque pas le budget si l'utilisateur
      // n'a pas encore choisi: défaut = "non".
      const hasBasement = basementVal === 'yes' ? 1 : 0;

      // Largeur de voie : ≥12 m → coef étage 1.1 (porte-à-faux autorisé), sinon 1.0.
      const voieLargeur = Number(draft.voieLargeur || NaN);
      const coefEtage = Number.isFinite(voieLargeur) && voieLargeur >= 12 ? 1.1 : 1.0;

      const effectiveType = draft.type === 'renovation' ? (draft.renoBaseType || undefined) : draft.type;

      // ── FERME URBAINE ─────────────────────────────────────────────────
      // Mode rapide : 2% × surface_terrain (en m² ou converti depuis hectares)
      // Mode libre  : surface saisie par l'user (à valider à l'étude)
      if (draft.type === 'ferme_urbaine') {
        if (draft.fermeMode === 'libre') {
          const surf = Number(draft.fermeSurface || NaN);
          return Number.isFinite(surf) && surf > 0 ? surf + FORFAIT_ADDONS_M2 : null;
        }
        // Rapide : 2% du terrain. Si saisie en hectares, convertir d'abord.
        const ha = Number(draft.fermeHectares || NaN);
        const stEffectif = Number.isFinite(ha) && ha > 0 ? ha * 10000 : st;
        return stEffectif * 0.02 + FORFAIT_ADDONS_M2;
      }

      // ── VILLA ─────────────────────────────────────────────────────────
      // R+ libre désormais (parseRLevel sur draft.rLevel, défaut R+1).
      if (effectiveType === 'villa') {
        const vt = (draft.villaType || '').toLowerCase();
        if (!vt) return null;
        const coef = vt.includes('bande') ? 0.5 : vt.includes('jume') ? 0.4 : vt.includes('isol') ? 0.3 : 0.4;
        const floors = parseRLevel(draft.rLevel) ?? 1; // R+1 par défaut si non saisi
        return st * coef * (1 + (coefEtage * floors) + hasBasement) + FORFAIT_ADDONS_M2;
      }

      // ── IMMEUBLE ──────────────────────────────────────────────────────
      if (effectiveType === 'immeuble') {
        if (!draft.immeubleType) return null;
        const e = parseRLevel(draft.rLevel);
        if (!e) return null;
        const fac = Number(draft.facades || NaN);
        if (!Number.isFinite(fac) || fac <= 0) return null;

        // CES (Coefficient d'Emprise au Sol) :
        // - maison de ville : 0.7 (recul jardin obligatoire)
        // - RDC commercial AVEC galerie : 0.7 (recul galerie)
        // - RDC commercial SANS galerie : 1.0 (occupe tout le lot)
        // - immeuble standard : 1.0
        let CES: number;
        if (draft.immeubleType === 'maison_ville') {
          CES = 0.7;
        } else if (draft.immeubleType === 'rdc_commercial') {
          CES = draft.galerieRdc === 'no' ? 1.0 : 0.7; // par défaut "yes" (recul galerie)
        } else {
          CES = 1.0;
        }

        const RDC_plein = st * CES;

        // ≥2 façades : formule standard, coef étage appliqué (porte-à-faux possible).
        if (fac >= 2) {
          return RDC_plein * (1 + hasBasement + (coefEtage * e)) + FORFAIT_ADDONS_M2;
        }

        // 1 façade (mitoyen 2 côtés) : règles cour spécifiques selon RDC mode.
        const rdcMode = draft.rdcCourMode || 'unknown';

        if (rdcMode === 'unknown') {
          // Plancher MAX : aucune soustraction de cour, hypothèse haute (à valider à l'étude).
          // étages SANS coef 1.1 (1 façade = pas de débordement latéral même si voie large).
          return RDC_plein * (1 + hasBasement + e) + FORFAIT_ADDONS_M2;
        }

        if (rdcMode === 'with_cour') {
          // Cour appliquée au RDC, étages héritent verticalement.
          const courSaisie = Number(draft.courSurface || 0);
          const cour = Math.max(courSaisie, courMinReglementaire(e));
          const RDC_net = Math.max(0, RDC_plein - cour);
          return RDC_net * (1 + hasBasement + e) + FORFAIT_ADDONS_M2;
        }

        // rdcMode === 'without_cour' : RDC plein, cour de jour 9 m² à chaque étage.
        // R+3 dernier niveau : cour 16 m² (réglementaire renforcée).
        // R+4 dernier niveau : "fond de cour" placeholder 20 m² + flag (UI).
        let etagesTotal = 0;
        for (let i = 1; i <= e; i++) {
          let cour_etage = 9;
          if (e === 3 && i === 3) cour_etage = 16;
          else if (e >= 4 && i === e) cour_etage = 20;
          etagesTotal += Math.max(0, RDC_plein - cour_etage);
        }
        const sousSol_m2 = hasBasement * RDC_plein;
        return RDC_plein + sousSol_m2 + etagesTotal + FORFAIT_ADDONS_M2;
      }

      return null;
    }

    function refreshBudgetOptions() {
      const sel = byId('q_budget') as HTMLSelectElement | null;
      if (!sel) return;

      const sp = computeSP();
      const prev = sel.value;

      // Reset
      sel.innerHTML = '';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = sp
        ? tt('p1.lp.imperative.budget_choose')
        : tt('p1.lp.imperative.budget_need_typology');
      sel.appendChild(opt0);

      if (!sp) {
        // nettoyage du draft pour éviter un budget figé
        delete (draft as any).budgetBandId;
        delete (draft as any).budgetMinMAD;
        delete (draft as any).budgetMaxMAD;
        delete (draft as any).budgetLabel;
        delete (draft as any).budget;
        save(draft);
        return;
      }

      BANDS.forEach(({ min, max }) => {
        const minMAD = roundMAD(sp * min);
        const maxMAD = roundMAD(sp * max);
        const o = document.createElement('option');
        o.value = `${min}-${max}`;
        const loc = localeFor(getStoredLang());
        o.textContent = tt('p1.lp.imperative.budget_range', {
          min: minMAD.toLocaleString(loc),
          max: maxMAD.toLocaleString(loc),
        });
        o.setAttribute('data-minmad', String(minMAD));
        o.setAttribute('data-maxmad', String(maxMAD));
        sel.appendChild(o);
      });

      // restore previous selection if possible
      if (prev) sel.value = prev;
      if (!sel.value && (draft as any).budgetBandId) sel.value = String((draft as any).budgetBandId);

      // Sync draft if selection exists
      if (sel.value) {
        const selected = sel.selectedOptions?.[0];
        const minMAD = Number(selected?.getAttribute('data-minmad') || NaN);
        const maxMAD = Number(selected?.getAttribute('data-maxmad') || NaN);
        (draft as any).budgetBandId = sel.value;
        (draft as any).budgetMinMAD = Number.isFinite(minMAD) ? minMAD : undefined;
        (draft as any).budgetMaxMAD = Number.isFinite(maxMAD) ? maxMAD : undefined;
        (draft as any).budgetLabel = (selected?.textContent || '').trim();
        // compat: certaines pages attendent un budget numérique
        (draft as any).budget = Number.isFinite(maxMAD) ? String(maxMAD) : undefined;
        save(draft);
      }
    };

    // Identité
    bindInput('q_firstname', 'firstname');
    bindInput('q_lastname', 'lastname');
    bindInput('q_phone', 'phone');
    bindInput('q_email', 'email');
    bindSelect('q_legal_situation', 'legalSituation');

    // Terrain / paramètres utiles au budget
    bindInput('q_area', 'terrainArea');
    bindSelect('q_basement', 'basement');

    // Initial budget options hydrate AFTER budget engine constants are initialized
    // and the relevant fields are bound.
    refreshBudgetOptions();

    // Personne physique
    bindInput('q_phys_id_number', 'physIdNumber');

    // Personne morale (ICE/RC are NOT mandatory)
    bindInput('q_company_name', 'companyName');
    bindInput('q_company_form', 'companyForm');
    bindInput('q_company_ice', 'companyICE');
    bindInput('q_company_rc', 'companyRC');

// ---------- Bindings (remplace les anciens onclick) ----------
    // 1) Sélection villa typologie
    qsa("[data-villa]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = (btn as HTMLElement).getAttribute("data-villa") || "";
        draft.type = "villa";
        draft.villaType = v;
        // blocage façades automatique selon typologie
        if (v === "bande") setFacadeAuto(2);
        else if (v === "jumelée" || v === "jumelee") setFacadeAuto(3);
        else if (v === "isolée" || v === "isolee") setFacadeAuto(4);
        save(draft);
        markSelected("[data-villa]", btn);
        applyVisibility();
        refreshBudgetOptions();
      });
    });

    // 2) Sélection immeuble type
    qsa("[data-imt]").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = (btn as HTMLElement).getAttribute("data-imt") || "";
        draft.type = "immeuble";
        draft.immeubleType = t;
        save(draft);
        markSelected("[data-imt]", btn);
        applyVisibility();
        refreshBudgetOptions();

        // Isolation modules: on masque les blocs non pertinents si présents
        const mv = qs("#maison_ville_block");
        const rdc = qs("#rdc_commercial_block");
        if (mv) mv.style.display = t === "maison_ville" ? "block" : "none";
        if (rdc) rdc.style.display = t === "rdc_commercial" ? "block" : "none";

        refreshBudgetOptions();
      });
    });

    // 2a) Nombre de façades (immeuble)
    // Groupe rendu sous forme de boutons (data-fac). Sans binding, le champ paraît inactif.
    qsa("[data-fac]").forEach(btn => {
      btn.addEventListener("click", () => {
        const f = (btn as HTMLElement).getAttribute("data-fac") || "";
        draft.facadesChoice = f;
        const n = parseInt(f, 10);
        if (Number.isFinite(n)) draft.facades = n;
        save(draft);
        markSelected("[data-fac]", btn);
        refreshBudgetOptions();
      });
    });

    
    // 2b) Niveau immeuble (R+)
    qsa("[data-r]").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = (btn as HTMLElement).getAttribute("data-r") || "";
        draft.rLevel = r;
        save(draft);
        markSelected("[data-r]", btn);
        refreshBudgetOptions();
      });
    });

    // 2c) Rénovation: choix du type (rénovation / décoration / transformation)
    qsa("[data-reno-kind]").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = (btn as HTMLElement).getAttribute("data-reno-kind") as any;
        draft.type = "renovation";
        draft.renoKind = k;
        save(draft);
        markSelected("[data-reno-kind]", btn);
        applyVisibility();
        refreshBudgetOptions();
      });
    });

    // 2d) Rénovation: support du projet (villa / immeuble)
    qsa("[data-reno-base]").forEach(btn => {
      btn.addEventListener("click", () => {
        const b = (btn as HTMLElement).getAttribute("data-reno-base") as any;
        draft.type = "renovation";
        draft.renoBaseType = b;
        save(draft);
        markSelected("[data-reno-base]", btn);
        applyVisibility();
        refreshBudgetOptions();
        refreshBudgetOptions();
      });
    });

// 3) Choix type projet (cartes du haut)
    // Le markup contient 3 cartes villa/immeuble/renovation : on hook sur data-p1type si présent
    qsa("[data-p1type]").forEach(btn => {
      btn.addEventListener("click", () => {
        const tp = (btn as HTMLElement).getAttribute("data-p1type") as any;
        draft.type = tp;

        // Si on passe en rénovation, on ne doit pas afficher les typologies villa/immeuble
        // tant que l'utilisateur n'a pas choisi le support (villa/immeuble).
        if (tp === 'renovation') {
          draft.renoBaseType = undefined;
          draft.villaType = undefined;
          draft.immeubleType = undefined;
          draft.rLevel = undefined;
          // on garde renoKind si déjà choisi, sinon il sera choisi après
        }
        save(draft);
        markSelected("[data-p1type]", btn);
        applyVisibility();
        refreshBudgetOptions();
        // UX: après sélection du type, afficher d'abord la section "Analysez votre projet"
        // (et ne pas forcer le focus sur les champs).
        scrollToId('analyser_mon_projet');
      });
    });

    // 3b) Façades (selects) — doit fonctionner aussi en rénovation
    // IMPORTANT: on utilise une délégation d'événement (change) pour éviter
    // toute régression si le DOM est réordonné/conditionnel.
    const onSelectChange = (ev: Event) => {
      const t = ev.target as any;
      if (!t || !(t instanceof HTMLSelectElement)) return;

      if (t.id === 'q_villa_facades') {
        draft.villaFacadesChoice = (t.value || '').trim();
        const n = parseInt(draft.villaFacadesChoice || '', 10);
        if (Number.isFinite(n)) draft.facades = n;
        save(draft);
        return;
      }

      if (t.id === 'q_facades') {
        draft.facadesChoice = (t.value || '').trim();
        const n = parseInt(draft.facadesChoice || '', 10);
        if (Number.isFinite(n)) draft.facades = n;
        save(draft);
        return;
      }
    };

    // Délégation robuste : certains scénarios (sections masquées/affichées)
    // peuvent rater le 'change' au premier rendu. On écoute aussi 'input'.
    document.addEventListener('change', onSelectChange);
    document.addEventListener('input', onSelectChange);

    // Sécurité supplémentaire : binding direct sur q_facades si présent.
    const bindFacadesSelect = () => {
      const el = byId('q_facades') as HTMLSelectElement | null;
      if (!el) return;
      const handler = () => {
        draft.facadesChoice = (el.value || '').trim();
        const n = parseInt(draft.facadesChoice || '', 10);
        if (Number.isFinite(n)) draft.facades = n;
        save(draft);
        refreshBudgetOptions();
      };
      el.addEventListener('change', handler);
      el.addEventListener('input', handler);
    };
    bindFacadesSelect();

    // Budget (MAD) — persist selection
    const bindBudgetSelect = () => {
      const sel = byId('q_budget') as HTMLSelectElement | null;
      if (!sel) return;
      const handler = () => {
        const v = (sel.value || '').trim();
        (draft as any).budgetBandId = v || undefined;
        const selected = sel.selectedOptions?.[0];
        const minMAD = Number(selected?.getAttribute('data-minmad') || NaN);
        const maxMAD = Number(selected?.getAttribute('data-maxmad') || NaN);
        (draft as any).budgetMinMAD = Number.isFinite(minMAD) ? minMAD : undefined;
        (draft as any).budgetMaxMAD = Number.isFinite(maxMAD) ? maxMAD : undefined;
        (draft as any).budgetLabel = (selected?.textContent || '').trim();
        (draft as any).budget = Number.isFinite(maxMAD) ? String(maxMAD) : undefined;
        save(draft);
      };
      sel.addEventListener('change', handler);
    };
    bindBudgetSelect();

    // Init budgets once after all bindings
    refreshBudgetOptions();

    // 4) Analyse projet → générer le récap COMPLET uniquement dans la section 5
    // (pas de récap mini en section 3)

    const btnAnalyze = byId("btn_analyze_project") || qs("[data-action='analyze']") || null;
    if (btnAnalyze) {
      btnAnalyze.addEventListener("click", (e) => {
        e.preventDefault();

        const effectiveType =
          draft.type === "renovation" ? (draft.renoBaseType || draft.type) : draft.type;

        // Récap complet (au-dessus des détails du projet)
        const v = (id: string) => {
          const el = byId(id) as HTMLInputElement | HTMLSelectElement | null;
          if (!el) return "";
          return (el.value || "").trim();
        };
        const label = (id: string) => {
          const el = byId(id) as HTMLSelectElement | null;
          if (!el) return "";
          const opt = el.selectedOptions?.[0];
          return (opt?.textContent || el.value || "").trim();
        };

        // Persist identity/contact into the draft so member pages can greet the user.
        // (V1 tunnel: qualification may be completed before account creation)
        draft.firstname = v('q_firstname') || undefined;
        draft.lastname = v('q_lastname') || undefined;
        draft.phone = v('q_phone') || undefined;
        draft.email = v('q_email') || undefined;
        draft.personType = v('q_person_type') || draft.personType;
        draft.legalSituation = v('q_legal_situation') || draft.legalSituation;
        draft.physIdType = v('q_phys_id_type') || draft.physIdType;
        draft.physIdNumber = v('q_phys_id_number') || draft.physIdNumber;
        draft.companyName = v('q_company_name') || draft.companyName;
        draft.companyForm = v('q_company_form') || draft.companyForm;
        draft.companyICE = v('q_company_ice') || draft.companyICE;
        draft.companyRC = v('q_company_rc') || draft.companyRC;

        // Budget (MAD) — persist selection for packs + welcome
        const bSel = byId('q_budget') as HTMLSelectElement | null;
        if (bSel) {
          const vBand = (bSel.value || '').trim();
          (draft as any).budgetBandId = vBand || (draft as any).budgetBandId;
          const opt = bSel.selectedOptions?.[0];
          const minMAD = Number(opt?.getAttribute('data-minmad') || NaN);
          const maxMAD = Number(opt?.getAttribute('data-maxmad') || NaN);
          (draft as any).budgetMinMAD = Number.isFinite(minMAD) ? minMAD : (draft as any).budgetMinMAD;
          (draft as any).budgetMaxMAD = Number.isFinite(maxMAD) ? maxMAD : (draft as any).budgetMaxMAD;
          (draft as any).budgetLabel = (opt?.textContent || '').trim() || (draft as any).budgetLabel;
          (draft as any).budget = Number.isFinite(maxMAD) ? String(maxMAD) : (draft as any).budget;
        }
        save(draft);

        const recapInline = byId("recap_inline");
        const recapInlineContent = byId("recap_inline_content");

        const lines: Array<[string, string]> = [];

        // 0) Récap — Demandeur (même logique que la collecte)
        lines.push([tt("portes.p1.recap.section.requester"), "__section__"]);
        const fullName = [v("q_lastname"), v("q_firstname")].filter(Boolean).join(" ");
        if (fullName) lines.push([tt("portes.p1.recap.f.fullname"), fullName]);
        if (v("q_phone")) lines.push([tt("portes.p1.recap.f.phone"), v("q_phone")]);
        if (v("q_email")) lines.push([tt("portes.p1.recap.f.email"), v("q_email")]);
        if (label("q_person_type")) lines.push([tt("portes.p1.recap.f.person"), label("q_person_type")]);
        if (label("q_legal_situation")) lines.push([tt("portes.p1.recap.f.legal"), label("q_legal_situation")]);

        if (label("q_phys_id_type")) lines.push([tt("portes.p1.recap.f.id_type"), label("q_phys_id_type")]);
        if (v("q_phys_id_number")) lines.push([tt("portes.p1.recap.f.id_number"), v("q_phys_id_number")]);

        if (v("q_company_name")) lines.push([tt("portes.p1.recap.f.company"), v("q_company_name")]);
        if (v("q_company_form")) lines.push([tt("portes.p1.recap.f.company_form"), v("q_company_form")]);
        if (v("q_company_ice")) lines.push([tt("portes.p1.recap.f.ice"), v("q_company_ice")]);
        if (v("q_company_rc")) lines.push([tt("portes.p1.recap.f.rc"), v("q_company_rc")]);

        // 1) Récap — Projet
        lines.push([tt("portes.p1.recap.section.project"), "__section__"]);
        lines.push([tt("portes.p1.recap.f.service"), draft.planMode === "type" ? tt("portes.p1.recap.val.plan_type") : draft.planMode === "personnalise" ? tt("portes.p1.recap.val.plan_custom") : tt("portes.p1.recap.val.start_qual")]);
        lines.push([tt("portes.p1.recap.f.category"), draft.type === "renovation" ? tt("portes.p1.recap.val.cat.reno") : draft.type === "villa" ? tt("portes.p1.recap.val.cat.villa") : draft.type === "immeuble" ? tt("portes.p1.recap.val.cat.imm") : tt("portes.p1.recap.val.cat.dash")]);

        if (draft.type === "renovation") {
          const k = draft.renoKind === "decoration" ? tt("portes.p1.recap.val.reno.decoration") : draft.renoKind === "transformation" ? tt("portes.p1.recap.val.reno.transformation") : tt("portes.p1.recap.val.reno.renovation");
          lines.push([tt("portes.p1.recap.f.reno_type"), k]);
          lines.push([tt("portes.p1.recap.f.support"), draft.renoBaseType === "immeuble" ? tt("portes.p1.recap.val.cat.imm") : draft.renoBaseType === "villa" ? tt("portes.p1.recap.val.cat.villa") : tt("portes.p1.recap.val.cat.dash")]);
        }

        if (effectiveType === "villa") {
          const vt = draft.villaType || tt("portes.p1.recap.val.cat.dash");
          lines.push([tt("portes.p1.recap.f.villa_type"), vt]);
          lines.push([tt("portes.p1.recap.f.facades"), label("q_villa_facades") || (draft.villaFacadesChoice || "") || (draft.facades ? String(draft.facades) : tt("portes.p1.recap.val.cat.dash"))]);
        }

        if (effectiveType === "immeuble") {
          lines.push([tt("portes.p1.recap.f.imm_type"), draft.immeubleType || tt("portes.p1.recap.val.cat.dash")]);
          lines.push([tt("portes.p1.recap.f.r_level"), draft.rLevel ? draft.rLevel.replace("R", "R+") : tt("portes.p1.recap.val.cat.dash")]);
          lines.push([tt("portes.p1.recap.f.facades"), label("q_facades") || (draft.facadesChoice || "") || tt("portes.p1.recap.val.cat.dash")]);
          lines.push([tt("portes.p1.recap.f.basement"), label("q_basement") || tt("portes.p1.recap.val.cat.dash")]);
          if (draft.immeubleType === "rdc_commercial") lines.push([tt("portes.p1.recap.f.rdc_comm"), label("q_rdc_commercial") || tt("portes.p1.recap.val.cat.dash")]);
        }

        // Données générales / foncier (si remplies)
        if (v("q_region")) lines.push([tt("portes.p1.recap.f.region"), v("q_region")]);
        if (v("q_province")) lines.push([tt("portes.p1.recap.f.province"), v("q_province")]);
        if (v("q_commune")) lines.push([tt("portes.p1.recap.f.commune"), v("q_commune")]);
        if (label("q_timeline")) lines.push([tt("portes.p1.recap.f.timeline"), label("q_timeline")]);
        if (label("q_budget")) lines.push([tt("portes.p1.recap.f.budget"), label("q_budget")]);
        if (label("q_owner_status")) lines.push([tt("portes.p1.recap.f.owner"), label("q_owner_status")]);
        if (label("q_tf_status")) lines.push([tt("portes.p1.recap.f.tf_status"), label("q_tf_status")]);
        if (v("q_tf_number")) lines.push([tt("portes.p1.recap.f.tf_number"), v("q_tf_number")]);
        if (label("q_lot_status")) lines.push([tt("portes.p1.recap.f.lot_status"), label("q_lot_status")]);
        if (v("q_lot_name")) lines.push([tt("portes.p1.recap.f.lot_name"), v("q_lot_name")]);
        if (v("q_lot_number")) lines.push([tt("portes.p1.recap.f.lot_number"), v("q_lot_number")]);


        // Rendu type "fiche projet" : grands titres, sections, et paires clé/valeur.
        const rows = lines.filter(([, val]) => val && val !== "—");
        const html = `
          <div style="border:1px solid rgba(201,162,39,0.25);border-radius:18px;background:rgba(255,255,255,0.92);box-shadow:0 10px 30px rgba(11,27,58,0.06);overflow:hidden">
            <div style="padding:14px 16px;border-bottom:1px solid rgba(201,162,39,0.18);display:flex;gap:10px;align-items:center;justify-content:space-between">
              <div style="font-weight:950;color:#0B1B3A">${tt("portes.p1.recap.card.title")}</div>
              <div style="font-size:12px;color:rgba(11,27,58,0.62)">${tt("portes.p1.recap.card.sub")}</div>
            </div>
            <div style="padding:14px 16px">
              <div style="display:grid;grid-template-columns:220px 1fr;gap:10px 18px;align-items:start">
                ${rows
                  .map(([k, val]) => {
                    if (val === '__section__') {
                      return `<div style="grid-column:1/-1;margin:10px 0 2px;padding:10px 12px;border-radius:14px;background:rgba(11,27,58,0.04);border:1px solid rgba(11,27,58,0.06);font-weight:950;color:rgba(11,27,58,0.92)">${k}</div>`;
                    }
                    return `<div style="font-weight:850;color:rgba(11,27,58,0.9)">${k}</div><div style="color:rgba(11,27,58,0.78)">${val}</div>`;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        `;

        if (recapInline && recapInlineContent) {
          // IMPORTANT: Le récap doit s'afficher dans la section 5 sans provoquer un saut/scroll automatique.
          recapInline.style.display = "block";
          recapInlineContent.innerHTML = html || `<div>${tt("portes.p1.recap.empty")}</div>`;
          focusNoScroll(recapInline);
        }
      });
    }

    // 5) Créer dossier → route auth (ne jamais sauter vers packs)
    const btnCreate = byId("btn_create_account");
    if (btnCreate) {
      btnCreate.addEventListener("click", (e) => {
        e.preventDefault();
        // B5: OTP/email mock, sans changer l'UI (le markup contient déjà otp_box).
        save(draft);
        const otpBox = byId("otp_box");
        if (otpBox) {
          otpBox.classList.remove("hidden");
          (otpBox as HTMLElement).style.display = "block";
        }
        focusNoScroll(byId("otp_code"));
      });
    }

    // OTP mock (no backend)
    const otpInput = byId("otp_code") as HTMLInputElement | null;
    const otpHint = byId("otp_hint");
    const btnVerify = byId("btn_verify_otp");
    const btnResend = byId("btn_resend_otp");

    const setOtpHint = (msg: string, ok = false) => {
      if (!otpHint) return;
      otpHint.textContent = msg;
      (otpHint as HTMLElement).style.color = ok ? "#16a34a" : "#dc2626";
      (otpHint as HTMLElement).style.fontWeight = ok ? "700" : "600";
    };

    const verifyOtp = () => {
      const code = (otpInput?.value || "").trim();
      if (!/^\d{6}$/.test(code)) {
        setOtpHint(tt('p1.lp.imperative.otp_err_6'));
        return;
      }
      // Mock rule: any 6 digits accepted (future: SMS provider)
      writeJSON(OTP_OK_KEY, true);
      setOtpHint(tt('p1.lp.imperative.otp_ok'), true);
      // Create dossier append-only and route to packs
      const { caseId } = createDossier(userId);
      navigate(`/p1/packs?case=${encodeURIComponent(caseId)}`);
    };

    if (btnVerify) btnVerify.addEventListener("click", (e) => { e.preventDefault(); verifyOtp(); });
    if (btnResend) btnResend.addEventListener("click", (e) => { e.preventDefault(); setOtpHint(tt('p1.lp.imperative.otp_resent'), true); focusNoScroll(otpInput); });
    if (otpInput) otpInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); verifyOtp(); } });

    

    // 5bis) Affichage conditionnel: Titre foncier / Lotissement
    const toggleTf = () => {
      const tfSel = byId("q_tf_status") as HTMLSelectElement | null;
      const tfWrap = byId("tf_number_wrap") as HTMLDivElement | null;
      if (!tfSel || !tfWrap) return;
      const show = tfSel.value === "exists";
      tfWrap.style.display = show ? "block" : "none";
      if (!show) {
        const inp = byId("q_tf_number") as HTMLInputElement | null;
        if (inp) inp.value = "";
      }
    };

    const toggleLot = () => {
      const lotSel = byId("q_lot_status") as HTMLSelectElement | null;
      const nameWrap = byId("lot_name_wrap") as HTMLDivElement | null;
      const numWrap = byId("lot_number_wrap") as HTMLDivElement | null;
      if (!lotSel || !nameWrap || !numWrap) return;
      const show = lotSel.value === "yes";
      nameWrap.style.display = show ? "block" : "none";
      numWrap.style.display = show ? "block" : "none";
      if (!show) {
        const n = byId("q_lot_name") as HTMLInputElement | null;
        const m = byId("q_lot_number") as HTMLInputElement | null;
        if (n) n.value = "";
        if (m) m.value = "";
      }
    };

    const onChange = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.id === "q_tf_status") toggleTf();
      if (t.id === "q_lot_status") toggleLot();
    };

    document.addEventListener("change", onChange);
    // init
    toggleTf();
    toggleLot();

// 6) Chatbot minimal (évite bouton mort)
    const chatSend = byId("chat_send_btn");
    const chatInput = byId("chat_input") as HTMLInputElement | null;
    const chatBox = byId("chat_messages");

    const appendChat = (role: "user" | "ai", text: string) => {
      if (!chatBox) return;
      const wrap = document.createElement("div");
      wrap.className = role === "user" ? "chat-msg-user" : "chat-msg-ai";
      const bubble = document.createElement("div");
      bubble.textContent = text;
      if (role === "ai") {
        bubble.style.background = "white";
        bubble.style.padding = "12px 16px";
        bubble.style.borderRadius = "12px 12px 12px 4px";
        bubble.style.fontSize = "14px";
        bubble.style.lineHeight = "1.6";
        bubble.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        bubble.style.display = "inline-block";
        bubble.style.maxWidth = "75%";
      } else {
        // user bubble style handled by CSS
        bubble.style.display = "inline-block";
      }
      wrap.appendChild(bubble);
      chatBox.appendChild(wrap);
      chatBox.scrollTop = chatBox.scrollHeight;
    };

    const sendChat = () => {
      if (!chatInput) return;
      const v = (chatInput.value || "").trim();
      if (!v) return;
      appendChat("user", v);
      chatInput.value = "";
      // IA placeholder (doctrine: AI + humain ensuite)
      window.setTimeout(() => {
        appendChat("ai", tt('p1.lp.imperative.chat_ai_default'));
      }, 250);
    };

    if (chatSend) chatSend.addEventListener("click", (e) => { e.preventDefault(); sendChat(); });
    if (chatInput) chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } });

    // ─── Lang-change listener — ré-applique les labels DOM imperatifs ───
    // Quand l'utilisateur switch FR/AR/EN, le re-render React ne touche pas
    // les .textContent posés via le code impératif ci-dessus. On les ré-évalue
    // au signal LANG_CHANGE_EVENT dispatché par I18nProvider.setLang.
    const onLangChange = () => {
      try {
        syncProjectTypeCtas();
        refreshBudgetOptions();
        // Façade label : ré-applique si une façade était choisie.
        if (typeof draft.facades === "number") setFacadeAuto(draft.facades);
      } catch { /* best-effort */ }
    };
    window.addEventListener(LANG_CHANGE_EVENT, onLangChange);

    // Cleanup listeners: (best-effort)
    return () => {
      document.removeEventListener('change', onSelectChange);
      window.removeEventListener(LANG_CHANGE_EVENT, onLangChange);
    };
  }, [navigate]);

  return (
    <div className="p1-landing-root">
      <style>{`
    *, *::before, *::after { box-sizing: border-box; }

    :root{
      --royal:#0B1B3A;
      --royal2:#123A7A;
      --ice:#F6F8FF;
      --gold:#C9A227;
      --goldSoft:#E8D8A6;
      --ink:#0B1B3A;
      --muted:rgba(11,27,58,0.74);
      --line:rgba(201,162,39,0.35);
      --white:#fff;
    }

    *{ font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; box-sizing:border-box; }
    html,body{ height:100%; background:radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%),
        radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%),
        linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72));
      background-attachment: fixed;
       color:var(--ink); overflow-x:hidden; }

    h1,h2,.lux-title{ font-family:"Playfair Display", Inter, system-ui, sans-serif; }

    .container-max{ max-width:1200px; margin:0 auto; padding:0 20px; }

    .section{ padding:92px 0; }
    @media (max-width:768px){ .section{ padding:64px 0; } }

    /* HERO */
    .hero{
      background:
        radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%),
        radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%),
        linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72));
      color:var(--ink);
      border-bottom:1px solid var(--line);
    }
    .kicker{
      display:inline-flex; gap:10px; align-items:center;
      padding:10px 14px; border-radius:999px;
      background:rgba(255,255,255,0.86);
      border:1px solid rgba(201,162,39,0.22);
      color:rgba(11,27,58,0.86);
      font-size:13px; font-weight:700;
      box-shadow:0 10px 30px rgba(11,27,58,0.08);
    }
    .hero h1{ font-size:56px; line-height:1.08; letter-spacing:-0.8px; }
    .hero p{ color:rgba(11,27,58,0.95); text-shadow: 0 1px 2px rgba(255,255,255,0.3);; }
    @media(max-width:768px){ .hero h1{ font-size:36px; } }

    .gold-divider{
      height:1px;
      background:linear-gradient(90deg, transparent, rgba(201,162,39,0.55), transparent);
    }

    /* CARDS */
    .lux-card{
      width:100%;
      background:rgba(255,255,255,0.86);
      border:1px solid var(--line);
      border-radius:16px;
      padding:28px;
      box-shadow:0 18px 55px rgba(11,27,58,0.12);
      backdrop-filter: blur(8px);
      transition: all .25s ease;
    
      max-width:100%;
    }
    .lux-card:hover{
      border-color:rgba(201,162,39,0.45);
      box-shadow:0 26px 80px rgba(11,27,58,0.16);
      transform: translateY(-2px);
    }

    /* BUTTONS */
    .btn{
      display:inline-flex; align-items:center; justify-content:center;
      padding:14px 22px; border-radius:12px;
      font-size:14px; font-weight:700;
      border:1px solid transparent;
      transition: all .2s ease;
      text-decoration:none;
      cursor:pointer;
      user-select:none;
      gap:10px;
    }
    .btn-gold{
      background:linear-gradient(135deg, var(--gold), #E6C75B);
      color:#1a1406;
      border-color: rgba(201,162,39,0.55);
      box-shadow:0 18px 34px rgba(201,162,39,0.25);
    }
    .btn-gold:hover{ filter:brightness(1.03); transform: translateY(-1px); }
    .btn-ghost{
      background:rgba(11,27,58,0.04);
      color:var(--royal);
      border-color:rgba(11,27,58,0.18);
    }
    .btn-ghost:hover{ background:rgba(11,27,58,0.06); }
    .btn-dark{
      background:var(--royal);
      color:#fff;
      border-color:rgba(11,27,58,0.35);
    }
    .btn-dark:hover{ filter:brightness(1.05); }

    /* TEXT */
    .muted{ color:var(--muted); }

    /* GRID */
    .grid-3{ display:grid; gap:18px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-2{ display:grid; gap:18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media(max-width:768px){ .grid-3{ grid-template-columns:1fr; } .grid-2{ grid-template-columns:1fr; } }

    /* PILIERS icons */
    .icon-dot{
      width:12px; height:12px; border-radius:999px;
      background:rgba(201,162,39,0.90);
      box-shadow:0 0 0 6px rgba(201,162,39,0.14);
      flex:none;
      margin-top:7px;
    }

    /* STEPS */
    .step{
      display:flex; gap:16px; align-items:flex-start;
      border:1px solid var(--line);
      background:rgba(255,255,255,0.75);
      border-radius:16px; padding:20px;
      box-shadow:0 12px 40px rgba(11,27,58,0.08);
    }
    .step-num{
      width:44px; height:44px; border-radius:14px;
      background:rgba(201,162,39,0.12);
      border:1px solid rgba(201,162,39,0.35);
      display:flex; align-items:center; justify-content:center;
      font-weight:800; color:var(--royal);
      flex:none;
    }

    /* TABS */
    .tabs{
      display:flex; flex-wrap:wrap; gap:10px;
      border:1px solid var(--line);
      padding:10px; border-radius:16px;
      background:rgba(255,255,255,0.72);
      box-shadow:0 12px 40px rgba(11,27,58,0.06);
    }
    .tab{
      padding:10px 12px; border-radius:12px;
      font-size:13px; font-weight:800;
      color:rgba(11,27,58,0.68);
      border:1px solid transparent;
      background:transparent;
      cursor:pointer;
      transition: all .2s ease;
      white-space:nowrap;
    }
    .tab:hover{ background:rgba(11,27,58,0.04); }
    .tab.active{
      color:var(--royal);
      background:rgba(201,162,39,0.14);
      border-color:rgba(201,162,39,0.35);
    }

    .tab-panel{ display:none; }
    .tab-panel.active{ display:block; }

    /* 3 columns typology */
    .colbox{
      border:1px solid var(--line);
      border-radius:16px;
      background:rgba(255,255,255,0.82);
      padding:18px;
      box-shadow:0 12px 38px rgba(11,27,58,0.08);
    }
    .col-title{
      font-size:12px; letter-spacing:.14em;
      text-transform:uppercase;
      font-weight:900; color:rgba(11,27,58,0.82);
      margin-bottom:10px;
    }
    .list{ list-style:none; padding:0; margin:0; }
    .list li{
      display:flex; gap:10px; align-items:flex-start;
      padding:9px 0;
      border-bottom:1px dashed rgba(11,27,58,0.10);
      color:rgba(11,18,32,0.74);
      font-size:14px;
    }
    .list li:last-child{ border-bottom:none; }
    .tick{
      width:18px; height:18px; border-radius:6px;
      background:rgba(201,162,39,0.16);
      border:1px solid rgba(201,162,39,0.30);
      display:inline-flex; align-items:center; justify-content:center;
      flex:none; margin-top:2px;
    }
    .tick::after{
      content:"";
      width:8px; height:4px;
      border-left:2px solid var(--royal);
      border-bottom:2px solid var(--royal);
      transform: rotate(-45deg);
      display:block;
      margin-top:-1px;
    }

    /* Gallery */
    .gallery{
      display:grid; gap:14px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-top:18px;
    }
    @media(max-width:900px){ .gallery{ grid-template-columns:1fr; } }

    .gcard{
      border-radius:16px;
      overflow:hidden;
      border:1px solid var(--line);
      background: transparent;
      box-shadow:0 18px 55px rgba(11,27,58,0.10);
      transition: all .2s ease;
    }
    .gcard:hover{ transform: translateY(-2px); border-color:rgba(201,162,39,0.35); }
    .gph{
      height:190px;
      background:
        radial-gradient(520px 190px at 20% 20%, rgba(201,162,39,0.22), transparent 60%),
        linear-gradient(135deg, rgba(11,27,58,0.10), rgba(11,27,58,0.02));
    }
    .gmeta{ padding:14px 16px; }
    .gtitle{ font-size:13px; font-weight:900; color:var(--royal); }
    .gsub{ font-size:12px; color:rgba(11,18,32,0.60); margin-top:4px; }

    /* FAQ */
    .faq-item{
      border:1px solid var(--line);
      border-radius:16px;
      overflow:hidden;
      background:rgba(255,255,255,0.82);
      box-shadow:0 12px 38px rgba(11,27,58,0.08);
    }
    .faq-q{
      width:100%;
      text-align:left;
      padding:18px 18px;
      font-weight:900;
      color:rgba(11,27,58,0.88);
      background:transparent;
      border:none;
      display:flex;
      justify-content:space-between;
      align-items:center;
      cursor:pointer;
    }
    .faq-a{
      padding:0 18px 18px 18px;
      color:rgba(11,18,32,0.72);
      line-height:1.7;
      display:none;
    }
    .faq-item.open .faq-a{ display:block; }
    .chev{
      width:34px; height:34px;
      border-radius:12px;
      background:rgba(201,162,39,0.14);
      border:1px solid rgba(201,162,39,0.30);
      display:flex; align-items:center; justify-content:center;
      transition: transform .2s ease;
      flex:none;
    }
    .faq-item.open .chev{ transform: rotate(180deg); }
    .chev svg{ width:18px; height:18px; }

    /* Pricing cards */
    .price-card{
      border-radius:18px;
      padding:26px;
      background:rgba(255,255,255,0.88);
      border:1px solid var(--line);
      box-shadow:0 18px 55px rgba(11,27,58,0.12);
      display:flex;
      flex-direction:column;
      height:100%;
      transition: all .25s ease;
    }
    .price-card:hover{ transform: translateY(-2px); border-color:rgba(201,162,39,0.40); }
    .featured{
      border:1px solid rgba(201,162,39,0.65);
      box-shadow:0 26px 90px rgba(201,162,39,0.18);
      background:
        radial-gradient(800px 260px at 20% 10%, rgba(201,162,39,0.16), transparent 60%),
        rgba(255,255,255,0.92);
      transform: scale(1.02);
    }
    @media(max-width:900px){ .featured{ transform:none; } }
    .badge{
      display:inline-flex;
      padding:8px 12px;
      border-radius:999px;
      font-size:11px;
      font-weight:900;
      letter-spacing:.12em;
      text-transform:uppercase;
      color:rgba(11,27,58,0.92);
      border:1px solid rgba(201,162,39,0.45);
      background:rgba(201,162,39,0.16);
      width:fit-content;
    }
    .price{
      display:flex; align-items:baseline; gap:6px;
      margin:16px 0 6px 0;
    }
    .price .cur{ font-weight:900; color:rgba(11,27,58,0.92); }
    .price .amt{ font-size:44px; font-weight:900; color:var(--royal); line-height:1; }
    .hint{ font-size:12px; color:rgba(11,18,32,0.55); font-weight:700; }

    .feat{ list-style:none; padding:0; margin:16px 0 0 0; }
    .feat li{
      display:flex; gap:10px; align-items:flex-start;
      padding:9px 0;
      color:rgba(11,18,32,0.72);
      font-size:13px;
      border-bottom:1px dashed rgba(11,27,58,0.10);
    }
    .feat li:last-child{ border-bottom:none; }
    .xmark{ opacity:.55; }
    .cta-row{ display:flex; gap:12px; flex-wrap:wrap; }

    .mini-note{
      border:1px solid var(--line);
      background:rgba(255,255,255,0.78);
      border-radius:16px;
      padding:14px 16px;
      color:rgba(11,18,32,0.78);
      font-size:13px;
      line-height:1.55;
      box-shadow:0 12px 40px rgba(11,27,58,0.06);
    }

    .section-title{
      font-size:40px;
      letter-spacing:-0.4px;
      line-height:1.15;
    }
    @media(max-width:768px){ .section-title{ font-size:28px; } }

    .sub{
      max-width:760px;
      font-size:16px;
      color:rgba(11,18,32,0.72);
      line-height:1.7;
    }
  
    /* --- Qualification form --- */
    .form-grid{ display:grid; gap:12px; grid-template-columns: repeat(3, minmax(0,1fr)); }
    @media(max-width:1100px){ .form-grid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
    @media(max-width:760px){ .form-grid{ grid-template-columns:1fr; } }
    @media(max-width:900px){ .form-grid{ grid-template-columns:1fr; } }
    .field{ display:flex; flex-direction:column; gap:6px; }
    .label{ font-size:12px; font-weight:900; letter-spacing:.10em; text-transform:uppercase; color:rgba(11,27,58,0.80); }
    .control{
      max-width:100%;
      width:100%;
      border:1px solid var(--line);
      background:rgba(255,255,255,0.78);
      border-radius:14px;
      padding:12px 12px;
      font-size:14px;
      color:var(--ink);
      outline:none;
    }
    .control:focus{ box-shadow:0 0 0 4px rgba(201,162,39,0.18); border-color:rgba(201,162,39,0.65); }
    .hint-small{ font-size:12px; color:rgba(11,27,58,0.64); line-height:1.5; }
    .hidden{ display:none !important; }
    .pill{
      display:inline-flex; align-items:center; gap:10px;
      padding:8px 12px; border-radius:999px;
      border:1px solid var(--line);
      background:rgba(255,255,255,0.72);
      font-size:12px; font-weight:800; color:rgba(11,27,58,0.78);
    }
    .req{ color:rgba(201,162,39,0.95); font-weight:900; }

  
    .bar-row{ display:flex; flex-wrap:wrap; gap:10px; max-width:100%; }
    .bar-row .btn{ white-space:nowrap; }
  
    .card-bullets{
      margin:12px 0 0;
      padding-left:18px;
      font-size:13px;
      color:rgba(11,27,58,0.78);
      line-height:1.4;
    }
    .price-card .micro{
      margin-top:10px;
      font-size:12px;
      opacity:.75;
    }
    
    .card-features{
      margin-top:12px;
      display:grid;
      gap:6px;
    }
    .card-feature{
      display:flex;
      gap:10px;
      align-items:flex-start;
      padding:0;
      border:none;
      border-radius:0;
      background:transparent;
    }
    .card-dot{
      width:8px; height:8px;
      border-radius:999px;
      background:rgba(28,72,255,0.9);
      margin-top:6px;
      flex:0 0 8px;
    }
    .card-feature b{ font-weight:700; color:rgba(11,27,58,0.92); }
    .card-feature span{ font-size:12.5px; color:rgba(11,27,58,0.78); line-height:1.35; }
    .card-tag{
      display:inline-block;
      margin-top:10px;
      padding:6px 10px;
      border-radius:999px;
      border:1px solid rgba(199,167,100,0.55);
      color:rgba(28,72,255,0.95);
      font-size:12px;
      background:rgba(255,255,255,0.55);
    }
    
    .card-bullets-premium{
      margin:14px 0 0;
      padding-left:18px;
      font-size:13px;
      line-height:1.45;
      color:rgba(11,27,58,0.80);
    }
    .card-bullets-premium li{ margin:6px 0; }
    .card-sub{
      margin-top:6px;
      font-size:13px;
      color:rgba(11,27,58,0.68);
    }
    .card-micro{
      margin-top:10px;
      font-size:12px;
      opacity:.75;
    }
    
.pack-card {
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(201,162,39,0.25);
  border-radius: 20px;
  padding: 32px;
  min-width: 340px;
  transition: all 0.3s;
}
.pack-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(11,27,58,0.15);
  border-color: rgba(201,162,39,0.5);
}


.project-type-btn {
  position: relative;
  transition: all 0.3s ease;
}
.project-type-btn.selected {
  background: linear-gradient(135deg, rgba(201,162,39,0.15), rgba(232,216,166,0.15)) !important;
  border: 2px solid #C9A227 !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(201,162,39,0.3);
}
.project-type-btn.selected::after {
  content: "✓";
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #C9A227;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}


.pack-card {
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(201,162,39,0.25);
  border-radius: 20px;
  padding: 36px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}
.pack-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(11,27,58,0.15);
  border-color: rgba(201,162,39,0.6);
}
@media (max-width: 1200px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
@media (max-width: 768px) {
  .grid-3 {
    grid-template-columns: 1fr !important;
  }
}


.project-type-btn { transition: all 0.3s; position: relative; }
.project-type-btn.selected {
  background: linear-gradient(135deg, rgba(201,162,39,0.15), rgba(232,216,166,0.15)) !important;
  border: 2px solid #C9A227 !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(201,162,39,0.3);
}
.project-type-btn.selected::after {
  content: "✓";
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #C9A227;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}



      /* Patch visuel minimal: rendre la sélection visible (fond or soft) sans bouger le layout */
      .cit-selected {
        background: rgba(197, 160, 74, 0.85) !important;
        border-color: rgba(197, 160, 74, 1) !important;
        color: #0b1b3a !important;
      }

      /* Hero plan mode buttons: show a clear selected ring without changing layout */
      .btn[data-planmode].selected {
        box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.65) !important;
        outline: 2px solid rgba(201, 162, 39, 0.55) !important;
        outline-offset: 2px !important;
      }

      /* Gentle pulse for the account gate after a plan-mode click */
      @keyframes citPulse {
        0% { box-shadow: 0 0 0 0 rgba(201,162,39,0.0); }
        30% { box-shadow: 0 0 0 6px rgba(201,162,39,0.22); }
        100% { box-shadow: 0 0 0 0 rgba(201,162,39,0.0); }
      }
      .cit-pulse { animation: citPulse 1.2s ease-out; }
    /* Chat widget minimal styles (no dead UI) */
    .chat-msg-ai { margin-bottom:16px; }
    .chat-msg-user { margin-bottom:16px; text-align:right; }
    .chat-msg-user > div {
      display:inline-block; max-width:75%;
      background:linear-gradient(135deg,#C9A227,#E6C75B);
      color:white; padding:12px 16px;
      border-radius:12px 12px 4px 12px;
      font-size:14px; line-height:1.6;
      box-shadow:0 2px 8px rgba(201,162,39,0.30);
    }
    #chatbot_toggle:hover { transform:scale(1.05); }

    /* Packs spacing helpers */
    .pack-card {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(201,162,39,0.25);
      border-radius: 20px;
      padding: 32px;
      min-width: 340px;
      transition: all 0.3s;
    }
    .pack-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(11,27,58,0.15);
      border-color: rgba(201,162,39,0.5);
    }

    @media(max-width:480px){
      .hero h1 { font-size: 28px; line-height: 1.18; }
      .section { padding: 40px 0; }
      .container-max { padding: 0 14px; }
    }
      `}
      </style>



  {/* LangSwitcher floating supprimé : le PublicLayout (tomes/tome1/router/layouts.tsx)
      gère déjà un LangSwitcher sticky-top. Le doublon position:fixed couvrait
      le header et flottait par-dessus le contenu sur mobile. */}

  <div id="app" className="min-h-full">

    
    <header className="hero">
      <div className="container-max" style={{ paddingTop: "72px", paddingBottom: "64px" }}>
        <div className="kicker mb-6">
          <span>{t("p1.lp.kicker.archi")}</span><span style={{ opacity: ".55" }}>•</span>
          <span>{t("p1.lp.kicker.auth")}</span><span style={{ opacity: ".55" }}>•</span>
          <span>{t("p1.lp.kicker.chantier")}</span>
        </div>

        <div className="grid-2" style={{ alignItems: "center" }}>
          <div>
            <h1 className="mb-5">{t("p1.lp.hero.title")}</h1>
            <p className="text-lg mb-8" style={{ fontSize: "18px", lineHeight: "1.75" }}>
              {t("p1.lp.hero.lead")}
              <br/><span style={{ color: "rgba(11,27,58,0.82)", fontWeight: "800" }}>{t("p1.lp.hero.tagline")}</span>
            </p>

            <div className="cta-row mb-8">
              <button id="btn_plan_type" data-planmode="type" type="button" className="btn btn-gold">
                {t("p1.lp.hero.cta_type")}
              </button>
              <button id="btn_plan_perso" data-planmode="personnalise" type="button" className="btn btn-dark">
                {t("p1.lp.hero.cta_perso")}
              </button>
              <button id="btn_start_qual" className="btn btn-ghost" type="button" data-planmode="qualification">{t("p1.lp.hero.cta_qual")}</button>
            </div>

            <div className="mini-note">
              <strong>{t("p1.lp.hero.note_title")}</strong> {t("p1.lp.hero.note_body")} <br/>
              <span style={{ opacity: ".95" }}>{t("p1.lp.hero.note_sub")}</span> <br/>
              <strong>{t("p1.lp.hero.note_option")}</strong> {t("p1.lp.hero.note_option_text")}
            </div>
          </div>

          <div>
            <div className="lux-card">
              <div className="gold-divider mb-6"></div>
              <div className="grid-2">
                <div>
                  <div style={{ fontWeight: "900", color: "rgba(11,27,58,0.92)", marginBottom: "6px" }}>{t("p1.lp.hero.card.method_t")}</div>
                  <div style={{ color: "rgba(11,18,32,0.72)", fontSize: "13px", lineHeight: "1.6" }}>
                    {t("p1.lp.hero.card.method_d")}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: "900", color: "rgba(11,27,58,0.92)", marginBottom: "6px" }}>{t("p1.lp.hero.card.dossier_t")}</div>
                  <div style={{ color: "rgba(11,18,32,0.72)", fontSize: "13px", lineHeight: "1.6" }}>
                    {t("p1.lp.hero.card.dossier_d")}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: "900", color: "rgba(11,27,58,0.92)", marginBottom: "6px" }}>{t("p1.lp.hero.card.suivi_t")}</div>
                  <div style={{ color: "rgba(11,18,32,0.72)", fontSize: "13px", lineHeight: "1.6" }}>
                    {t("p1.lp.hero.card.suivi_d")}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: "900", color: "rgba(11,27,58,0.92)", marginBottom: "6px" }}>{t("p1.lp.hero.card.sign_t")}</div>
                  <div style={{ color: "rgba(11,18,32,0.72)", fontSize: "13px", lineHeight: "1.6" }}>
                    {t("p1.lp.hero.card.sign_d")}
                  </div>
                </div>
              </div>
              <div className="gold-divider mt-6"></div>
              <div style={{ marginTop: "12px", fontSize: "12px", color: "rgba(11,18,32,0.60)" }}>
                {t("p1.lp.hero.card.foot")}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "56px" }}>
          <div className="gold-divider"></div>
        </div>
      </div>
    </header>

    
    <section id="pillars" className="section">
      {/* Backward-compat anchor (anciennes itérations) */}
      <div id="qualification" />
      <div className="container-max">
        <h2 className="section-title mb-4">{t("p1.lp.pillars.title")}</h2>
        <p className="sub mb-10">
          {t("p1.lp.pillars.sub")}
        </p>


      <div id="project_types" className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "32px", margin: "40px auto", maxWidth: "1400px" }}>

        <div className="price-card" id="price-card-villa">
          <div className="lux-title">{t("p1.lp.card.villa.title")}</div>
          <div className="card-sub">{t("p1.lp.card.villa.sub")}</div>
          <ul className="card-bullets-premium">
            <li>{t("p1.lp.card.villa.b1")}</li>
            <li>{t("p1.lp.card.villa.b2")}</li>
            <li>{t("p1.lp.card.villa.b3")}</li>
          </ul>
          <div className="muted card-micro">{t("p1.lp.card.villa.micro")}</div>
          <button className="btn btn-dark project-type-btn" data-p1type="villa" type="button" style={{ width: "100%", marginTop: "18px" }}>{t("p1.lp.btn.select")}</button>
        </div>


        <div className="price-card" id="price-card-imm">
          <div className="lux-title">{t("p1.lp.card.imm.title")}</div>
          <div className="card-sub">{t("p1.lp.card.imm.sub")}</div>
          <ul className="card-bullets-premium">
            <li>{t("p1.lp.card.imm.b1")}</li>
            <li>{t("p1.lp.card.imm.b2")}</li>
            <li>{t("p1.lp.card.imm.b3")}</li>
          </ul>
          <div className="muted card-micro">{t("p1.lp.card.imm.micro")}</div>
          <button className="btn btn-dark project-type-btn" data-p1type="immeuble" type="button" style={{ width: "100%", marginTop: "18px" }}>{t("p1.lp.btn.select")}</button>
        </div>


        <div className="price-card" id="price-card-reno">
          <div className="lux-title">{t("p1.lp.card.reno.title")}</div>
          <div className="card-sub">{t("p1.lp.card.reno.sub")}</div>
          <ul className="card-bullets-premium">
            <li>{t("p1.lp.card.reno.b1")}</li>
            <li>{t("p1.lp.card.reno.b2")}</li>
            <li>{t("p1.lp.card.reno.b3")}</li>
          </ul>
          <div className="muted card-micro">{t("p1.lp.card.reno.micro")}</div>
          <button className="btn btn-dark project-type-btn" data-p1type="renovation" type="button" style={{ width: "100%", marginTop: "18px" }}>{t("p1.lp.btn.select")}</button>
        </div>
      </div>



      <div className="gold-divider" style={{ margin: "30px 0" }}></div>

      
      <div id="qual_section" style={{ width: "100%" }}>

        {/* Anchor de scroll: affiche le titre "Analysez votre projet" (évite d'arriver directement sur les champs) */}
        <div id="analyser_mon_projet" style={{ scrollMarginTop: "90px" }}></div>

        <h3 className="lux-title" style={{ fontSize: "20px", marginBottom: "8px" }}>{t("p1.lp.analyse.title")}</h3>
        <p style={{ fontSize: "13px", color: "rgba(11,27,58,0.68)", marginBottom: "18px" }}>
          {t("p1.lp.analyse.sub")} <strong>{t("p1.lp.analyse.sub_bold")}</strong>
        </p>

        <div className="gold-divider" style={{ margin: "16px 0" }}></div>


        <div className="pill" style={{ marginBottom: "12px" }}>{t("p1.lp.sec.identity")} <span className="req">*</span></div>
        <div className="form-grid">
          <div className="field">
            <label className="label">{t("p1.lp.f.lastname")} <span className="req">*</span></label>
            <input className="control" id="q_lastname" type="text" placeholder={t("p1.lp.f.lastname_ph")}/>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.firstname")} <span className="req">*</span></label>
            <input className="control" id="q_firstname" type="text" placeholder={t("p1.lp.f.firstname_ph")}/>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.phone")} <span className="req">*</span></label>
            <input className="control" id="q_phone" type="tel" placeholder={t("p1.lp.f.phone_ph")}/>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.email")} <span className="req">*</span></label>
            <input className="control" id="q_email" type="email" placeholder={t("p1.lp.f.email_ph")}/>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.person_type")} <span className="req">*</span></label>
            <select className="control" id="q_person_type">
              <option value="">{t("p1.lp.f.choose")}</option>
              <option value="physique">{t("p1.lp.f.physical")}</option>
              <option value="morale">{t("p1.lp.f.moral")}</option>
            </select>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.legal_situation")} <span className="req">*</span></label>
            <select className="control" id="q_legal_situation">
              <option value="">{t("p1.lp.f.choose")}</option>
              <option value="owner_major">{t("p1.lp.f.owner_major")}</option>
              <option value="heir">{t("p1.lp.f.heir")}</option>
              <option value="tenant">{t("p1.lp.f.tenant")}</option>
              <option value="shareholder">{t("p1.lp.f.shareholder")}</option>
            </select>
          </div>

          {/* Personne physique */}
          <div className="field" id="phys_id_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.id_type")} <span className="req">*</span></label>
            <select className="control" id="q_phys_id_type">
              <option value="">{t("p1.lp.f.choose")}</option>
              <option value="cin">{t("p1.lp.f.cin")}</option>
              <option value="passport">{t("p1.lp.f.passport")}</option>
            </select>
          </div>
          <div className="field" id="phys_id_number_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.id_number")} <span className="req">*</span></label>
            <input className="control" id="q_phys_id_number" type="text" placeholder={t("p1.lp.f.id_number_ph")}/>
          </div>

          {/* Personne morale */}
          <div className="field" id="moral_name_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.company_name")} <span className="req">*</span></label>
            <input className="control" id="q_company_name" type="text" placeholder={t("p1.lp.f.company_name_ph")}/>
          </div>
          <div className="field" id="moral_form_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.company_form")} <span className="req">*</span></label>
            <input className="control" id="q_company_form" type="text" placeholder={t("p1.lp.f.company_form_ph")}/>
          </div>
          <div className="field" id="moral_ice_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.ice")} <span className="req">*</span></label>
            <input className="control" id="q_company_ice" type="text" placeholder={t("p1.lp.f.ice_ph")}/>
          </div>
          <div className="field" id="moral_rc_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.rc")} <span className="req">*</span></label>
            <input className="control" id="q_company_rc" type="text" placeholder={t("p1.lp.f.rc_ph")}/>
          </div>
        </div>

        <div className="gold-divider" style={{ margin: "18px 0" }}></div>


        <div className="pill" style={{ marginBottom: "12px" }}>{t("p1.lp.sec.localisation")} <span className="req">*</span></div>
        <div className="form-grid">
          <div className="field">
            <label className="label">{t("p1.lp.f.region")} <span className="req">*</span></label>
            <input className="control" id="q_region" type="text" placeholder={t("p1.lp.f.region_ph")}/>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.province")} <span className="req">*</span></label>
            <input className="control" id="q_province" type="text" placeholder={t("p1.lp.f.province_ph")}/>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.commune")} <span className="req">*</span></label>
            <input className="control" id="q_commune" type="text" placeholder={t("p1.lp.f.commune_ph")}/>
          </div>
        </div>

        <div className="gold-divider" style={{ margin: "18px 0" }}></div>


        <div className="pill" style={{ marginBottom: "12px" }}>{t("p1.lp.sec.foncier")} <span className="req">*</span></div>
        <div className="form-grid">
          <div className="field">
            <label className="label">{t("p1.lp.f.surface")} <span className="req">*</span></label>
            <input className="control" id="q_area" type="number" min="0" placeholder={t("p1.lp.f.surface_ph")}/>
          </div>

          <div className="field">
            <label className="label">{t("p1.lp.f.timeline")} <span className="req">*</span></label>
            <select className="control" id="q_timeline">
              <option value="">{t("p1.lp.f.choose")}</option>
              <option value="immediate">{t("p1.lp.f.timeline.immediate")}</option>
              <option value="lt3m">{t("p1.lp.f.timeline.lt3m")}</option>
              <option value="3-6m">{t("p1.lp.f.timeline.3_6m")}</option>
              <option value="gt6m">{t("p1.lp.f.timeline.gt6m")}</option>
              <option value="flexible">{t("p1.lp.f.timeline.flexible")}</option>
            </select>
          </div>
          <div className="field" id="owner_status_wrap" style={{ display: "block" }}>
            <label className="label">{t("p1.lp.f.owner_q")} <span className="req">*</span></label>
            <select className="control" id="q_owner_status">
              <option value="">{t("p1.lp.f.choose")}</option>
              <option value="yes">{t("p1.lp.f.owner.yes")}</option>
              <option value="acquiring">{t("p1.lp.f.owner.acquiring")}</option>
              <option value="searching">{t("p1.lp.f.owner.searching")}</option>
            </select>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.tf")} <span className="req">*</span></label>
            <select className="control" id="q_tf_status">
              <option value="">{t("p1.lp.f.choose")}</option>
              <option value="exists">{t("p1.lp.f.tf.exists")}</option>
              <option value="pending">{t("p1.lp.f.tf.pending")}</option>
              <option value="none">{t("p1.lp.f.tf.none")}</option>
              <option value="na">{t("p1.lp.f.tf.na")}</option>
            </select>
          </div>
          <div className="field" id="tf_number_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.tf_number")} <span className="req">*</span></label>
            <input className="control" id="q_tf_number" type="text" placeholder={t("p1.lp.f.tf_number_ph")}/>
          </div>
          <div className="field">
            <label className="label">{t("p1.lp.f.lot")} <span className="req">*</span></label>
            <select className="control" id="q_lot_status">
              <option value="">{t("p1.lp.f.choose")}</option>
              <option value="yes">{t("p1.lp.f.lot.yes")}</option>
              <option value="no">{t("p1.lp.f.lot.no")}</option>
              <option value="na">{t("p1.lp.f.lot.na")}</option>
            </select>
          </div>
          <div className="field" id="lot_name_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.lot_name")} <span className="req">*</span></label>
            <input className="control" id="q_lot_name" type="text" placeholder={t("p1.lp.f.lot_name_ph")}/>
          </div>
          <div className="field" id="lot_number_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.lot_number")} <span className="req">*</span></label>
            <input className="control" id="q_lot_number" type="text" placeholder={t("p1.lp.f.lot_number_ph")}/>
          </div>
          <div className="field" id="lot_r_wrap" style={{ display: "none" }}>
            <label className="label">{t("p1.lp.f.lot_type")}</label>
            <select className="control" id="q_lot_r_type">
              <option value="">{t("p1.lp.f.lot_unknown")}</option>
              <option value="R0">R+0</option><option value="R1">R+1</option>
              <option value="R2">R+2</option><option value="R3">R+3</option><option value="R4">R+4</option>
            </select>
          </div>
        </div>

        <div className="gold-divider" style={{ margin: "18px 0" }}></div>

<div className="pill" style={{ marginBottom: "12px" }}>{t("p1.lp.sec.details")}</div>
        <p style={{ fontSize: "13px", color: "rgba(11,27,58,0.68)", marginBottom: "14px" }}>
          {t("p1.lp.sec.details_sub")}
        </p>

        <div id="details_anchor" style={{ scrollMarginTop: "90px" }}></div>

        {/* IMPORTANT UX : en rénovation, les typologies doivent apparaître SOUS le choix "support".
            Donc on affiche d'abord le bloc rénovation, puis les typologies villa/immeuble. */}

        <div id="bar_reno" style={{ display: "none", marginBottom: "14px" }}>
          <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.reno.title")} <span className="req">*</span></div>

          <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.reno.type")} <span className="req">*</span></div>
          <div className="bar-row" style={{ marginBottom: "12px" }}>
            <button className="btn btn-dark" type="button" data-reno-kind="renovation">{t("p1.lp.reno.kind.renovation")}</button>
            <button className="btn btn-dark" type="button" data-reno-kind="decoration">{t("p1.lp.reno.kind.decoration")}</button>
            <button className="btn btn-dark" type="button" data-reno-kind="transformation">{t("p1.lp.reno.kind.transformation")}</button>
          </div>

          <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.reno.support")} <span className="req">*</span></div>
          <div className="bar-row" style={{ marginBottom: "12px" }}>
            <button className="btn btn-dark" type="button" data-reno-base="villa">{t("p1.lp.reno.support.villa")}</button>
            <button className="btn btn-dark" type="button" data-reno-base="immeuble">{t("p1.lp.reno.support.imm")}</button>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label">{t("p1.lp.reno.plan_q")} <span className="req">*</span></label>
              <select className="control" id="q_reno_authorized_plan">
                <option value="">{t("p1.lp.reno.plan.unknown")}</option>
                <option value="yes">{t("p1.lp.reno.plan.yes")}</option>
                <option value="no">{t("p1.lp.reno.plan.no")}</option>
                <option value="na">{t("p1.lp.reno.plan.na")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{t("p1.lp.reno.conform_q")} <span className="req">*</span></label>
              <select className="control" id="q_reno_conform">
                <option value="">{t("p1.lp.reno.plan.unknown")}</option>
                <option value="yes">{t("p1.lp.reno.plan.yes")}</option>
                <option value="no">{t("p1.lp.reno.plan.no")}</option>
                <option value="na">{t("p1.lp.reno.plan.na")}</option>
              </select>
            </div>
          </div>

          <p className="muted" style={{ marginTop: "10px" }}>
            {t("p1.lp.reno.tip")}
          </p>
        </div>

        <div id="bar_villa" style={{ display: "none", marginBottom: "14px" }}>
          <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.villa.title")} <span className="req">*</span></div>
          <div className="bar-row">
            <button className="btn btn-dark" type="button" data-villa="bande">{t("p1.lp.villa.bande")}</button>
            <button className="btn btn-dark" type="button" data-villa="jumelee">{t("p1.lp.villa.jumelee")}</button>
            <button className="btn btn-dark" type="button" data-villa="isolee">{t("p1.lp.villa.isolee")}</button>
            <button className="btn btn-ghost" type="button" data-villa="inconnu">{t("p1.lp.villa.unknown")}</button>
          </div>
          <p style={{ fontSize: "12px", color: "rgba(11,27,58,0.60)", marginTop: "8px" }}>{t("p1.lp.villa.usage")}</p>
          <div style={{ marginTop: "12px" }}>
            <label className="label">{t("p1.lp.villa.fac_label")}</label>
            <select className="control" id="q_villa_facades" style={{ maxWidth: "320px", marginTop: "6px" }}>
              <option value="">{t("p1.lp.villa.unknown")}</option>
              <option value="1">{t("p1.lp.villa.fac.1")}</option>
              <option value="angle">{t("p1.lp.villa.fac.angle")}</option>
              <option value="2op">{t("p1.lp.villa.fac.2op")}</option>
              <option value="3">{t("p1.lp.villa.fac.3")}</option>
              <option value="4">{t("p1.lp.villa.fac.4")}</option>
            </select>
          </div>
        </div>

        <div id="bar_immeuble" style={{ display: "none", marginBottom: "14px" }}>
          <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.imm.lot_type")} <span className="req">*</span></div>
          <div className="bar-row" style={{ marginBottom: "12px" }}>
            <button className="btn btn-dark" type="button" data-imt="economique">{t("p1.lp.imm.lot.eco")}</button>
            <button className="btn btn-dark" type="button" data-imt="rdc_commercial">{t("p1.lp.imm.lot.rdc")}</button>
            <button className="btn btn-dark" type="button" data-imt="maison_ville">{t("p1.lp.imm.lot.mdv")}</button>
          </div>

          <div id="facades_wrap" style={{ display: "none", marginTop: "12px" }}>
            <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.imm.fac_title")} <span className="req">*</span></div>
            <div className="bar-row">
              <button className="btn btn-dark" type="button" data-fac="1">{t("p1.lp.imm.fac.1")}</button>
              <button className="btn btn-dark" type="button" data-fac="2">{t("p1.lp.imm.fac.angle2")}</button>
              <button className="btn btn-dark" type="button" data-fac="3">{t("p1.lp.imm.fac.3")}</button>
              <button className="btn btn-dark" type="button" data-fac="4">{t("p1.lp.imm.fac.4")}</button>
            </div>
          </div>

          <div style={{ marginTop: "14px" }}>
            <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.imm.r_title")} <span className="req">*</span></div>
            <div className="bar-row">
              <button className="btn btn-dark" type="button" data-r="R1">{t("p1.lp.imm.r1")}</button>
              <button className="btn btn-dark" type="button" data-r="R2">{t("p1.lp.imm.r2")}</button>
              <button className="btn btn-dark" type="button" data-r="R3">{t("p1.lp.imm.r3")}</button>
              <button className="btn btn-dark" type="button" data-r="R4">{t("p1.lp.imm.r4")}</button>
              <button className="btn btn-ghost" type="button" data-r="inconnu">{t("p1.lp.villa.unknown")}</button>
            </div>
          </div>

          <div id="galerie_wrap" style={{ display: "none", marginTop: "14px" }}>
            <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.imm.gal_title")}</div>
            <div className="form-grid">
              <div className="field">
                <label className="label">{t("p1.lp.imm.gal_recul")}</label>
                <select className="control" id="q_galerie_rdc">
                  <option value="">{t("p1.lp.villa.unknown")}</option>
                  <option value="yes">{t("p1.lp.f.owner.yes")}</option>
                  <option value="no">{t("p1.lp.reno.plan.no")}</option>
                </select>
              </div>
            </div>
          </div>

          <div id="mdv_fields" style={{ display: "none", marginTop: "14px" }}>
            <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.imm.mdv_title")}</div>
            <div className="form-grid">
              <div className="field">
                <label className="label">{t("p1.lp.imm.mdv_rdc")}</label>
                <select className="control" id="q_mdv_rdc_use">
                  <option value="">{t("p1.lp.imm.mdv_choose")}</option>
                  <option value="habitation">{t("p1.lp.imm.mdv_hab")}</option>
                  <option value="commercial">{t("p1.lp.imm.mdv_comm")}</option>
                  <option value="unknown">{t("p1.lp.villa.unknown")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("p1.lp.imm.mdv_recul")}</label>
                <select className="control" id="q_mdv_recul_jardin">
                  <option value="">{t("p1.lp.imm.mdv_choose")}</option>
                  <option value="yes">{t("p1.lp.f.owner.yes")}</option>
                  <option value="no">{t("p1.lp.reno.plan.no")}</option>
                  <option value="unknown">{t("p1.lp.villa.unknown")}</option>
                </select>
              </div>
            </div>
            <p className="muted" style={{ marginTop: "10px" }}>{t("p1.lp.imm.mdv_note")}</p>
          </div>

          <div id="immeuble_common_wrap" style={{ display: "none", marginTop: "14px" }}>
            <div className="form-grid">
              <div className="field" id="rdc_commercial_wrap" style={{ display: "none" }}>
                <label className="label">{t("p1.lp.imm.rdc_q")} <span className="req">*</span></label>
                <select className="control" id="q_rdc_commercial">
                  <option value="">{t("p1.lp.villa.unknown")}</option>
                  <option value="no">{t("p1.lp.reno.plan.no")}</option>
                  <option value="yes">{t("p1.lp.f.owner.yes")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("p1.lp.imm.basement_q")} <span className="req">*</span></label>
                <select className="control" id="q_basement">
                  <option value="">{t("p1.lp.villa.unknown")}</option>
                  <option value="no">{t("p1.lp.imm.basement.no")}</option>
                  <option value="yes">{t("p1.lp.imm.basement.yes")}</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "10px" }}>
              <label className="label">{t("p1.lp.villa.fac_label")}</label>
              <select
                className="control"
                id="q_facades"
                style={{ maxWidth: "320px", marginTop: "6px", position: "relative", zIndex: 5, pointerEvents: "auto" }}
              >
                <option value="">{t("p1.lp.villa.unknown")}</option>
                <option value="1">{t("p1.lp.villa.fac.1")}</option>
                <option value="2op">{t("p1.lp.villa.fac.2op")}</option>
                <option value="angle">{t("p1.lp.villa.fac.angle")}</option>
                <option value="3">{t("p1.lp.villa.fac.3")}</option>
                <option value="4">{t("p1.lp.villa.fac.4")}</option>
              </select>
            </div>
          </div>
        </div>
<div className="gold-divider" style={{ margin: "20px 0" }}></div>

        
        
        <div className="form-grid" style={{ marginTop: "14px" }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="label">{t("p1.lp.f.budget")} <span className="req">*</span></label>
            <select className="control" id="q_budget">
              <option value="">{t("p1.lp.f.budget_default")}</option>
            </select>
            <p style={{ marginTop: "6px", fontSize: "12px", color: "rgba(11,27,58,0.62)" }}>
              {t("p1.lp.f.budget_help")}
            </p>
            <p style={{ marginTop: "4px", fontSize: "11px", color: "rgba(159,124,52,0.95)", fontStyle: "italic" }}>
              ⚠ {t("p1.lp.f.sp_revision_flag")}
            </p>
          </div>
        </div>

<div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.sec.analyse_step")}</div>
        <p style={{ fontSize: "13px", color: "rgba(11,27,58,0.68)", marginBottom: "18px" }}>
          {t("p1.lp.sec.analyse_step_sub")}
        </p>

        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <button className="btn btn-gold" id="btn_analyze_project">{t("p1.lp.analyse.cta")}</button>
        </div>

        {/* Récap complet — doit s'afficher ici (section 5) après action "Analyser mon projet" */}
        <div id="recap_inline" style={{ display: "none", margin: "18px 0" }} className="mini-note">
          <div style={{ fontWeight: 900, marginBottom: "10px" }}>{t("p1.lp.recap.title")}</div>
          <div id="recap_inline_content"></div>
        </div>

        <div id="analysis_box" style={{ display: "none" }} className="mini-note">
          <strong>{t("p1.lp.analysis.label")}</strong>
          <div id="analysis_text" style={{ marginTop: "8px", lineHeight: "1.7" }}></div>
        </div>

        <div className="gold-divider" style={{ margin: "32px 0" }}></div>

        <div style={{ textAlign: "center" }}>
          <div className="lux-card" style={{ maxWidth: "760px", margin: "0 auto", padding: "18px" }}>
            <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.create.pill")}</div>
            <p className="muted" style={{ margin: "0 0 14px", lineHeight: "1.7" }}>
              {t("p1.lp.create.body")}
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              <button className="btn btn-gold" id="btn_create_account" type="button">{t("p1.lp.create.cta")}</button>
              <a className="btn btn-outline" href="/auth/login" style={{ textDecoration: "none" }}>{t("p1.lp.create.have_account")}</a>
            </div>
          </div>
        </div>

        <div id="otp_box" className="lux-card hidden" style={{ marginTop: "18px" }}>
          <div className="pill" style={{ marginBottom: "10px" }}>{t("p1.lp.otp.title")}</div>
          <p className="muted" style={{ margin: "0 0 12px" }}>{t("p1.lp.otp.body")}</p>

          <div className="form-grid">
            <div className="control">
              <label htmlFor="otp_code">{t("p1.lp.otp.label")}</label>
              <input id="otp_code" type="text" inputMode="numeric" maxLength={6} placeholder={t("p1.lp.otp.ph")} />
              <div className="hint muted" id="otp_hint" style={{ marginTop: "8px" }}></div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
            <button className="btn btn-outline" id="btn_resend_otp" type="button">{t("p1.lp.otp.resend")}</button>
            <button className="btn btn-gold" id="btn_verify_otp" type="button">{t("p1.lp.otp.verify")}</button>
          </div>
        </div>



      </div>
      </div>
  </section>


  <section id="p1-fiches-prestations" style={{ padding: "72px 0", background: "rgba(11,27,58,0.02)" }}>
    <div className="container-max">
      <h2 className="section-title lux-title" style={{ textAlign: "center", marginBottom: "32px" }}>
        {t("prestations.section_title")}
      </h2>
      <FichesPrestations porte="P1" />
    </div>
  </section>


  <section id="packs" style={{ display: "none", padding: "92px 0" }}>
    <div className="container-max">

      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 14px", borderRadius: "999px", background: "rgba(201,162,39,0.14)", border: "1px solid rgba(201,162,39,0.40)", marginBottom: "20px" }}>
        <span style={{ fontSize: "11px", fontWeight: "900", letterSpacing: ".10em", textTransform: "uppercase", color: "rgba(11,27,58,0.88)" }}>{t("p1.lp.packs.badge")}</span>
      </div>

      <h2 className="section-title lux-title" style={{ marginBottom: "10px" }}>
        {t("p1.lp.packs.title")} <span id="pack_project_label">{t("p1.lp.packs.project_label")}</span>
      </h2>
      <p className="sub" style={{ marginBottom: "40px" }}>
        {t("p1.lp.packs.sub")}
      </p>


      <div id="pack_selected_badge" style={{ display: "none", marginBottom: "24px" }} className="mini-note">
        <strong>{t("p1.lp.packs.preselect")}</strong> <span id="pack_selected_label"></span> — {t("p1.lp.packs.change")}
      </div>

      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "32px", margin: "40px auto", maxWidth: "1400px" }}>


        <div className="price-card" id="pack_card_type">
          <div className="badge">{t("p1.lp.pack.type.badge")}</div>
          <div className="lux-title" style={{ marginTop: "12px", fontSize: "19px" }}>{t("p1.lp.pack.type.title")}</div>
          <p className="muted" style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6" }}>{t("p1.lp.pack.type.sub")}</p>
          <div className="price">
            <span style={{ fontSize: "13px", fontWeight: "700" }}>{t("p1.lp.pack.from")}</span>
            <span className="amt" style={{ fontSize: "34px" }}>19 999</span>
            <span style={{ fontSize: "13px", fontWeight: "700" }}>{t("p1.lp.pack.mad_ht")}</span>
          </div>
          <div className="hint" style={{ marginBottom: "12px" }}>{t("p1.lp.pack.type.warn")}</div>
          <ul className="feat" style={{ flex: "1" }}>
            <li><span className="tick"></span>{t("p1.lp.pack.type.f1")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.type.f2")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.type.f3")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.type.f4")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.type.f5")}</li>
            <li style={{ opacity: ".4" }}><span className="tick"></span>{t("p1.lp.pack.type.f6")}</li>
          </ul>
          <button className="btn btn-dark" id="btn_pack_type" style={{ marginTop: "16px", width: "100%" }}>{t("p1.lp.pack.choose")}</button>
        </div>


        <div className="price-card featured" id="pack_card_custom">
          <div className="badge">{t("p1.lp.pack.custom.badge")}</div>
          <div className="lux-title" style={{ marginTop: "12px", fontSize: "19px" }}>{t("p1.lp.pack.custom.title")}</div>
          <p className="muted" style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6" }}>{t("p1.lp.pack.custom.sub")}</p>
          <div className="price">
            <span style={{ fontSize: "13px", fontWeight: "700" }}>{t("p1.lp.pack.from")}</span>
            <span className="amt" style={{ fontSize: "34px" }}>39 999</span>
            <span style={{ fontSize: "13px", fontWeight: "700" }}>{t("p1.lp.pack.mad_ht")}</span>
          </div>
          <div className="hint" style={{ marginBottom: "12px" }}>{t("p1.lp.pack.custom.hint")}</div>
          <ul className="feat" style={{ flex: "1" }}>
            <li><span className="tick"></span>{t("p1.lp.pack.custom.f1")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.custom.f2")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.custom.f3")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.custom.f4")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.custom.f5")}</li>
          </ul>
          <button className="btn btn-gold" id="btn_pack_custom" style={{ marginTop: "16px", width: "100%" }}>{t("p1.lp.pack.choose")}</button>
        </div>


        <div className="price-card" id="pack_card_premium">
          <div className="badge">{t("p1.lp.pack.premium.badge")}</div>
          <div className="lux-title" style={{ marginTop: "12px", fontSize: "19px" }}>{t("p1.lp.pack.premium.title")}</div>
          <p className="muted" style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6" }}>{t("p1.lp.pack.premium.sub")}</p>
          <div className="price">
            <span style={{ fontSize: "18px", fontWeight: "900", color: "var(--royal)" }}>{t("p1.lp.pack.premium.on_quote")}</span>
          </div>
          <div className="hint" style={{ marginBottom: "12px" }}>{t("p1.lp.pack.premium.hint")}</div>
          <ul className="feat" style={{ flex: "1" }}>
            <li><span className="tick"></span>{t("p1.lp.pack.premium.f1")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.premium.f2")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.premium.f3")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.premium.f4")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.premium.f5")}</li>
            <li><span className="tick"></span>{t("p1.lp.pack.premium.f6")}</li>
          </ul>
          <button className="btn btn-dark" style={{ marginTop: "16px", width: "100%" }}>{t("p1.lp.pack.premium.cta")}</button>
        </div>

      </div>

      <div className="gold-divider" style={{ margin: "48px 0 28px" }}></div>
      <div className="grid-2" style={{ gap: "24px" }}>
        <div className="mini-note">
          <div style={{ fontWeight: "900", color: "var(--royal)", marginBottom: "8px" }}>{t("p1.lp.model.classic.title")}</div>
          <div>{t("p1.lp.model.classic.body")}</div>
          <ul style={{ margin: "8px 0 0", paddingLeft: "16px", fontSize: "13px", lineHeight: "1.9", color: "rgba(11,18,32,0.72)" }}>
            <li>{t("p1.lp.model.classic.l1")}</li>
            <li>{t("p1.lp.model.classic.l2")}</li>
            <li>{t("p1.lp.model.classic.l3")}</li>
          </ul>
        </div>
        <div className="mini-note">
          <div style={{ fontWeight: "900", color: "var(--royal)", marginBottom: "8px" }}>{t("p1.lp.model.packs.title")}</div>
          <div>{t("p1.lp.model.packs.l1")}</div>
          <div style={{ marginTop: "4px" }}>{t("p1.lp.model.packs.l2")}</div>
          <div style={{ fontSize: "12px", color: "rgba(11,18,32,0.55)", marginTop: "10px" }}>{t("p1.lp.model.packs.warn")}</div>
        </div>
      </div>

    </div>
  </section>
















<div id="chatbot_container" style={{ position: "fixed", bottom: "0", right: "0", zIndex: "10000" }}>
  
  <button id="chatbot_toggle" style={{ position: "fixed", bottom: "24px", right: "24px", width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#C9A227,#E6C75B)", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(201,162,39,0.4)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}>
    <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
  </button>
  
  
  <div id="chatbot_window" style={{ display: "none", position: "fixed", bottom: "100px", right: "24px", width: "380px", maxHeight: "550px", background: "white", borderRadius: "20px", boxShadow: "0 12px 48px rgba(0,0,0,0.25)", overflow: "hidden" }}>
    
    <div style={{ background: "linear-gradient(135deg,#C9A227,#E6C75B)", color: "white", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "700" }}>{t("p1.lp.chat.title")}</h3>
        <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: "0.95" }}>{t("p1.lp.chat.sub")}</p>
      </div>
      <button aria-label="close" style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "24px", padding: "0", width: "32px", height: "32px" }}>×</button>
    </div>


    <div id="chat_messages" style={{ height: "380px", overflowY: "auto", padding: "20px", background: "#fafafa" }}>
      <div className="chat-msg-ai">
        <div style={{ background: "white", padding: "12px 16px", borderRadius: "12px 12px 12px 4px", fontSize: "14px", lineHeight: "1.6", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          {t("p1.lp.chat.welcome")}<br/><br/>
          <strong>{t("p1.lp.chat.help_with")}</strong><br/>
          • {t("p1.lp.chat.help1")}<br/>
          • {t("p1.lp.chat.help2")}<br/>
          • {t("p1.lp.chat.help3")}<br/>
          • {t("p1.lp.chat.help4")}<br/><br/>
          {t("p1.lp.chat.howcan")}
        </div>
      </div>
    </div>


    <div style={{ padding: "16px", borderTop: "1px solid #e5e5e5", background: "white" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input type="text" id="chat_input" placeholder={t("p1.lp.chat.input_ph")} style={{ flex: "1", padding: "12px", border: "1px solid #ddd", borderRadius: "12px", fontSize: "14px" }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); } }} />
        <button id="chat_send_btn" type="button" aria-label="send" style={{ padding: "12px 20px", background: "linear-gradient(135deg,#C9A227,#E6C75B)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600" }}>
          ➤
        </button>
      </div>
    </div>
  </div>
</div>






      </div> {/* close #app */}
    </div>
  );
}
//test
