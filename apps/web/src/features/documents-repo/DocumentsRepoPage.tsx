/**
 * DocumentsRepoPage — page principale du dépôt documentaire d'un dossier.
 *
 * Route suggérée : `/dossier/:dossierId/documents` (à câbler dans routes.tsx).
 *
 * Layout mobile-first :
 *  - En haut : barre recherche + filtres statut + chip catégories
 *  - Bouton flottant "+ Téléverser" qui ouvre la bottom-sheet sur mobile
 *  - Grille responsive par catégorie
 *  - Modale preview / signature / partage
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABEL,
  type DocCategory,
  type Document,
  type DocStatus,
  type DocumentListItem,
  documentsRepoApi,
} from "./documents-repo.api";
import DocumentCard from "./DocumentCard";
import DocumentUploader from "./DocumentUploader";
import DocumentPreview from "./DocumentPreview";
import SignatureModal from "./SignatureModal";

type Props = {
  dossierId: string;
  /** Si fourni, désactive les boutons de suppression. */
  readOnly?: boolean;
};

type StatusFilter = "ALL" | "DRAFT" | "PENDING" | "SIGNED" | "ARCHIVED";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Tous" },
  { key: "DRAFT", label: "Brouillons" },
  { key: "PENDING", label: "À signer" },
  { key: "SIGNED", label: "Signés" },
  { key: "ARCHIVED", label: "Archivés" },
];

const CATEGORIES = Object.keys(CATEGORY_LABEL) as DocCategory[];

const S = {
  page: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 12px 96px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#0f172a",
  },
  h1: { fontSize: 22, fontWeight: 700, margin: "0 0 4px" },
  sub: { fontSize: 13, color: "#64748b", margin: "0 0 16px" },
  controls: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 10,
    marginBottom: 14,
  },
  search: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    boxSizing: "border-box" as const,
  },
  tabs: { display: "flex" as const, flexWrap: "wrap" as const, gap: 6 },
  tab: (active: boolean) => ({
    background: active ? "#0f172a" : "#f1f5f9",
    color: active ? "#fff" : "#475569",
    border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer" as const,
  }),
  chips: { display: "flex" as const, flexWrap: "wrap" as const, gap: 6 },
  catSection: { marginTop: 18 },
  catTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em" as const,
    margin: "0 0 8px",
  },
  grid: {
    display: "grid" as const,
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
  },
  empty: {
    border: "1px dashed #cbd5e1",
    borderRadius: 10,
    padding: 32,
    textAlign: "center" as const,
    color: "#64748b",
    background: "#f8fafc",
  },
  fab: {
    position: "fixed" as const,
    right: 16,
    bottom: 16,
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 999,
    padding: "14px 22px",
    fontSize: 15,
    fontWeight: 700,
    boxShadow: "0 6px 16px rgba(15,23,42,0.3)",
    cursor: "pointer" as const,
    zIndex: 50,
  },
  sheet: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.5)",
    zIndex: 60,
    display: "flex" as const,
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
  },
  sheetInner: {
    background: "#fff",
    width: "100%",
    maxWidth: 720,
    maxHeight: "90vh",
    overflow: "auto" as const,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetHead: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  toast: (kind: "ok" | "err") => ({
    position: "fixed" as const,
    bottom: 88,
    left: "50%",
    transform: "translateX(-50%)",
    background: kind === "ok" ? "#16a34a" : "#dc2626",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 6px 14px rgba(0,0,0,0.2)",
    zIndex: 100,
  }),
};

