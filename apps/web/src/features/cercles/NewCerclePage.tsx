import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import { cerclesApi, CercleVisibility } from "./api";

export default function NewCerclePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CercleVisibility>("MEMBERS_ONLY");
  const [region, setRegion] = useState("");
  const [themesInput, setThemesInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!name.trim()) { setErr("Nom requis"); return; }
    setBusy(true);
    try {
      const themes = themesInput.split(",").map(s => s.trim()).filter(Boolean);
      const r = await cerclesApi.create({ name, description: description || undefined, visibility, region: region || undefined, themes });
      navigate(`/cercles/${r.data.slug}`);
    } catch (e: any) {
      setErr(e?.message || "Erreur création");
      setBusy(false);
    }
  };

  return (
    <CerclesShell>
      <div style={S.root}>
        <div style={S.eyebrow}>Atelier · Nouveau cercle</div>
        <h1 style={S.title}>Créer un cercle</h1>
        <p style={S.lead}>Un cercle réunit des pros autour d'un sujet, d'une région ou d'un projet. Vous en êtes l'OWNER : vous fixez la visibilité, invitez les membres, modérez.</p>

        <div style={S.form}>
          <Field label="Nom du cercle">
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="ex: Architectes Rabat" />
          </Field>

          <Field label="Description (optionnelle)">
            <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" as const }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Sujet du cercle, règles, etc." />
          </Field>

          <Field label="Visibilité">
            <div style={{ display: "flex", gap: 10 }}>
              {(["PUBLIC", "MEMBERS_ONLY", "PRIVATE"] as CercleVisibility[]).map(v => (
                <button key={v} type="button" onClick={() => setVisibility(v)} style={{
                  flex: 1,
                  padding: "12px 14px",
                  background: visibility === v ? CC_THEME.bgSoft : CC_THEME.bgRaised,
                  border: `1px solid ${visibility === v ? CC_THEME.or : CC_THEME.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: visibility === v ? CC_THEME.navy : CC_THEME.ink }}>
                    {v === "PUBLIC" ? "🌐 Public" : v === "MEMBERS_ONLY" ? "👥 Membres seuls" : "🔒 Privé"}
                  </div>
                  <div style={{ fontSize: 11, color: CC_THEME.inkMuted, marginTop: 2 }}>
                    {v === "PUBLIC" ? "Visible et joinable directement" : v === "MEMBERS_ONLY" ? "Visible, joinable sur demande" : "Invisible sauf invités"}
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: "flex", gap: 14 }}>
            <Field label="Région (optionnelle)">
              <input style={S.input} value={region} onChange={e => setRegion(e.target.value)} placeholder="Casablanca-Settat, Rabat-Salé-Kénitra…" />
            </Field>
            <Field label="Thèmes (séparés par virgule)">
              <input style={S.input} value={themesInput} onChange={e => setThemesInput(e.target.value)} placeholder="BIM, Béton précontraint, VRD" />
            </Field>
          </div>

          {err && <div style={S.err}>{err}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button onClick={() => navigate("/cercles")} style={S.btnGhost}>Annuler</button>
            <button onClick={submit} disabled={busy} style={S.btnPrimary}>{busy ? "Création…" : "Créer le cercle"}</button>
          </div>
        </div>
      </div>
    </CerclesShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <span style={{ fontSize: 10.5, color: CC_THEME.inkMuted, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "40px 48px", maxWidth: 700 },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "8px 0 12px", fontFamily: CC_THEME.fontDisplay, fontSize: 32, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.01em" },
  lead: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic", lineHeight: 1.55, maxWidth: 540, marginBottom: 28 },

  form: { display: "flex", flexDirection: "column", gap: 18, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 24, boxShadow: CC_THEME.shadowSoft },
  input: { padding: "10px 12px", fontSize: 13.5, fontFamily: CC_THEME.fontBody, background: CC_THEME.bg, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, color: CC_THEME.ink, outline: "none", boxSizing: "border-box" as const },
  err: { padding: "10px 14px", background: CC_THEME.dangerBg, border: `1px solid ${CC_THEME.danger}40`, borderRadius: 6, color: CC_THEME.danger, fontSize: 12.5 },

  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "10px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },
  btnGhost: { background: "transparent", color: CC_THEME.inkMid, border: `1px solid ${CC_THEME.border}`, padding: "10px 18px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
};
