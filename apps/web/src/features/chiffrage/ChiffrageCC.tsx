/**
 * Chiffrage du back-office (/cc/simulateur) : même gadget que /chiffrage,
 * prérempli depuis l'URL quand on vient d'un lead (« Rouvrir dans le simulateur »),
 * avec génération du CPS.
 */
import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import ChiffrageGadget from "./ChiffrageGadget";
import { projetDepuisUrl } from "./ChiffragePage";

export default function ChiffrageCC() {
  const { search } = useLocation();
  const initial = useMemo(() => projetDepuisUrl(search), [search]);
  return <ChiffrageGadget variante="cc" initial={initial} />;
}

