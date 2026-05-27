/**
 * DocumentsQuickAccess — liste des documents clés (contrat, plans, permis, PV).
 *
 * Mobile-first : cards verticales sur mobile, grille sur desktop.
 */

import React from "react";
import { DocumentRef } from "./mon-parcours.api";

interface Props {
  documents: DocumentRef[];
}

function iconFor(kind: string): string {
  const k = kind.toUpperCase();
  if (k.includes("CONTRAT")) return "📜";
  if (k.includes("PLAN")) return "📐";
  if (k.includes("PERMIS")) return "🏛️";
  if (k.includes("PV")) return "📋";
  return "📄";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const DocumentsQuickAccess: React.FC<Props> = ({ documents }) => {
  return (
    <section
      aria-label="Documents clés"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <h3 className="mb-3 text-base font-semibold text-slate-900 sm:text-lg">
        Documents clés
      </h3>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun document disponible pour le moment.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {documents.map((d) => (
            <li key={d.id}>
              <a
                href={d.signedUrl ?? "#"}
                target={d.signedUrl ? "_blank" : undefined}
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition hover:bg-slate-100 hover:shadow-sm"
              >
                <span className="text-xl" aria-hidden>
                  {iconFor(d.kind)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {d.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.kind} · {fmtDate(d.updatedAt)}
                  </p>
                </div>
                {d.signed && (
                  <span
                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
                    aria-label="Signé"
                  >
                    ✓
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DocumentsQuickAccess;
