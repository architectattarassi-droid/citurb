import React, { useEffect } from "react";
import { useP1Machine, loadPersistedState, persistState } from "../../../../domain/p1.store";
import P1Landing from "./P1Landing";
import { useAuth } from "../../../tome5/AuthProvider";

/**
 * P1Home
 * - Landing P1 rendue en React (plus d'iframe / srcDoc).
 * - Doctrine: UI identique, logique isolée, état persisté (storage-first).
 * - Responsive desktop: le breakout 100vw est conservé pour le dégradé hero,
 *   mais l'enfant P1Landing porte déjà un .container-max 1200px à l'intérieur,
 *   et la classe utilitaire .cit-p1-home permet une override CSS centralisée
 *   (cf. styles/responsive-desktop.css) sans toucher au layout interne.
 */
export default function P1Home() {
  const auth = useAuth();
  const userId = auth.userId || "guest";
  const initialState = loadPersistedState(userId) || "E1_LANDING";
  const { state } = useP1Machine(initialState);

  useEffect(() => {
    persistState(userId, state);
  }, [state, userId]);

  return (
    <div
      className="cit-p1-home"
      style={{
        width: "100vw",
        position: "relative",
        left: "50%",
        right: "50%",
        marginLeft: "-50vw",
        marginRight: "-50vw",
      }}
    >
      <P1Landing />
    </div>
  );
}
