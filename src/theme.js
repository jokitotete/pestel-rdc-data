// Jetons de conception — SEULE SOURCE de couleurs / polices / espacements / typographie / rayons / motion.
// RS1 (Design System agnostique) : aucune valeur en dur dispersée dans les écrans — tout référence un jeton
// sémantique ci-dessous (échelles SP/TYPE/RADIUS/DUR/EASE/ELEV/HIT), verrouillé par __tests__/tokens.guard.
import { Platform, Easing } from 'react-native';

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
  // Surface d'ACTION (pastille active) découplée de l'accent : blanc lisible dessus (6,17:1 AA) dans les DEUX
  // thèmes. `cobalt` (accent brut) reste réservé au TEXTE/point ; ne jamais peindre du blanc dessus en sombre.
  actionFill: '#2f52e0', onAction: '#ffffff',
  gold: '#c08411', goldText: '#895e0c',                   // gold = point graphique ; goldText = texte AA
  alert: '#d64046', ok: '#1f9d63', okText: '#177449', white: '#ffffff',
  mapNeutral: '#e9e2d4', mapStroke: '#fffdf8',   // province « calme » / trait entre provinces
  // RS1-02 : couleurs résiduelles tokenisées (plus aucun hex/rgba hors de ce fichier).
  onHero: '#ffffff', onHeroDim: 'rgba(255,255,255,0.75)',   // texte sur bandeau/splash cobalt (blanc ≥8:1)
  scrim: 'rgba(20,25,40,0.35)',                             // voile modale (EditionSheet)
  shadow: '#1a2740',                                        // couleur d'ombre (ELEV) — jadis en dur dans ui.js
};
export const DARK = {
  bg: '#0a0e15', bg2: '#0f1620', panel: '#121a26', panel2: '#0f1620', elev: '#17212f',
  border: 'rgba(255,255,255,0.10)', border2: 'rgba(255,255,255,0.055)',
  ink: '#e8eef6', inkDim: '#93a1b5', inkMut: '#7a8496',   // inkMut : #647085→#7a8496 (3,5→4,6:1)
  cobalt: '#5c82ff', cobaltDim: 'rgba(92,130,255,0.18)',
  // En sombre, `cobalt` #5c82ff est accordé comme TEXTE sur fond noir (AA) mais échoue derrière du blanc
  // (3,45:1). La surface d'action garde donc le cobalt profond #2f52e0 → blanc 6,17:1 AA, cohérent avec le clair.
  actionFill: '#2f52e0', onAction: '#ffffff',
  gold: '#e7b74b', goldText: '#e7b74b',                   // sur fond sombre l'or vif passe déjà (9,4:1)
  alert: '#ec5b60', ok: '#33c07f', okText: '#33c07f', white: '#ffffff',
  mapNeutral: '#28313f', mapStroke: '#0a0e15',
  onHero: '#ffffff', onHeroDim: 'rgba(255,255,255,0.75)',   // le bandeau HERO_GRAD est fixe (sombre) → blanc dans les 2 thèmes
  scrim: 'rgba(0,0,0,0.5)', shadow: '#000000',
};
export const C = { ...LIGHT };                    // palette active (mutée par applyTheme)

// Cible tactile (jeton) — HIG 44 px / WCAG 2.2 AA 2.5.8 ≥ 24 px. Pilote tous les hitSlop (aucun littéral).
export const TOUCH = { min: 44 };

export function applyTheme(mode) {
  const dark = mode === 'dark';
  Object.assign(C, dark ? DARK : LIGHT);
  Object.assign(AXT, dark ? AXT_D : AXT_L);       // texte d'axe conforme AA selon le thème
  Object.assign(RELT, dark ? RELT_D : RELT_L);
  MAP_RAMP.length = 0; MAP_RAMP.push(...(dark ? MAP_RAMP_D : MAP_RAMP_L));   // rampe carte selon le thème
  return mode;
}

