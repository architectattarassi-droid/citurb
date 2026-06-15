/**
 * PublicPostPage — page publique d'un post général (route /post/:id).
 *
 * Accessible SANS authentification → c'est la page qu'on partage hors
 * plateforme (réseaux sociaux, email…). Indexable par Google = SEO.
 * Affiche le post complet + un bandeau CTA "Rejoindre CITURBAREA Cercles".
 *
 * Si le post appartient à un cercle (privé), l'API renvoie 403 → on
 * affiche un mur "contenu réservé aux membres".
 */

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CC_THEME, ensureFonts } from "./theme";
import { cerclesApi, CerclePost } from "./api";
import { useAuth } from "../../tomes/tome5/AuthProvider";
import { apiBase } from "../../tomes/tome4/apiClient";
import MediaEmbed, { extractUrls, isEmbeddable } from "./MediaEmbed";
import { SharePost } from "./SharePost";
import { PostAttachments } from "./PostAttachments";

const METIER_LABELS: Record<string, string> = {
  ARCHITECTE: "Architecte", BET_STRUCTURE: "BET Structure", BET_FLUIDES: "BET Fluides", BET_VRD: "BET VRD",
  TOPOGRAPHE: "Topographe", GEOMETRE: "Géomètre", CONTROLE_TECHNIQUE: "Contrôle technique", LABORATOIRE: "Laboratoire",
  ENTREPRISE_GO: "Entreprise GO", ENTREPRISE_SECOND_OEUVRE: "Second œuvre", FOURNISSEUR_MATERIAUX: "Fournisseur",
  PROMOTEUR: "Promoteur", MOA_PUBLIQUE: "MOA publique", MOA_PRIVEE: "MOA privée", ARTISAN_QUALIFIE: "Artisan",
};

