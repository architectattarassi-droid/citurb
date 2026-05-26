/**
 * Mobile utilities — barrel exports.
 *
 * Composants utilitaires mobile-first pour CITURBAREA, 0 dépendance externe.
 * Voir chaque fichier pour JSDoc détaillée.
 */

export { useBreakpoint, useIsMobile, useIsTablet, useIsDesktop } from "./useBreakpoint";
export type { Breakpoint } from "./useBreakpoint";

export { BottomSheet } from "./BottomSheet";
export type { BottomSheetProps, BottomSheetSnap } from "./BottomSheet";

export { ActionSheet } from "./ActionSheet";
export type { ActionSheetAction, ActionSheetProps } from "./ActionSheet";

export { ResponsiveTable } from "./ResponsiveTable";
export type { ResponsiveTableColumn, ResponsiveTableProps } from "./ResponsiveTable";

export { FAB } from "./FAB";
export type { FABProps } from "./FAB";

export { MobileHeader, HeaderIconButton } from "./MobileHeader";
export type { MobileHeaderProps } from "./MobileHeader";

export { MobileDrawer } from "./MobileDrawer";
export type { MobileDrawerProps } from "./MobileDrawer";