// Couleurs des 6 axes PESTEL (identiques au portail : --ax-*) + 2 rubriques hors PESTEL.
// Rampe VIVE (P3 « langage vivant ») — teintes d'axe plus saturées, servant le GRAPHIQUE (fill teinté,
// pastille, point). Le trait des icônes/textes utilise AXT (variante AA ≥ 4,5:1, vérifiée par calcul).
export const AX = {
  P:   '#ef3f45',  // Politique / Gouvernance / Sécurité — rouge vif
  E:   '#eab308',  // Économie — ambre vif
  S:   '#ec4899',  // Social — rose vif
  T:   '#1e93ef',  // Technologique & Numérique — bleu vif
  Env: '#10b981',  // Environnement — émeraude
  L:   '#8b5cf6',  // Légal & Réglementaire — violet vif
  C:   '#db2777',  // Culture & Arts — magenta (rubrique)
  Sp:  '#f97316',  // Sports — orange (rubrique)
  Ev:  '#06bcb2',  // Events (forums, salons, sommets) — turquoise (rubrique)
};
// P3 « langage vivant » — les emoji d'axe sont remplacés par le JEU UNIQUE de glyphes vectoriels
// (src/icons.js, duotone : trait AXT conforme AA + aplat AX teinté). Plus d'emoji dans l'UI.
export const AX_SHORT = { P: 'Politique', E: 'Économie', S: 'Social', T: 'Numérique', Env: 'Environnement', L: 'Légal', C: 'Culture & Arts', Sp: 'Sports', Ev: 'Events' };
export const AX_ORDER = ['P', 'E', 'S', 'T', 'Env', 'L'];
// Rubriques hors grille PESTEL (beats d'actualité) — traitées comme des axes dans les données.
// Events est placé à côté de Sports (événements ouverts : forums, salons, sommets — distinct de l'agenda « À suivre »).
export const RUBRIQUES = ['C', 'Sp', 'Ev'];

// Marque « Ntongo » — slogan affiché (baseline produit).
export const SLOGAN = 'La RDC qui vous concerne, chaque jour.';

// Bandeau « hero » de la Une sectorielle (« Votre Une · [secteur] ») — dégradé de MARQUE FIXE (identique en
// clair/sombre, cohérent avec le splash). Cobalt = signal d'action → une Une filtrée par secteur porte la
// couleur d'action de l'app. Blanc sur l'extrémité la plus claire #1E40C6 = ~8:1 (AA, texte petit compris).
export const HERO_GRAD = ['#12205E', '#1E40C6'];

// RS1-02 : palette de la surface de MARQUE FIXE de l'écran d'accueil (Welcome) — indépendante du thème
// (toujours nuit → cobalt). Regroupée ici pour que Welcome ne porte aucune couleur en dur.
export const SPLASH = {
  grad: ['#070C1C', '#0F1E52', '#1D3FC4'],   // dégradé nuit→cobalt
  gold: '#F4B740',                            // accent or (· RDC, barre de progression)
  textHi: '#FFFFFF', textMid: '#CFDDF0', textLow: '#9FB4DA',   // wordmark / slogan / accroche
  hint: 'rgba(255,255,255,0.5)', foot: '#6E82AA',
  track: 'rgba(255,255,255,0.15)',            // rail (fond) de la barre de progression du splash
};

// Lot A — jetons de TEXTE d'axe (AA ≥ 4,5:1) : les couleurs AX vives (ci-dessus) servent le GRAPHIQUE
// (pastille, bordure, tint) ; peindre du texte < 24 px avec AX brut échoue l'AA. `AXT` porte donc la
// variante texte, conforme sur les fonds réels (tint clair assombri / vif sur fond sombre).
// Dérivés DÉTERMINISTIQUEMENT de la rampe vive (script scratchpad/ramp.py) : chaque valeur ≥ 4,59:1 sur
// crème (#f4f1ea) en clair et ≥ 4,65:1 sur #0a0e15 en sombre. Ne pas ajuster « à l'œil » — recalculer.
// RS1-07 : re-dérivés DÉTERMINISTIQUEMENT pour être AA (≥4,5:1) sur le fond le PLUS STRICT où le texte d'axe
// est rendu = tint(AX,0.14) sur panel (badge de compte). Comme le tint est le fond le plus sombre/saturé,
// être AA dessus garantit l'AA sur bg et panel aussi. Vérifié par __tests__/contrast.test.js (clair + sombre).
export const AXT_L = { P:'#d10c13', E:'#866501', S:'#cb106c', T:'#096dbb', Env:'#087a54', L:'#773ef7', C:'#c31c67', Sp:'#b34900', Ev:'#017972' };
export const AXT_D = { P:'#f45257', E:'#f0b602', S:'#f14f9f', T:'#1a94f4', Env:'#0cbd82', L:'#9d74fb', C:'#e65395', Sp:'#ff7210', Ev:'#01c1b6' };
export const AXT = { ...AXT_L };   // mutable (applyTheme)
// Jetons de TEXTE de fiabilité (lettre A/B/C/D du SrcDot, sur fond teinté).
export const RELT_L = { A:'#166e45', B:'#20639b', C:'#835a0c', D:'#a73237' };
export const RELT_D = { A:'#3eab79', B:'#4a9ee4', C:'#cb8e19', D:'#e06e72' };
export const RELT = { ...RELT_L };

