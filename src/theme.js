// Jetons de conception — repris 1:1 du portail web PESTEL RDC (styles.css :root, thème clair).
// Une seule source de couleurs/polices/formats : aucune valeur en dur dispersée dans les écrans.

// Deux palettes — clair (défaut, comme le portail) et sombre. `C` est MUTABLE :
// applyTheme() y recopie la palette active, et un re-rendu (App.js) la propage à tous les
// écrans (ils lisent C.x au rendu). Évite de convertir chaque composant à un contexte.
export const LIGHT = {
  bg: '#f4f1ea', bg2: '#ece6da', panel: '#fffdf8', panel2: '#f6f2ea', elev: '#fffefb',
  border: 'rgba(30,30,40,0.12)', border2: 'rgba(30,30,40,0.07)',
  ink: '#1a2230', inkDim: '#4d5a6e', inkMut: '#7d8798',
  cobalt: '#2f52e0', cobaltDim: 'rgba(47,82,224,0.10)',
  gold: '#c98a12', alert: '#d64046', ok: '#1f9d63', white: '#ffffff',
  mapNeutral: '#e9e2d4', mapStroke: '#fffdf8',   // province « calme » / trait entre provinces
};
export const DARK = {
  bg: '#0a0e15', bg2: '#0f1620', panel: '#121a26', panel2: '#0f1620', elev: '#17212f',
  border: 'rgba(255,255,255,0.10)', border2: 'rgba(255,255,255,0.055)',
  ink: '#e8eef6', inkDim: '#93a1b5', inkMut: '#647085',
  cobalt: '#5c82ff', cobaltDim: 'rgba(92,130,255,0.18)',
  gold: '#e7b74b', alert: '#ec5b60', ok: '#33c07f', white: '#ffffff',
  mapNeutral: '#28313f', mapStroke: '#0a0e15',
};
export const C = { ...LIGHT };                    // palette active (mutée par applyTheme)
export function applyTheme(mode) { Object.assign(C, mode === 'dark' ? DARK : LIGHT); return mode; }

// Couleurs des 6 axes PESTEL (identiques au portail : --ax-*) + 2 rubriques hors PESTEL.
export const AX = {
  P:   '#e0484d',  // Politique / Gouvernance / Sécurité — rouge
  E:   '#c98a12',  // Économie — or (assombri pour lisibilité sur fond clair)
  S:   '#d15a8c',  // Social — rose
  T:   '#2f8fe0',  // Technologique & Numérique — cyan
  Env: '#2fa571',  // Environnement — vert
  L:   '#8f6fe6',  // Légal & Réglementaire — violet
  C:   '#b5417a',  // Culture & Arts — magenta (rubrique)
  Sp:  '#e0762e',  // Sports — orange (rubrique)
};
export const AX_ICON = { P: '🏛️', E: '📈', S: '👥', T: '🖥️', Env: '🌍', L: '⚖️', C: '🎭', Sp: '⚽' };
export const AX_SHORT = { P: 'Politique', E: 'Économie', S: 'Social', T: 'Numérique', Env: 'Environnement', L: 'Légal', C: 'Culture & Arts', Sp: 'Sports' };
export const AX_ORDER = ['P', 'E', 'S', 'T', 'Env', 'L'];
// Rubriques hors grille PESTEL (beats d'actualité) — traitées comme des axes dans les données.
export const RUBRIQUES = ['C', 'Sp'];

// Fiabilité des sources (A→D), couleurs du portail (--rel-*)
export const REL = {
  A: { c: '#1f9d63', label: 'A · institutionnel' },
  B: { c: '#2f8fe0', label: 'B · presse établie' },
  C: { c: '#c98a12', label: 'C · secondaire' },
  D: { c: '#d64046', label: 'D · non vérifié' },
};

// Familles de polices — @expo-google-fonts (Fraunces display + IBM Plex, marque du portail).
// Avec une police custom, fontWeight est ignoré → choisir la bonne famille par graisse.
export const F = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyMed: 'IBMPlexSans_500Medium',
  bodySemi: 'IBMPlexSans_600SemiBold',
  bodyBold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
};

// Teinte douce d'une couleur d'axe pour les fonds (≈ color-mix 14% sur panel).
export const tint = (hex, a = 0.14) => {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// Libellés FR (jamais d'anglais dans l'UI).
export const relFr = (r) => (r === 'established' ? 'établi' : 'à confirmer');
export const relIsOk = (r) => r === 'established';

const MOIS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const fmtDateCourt = (iso) => {
  // "2026-07-10" -> "10 juil."
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${parseInt(m[3], 10)} ${MOIS[parseInt(m[2], 10) - 1]}`;
};
