/**
 * CabinetManagePage — /cabinet/me/manage
 * Vue gestion du cabinet pour son propriétaire (JWT) :
 *  - assure le slug public, lien vers la fiche publique
 *  - CRUD projets + toggle published
 *  - upload médias (photos / vidéo fichier / vidéo URL YouTube) via presign → PUT direct
 *
 * Doctrine respectée : aucune logique métier ici (slug/alt/keywords/JSON-LD = côté API).
 * Ce composant n'orchestre que des appels et l'UX.
 */
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  cabinetApi,
  CabinetProject,
  isAuthed,
  ProjectStatus,
  youtubeThumb,
} from "./api";
import { useT } from "../../i18n/i18n";

const STATUSES: ProjectStatus[] = ["ETUDE", "EN_COURS", "LIVRE"];

const empty = (): Partial<CabinetProject> => ({
  title: "",
  type: "",
  location: "",
  surface: null,
  year: null,
  status: "ETUDE",
  missions: [],
  programme: "",
  description: "",
  materials: "",
  keywords: [],
  published: false,
});

export default function CabinetManagePage() {
  const t = useT();
  const nav = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);
  const [projects, setProjects] = useState<CabinetProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<CabinetProject>>(empty());

  useEffect(() => {
    if (!isAuthed()) {
      nav("/login?next=" + encodeURIComponent("/cabinet/me/manage"));
      return;
    }
    let alive = true;
    (async () => {
      try {
        const s = await cabinetApi.ensureMySlug();
        if (!alive) return;
        setSlug(s.data.slug);
        const p = await cabinetApi.listMyProjects();
        if (alive) setProjects(p.data || []);
      } catch (e: any) {
        if (alive) setErr(e?.message || t("cabinet.manage.load_error_default"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nav, t]);

  async function refresh() {
    const p = await cabinetApi.listMyProjects();
    setProjects(p.data || []);
  }

  function startEdit(p?: CabinetProject) {
    if (p) {
      setEditingId(p.id);
      setDraft({ ...p });
    } else {
      setEditingId("new");
      setDraft(empty());
    }
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(empty());
  }

  async function saveDraft() {
    try {
      const payload: Partial<CabinetProject> = {
        title: draft.title || "",
        type: draft.type || "",
        location: draft.location || "",
        surface: draft.surface ? Number(draft.surface) : null,
        year: draft.year ? Number(draft.year) : null,
        status: (draft.status as ProjectStatus) || "ETUDE",
        missions: Array.isArray(draft.missions) ? draft.missions : [],
        programme: draft.programme || null,
        description: draft.description || "",
        materials: draft.materials || null,
        keywords: Array.isArray(draft.keywords) ? draft.keywords : [],
      };
      if (editingId === "new") await cabinetApi.createProject(payload);
      else if (editingId) await cabinetApi.updateProject(editingId, payload);
      cancelEdit();
      await refresh();
    } catch (e: any) {
      alert(e?.message || t("cabinet.manage.form.save_error_default"));
    }
  }

  async function togglePublish(p: CabinetProject) {
    try {
      await cabinetApi.publishProject(p.id, !p.published);
      await refresh();
    } catch (e: any) {
      alert(e?.message || t("cabinet.manage.card.publish_error_default"));
    }
  }

  async function deleteProject(p: CabinetProject) {
    if (!confirm(t("cabinet.manage.card.delete_confirm", { title: p.title }))) return;
    try {
      await cabinetApi.deleteProject(p.id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || t("cabinet.manage.card.delete_error_default"));
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>{t("cabinet.manage.loading")}</div>;
  if (err)
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, color: "#0f172a" }}>{t("cabinet.manage.error_title")}</h1>
        <p style={{ color: "#64748b" }}>{err}</p>
        <p style={{ color: "#64748b", fontSize: 13 }}>
          {t("cabinet.manage.error_hint")} <Link to="/cercles/me/edit">{t("cabinet.manage.error_hint_link")}</Link>{t("cabinet.manage.error_hint_after")}
        </p>
      </div>
    );

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: 0 }}>{t("cabinet.manage.title")}</h1>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              {t("cabinet.manage.public_label")}{" "}
              {slug ? (
                <Link to={`/cabinet/${slug}`} style={{ color: "#1e3a8a", fontWeight: 700, textDecoration: "none" }}>
                  /cabinet/{slug}
                </Link>
              ) : (
                "—"
              )}
            </div>
          </div>
          <button onClick={() => startEdit()} style={btnPrimary}>{t("cabinet.manage.new_project")}</button>
        </div>

        {editingId && (
          <ProjectForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelEdit} isNew={editingId === "new"} />
        )}

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {projects.length === 0 && !editingId && (
            <div style={{ padding: 30, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, color: "#64748b", textAlign: "center" }}>
              {t("cabinet.manage.empty_state")}
            </div>
          )}
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isEditing={editingId === p.id}
              onEdit={() => startEdit(p)}
              onDelete={() => deleteProject(p)}
              onTogglePublish={() => togglePublish(p)}
              onMediaChanged={refresh}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── ProjectForm ──────────────────────────── */
function ProjectForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  isNew,
}: {
  draft: Partial<CabinetProject>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<CabinetProject>>>;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const t = useT();
  const set = (k: keyof CabinetProject) => (e: any) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 0 }}>{isNew ? t("cabinet.manage.form.new_title") : t("cabinet.manage.form.edit_title")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <Field label={t("cabinet.manage.form.label_title")}><input value={draft.title || ""} onChange={set("title")} style={inp} /></Field>
        <Field label={t("cabinet.manage.form.label_type")}><input value={draft.type || ""} onChange={set("type")} style={inp} placeholder={t("cabinet.manage.form.placeholder_type")} /></Field>
        <Field label={t("cabinet.manage.form.label_city")}><input value={draft.location || ""} onChange={set("location")} style={inp} /></Field>
        <Field label={t("cabinet.manage.form.label_surface")}><input type="number" value={draft.surface ?? ""} onChange={set("surface")} style={inp} /></Field>
        <Field label={t("cabinet.manage.form.label_year")}><input type="number" value={draft.year ?? ""} onChange={set("year")} style={inp} /></Field>
        <Field label={t("cabinet.manage.form.label_status")}>
          <select value={draft.status || "ETUDE"} onChange={set("status")} style={inp}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 10 }}>
        <Field label={t("cabinet.manage.form.label_programme")}><textarea value={draft.programme || ""} onChange={set("programme")} style={{ ...inp, minHeight: 60 }} /></Field>
      </div>
      <div style={{ marginTop: 10 }}>
        <Field label={t("cabinet.manage.form.label_description")}><textarea value={draft.description || ""} onChange={set("description")} style={{ ...inp, minHeight: 100 }} /></Field>
      </div>
      <div style={{ marginTop: 10 }}>
        <Field label={t("cabinet.manage.form.label_materials")}><input value={draft.materials || ""} onChange={set("materials")} style={inp} /></Field>
      </div>
      <div style={{ marginTop: 10 }}>
        <Field label={t("cabinet.manage.form.label_keywords")}>
          <input
            value={(draft.keywords || []).join(", ")}
            onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
            style={inp}
            placeholder={t("cabinet.manage.form.placeholder_keywords")}
          />
        </Field>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button onClick={onSave} style={btnPrimary}>{isNew ? t("cabinet.manage.form.btn_create") : t("cabinet.manage.form.btn_save")}</button>
        <button onClick={onCancel} style={btnGhost}>{t("cabinet.manage.form.btn_cancel")}</button>
      </div>
    </div>
  );
}

