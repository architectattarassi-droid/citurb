/** Choix d'un créneau : jours en onglets (défilement horizontal), heures en boutons ≥ 44 px. */
import { heureLocale, jourCourt, moisCourt, type Creneaux } from "./api";

export default function ChoixCreneau({ offre, jour, debut, tzLocal, onJour, onDebut }: {
  offre: Creneaux; jour: string; debut: string; tzLocal: string | null;
  onJour: (date: string) => void; onDebut: (iso: string) => void;
}) {
  const jourChoisi = offre.jours.find((j) => j.date === jour);
  return (
    <>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Jours">
        {offre.jours.map((j) => {
          const actif = j.date === jour, vide = !j.creneaux.length;
          return (
            <button key={j.date} type="button" role="tab" aria-selected={actif} disabled={vide} onClick={() => onJour(j.date)}
              className={`min-h-[56px] min-w-[64px] shrink-0 rounded-xl border px-2 text-center ${actif ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : vide ? "border-slate-200 bg-slate-50 text-slate-300" : "border-slate-300 bg-white text-slate-800"}`}>
              <span className="block text-sm font-semibold capitalize">{jourCourt(j.date)}</span>
              <span className="block text-xs">{vide ? "complet" : moisCourt(j.date)}</span>
            </button>
          );
        })}
      </div>
      {offre.jours.every((j) => !j.creneaux.length) && <p className="text-sm text-slate-600">Aucun créneau libre pour le moment : écrivez-nous sur WhatsApp, nous trouverons un moment.</p>}
      {jourChoisi && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="tabpanel">
          {jourChoisi.creneaux.map((c) => (
            <button key={c.debut} type="button" aria-pressed={debut === c.debut} onClick={() => onDebut(c.debut)}
              className={`min-h-[48px] rounded-lg border px-1 text-center ${debut === c.debut ? "border-[#C9A227] bg-[#C9A227] font-bold text-[#0B1B3A]" : "border-slate-300 bg-white text-slate-800 hover:border-[#0B1B3A]"}`}>
              <span className="block text-base font-semibold">{c.heure}</span>
              {tzLocal && <span className="block text-[11px] text-slate-500">{heureLocale(c.debut, tzLocal)}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

