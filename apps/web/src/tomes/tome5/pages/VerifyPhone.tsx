import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthProvider";

/**
 * V162 — Phone verification (OTP SMS) — MOCK
 * - In dev, OTP is printed in console.
 * - In prod, replace AuthProvider.startPhoneVerification by Twilio.
 */
export default function VerifyPhone() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const next = params.get("next") || "/p1/packs";

  const [phone, setPhone] = useState(auth.phone || "");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const verified = useMemo(() => Boolean(auth.phoneVerifiedAt), [auth.phoneVerifiedAt]);

  if (!auth.isAuthed) {
    nav(`/login?next=${encodeURIComponent(next)}`);
    return null;
  }

  const normalizePhone = (raw: string): string => {
    const n = raw.replace(/\s/g, "");
    if (n.startsWith("+")) return n;
    if (n.startsWith("212")) return `+${n}`;
    if (n.startsWith("0")) return `+212${n.slice(1)}`;
    return n;
  };

  const send = async () => {
    setErr(null);
    setStatus(null);
    try {
      await auth.startPhoneVerification(normalizePhone(phone));
      setStatus("Code envoyé. (En mode dev, le code s’affiche dans la console.)");
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    }
  };

  const verify = async () => {
    setErr(null);
    setStatus(null);
    try {
      await auth.verifyPhoneOtp(otp);
      setStatus("Numéro vérifié.");
      nav(next, { replace: true, state: { from: loc.pathname } });
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    }
  };

  return (
    <div style={{ padding: "36px 0 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 18px" }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: "#0B1B3A", letterSpacing: -0.3 }}>
          Vérification du téléphone
        </div>
        <div style={{ marginTop: 10, color: "rgba(11,18,32,0.72)", lineHeight: 1.7 }}>
          Accès aux packs uniquement après <b>validation SMS</b>.
        </div>

        <div style={{ marginTop: 22, border: "1px solid rgba(201,162,39,0.35)", borderRadius: 16, padding: 18, background: "rgba(255,255,255,0.9)" }}>
          <div style={{ fontWeight: 900, color: "#0B1B3A" }}>Numéro</div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex: 06XXXXXXXX"
            style={{ width: "100%", marginTop: 8, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(11,27,58,0.18)" }}
          />
          <button
            onClick={send}
            style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(201,162,39,0.55)", background: "rgba(201,162,39,0.18)", fontWeight: 900, cursor: "pointer" }}
          >
            Envoyer le code
          </button>

          <div style={{ marginTop: 18, fontWeight: 900, color: "#0B1B3A" }}>Code SMS</div>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6 chiffres"
            style={{ width: "100%", marginTop: 8, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(11,27,58,0.18)" }}
          />
          <button
            onClick={verify}
            disabled={verified}
            style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(11,27,58,0.18)", background: verified ? "rgba(11,27,58,0.06)" : "#0B1B3A", color: verified ? "rgba(11,27,58,0.55)" : "white", fontWeight: 900, cursor: verified ? "not-allowed" : "pointer" }}
          >
            Valider
          </button>

          {status && <div style={{ marginTop: 12, color: "rgba(11,18,32,0.75)", fontWeight: 700 }}>{status}</div>}
          {err && <div style={{ marginTop: 12, color: "#b42318", fontWeight: 800 }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}
