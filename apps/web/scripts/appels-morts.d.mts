export type Appel = { fichier: string; ligne: number; chemin: string; vivante: boolean };
export const RACINE: string;
export const CLIQUET: string;
export function routesVivantes(): string[][];
export function normaliser(brut: string): string | null;
export function estVivante(chemin: string, routes?: string[][]): boolean;
export function analyser(): { total: number; vivants: number; morts: Appel[] };
export function parFichier(morts: Appel[]): Record<string, number>;