/** Page principale du dépôt documentaire d'un dossier. */
export default function DocumentsRepoPage({ dossierId, readOnly = false }: Props) {
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [catFilter, setCatFilter] = useState<DocCategory | "ALL">("ALL");

  const [showUploader, setShowUploader] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | DocumentListItem | null>(null);
  const [signDoc, setSignDoc] = useState<Document | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await documentsRepoApi.list(dossierId);
      setItems(r.items);
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? "Erreur de chargement" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dossierId) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const matchesStatus = (s: DocStatus): boolean => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "DRAFT") return s === "DRAFT";
    if (statusFilter === "PENDING") return s === "PENDING_SIGNATURE" || s === "PARTIALLY_SIGNED";
    if (statusFilter === "SIGNED") return s === "SIGNED";
    if (statusFilter === "ARCHIVED") return s === "ARCHIVED";
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (!matchesStatus(d.status)) return false;
      if (catFilter !== "ALL" && d.category !== catFilter) return false;
      if (q && !d.title.toLowerCase().includes(q) && !d.filename.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, statusFilter, catFilter]);

  const grouped = useMemo(() => {
    const map = new Map<DocCategory, DocumentListItem[]>();
    for (const c of CATEGORIES) map.set(c, []);
    for (const d of filtered) map.get(d.category)?.push(d);
    return map;
  }, [filtered]);

  // ── Actions
  const openPreview = async (it: DocumentListItem) => {
    try {
      const full = await documentsRepoApi.get(it.id);
      setPreviewDoc(full);
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? "Aperçu indisponible" });
    }
  };

  const openSign = async (it: DocumentListItem) => {
    try {
      const full = await documentsRepoApi.get(it.id);
      setSignDoc(full);
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? "Signature indisponible" });
    }
  };

  const handleSign = async (payload: {
    dataUrl: string;
    signerRole: string;
    signerName: string;
    signerEmail?: string;
    geoLat?: number | null;
    geoLng?: number | null;
  }) => {
    if (!signDoc) return;
    await documentsRepoApi.sign(signDoc.id, payload);
    setSignDoc(null);
    setToast({ kind: "ok", msg: "Signature enregistrée" });
    await reload();
  };

  const handleShare = async (it: DocumentListItem) => {
    try {
      const full = await documentsRepoApi.get(it.id);
      const url = documentsRepoApi.verifyUrl(full.id, full.hashSha256);
      if (navigator.share) {
        await navigator.share({ title: full.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast({ kind: "ok", msg: "Lien de vérification copié" });
      }
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? "Partage indisponible" });
    }
  };

  const handleDelete = async (it: DocumentListItem) => {
    if (!window.confirm(`Archiver « ${it.title} » ?`)) return;
    try {
      await documentsRepoApi.remove(it.id);
      setToast({ kind: "ok", msg: "Document archivé" });
      await reload();
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? "Suppression refusée" });
    }
  };

  const visibleCategories = CATEGORIES.filter((c) => (grouped.get(c) ?? []).length > 0);

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Documents du dossier</h1>
      <p style={S.sub}>
        Contrats, plans, PV, factures, attestations — signature électronique
        intégrée avec empreinte SHA-256 vérifiable.
      </p>

      <div style={S.controls}>
        <input
          type="search"
          style={S.search}
          placeholder="Rechercher un document…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher"
        />
        <div style={S.tabs} role="tablist" aria-label="Filtre statut">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === t.key}
              style={S.tab(statusFilter === t.key)}
              onClick={() => setStatusFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={S.chips} role="tablist" aria-label="Filtre catégorie">
          <button
            type="button"
            style={S.tab(catFilter === "ALL")}
            onClick={() => setCatFilter("ALL")}
          >
            Toutes catégories
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              style={S.tab(catFilter === c)}
              onClick={() => setCatFilter(c)}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={S.empty}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          {items.length === 0
            ? "Aucun document pour ce dossier — téléversez votre premier fichier."
            : "Aucun document ne correspond aux filtres."}
        </div>
      ) : (
        visibleCategories.map((cat) => {
          const docs = grouped.get(cat) ?? [];
          return (
            <section key={cat} style={S.catSection}>
              <h2 style={S.catTitle}>{CATEGORY_LABEL[cat]} ({docs.length})</h2>
              <div style={S.grid}>
                {docs.map((d) => (
                  <DocumentCard
                    key={d.id}
                    doc={d}
                    onPreview={() => openPreview(d)}
                    onSign={() => openSign(d)}
                    onShare={() => handleShare(d)}
                    onDelete={() => handleDelete(d)}
                    canDelete={!readOnly}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {!readOnly ? (
        <button type="button" style={S.fab} onClick={() => setShowUploader(true)}>
          + Téléverser
        </button>
      ) : null}

      {showUploader ? (
        <div style={S.sheet} onClick={(e) => e.target === e.currentTarget && setShowUploader(false)}>
          <div style={S.sheetInner}>
            <div style={S.sheetHead}>
              <strong>Téléverser des documents</strong>
              <button type="button" style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer" }} onClick={() => setShowUploader(false)} aria-label="Fermer">×</button>
            </div>
            <DocumentUploader
              dossierId={dossierId}
              onUploaded={() => {
                void reload();
                setToast({ kind: "ok", msg: "Documents téléversés" });
              }}
            />
          </div>
        </div>
      ) : null}

      {previewDoc ? (
        <DocumentPreview
          doc={previewDoc as Document}
          onClose={() => setPreviewDoc(null)}
        />
      ) : null}

      {signDoc ? (
        <SignatureModal
          doc={signDoc}
          onClose={() => setSignDoc(null)}
          onSubmit={handleSign}
        />
      ) : null}

      {toast ? <div style={S.toast(toast.kind)}>{toast.msg}</div> : null}
    </div>
  );
}