export default function PublicPostPage() {
  useEffect(() => { ensureFonts(); }, []);
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const [post, setPost] = useState<CerclePost | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Édition par l'auteur du post ──────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  // Pièces jointes : ids existants à retirer + nouvelles PJ uploadées.
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<
    Array<{ fileKey: string; filename: string; mimeType: string; sizeBytes: number; url: string }>
  >([]);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (!id) return;
    cerclesApi.publicPost(id)
      .then(r => setPost(r.data))
      .catch((e: any) => setErr(e?.message || "Post introuvable"))
      .finally(() => setLoading(false));
  }, [id]);

  // L'auteur du post peut le modifier (le backend autorise auteur OU modérateur).
  const canEdit = !!auth.isAuthed && !!post && post.authorId === auth.userId;

  const startEdit = () => {
    if (!post) return;
    setDraftTitle(post.title || "");
    setDraftBody(post.body || "");
    setRemoveIds([]);
    setNewAttachments([]);
    setSaveErr(null);
    setEditing(true);
  };

  // Pièces jointes existantes encore visibles (non marquées pour suppression).
  const keptAttachments = (post?.attachments || []).filter((a) => !removeIds.includes(a.id));
  const remainingCount = keptAttachments.length + newAttachments.length;

  const addImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    setSaveErr(null);
    try {
      // Même flux que le composer du fil : upload via cercleId placeholder "_misc".
      const uploaded = await cerclesApi.uploadPostMedia("_misc", Array.from(files));
      setNewAttachments((prev) => [...prev, ...uploaded]);
    } catch (e: any) {
      setSaveErr(e?.message || "Échec de l'upload");
    } finally {
      setUploadingImg(false);
    }
  };

  const saveEdit = async () => {
    if (!post) return;
    if (!draftBody.trim() && remainingCount === 0) {
      setSaveErr("Ajoutez du texte ou au moins une image.");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      // PATCH /api/feed/posts/:id — l'URL /post/:id (basée sur l'id) reste identique.
      const r = await cerclesApi.editPost(post.id, {
        title: draftTitle,
        body: draftBody,
        addAttachments: newAttachments.map(({ fileKey, filename, mimeType, sizeBytes }) => ({
          fileKey, filename, mimeType, sizeBytes,
        })),
        removeAttachmentIds: removeIds,
      });
      setPost((prev) => (prev ? { ...prev, ...r.data } : r.data));
      setEditing(false);
    } catch (e: any) {
      setSaveErr(e?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const author: any = post?.author;
  const proProfile = author?.proProfile;
  const displayName = proProfile?.displayName || author?.username || author?.email || "Membre";

  return (
    <div style={S.root}>
      <header style={S.header}>
        <Link to="/" style={S.brand}>
          <div style={S.brandSeal}>C</div>
          <div>
            <div style={S.brandName}>CITURBAREA · CERCLES</div>
            <div style={S.brandSub}>Le réseau des professionnels du BTP au Maroc</div>
          </div>
        </Link>
        <nav style={S.nav}>
          <Link to="/login" style={S.navLink}>Se connecter</Link>
          <Link to="/inscription" style={S.navCta}>Créer un compte</Link>
        </nav>
      </header>

      <main style={S.main}>
        {loading && <div style={S.muted}>Chargement…</div>}

        {err && (
          <div style={S.errBox}>
            <h1 style={S.errTitle}>Contenu non disponible</h1>
            <p style={S.errBody}>
              Ce post est peut-être réservé aux membres d'un cercle privé, ou n'existe plus.
            </p>
            <Link to="/inscription" style={S.btnPrimary}>Rejoindre CITURBAREA Cercles</Link>
          </div>
        )}

        {post && (
          <>
            <article style={S.postCard}>
              <div style={S.postHead}>
                <div style={S.avatar}>{displayName.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div style={S.authorName}>
                    {displayName}
                    {proProfile?.isVerified && <span title="Vérifié" style={{ color: CC_THEME.success, marginLeft: 5 }}>✓</span>}
                  </div>
                  <div style={S.authorMeta}>
                    {proProfile?.metier ? (METIER_LABELS[proProfile.metier] || proProfile.metier) : "Professionnel BTP"}
                    {" · "}
                    {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <span style={S.publicBadge}>🌐 Post public</span>
                {canEdit && !editing && (
                  <button onClick={startEdit} style={S.editBtn}>✏️ Modifier</button>
                )}
              </div>

              {editing ? (
                <div style={S.editForm}>
                  <p style={S.editHint}>
                    ✏️ Vous modifiez votre post. <strong>Le lien reste identique</strong> — tout ce qui a été
                    partagé continue de fonctionner. Pour une vidéo, collez un lien YouTube dans le texte :
                    il s'affichera automatiquement.
                  </p>

                  <label style={S.label}>Titre (optionnel)</label>
                  <input
                    style={S.input}
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Titre du post"
                  />

                  <label style={S.label}>Texte</label>
                  <textarea
                    style={{ ...S.input, minHeight: 200, resize: "vertical", lineHeight: 1.6 }}
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                  />

                  <label style={S.label}>Images / vidéos jointes</label>
                  {(keptAttachments.length > 0 || newAttachments.length > 0) && (
                    <div style={S.thumbGrid}>
                      {keptAttachments.map((a) => (
                        <div key={a.id} style={S.thumbWrap}>
                          {/^image\//.test(a.mimeType) ? (
                            <img src={`${apiBase()}/uploads/${a.fileKey}`} alt={a.filename} style={S.thumb} />
                          ) : (
                            <div style={S.thumbFile}>📎 {a.filename}</div>
                          )}
                          <button type="button" title="Retirer" style={S.thumbDel}
                            onClick={() => setRemoveIds((ids) => [...ids, a.id])}>×</button>
                        </div>
                      ))}
                      {newAttachments.map((a, i) => (
                        <div key={`new-${i}`} style={S.thumbWrap}>
                          {/^image\//.test(a.mimeType) ? (
                            <img src={a.url.startsWith("http") ? a.url : `${apiBase()}${a.url}`} alt={a.filename} style={S.thumb} />
                          ) : (
                            <div style={S.thumbFile}>📎 {a.filename}</div>
                          )}
                          <span style={S.thumbNew}>nouveau</span>
                          <button type="button" title="Retirer" style={S.thumbDel}
                            onClick={() => setNewAttachments((arr) => arr.filter((_, j) => j !== i))}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={S.editActions}>
                    <label style={{ ...S.cancelBtn, cursor: uploadingImg ? "wait" : "pointer" }}>
                      {uploadingImg ? "Envoi…" : "📷 Ajouter une image / vidéo"}
                      <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
                        disabled={uploadingImg}
                        onChange={(e) => { addImages(e.target.files); e.currentTarget.value = ""; }} />
                    </label>
                  </div>

                  {saveErr && <p style={S.saveErr}>{saveErr}</p>}

                  <div style={S.editActions}>
                    <button style={S.saveBtn} onClick={saveEdit} disabled={saving}>
                      {saving ? "Enregistrement…" : "💾 Enregistrer"}
                    </button>
                    <button style={S.cancelBtn} onClick={() => { setEditing(false); setSaveErr(null); }} disabled={saving}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {post.title && <h1 style={S.postTitle}>{post.title}</h1>}
                  <div style={S.postBody}>{post.body}</div>

                  {extractUrls(post.body || "").filter(isEmbeddable).slice(0, 3).map((u, i) => (
                    <MediaEmbed key={i} url={u} maxWidth={620} />
                  ))}

                  <PostAttachments attachments={post.attachments || []} />
                </>
              )}

              <div style={S.postStats}>
                👍 {post.upvotes} · 💬 {(post as any)._count?.replies ?? post.replyCount ?? 0} commentaire(s)
              </div>

              <div style={S.shareBlock}>
                <div style={S.shareLabel}>Partager ce post</div>
                <SharePost
                  url={typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : ""}
                  title={post.title || "Post CITURBAREA Cercles"}
                />
              </div>
            </article>

            {/* Commentaires (lecture seule pour les visiteurs non connectés) */}
            {post.replies && post.replies.length > 0 && (
              <section style={S.commentsSection}>
                <div style={S.commentsTitle}>Commentaires</div>
                {post.replies.map((c: any) => {
                  const cn = c.author?.proProfile?.displayName || c.author?.username || c.author?.email || "Membre";
                  return (
                    <div key={c.id} style={S.comment}>
                      <div style={S.cAvatar}>{cn.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <div style={S.cName}>{cn}</div>
                        <div style={S.cBody}>{c.body}</div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Bandeau CTA inscription */}
            <section style={S.ctaBanner}>
              <h2 style={S.ctaTitle}>Rejoignez la conversation</h2>
              <p style={S.ctaText}>
                CITURBAREA Cercles est le réseau privé des professionnels du BTP marocain —
                architectes, BET, laboratoires, topographes, entreprises. Discussions,
                visios, annuaire pro, messagerie directe.
              </p>
              <div style={S.ctaBtns}>
                <Link to="/inscription" style={S.btnPrimary}>Créer mon compte pro</Link>
                <Link to="/login" style={S.btnGhost}>J'ai déjà un compte</Link>
              </div>
            </section>
          </>
        )}
      </main>

      <footer style={S.footer}>
        CITURBAREA · Cercles · Maroc · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { background: CC_THEME.bg, minHeight: "100vh", fontFamily: CC_THEME.fontBody, color: CC_THEME.ink },
  header: { borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", flexWrap: "wrap", gap: 12 },
  brand: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" },
  brandSeal: { width: 38, height: 38, borderRadius: 8, background: CC_THEME.bgDeep, color: CC_THEME.or, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 22, fontWeight: 700 },
  brandName: { fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: CC_THEME.ink },
  brandSub: { fontSize: 10, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 2 },
  nav: { display: "flex", alignItems: "center", gap: 12 },
  navLink: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 13, fontWeight: 500 },
  navCta: { background: CC_THEME.navy, color: CC_THEME.bg, padding: "8px 16px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 },

  main: { maxWidth: 720, margin: "0 auto", padding: "32px 20px 60px" },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", textAlign: "center", padding: 40 },

  errBox: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 40, textAlign: "center" },
  errTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 24, color: CC_THEME.navy, margin: "0 0 10px" },
  errBody: { color: CC_THEME.inkMid, fontSize: 14, marginBottom: 22, lineHeight: 1.6 },

  postCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 28, boxShadow: CC_THEME.shadowSoft },
  postHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  avatar: { width: 46, height: 46, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 18, fontWeight: 700, flexShrink: 0 },
  authorName: { fontSize: 15, fontWeight: 600, color: CC_THEME.navy },
  authorMeta: { fontSize: 12, color: CC_THEME.inkMuted, marginTop: 2 },
  publicBadge: { marginLeft: "auto", fontSize: 11, color: CC_THEME.success, fontWeight: 600, background: CC_THEME.successBg, padding: "4px 10px", borderRadius: 5 },
  editBtn: { fontSize: 12.5, fontWeight: 600, color: CC_THEME.bg, background: CC_THEME.navy, border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer" },
  editForm: { display: "flex", flexDirection: "column", margin: "6px 0 4px" },
  editHint: { background: CC_THEME.orSoft, color: CC_THEME.bgDeep, borderRadius: 8, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.5, margin: "0 0 16px" },
  label: { fontSize: 12, fontWeight: 700, color: CC_THEME.navy, margin: "10px 0 6px" },
  input: { width: "100%", boxSizing: "border-box", border: `1px solid ${CC_THEME.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14.5, color: CC_THEME.ink, background: CC_THEME.bg, fontFamily: CC_THEME.fontBody, outline: "none" },
  editActions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 },
  saveBtn: { background: CC_THEME.or, color: CC_THEME.bgDeep, border: "none", padding: "11px 22px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  cancelBtn: { background: "transparent", color: CC_THEME.inkMid, border: `1px solid ${CC_THEME.border}`, padding: "10px 18px", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  saveErr: { color: "#b91c1c", fontSize: 13.5, margin: "10px 0 0" },
  thumbGrid: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  thumbWrap: { position: "relative", width: 96, height: 96 },
  thumb: { width: 96, height: 96, objectFit: "cover", borderRadius: 8, border: `1px solid ${CC_THEME.border}` },
  thumbFile: { width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 11, padding: 6, borderRadius: 8, border: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgSoft, color: CC_THEME.inkMid, overflow: "hidden" },
  thumbDel: { position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#b91c1c", color: "#fff", fontSize: 15, lineHeight: "20px", cursor: "pointer", fontWeight: 700 },
  thumbNew: { position: "absolute", bottom: 4, left: 4, fontSize: 9, fontWeight: 700, background: CC_THEME.or, color: CC_THEME.bgDeep, padding: "1px 5px", borderRadius: 4 },
  postTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.navy, margin: "8px 0 14px", lineHeight: 1.2 },
  postBody: { fontSize: 15, color: CC_THEME.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" },
  attachments: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 },
  attachImg: { maxWidth: 280, maxHeight: 200, objectFit: "cover", borderRadius: 8, border: `1px solid ${CC_THEME.border}` },
  attachVid: { maxWidth: 400, borderRadius: 8, background: "#000" },
  attachFile: { fontSize: 12.5, padding: "9px 14px", background: CC_THEME.bgSoft, borderRadius: 6, color: CC_THEME.inkMid, textDecoration: "none" },
  postStats: { marginTop: 18, paddingTop: 14, borderTop: `1px solid ${CC_THEME.borderSoft}`, fontSize: 13, color: CC_THEME.inkMid },
  shareBlock: { marginTop: 18, paddingTop: 16, borderTop: `1px solid ${CC_THEME.borderSoft}` },
  shareLabel: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 },

  commentsSection: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 22, marginTop: 16 },
  commentsTitle: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 },
  comment: { display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" },
  cAvatar: { width: 32, height: 32, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 13, fontWeight: 700, flexShrink: 0 },
  cName: { fontSize: 13, fontWeight: 600, color: CC_THEME.ink },
  cBody: { fontSize: 13.5, color: CC_THEME.inkMid, lineHeight: 1.55, marginTop: 2, whiteSpace: "pre-wrap" },

  ctaBanner: { background: CC_THEME.bgDeep, color: CC_THEME.inkOnDark, borderRadius: 12, padding: "32px 28px", marginTop: 20, textAlign: "center" },
  ctaTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 24, fontWeight: 600, color: CC_THEME.inkOnDark, margin: "0 0 10px" },
  ctaText: { fontSize: 14, color: "#D4CFC2", lineHeight: 1.6, maxWidth: 520, margin: "0 auto 22px" },
  ctaBtns: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: { background: CC_THEME.or, color: CC_THEME.bgDeep, padding: "12px 24px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-block" },
  btnGhost: { background: "transparent", color: CC_THEME.inkOnDark, padding: "11px 24px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 500, border: `1px solid rgba(250,247,242,0.3)`, display: "inline-block" },

  footer: { textAlign: "center", padding: "24px", fontSize: 12, color: CC_THEME.inkMuted, borderTop: `1px solid ${CC_THEME.border}`, letterSpacing: "0.08em" },
};
