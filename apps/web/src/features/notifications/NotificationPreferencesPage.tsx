import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  disablePushSubscription,
  ensurePushSubscription,
  notificationsHubApi,
  type ChannelPreference,
  type HubChannel,
  type HubEventType,
  type HubLang,
  type PreferencesResponse,
} from "./notifications-hub.api";

/**
 * NotificationPreferencesPage — page `/parametres/notifications`.
 *
 * - Tableau matrice eventType × channel avec toggles
 * - Save automatique (PATCH) — état optimiste
 * - Sélecteur langue notifications (FR/AR/EN)
 * - CTA activer/désactiver push système
 * - Mobile-first : table devient cards empilées en `< sm`
 */

const CHANNEL_LABELS: Record<HubChannel, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  PUSH: "Push",
  IN_APP: "Centre",
};

const EVENT_GROUPS: Array<{ label: string; events: HubEventType[] }> = [
  { label: "Dossier & permis", events: ["DOSSIER_CREE", "PERMIS_DEPOSE", "PERMIS_COMMISSION_PROGRAMMEE", "PERMIS_DECISION_FAVORABLE", "PERMIS_DECISION_RESERVES", "PERMIS_DECISION_REFUS"] },
  { label: "Chantier", events: ["CHANTIER_DEMARRAGE", "PV_CHANTIER_SIGNE", "RETARD_DETECTE", "BLOCAGE_DECLARE"] },
  { label: "Livraison & garantie", events: ["RECEPTION_PROVISOIRE_PROGRAMMEE", "LIVRAISON_PRETE", "GARANTIE_EXPIRE_J30"] },
  { label: "Paiements", events: ["PAIEMENT_RECU", "PACK_VALIDE", "FACTURE_DISPONIBLE"] },
  { label: "Interactions", events: ["MENTION_INTERACTION", "INVITATION_CERCLE", "MESSAGE_RECU"] },
  { label: "Sécurité", events: ["OTP_CONNEXION", "MOT_DE_PASSE_CHANGE"] },
  { label: "Autres", events: ["LEAD_CONTACT_RECU", "PROFIL_VALIDE", "INFO_GENERIQUE"] },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<PreferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pushPerm, setPushPerm] = useState<NotificationPermission | "unknown">("unknown");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await notificationsHubApi.getPreferences();
      setPrefs(p);
    } finally {
      setLoading(false);
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPerm(Notification.permission);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const matrix = useMemo<Record<string, boolean>>(() => {
    if (!prefs) return {};
    const m: Record<string, boolean> = {};
    for (const r of prefs.matrix) m[`${r.eventType}:${r.channel}`] = r.enabled;
    return m;
  }, [prefs]);

  const toggle = async (eventType: HubEventType, channel: HubChannel, next: boolean) => {
    const key = `${eventType}:${channel}`;
    setSavingKey(key);
    // optimiste
    setPrefs(p => p ? {
      ...p,
      matrix: p.matrix.map(r => r.eventType === eventType && r.channel === channel ? { ...r, enabled: next } : r),
    } : p);
    try {
      await notificationsHubApi.setPreference(eventType, channel, next);
    } catch {
      // rollback
      setPrefs(p => p ? {
        ...p,
        matrix: p.matrix.map(r => r.eventType === eventType && r.channel === channel ? { ...r, enabled: !next } : r),
      } : p);
    } finally {
      setSavingKey(null);
    }
  };

  const onLangChange = async (lang: HubLang) => {
    if (!prefs) return;
    setPrefs({ ...prefs, lang });
    try { await notificationsHubApi.setLang(lang); } catch { /* silent */ }
  };

  const onTogglePush = async () => {
    if (pushPerm === "granted") {
      await disablePushSubscription();
      if (typeof window !== "undefined" && "Notification" in window) setPushPerm(Notification.permission);
    } else {
      await ensurePushSubscription();
      if (typeof window !== "undefined" && "Notification" in window) setPushPerm(Notification.permission);
    }
  };

  if (loading || !prefs) {
    return <div className="p-6 text-center text-sm text-slate-500">Chargement des préférences…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Préférences de notifications</h1>
            <Link to="/notifications" className="text-sm text-blue-700 hover:underline">
              Voir mes notifications
            </Link>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Choisissez par canal et par type d'événement comment vous voulez être notifié.
          </p>
        </header>

        {/* Langue */}
        <section className="mb-6 bg-white rounded-lg shadow-sm p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Langue des notifications</h2>
          <div className="flex gap-2">
            {(["fr", "ar", "en"] as HubLang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => onLangChange(l)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  prefs.lang === l
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {l === "fr" && "Français"}
                {l === "ar" && "العربية"}
                {l === "en" && "English"}
              </button>
            ))}
          </div>
        </section>

        {/* Push système */}
        <section className="mb-6 bg-white rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Notifications push (navigateur)</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Statut : {pushPerm === "granted" ? "Activé" : pushPerm === "denied" ? "Bloqué dans le navigateur" : "Non activé"}
              </p>
            </div>
            <button
              type="button"
              onClick={onTogglePush}
              disabled={pushPerm === "denied"}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                pushPerm === "granted"
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : pushPerm === "denied"
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-blue-700 text-white hover:bg-blue-800"
              }`}
            >
              {pushPerm === "granted" ? "Désactiver" : "Activer"}
            </button>
          </div>
        </section>

        {/* Matrice */}
        {EVENT_GROUPS.map(group => {
          const events = group.events.filter(e => prefs.eventTypes.includes(e));
          if (events.length === 0) return null;
          return (
            <section key={group.label} className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
              <h2 className="px-4 sm:px-5 py-3 text-sm font-semibold text-slate-900 border-b border-slate-100 bg-slate-50">
                {group.label}
              </h2>

              {/* Desktop : table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-2">Événement</th>
                      {prefs.channels.map(c => (
                        <th key={c} className="text-center px-3 py-2 w-24">{CHANNEL_LABELS[c]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(e => (
                      <tr key={e} className="border-t border-slate-100">
                        <td className="px-5 py-3 text-sm text-slate-700">{humanize(e)}</td>
                        {prefs.channels.map(c => {
                          const k = `${e}:${c}`;
                          const enabled = matrix[k] ?? true;
                          return (
                            <td key={c} className="text-center px-3 py-3">
                              <Toggle
                                enabled={enabled}
                                disabled={savingKey === k}
                                onChange={(v) => toggle(e as HubEventType, c, v)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile : cards empilées */}
              <div className="sm:hidden divide-y divide-slate-100">
                {events.map(e => (
                  <div key={e} className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 mb-2">{humanize(e)}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {prefs.channels.map(c => {
                        const k = `${e}:${c}`;
                        const enabled = matrix[k] ?? true;
                        return (
                          <label key={c} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 rounded">
                            <span className="text-xs text-slate-600">{CHANNEL_LABELS[c]}</span>
                            <Toggle
                              enabled={enabled}
                              disabled={savingKey === k}
                              onChange={(v) => toggle(e as HubEventType, c, v)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
        enabled ? "bg-emerald-600" : "bg-slate-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 bg-white rounded-full shadow transform transition ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const HUMAN_LABELS: Record<string, string> = {
  LEAD_CONTACT_RECU: "Demande de contact reçue",
  DOSSIER_CREE: "Dossier créé",
  PROFIL_VALIDE: "Profil validé",
  PERMIS_DEPOSE: "Permis déposé",
  PERMIS_COMMISSION_PROGRAMMEE: "Commission programmée",
  PERMIS_DECISION_FAVORABLE: "Décision favorable",
  PERMIS_DECISION_RESERVES: "Réserves émises",
  PERMIS_DECISION_REFUS: "Refus",
  CHANTIER_DEMARRAGE: "Démarrage chantier",
  PV_CHANTIER_SIGNE: "PV de chantier signé",
  RETARD_DETECTE: "Retard détecté",
  BLOCAGE_DECLARE: "Blocage déclaré",
  RECEPTION_PROVISOIRE_PROGRAMMEE: "Réception provisoire",
  LIVRAISON_PRETE: "Livraison prête",
  GARANTIE_EXPIRE_J30: "Garantie J-30",
  PAIEMENT_RECU: "Paiement reçu",
  PACK_VALIDE: "Pack validé",
  FACTURE_DISPONIBLE: "Facture disponible",
  MENTION_INTERACTION: "Mention dans une discussion",
  INVITATION_CERCLE: "Invitation à un cercle",
  MESSAGE_RECU: "Nouveau message",
  OTP_CONNEXION: "Code de connexion",
  MOT_DE_PASSE_CHANGE: "Mot de passe modifié",
  INFO_GENERIQUE: "Notification générique",
};

function humanize(eventType: string): string {
  return HUMAN_LABELS[eventType] || eventType.replace(/_/g, " ").toLowerCase();
}