// RS1-13 — Carte : rampe séquentielle DISCRÈTE (4 paliers, fills OPAQUES pour un contraste déterministe),
// dérivée du cobalt sur mapNeutral. L'activité n'est PAS portée par la seule couleur (WCAG 1.4.1) : chaque
// province porte AUSSI une catégorie TEXTE (MAP_CATS) + une mini-barre segmentée → la rampe est un encodage
// REDONDANT (arbitrage Lead Tech : l'exigence normative est 1.4.1, tenue par le texte ; la rampe reste
// perceptible, le palier haut nettement distinct du neutre). Swappée par thème comme AXT/RELT.
export const MAP_RAMP_L = ['#e9e2d4', '#b1b7d8', '#8393db', '#506cde'];   // calme · faible · modérée · forte
export const MAP_RAMP_D = ['#28313f', '#384979', '#455ea9', '#5373dc'];
export const MAP_RAMP = [...MAP_RAMP_L];
export const MAP_CATS = ['calme', 'faible', 'modérée', 'forte'];
// Palier d'activité (0..3) d'une province : 0 si aucune actu, sinon tiers de n/maxN.
export const mapLevel = (n, maxN) => (!n ? 0 : Math.min(3, Math.ceil((n / Math.max(1, maxN)) * 3)));

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

// ── ÉCHELLE D'ESPACEMENT (RS1-01, DS agnostique) — base 4 avec demi-pas dans le registre fin (2px) pour
// tokeniser SANS déplacer le pixel (arbitrage Lead Tech : migration à rendu identique d'abord ; un resserrement
// vers une grille 4pt stricte reste possible ensuite, la garde vérifie l'usage de JETONS, pas les valeurs).
// `gutter` (18) = gouttière d'écran, source unique du full-bleed du PageHeader.
export const SP = {
  none: 0, hair: 2, xs: 4, xs2: 6, sm: 8, sm2: 10, md: 12, md2: 14, lg: 16, gutter: 18,
  xl: 20, xl2: 22, xxl: 24, xxxl: 32, huge: 40, giant: 48,
};

// ── RAYONS — familles cohérentes (barre d'accent → xs ; tag → sm ; bloc → md ; carte → lg ; chip/feuille →
// chip ; dock → dock ; cercle → half(size) ; pilule pleine → pill).
export const RADIUS = { xs: 4, sm: 6, md: 10, lg: 16, chip: 22, dock: 24, pill: 999, half: (s) => s / 2 };

// ── MOTION — durées (ms) + courbes. Réutilisées par ScreenFade / Welcome / micro-interactions.
export const DUR = { instant: 0, fast: 120, base: 230, slow: 320, splashIn: 480, splashLogo: 520 };
export const EASE = { standard: Easing.out(Easing.cubic), inOut: Easing.inOut(Easing.ease) };

// ── CIBLES TACTILES (hitSlop) — dérivées de TOUCH.min. Plus aucun hitSlop littéral.
export const HIT = { sm: 8, md: 10, lg: 14 };

