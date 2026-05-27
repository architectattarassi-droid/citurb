/**
 * DocumentUploader — drag&drop multi-fichiers + preview + progress bar.
 *
 * Mobile-first :
 *  - Tap pour ouvrir le picker natif
 *  - Bottom-sheet style sur petit écran
 *  - Validation taille (25 Mo) et type avant POST
 *  - Progression par fichier (XHR upload.onprogress)
 */
import React, { useCallback, useRef, useState } from "react";
import {
  CATEGORY_LABEL,
  type DocCategory,
  documentsRepoApi,
  formatBytes,
} from "./documents-repo.api";

type Props = {
  dossierId: string;
  onUploaded: () => void;
  defaultCategory?: DocCategory;
  /** Plafond MB côté UI — synchronisé avec backend (MAX_UPLOAD_BYTES). */
  maxMb?: number;
};

type Item = {
  file: File;
  category: DocCategory;
  title: string;
  progress: number;
  status: "PENDING" | "UPLOADING" | "DONE" | "ERROR";
  error?: string;
};

const ALLOWED_EXT_LABEL = "PDF, JPG, PNG, WEBP, HEIC, DOC, DOCX, XLS, XLSX, CSV, TXT";

const S = {
  dropZone: (active: boolean) => ({
    border: `2px dashed ${active ? "#0f172a" : "#94a3b8"}`,
    borderRadius: 10,
    padding: 28,
    textAlign: "center" as const,
    background: active ? "#f1f5f9" : "#f8fafc",
    cursor: "pointer" as const,
    transition: "all 0.15s ease",
  }),
  hint: { fontSize: 12, color: "#64748b", marginTop: 6 },
  list: { marginTop: 16, display: "flex" as const, flexDirection: "column" as const, gap: 10 },
  item: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 6,
  },
  itemHeader: { display: "flex" as const, justifyContent: "space-between" as const, gap: 8, fontSize: 13, color: "#0f172a", fontWeight: 600 },
  metaRow: { display: "flex" as const, flexWrap: "wrap" as const, gap: 8, fontSize: 12, color: "#64748b" },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
    minWidth: 140,
    flex: 1,
  },
  select: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
    minWidth: 160,
  },
  progress: {
    height: 6,
    background: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden" as const,
    marginTop: 4,
  },
  progressBar: (pct: number, status: Item["status"]) => ({
    height: "100%",
    width: `${pct}%`,
    background: status === "ERROR" ? "#dc2626" : status === "DONE" ? "#16a34a" : "#0f172a",
    transition: "width 0.2s ease",
  }),
  toolbar: { display: "flex" as const, justifyContent: "flex-end" as const, gap: 8, marginTop: 12 },
  btnPrimary: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
  },
  error: { color: "#991b1b", fontSize: 12 },
};

const CATEGORIES = Object.keys(CATEGORY_LABEL) as DocCategory[];

/** Zone d'upload drag&drop + sélection multi-fichiers. */
export default function DocumentUploader({ dossierId, onUploaded, defaultCategory = "AUTRE", maxMb = 25 }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const next: Item[] = [];
    Array.from(files).forEach((f) => {
      const sizeMb = f.size / 1024 / 1024;
      if (sizeMb > maxMb) {
        next.push({
          file: f,
          category: defaultCategory,
          title: f.name.replace(/\.[^.]+$/, ""),
          progress: 0,
          status: "ERROR",
          error: `Fichier trop volumineux (${sizeMb.toFixed(1)} Mo > ${maxMb} Mo)`,
        });
        return;
      }
      next.push({
        file: f,
        category: defaultCategory,
        title: f.name.replace(/\.[^.]+$/, ""),
        progress: 0,
        status: "PENDING",
      });
    });
    setItems((prev) => [...prev, ...next]);
  }, [defaultCategory, maxMb]);

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const uploadOne = async (idx: number, item: Item) => {
    updateItem(idx, { status: "UPLOADING", progress: 0, error: undefined });
    try {
      await documentsRepoApi.upload(
        dossierId,
        item.file,
        { title: item.title, category: item.category },
        (pct) => updateItem(idx, { progress: pct }),
      );
      updateItem(idx, { status: "DONE", progress: 100 });
    } catch (e: any) {
      updateItem(idx, {
        status: "ERROR",
        error: e?.message ?? "Échec de l'upload",
      });
    }
  };

  const uploadAll = async () => {
    const pending = items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => it.status === "PENDING");
    for (const { it, i } of pending) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(i, it);
    }
    onUploaded();
    // Conserve les ERROR pour visibilité ; nettoie les DONE
    setItems((prev) => prev.filter((it) => it.status !== "DONE"));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── DnD handlers
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        style={S.dropZone(dragActive)}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
      >
        <strong>Glissez-déposez vos fichiers ici</strong>
        <div style={S.hint}>ou tapez pour sélectionner — {ALLOWED_EXT_LABEL} (max {maxMb} Mo)</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 ? (
        <>
          <div style={S.list}>
            {items.map((it, i) => (
              <div key={`${it.file.name}-${i}`} style={S.item}>
                <div style={S.itemHeader}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.file.name}
                  </span>
                  <span>{formatBytes(it.file.size)}</span>
                </div>
                <div style={S.metaRow}>
                  <input
                    style={S.input}
                    value={it.title}
                    onChange={(e) => updateItem(i, { title: e.target.value })}
                    placeholder="Titre"
                    disabled={it.status === "UPLOADING"}
                  />
                  <select
                    style={S.select}
                    value={it.category}
                    onChange={(e) => updateItem(i, { category: e.target.value as DocCategory })}
                    disabled={it.status === "UPLOADING"}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                  {it.status !== "UPLOADING" && it.status !== "DONE" ? (
                    <button type="button" style={S.btnGhost} onClick={() => removeItem(i)}>
                      Retirer
                    </button>
                  ) : null}
                </div>
                <div style={S.progress}>
                  <div style={S.progressBar(it.progress, it.status)} />
                </div>
                {it.error ? <div style={S.error}>{it.error}</div> : null}
              </div>
            ))}
          </div>
          <div style={S.toolbar}>
            <button type="button" style={S.btnGhost} onClick={() => setItems([])}>
              Tout vider
            </button>
            <button
              type="button"
              style={S.btnPrimary}
              onClick={uploadAll}
              disabled={!items.some((it) => it.status === "PENDING")}
            >
              Téléverser
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
