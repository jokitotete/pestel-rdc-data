// Jetons de conception — repris 1:1 du portail web PESTEL RDC (styles.css :root, thème clair).
// Une seule source de couleurs/polices/formats : aucune valeur en dur dispersée dans les écrans.

// Deux palettes — clair (défaut, comme le portail) et sombre. `C` est MUTABLE :
// applyTheme() y recopie la palette active, et un re-rendu (App.js) la propage à tous les
// écrans (ils lisent C.x au rendu). Évite de convertir chaque composant à un contexte.
// Lot A (accessibilité déterministe) — contrastes corrigés au niveau des JETONS (WCAG 2.2 AA, ≥4,5:1),
// vérifiés par calcul sur les fonds RÉELS (panel/bg et fonds tint), clair ET sombre. Séparation stricte :
// un jeton « texte » (…Text) est conforme AA ; le jeton graphique (point/bordure) reste vif (≥3:1).
export const LIGHT = {
  bg: '#f4f1ea', bg2: '#ece6da', panel: '#fffdf8', panel2: '#f6f2ea', elev: '#fffefb',
  border: 'rgba(30,30,40,0.12)', border2: 'rgba(30,30,40,0.07)',
  ink: '#1a2230', inkDim: '#4d5a6e', inkMut: '#5e6572',   // inkMut : #7d8798→#5e6572 (3,2→4,7:1)
  cobalt: '#2f52e0', cobaltDim: 'rgba(47,82,224,0.10)',
  gold: '#c08411', goldText: '#895e0c',                   // gold = point graphique ; goldText = texte AA
  alert: '#d64046', ok: '#1f9d63', okText: '#177449', white: '#ffffff',
  mapNeutral: '#e9e2d4', mapStroke: '#fffdf8',   // province « calme » / trait entre provinces
};
export const DARK = {
  bg: '#0a0e15', bg2: '#0f1620', panel: '#121a26', panel2: '#0f1620', elev: '#17212f',
  border: 'rgba(255,255,255,0.10)', border2: 'rgba(255,255,255,0.055)',
  ink: '#e8eef6', inkDim: '#93a1b5', inkMut: '#7a8496',   // inkMut : #647085→#7a8496 (3,5→4,6:1)
  cobalt: '#5c82ff', cobaltDim: 'rgba(92,130,255,0.18)',
  gold: '#e7b74b', goldText: '#e7b74b',                   // sur fond sombre l'or vif passe déjà (9,4:1)
  alert: '#ec5b60', ok: '#33c07f', okText: '#33c07f', white: '#ffffff',
  mapNeutral: '#28313f', mapStroke: '#0a0e15',
};
export const C = { ...LIGHT };                    // palette active (mutée par applyTheme)

// Cible tactile (jeton) — HIG 44 px / WCAG 2.2 AA 2.5.8 ≥ 24 px. Pilote tous les hitSlop (aucun littéral).
export const TOUCH = { min: 44 };

export function applyTheme(mode) {
  const dark = mode === 'dark';
  Object.assign(C, dark ? DARK : LIGHT);
  Object.assign(AXT, dark ? AXT_D : AXT_L);       // texte d'axe conforme AA selon le thème
  Object.assign(RELT, dark ? RELT_D : RELT_L);
  return mode;
}

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
  Ev:  '#0fb5ae',  // Events (forums, salons, sommets) — turquoise (rubrique)
};
export const AX_ICON = { P: '🏛️', E: '📈', S: '👥', T: '🖥️', Env: '🌍', L: '⚖️', C: '🎭', Sp: '⚽', Ev: '🎟️' };
export const AX_SHORT = { P: 'Politique', E: 'Économie', S: 'Social', T: 'Numérique', Env: 'Environnement', L: 'Légal', C: 'Culture & Arts', Sp: 'Sports', Ev: 'Events' };
export const AX_ORDER = ['P', 'E', 'S', 'T', 'Env', 'L'];
// Rubriques hors grille PESTEL (beats d'actualité) — traitées comme des axes dans les données.
// Events est placé à côté de Sports (événements ouverts : forums, salons, sommets — distinct de l'agenda « À suivre »).
export const RUBRIQUES = ['C', 'Sp', 'Ev'];

// Marque « Ntongo » — slogan affiché (baseline produit).
export const SLOGAN = 'La RDC qui vous concerne, chaque jour.';

// Lot A — jetons de TEXTE d'axe (AA ≥ 4,5:1) : les couleurs AX vives (ci-dessus) servent le GRAPHIQUE
// (pastille, bordure, tint) ; peindre du texte < 24 px avec AX brut échoue l'AA. `AXT` porte donc la
// variante texte, conforme sur les fonds réels (tint clair assombri / vif sur fond sombre).
export const AXT_L = { P:'#aa373b', E:'#855b0c', S:'#994266', T:'#21649d', Env:'#1f6f4c', L:'#6a52aa', C:'#9d396a', Sp:'#964f1f', Ev:'#096e6a' };
export const AXT_D = { P:'#e6696d', E:'#c98a12', S:'#d8739d', T:'#469be3', Env:'#39aa78', L:'#a085ea', C:'#c9749e', Sp:'#e17b36', Ev:'#0fb5ae' };
export const AXT = { ...AXT_L };   // mutable (applyTheme)
// Jetons de TEXTE de fiabilité (lettre A/B/C/D du SrcDot, sur fond teinté).
export const RELT_L = { A:'#166e45', B:'#20639b', C:'#835a0c', D:'#a73237' };
export const RELT_D = { A:'#3eab79', B:'#4a9ee4', C:'#cb8e19', D:'#e06e72' };
export const RELT = { ...RELT_L };

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