// ── ÉLÉVATION — ombres tokenisées (référencent C.shadow, plus de hex en dur dans ui.js). Statique : la
// couleur d'ombre ne change pas assez entre thèmes pour justifier un recalcul (ombre quasi invisible en sombre).
export const ELEV = {
  sm: Platform.select({ ios: { shadowColor: C.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, android: { elevation: 2 } }),
  md: Platform.select({ ios: { shadowColor: C.shadow, shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }, android: { elevation: 6 } }),
};

// ── ÉCHELLE TYPOGRAPHIQUE (RS1-04) — RÔLES sémantiques {famille, taille, interligne, approche} SANS couleur
// (la couleur reste un jeton C.* séparé, pour garantir l'AA par paire rôle×couleur). Un texte = un rôle + une
// couleur : `style={[TYPE.body, { color: C.inkDim }]}`. ≤11 rôles couvrent 100 % des textes ; demi-points repliés.
export const TYPE = {
  display:   { fontFamily: F.displayBold, fontSize: 25,   lineHeight: 30, letterSpacing: 0.2 },   // titre de bandeau (PageHeader)
  title:     { fontFamily: F.display,     fontSize: 21,   lineHeight: 26, letterSpacing: 0.2 },   // titre de section
  serifLead: { fontFamily: F.display,     fontSize: 18,   lineHeight: 26, letterSpacing: 0 },     // titre d'article (Detail)
  heading:   { fontFamily: F.bodyBold,    fontSize: 16,   lineHeight: 22, letterSpacing: 0 },     // titre de carte « à la une » (rank)
  cardTitle: { fontFamily: F.bodySemi,    fontSize: 14.5, lineHeight: 20, letterSpacing: 0 },     // titre de carte (sans rank), items de liste
  body:      { fontFamily: F.body,        fontSize: 15,   lineHeight: 23, letterSpacing: 0 },     // corps long (Detail)
  bodySm:    { fontFamily: F.body,        fontSize: 13.5, lineHeight: 19.5, letterSpacing: 0 },   // corps de carte / listes
  label:     { fontFamily: F.bodySemi,    fontSize: 12.5, lineHeight: 16, letterSpacing: 0 },     // libellés, pills, chips
  caption:   { fontFamily: F.mono,        fontSize: 11,   lineHeight: 15, letterSpacing: 0 },     // méta, source, dates
  overline:  { fontFamily: F.mono,        fontSize: 10.5, lineHeight: 14, letterSpacing: 1.0 },   // eyebrows / kickers (majuscules)
  mono:      { fontFamily: F.monoSemi,    fontSize: 11,   lineHeight: 15, letterSpacing: 0 },     // valeurs mono accentuées
  data:      { fontFamily: F.displayBold, fontSize: 21,   lineHeight: 24, letterSpacing: 0 },     // chiffres KPI
  nav:       { fontFamily: F.body,        fontSize: 11,   lineHeight: 13, letterSpacing: 0.2 },   // libellé d'onglet (dock) — famille surchargée selon l'état actif
};

// Typographie de la surface de MARQUE de l'écran d'accueil (Welcome) — échelle propre, plus grande que le
// contenu (c'est un splash, pas du corps de texte). Regroupée avec SPLASH pour que Welcome n'ait aucun littéral.
export const SPLASH_TYPE = {
  wordmark: { fontFamily: F.displayBold, fontSize: 30, letterSpacing: 0.3 },
  slogan:   { fontFamily: F.body,        fontSize: 26, lineHeight: 34 },
  accroche: { fontFamily: F.mono,        fontSize: 22, lineHeight: 30 },
  hint:     { fontFamily: F.mono,        fontSize: 11, letterSpacing: 0.6 },
  foot:     { fontFamily: F.mono,        fontSize: 12, letterSpacing: 0.4 },
};

// Lookup de jeton PROTOTYPE-SAFE (RS3) : `MAP[clé]` via bracket résout AUSSI les propriétés HÉRITÉES
// (`constructor`, `__proto__`, `toString`, `hasOwnProperty`…) — toutes truthy — donc `MAP[clé] || fallback`
// NE se replie PAS et une valeur non-couleur (fonction/objet) file vers tint()/le rendu = crash (TypeError).
// `pick` n'accepte QUE les clés PROPRES (même garde que getEdition), sinon le fallback. À utiliser pour tout
// lookup de jeton (AX/AXT/REL/RELT/AX_SHORT) par clé issue de la donnée distante NON FIABLE.
export const pick = (map, key, fallback) =>
  (typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)) ? map[key] : fallback;

// Teinte douce d'une couleur d'axe pour les fonds (≈ color-mix 14% sur panel).
// Défense en profondeur (RS3) : un hex non-string (lookup empoisonné qui aurait échappé à pick) retombe
// sur cobalt au lieu de lever `hex.replace is not a function` — jamais de crash de rendu sur une couleur.
export const tint = (hex, a = 0.14) => {
  const h = (typeof hex === 'string' && hex.charAt(0) === '#') ? hex : C.cobalt;
  const n = h.replace('#', '');
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