/* ──────────────────────────── ProjectCard ──────────────────────────── */
function ProjectCard({
  project,
  isEditing,
  onEdit,
  onDelete,
  onTogglePublish,
  onMediaChanged,
}: {
  project: CabinetProject;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onMediaChanged: () => Promise<void>;
}) {
  const t = useT();
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
            {project.title} {project.published && <span style={{ background: "#15803d", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 99, marginLeft: 6, verticalAlign: "middle" }}>{t("cabinet.manage.card.published_badge")}</span>}
          </h3>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {project.type} · {project.location}{project.year ? ` · ${project.year}` : ""} · {project.status}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onTogglePublish} style={btnGhost}>{project.published ? t("cabinet.manage.card.btn_unpublish") : t("cabinet.manage.card.btn_publish")}</button>
          <button onClick={onEdit} style={btnGhost} disabled={isEditing}>{t("cabinet.manage.card.btn_edit")}</button>
          <button onClick={onDelete} style={{ ...btnGhost, color: "#b91c1c", borderColor: "#fecaca" }}>{t("cabinet.manage.card.btn_delete")}</button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginTop: 10, marginBottom: 12 }}>{project.description}</p>
      <MediaPanel project={project} onChanged={onMediaChanged} />
    </div>
  );
}

/* ──────────────────────────── MediaPanel ──────────────────────────── */
function MediaPanel({ project, onChanged }: { project: CabinetProject; onChanged: () => Promise<void> }) {
  const t = useT();
  const [uploading, setUploading] = useState<{ name: string; pct: number } | null>(null);
  const [ytUrl, setYtUrl] = useState("");

  async function uploadPhoto(files: FileList | null) {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      try {
        setUploading({ name: file.name, pct: 0 });
        const { publicUrl } = await cabinetApi.uploadFile(file, "photo", (p) => setUploading({ name: file.name, pct: p }));
        await cabinetApi.addMedia(project.id, { kind: "PHOTO", url: publicUrl, width: null, height: null });
      } catch (e: any) {
        alert(`${file.name}: ${e?.message || t("cabinet.manage.media.upload_fail_default")}`);
      } finally {
        setUploading(null);
      }
    }
    await onChanged();
  }

  async function uploadVideoFile(file: File | null, thumb: File | null) {
    if (!file) return;
    if (!thumb) {
      alert(t("cabinet.manage.media.thumbnail_required"));
      return;
    }
    try {
      setUploading({ name: file.name, pct: 0 });
      const [{ publicUrl: videoUrl }, { publicUrl: thumbUrl }] = await Promise.all([
        cabinetApi.uploadFile(file, "video", (p) => setUploading({ name: file.name, pct: p })),
        cabinetApi.uploadFile(thumb, "thumbnail"),
      ]);
      await cabinetApi.addMedia(project.id, { kind: "VIDEO_FILE", url: videoUrl, thumbnailUrl: thumbUrl });
    } catch (e: any) {
      alert(e?.message || t("cabinet.manage.media.upload_video_fail_default"));
    } finally {
      setUploading(null);
      await onChanged();
    }
  }

  async function addYoutube() {
    if (!ytUrl) return;
    const thumb = youtubeThumb(ytUrl);
    if (!thumb) {
      alert(t("cabinet.manage.media.youtube_invalid"));
      return;
    }
    try {
      await cabinetApi.addMedia(project.id, { kind: "VIDEO_URL", url: ytUrl, thumbnailUrl: thumb });
      setYtUrl("");
      await onChanged();
    } catch (e: any) {
      alert(e?.message || t("cabinet.manage.media.add_video_fail_default"));
    }
  }

  async function delMedia(mid: string) {
    if (!confirm(t("cabinet.manage.media.delete_confirm"))) return;
    try {
      await cabinetApi.deleteMedia(project.id, mid);
      await onChanged();
    } catch (e: any) {
      alert(e?.message || t("cabinet.manage.media.delete_fail_default"));
    }
  }

  return (
    <div style={{ marginTop: 8, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
        {t("cabinet.manage.media.title")} <span style={{ color: "#94a3b8", fontWeight: 500 }}>({project.media.length})</span>
      </div>
      {project.media.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
          {project.media.map((m) => (
            <div key={m.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9" }}>
              <img src={m.thumbnailUrl || m.url} alt={m.alt || ""} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "4px 6px", fontSize: 10, color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{m.kind}</span>
                <button onClick={() => delMedia(m.id)} style={{ background: "transparent", border: 0, color: "#b91c1c", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Field label={t("cabinet.manage.media.add_photos")}>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => uploadPhoto(e.target.files)} />
        </Field>
        <VideoFileUpload onUpload={uploadVideoFile} />
        <Field label={t("cabinet.manage.media.add_youtube")}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder={t("cabinet.manage.media.youtube_placeholder")} style={inp} />
            <button onClick={addYoutube} style={btnPrimary}>{t("cabinet.manage.media.btn_add")}</button>
          </div>
        </Field>
      </div>
      {uploading && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#1e3a8a" }}>
          {t("cabinet.manage.media.uploading_progress", { name: uploading.name, pct: uploading.pct })}
        </div>
      )}
    </div>
  );
}

function VideoFileUpload({ onUpload }: { onUpload: (file: File | null, thumb: File | null) => void }) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  return (
    <Field label={t("cabinet.manage.media.add_video_file")}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setThumb(e.target.files?.[0] || null)} />
        <button onClick={() => { onUpload(file, thumb); setFile(null); setThumb(null); }} disabled={!file || !thumb} style={btnPrimary}>{t("cabinet.manage.media.btn_send")}</button>
      </div>
    </Field>
  );
}

/* ─────────────────────────────── UI bits ─────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 12, color: "#64748b", fontWeight: 600 }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  );
}
const cardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,.03)" };
const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", boxSizing: "border-box" };
const btnPrimary: React.CSSProperties = { padding: "9px 16px", borderRadius: 8, border: "none", background: "#1e3a8a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 600, fontSize: 13, cursor: "pointer" };
