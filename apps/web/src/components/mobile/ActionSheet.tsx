import React from "react";
import { BottomSheet } from "./BottomSheet";

/**
 * ActionSheet — menu d'actions style iOS, glissant depuis le bas.
 *
 * Affiche une liste d'actions empilées verticalement. Chaque action peut être
 * neutre (defaut) ou destructive (rouge). Un bouton "Annuler" optionnel est
 * affiché en dessous, séparé visuellement.
 *
 * Tap sur une action → exécute son onClick puis ferme la feuille.
 *
 * Couleurs neutres (#0f172a / #f1f5f9) compatibles light + dark via CSS vars.
 */

export interface ActionSheetAction {
  label: string;
  /** Icône en début de ligne (emoji ou node React). */
  icon?: React.ReactNode;
  /** Marque l'action en rouge (suppression, déconnexion…). */
  destructive?: boolean;
  /** Désactive l'action (gris cliquable mais inactif). */
  disabled?: boolean;
  onClick: () => void;
}

export interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  /** Liste des actions à afficher (ordre = ordre d'affichage). */
  actions: ActionSheetAction[];
  /** Label du bouton annuler (par défaut "Annuler"). Vide pour le cacher. */
  cancel?: string;
  /** Titre optionnel affiché en tête. */
  title?: string;
}

export function ActionSheet(props: ActionSheetProps): React.ReactElement {
  const { open, onClose, actions, cancel = "Annuler", title } = props;

  const handleClick = (a: ActionSheetAction) => {
    if (a.disabled) return;
    a.onClick();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} snap="small" hideHandle>
      {title && <div style={S.title}>{title}</div>}
      <div style={S.list}>
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            disabled={a.disabled}
            onClick={() => handleClick(a)}
            style={{
              ...S.item,
              color: a.disabled ? "#94a3b8" : a.destructive ? "#dc2626" : "#0f172a",
              cursor: a.disabled ? "not-allowed" : "pointer",
              borderBottom:
                i < actions.length - 1 ? "1px solid #f1f5f9" : "none",
            }}
          >
            {a.icon && <span style={S.icon}>{a.icon}</span>}
            <span style={S.label}>{a.label}</span>
          </button>
        ))}
      </div>
      {cancel && (
        <button type="button" onClick={onClose} style={S.cancel}>
          {cancel}
        </button>
      )}
    </BottomSheet>
  );
}

const S: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    padding: "4px 12px 12px",
    fontWeight: 500,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    fontSize: 15,
    fontFamily: "inherit",
    fontWeight: 500,
    textAlign: "left",
    minHeight: 48,
    width: "100%",
    WebkitTapHighlightColor: "transparent",
  },
  icon: {
    width: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  label: { flex: 1 },
  cancel: {
    marginTop: 10,
    padding: "14px 16px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    color: "#0f172a",
    cursor: "pointer",
    minHeight: 48,
    fontFamily: "inherit",
  },
};

export default ActionSheet;
