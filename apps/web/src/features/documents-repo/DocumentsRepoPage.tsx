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
import { useT } from "../../i18n/i18n";

type Props = {
  dossierId: string;
  /** Si fourni, désactive les boutons de suppression. */
  readOnly?: boolean;
};

type StatusFilter = "ALL" | "DRAFT" | "PENDING" | "SIGNED" | "ARCHIVED";

const STATUS_TAB_KEYS: { key: StatusFilter; tKey: string }[] = [
  { key: "ALL", tKey: "documents.repo.tabs.all" },
  { key: "DRAFT", tKey: "documents.repo.tabs.draft" },
  { key: "PENDING", tKey: "documents.repo.tabs.pending" },
  { key: "SIGNED", tKey: "documents.repo.tabs.signed" },
  { key: "ARCHIVED", tKey: "documents.repo.tabs.archived" },
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
  const t = useT();
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [catFilter, setCatFilter] = useState<DocCategory | "ALL">("ALL");

  const [showUploader, setShowUploader] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | DocumentListItem | null>(null);
  const [signDoc, setSignDoc] = useState<Document | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const catLabel = (c: DocCategory): string => {
    const key = `documents.repo.cat.${c}`;
    const v = t(key);
    return v === key ? CATEGORY_LABEL[c] : v;
  };

  const reload = async () => {
    setLoading(true);
    try {
      const r = await documentsRepoApi.list(dossierId);
      setItems(r.items);
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? t("documents.repo.error.load") });
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
      setToast({ kind: "err", msg: e?.message ?? t("documents.repo.error.preview") });
    }
  };

  const openSign = async (it: DocumentListItem) => {
    try {
      const full = await documentsRepoApi.get(it.id);
      setSignDoc(full);
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? t("documents.repo.error.sign") });
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
    setToast({ kind: "ok", msg: t("documents.repo.toast.signed") });
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
        setToast({ kind: "ok", msg: t("documents.repo.toast.shareCopied") });
      }
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? t("documents.repo.error.share") });
    }
  };

  const handleDelete = async (it: DocumentListItem) => {
    if (!window.confirm(t("documents.repo.confirm.archive", { title: it.title }))) return;
    try {
      await documentsRepoApi.remove(it.id);
      setToast({ kind: "ok", msg: t("documents.repo.toast.archived") });
      await reload();
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message ?? t("documents.repo.error.delete") });
    }
  };

  const visibleCategories = CATEGORIES.filter((c) => (grouped.get(c) ?? []).length > 0);

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{t("documents.repo.title")}</h1>
      <p style={S.sub}>{t("documents.repo.subtitle")}</p>

      <div style={S.controls}>
        <input
          type="search"
          style={S.search}
          placeholder={t("documents.repo.search.placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t("documents.repo.search.aria")}
        />
        <div style={S.tabs} role="tablist" aria-label={t("documents.repo.tabs.aria")}>
          {STATUS_TAB_KEYS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.key}
              style={S.tab(statusFilter === tab.key)}
              onClick={() => setStatusFilter(tab.key)}
            >
              {t(tab.tKey)}
            </button>
          ))}
        </div>
        <div style={S.chips} role="tablist" aria-label={t("documents.repo.chips.aria")}>
          <button
            type="button"
            style={S.tab(catFilter === "ALL")}
            onClick={() => setCatFilter("ALL")}
          >
            {t("documents.repo.chips.all")}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              style={S.tab(catFilter === c)}
              onClick={() => setCatFilter(c)}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={S.empty}>{t("documents.repo.loading")}</div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          {items.length === 0
            ? t("documents.repo.empty.none")
            : t("documents.repo.empty.filtered")}
        </div>
      ) : (
        visibleCategories.map((cat) => {
          const docs = grouped.get(cat) ?? [];
          return (
            <section key={cat} style={S.catSection}>
              <h2 style={S.catTitle}>{catLabel(cat)} ({docs.length})</h2>
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
          {t("documents.repo.fab.upload")}
        </button>
      ) : null}

      {showUploader ? (
        <div style={S.sheet} onClick={(e) => e.target === e.currentTarget && setShowUploader(false)}>
          <div style={S.sheetInner}>
            <div style={S.sheetHead}>
              <strong>{t("documents.repo.sheet.title")}</strong>
              <button type="button" style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer" }} onClick={() => setShowUploader(false)} aria-label={t("documents.repo.sheet.close")}>×</button>
            </div>
            <DocumentUploader
              dossierId={dossierId}
              onUploaded={() => {
                void reload();
                setToast({ kind: "ok", msg: t("documents.repo.toast.uploaded") });
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
