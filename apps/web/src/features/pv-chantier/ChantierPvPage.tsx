/**
 * ChantierPvPage — page chantier dédiée aux PV (/chantier/:dossierId/pv).
 *
 * Bandeau de conformité cadence (1 PV / 15 jours) + liste des PV.
 * Les éditeurs/viewers vivent sous /pv-chantier/* (baseRoute par défaut).
 */

import React from "react";
import { useParams } from "react-router-dom";
import PvComplianceBanner from "./PvComplianceBanner";
import PvChantierList from "./PvChantierList";

export default function ChantierPvPage() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  return (
    <div style={{ padding: 12, maxWidth: 980, margin: "0 auto" }}>
      <PvComplianceBanner dossierId={dossierId} showOk />
      <PvChantierList dossierId={dossierId} baseRoute="/pv-chantier" />
    </div>
  );
}
