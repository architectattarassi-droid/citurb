/**
 * DeployWatcher — après chaque navigation SPA, si un nouveau build a été
 * détecté (lib/deployWatch), recharge la page une fois pour charger la
 * nouvelle version avant que le routeur ne réclame un chunk disparu.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { checkForUpdate, reloadIfUpdatePending } from "./deployWatch";

export default function DeployWatcher() {
  const location = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reloadIfUpdatePending()) void checkForUpdate();
  }, [location.pathname]);

  return null;
}
