import React from 'react';
import { SvgXml } from 'react-native-svg';
import { C, AX, AXT } from './theme';

// JEU D'ICÔNES UNIQUE (SVG vectoriel, 24-grid, trait ~1.7). Trois familles cohérentes :
//  • SÉMANTIQUES (axes/rubriques/secteurs) = DUOTONE : silhouette teintée `__F__` (fill-opacity) + trait AA.
//  • NAV = monoline, variante « -on » PLEINE (cobalt = signal d'action).
//  • UI = monoline neutre.
// Paramétrées par couleur (tokenisé) : `currentColor` = trait, `__F__` = teinte de remplissage.
const S = 'stroke="currentColor"';
const ICONS = {
  // ── Axes PESTEL (duotone) ──
  P: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.2 L3 8.3 L21 8.3 Z" fill="__F__" fill-opacity="0.2"/><path d="M12 3.2 L3 8.3 L21 8.3" ${S} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M5.2 8.9 V17.2 M9.4 8.9 V17.2 M14.6 8.9 V17.2 M18.8 8.9 V17.2" ${S} stroke-width="1.8" stroke-linecap="round"/><path d="M3.4 17.6 H20.6 M4.7 20.4 H19.3" ${S} stroke-width="1.8" stroke-linecap="round"/></svg>`,
  E: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.6" y="13" width="4" height="6.8" rx="1" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6"/><rect x="10" y="9" width="4" height="10.8" rx="1" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6"/><rect x="16.4" y="4.8" width="4" height="15" rx="1" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6"/></svg>`,
  S: `<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.3" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.7"/><path d="M3.6 19.2 C3.6 15.4 6 13.9 9 13.9 C12 13.9 14.4 15.4 14.4 19.2" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.7" stroke-linecap="round"/><circle cx="16.7" cy="9.2" r="2.5" ${S} stroke-width="1.5"/><path d="M15 14 C18.4 13.6 20.6 15.4 20.6 18.7" ${S} stroke-width="1.5" stroke-linecap="round"/></svg>`,
  T: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4.4" width="18" height="12.2" rx="2" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.7"/><path d="M9 20.2 H15 M12 16.6 V20.2" ${S} stroke-width="1.7" stroke-linecap="round"/><path d="M6.8 12.6 L10 9.4 L12.4 11.8 L17.2 7" ${S} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  Env: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 19 C5 10 11 4.6 20 4.6 C20 13.6 14.6 19 5 19 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.7" stroke-linejoin="round"/><path d="M5 19 C8.4 15 12 11 18.2 8" ${S} stroke-width="1.5" stroke-linecap="round"/></svg>`,
  L: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.6 V20 M8 20 H16" ${S} stroke-width="1.7" stroke-linecap="round"/><path d="M4.8 7 H19.2" ${S} stroke-width="1.7" stroke-linecap="round"/><path d="M4.8 7 L2.6 12 L7 12 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.4" stroke-linejoin="round"/><path d="M19.2 7 L17 12 L21.4 12 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="7" r="1.2" fill="currentColor"/></svg>`,
  // ── Rubriques (duotone) ──
  C: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 4 C6.6 4 3 7.4 3 11.8 C3 15.2 5.8 17.6 8.8 17.2 C10.2 17 10 15.6 11 15 C12.4 14.2 13.8 15.4 15.4 15 C18.4 14.2 21 12 21 9.6 C21 6.2 17 4 12 4 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="9.2" r="1.1" fill="currentColor"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor"/><circle cx="16" cy="9.4" r="1.1" fill="currentColor"/></svg>`,
  Sp: `<svg viewBox="0 0 24 24" fill="none"><path d="M7 4 H17 V8 C17 11.3 14.8 13.4 12 13.4 C9.2 13.4 7 11.3 7 8 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.7" stroke-linejoin="round"/><path d="M7 5.6 H4.6 V7 C4.6 8.5 5.9 9.7 7.3 9.7 M17 5.6 H19.4 V7 C19.4 8.5 18.1 9.7 16.7 9.7" ${S} stroke-width="1.4" stroke-linecap="round"/><path d="M12 13.4 V16.6 M9.4 20 H14.6 M10.4 20 V17.4 H13.6 V20" ${S} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  Ev: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 7.5 H20 V10 A2 2 0 0 0 20 14 V16.5 H4 V14 A2 2 0 0 0 4 10 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.7" stroke-linejoin="round"/><path d="M12 8.4 V15.6" ${S} stroke-width="1.5" stroke-dasharray="1.4 2" stroke-linecap="round"/></svg>`,
  // ── Secteurs transversaux (duotone) ──
  mines: `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 4 H17.5 L21.5 9 L12 21 L2.5 9 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6" stroke-linejoin="round"/><path d="M2.5 9 H21.5 M9 4 L7 9 L12 21 M15 4 L17 9 L12 21" ${S} stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  banques: `<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6.8" rx="7" ry="3" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6"/><path d="M5 6.8 V12.4 C5 14.1 8.1 15.4 12 15.4 C15.9 15.4 19 14.1 19 12.4 V6.8" ${S} stroke-width="1.6"/><path d="M5 12.4 V17 C5 18.7 8.1 20 12 20 C15.9 20 19 18.7 19 17 V12.4" ${S} stroke-width="1.6"/></svg>`,
  telecoms: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 11 L9.6 20.5 H14.4 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="8.8" r="2" fill="__F__" fill-opacity="0.3" ${S} stroke-width="1.5"/><path d="M7.2 4.2 A7 7 0 0 0 7.2 13.4 M16.8 4.2 A7 7 0 0 1 16.8 13.4" ${S} stroke-width="1.4" stroke-linecap="round"/></svg>`,
  logistique: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 13.5 H21 L19 18 H5 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6" stroke-linejoin="round"/><rect x="7" y="7.5" width="4.4" height="6" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.3"/><rect x="12.4" y="5.5" width="4.4" height="8" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.3"/><path d="M2 20.6 C4 19.7 5 21.5 7 20.6 C9 19.7 10 21.5 12 20.6 C14 19.7 15 21.5 17 20.6 C19 19.7 20 21.5 22 20.6" ${S} stroke-width="1.4" stroke-linecap="round"/></svg>`,
  assurances: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 L19 6 V11 C19 16 15.5 19.4 12 21 C8.5 19.4 5 16 5 11 V6 Z" fill="__F__" fill-opacity="0.2" ${S} stroke-width="1.6" stroke-linejoin="round"/><path d="M8.8 12 L11.2 14.4 L15.4 9.6" ${S} stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // ── Navigation (monoline + variante -on pleine) ──
  home: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.4" y="5.5" width="14" height="13" rx="1.6" ${S} stroke-width="1.7"/><path d="M17.4 8.6 H20.6 V16.8 A1.7 1.7 0 0 1 17.4 17.6" ${S} stroke-width="1.6" stroke-linejoin="round"/><path d="M6.4 9.2 H14.4 M6.4 12 H14.4 M6.4 14.8 H11.4" ${S} stroke-width="1.5" stroke-linecap="round"/></svg>`,
  'home-on': `<svg viewBox="0 0 24 24" fill="none"><rect x="3.4" y="5.5" width="14" height="13" rx="1.6" fill="currentColor"/><path d="M17.4 8.6 H20.6 V16.8 A1.7 1.7 0 0 1 17.4 17.6" ${S} stroke-width="1.6" stroke-linejoin="round"/><path d="M6.4 9.2 H14.4 M6.4 12 H14.4 M6.4 14.8 H11.4" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.4 L14.5 9.2 L20.8 9.8 L16 14 L17.5 20.4 L12 17 L6.5 20.4 L8 14 L3.2 9.8 L9.5 9.2 Z" ${S} stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  'star-on': `<svg viewBox="0 0 24 24"><path d="M12 3.4 L14.5 9.2 L20.8 9.8 L16 14 L17.5 20.4 L12 17 L6.5 20.4 L8 14 L3.2 9.8 L9.5 9.2 Z" fill="currentColor" ${S} stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  compass: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" ${S} stroke-width="1.7"/><path d="M12 4.4 L13.7 12 L12 19.6 L10.3 12 Z" fill="currentColor"/><path d="M4.4 12 L12 10.3 L19.6 12 L12 13.7 Z" ${S} stroke-width="1.5" stroke-linejoin="round"/><path d="M12 2.6 V4.4 M12 19.6 V21.4 M2.6 12 H4.4 M19.6 12 H21.4" ${S} stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="1.15" fill="currentColor"/></svg>`,
  axes: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.6" ${S} stroke-width="1.7"/><path d="M15.6 8.4 L11.2 11.2 L8.4 15.6 L12.8 12.8 Z" ${S} stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  'axes-on': `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.6" ${S} stroke-width="1.7"/><path d="M15.6 8.4 L11.2 11.2 L8.4 15.6 L12.8 12.8 Z" fill="currentColor" ${S} stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 4 L3 6.4 V20 L9 17.6 L15 20 L21 17.6 V4 L15 6.4 Z" ${S} stroke-width="1.6" stroke-linejoin="round"/><path d="M9 4 V17.6 M15 6.4 V20" ${S} stroke-width="1.4"/></svg>`,
  'map-on': `<svg viewBox="0 0 24 24"><path d="M9 4 L3 6.4 V20 L9 17.6 L15 20 L21 17.6 V4 L15 6.4 Z" fill="currentColor" ${S} stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  stats: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 20 H20" ${S} stroke-width="1.7" stroke-linecap="round"/><rect x="5" y="11.5" width="3.4" height="6.5" rx="0.8" ${S} stroke-width="1.6"/><rect x="10.3" y="7.5" width="3.4" height="10.5" rx="0.8" ${S} stroke-width="1.6"/><rect x="15.6" y="4" width="3.4" height="14" rx="0.8" ${S} stroke-width="1.6"/></svg>`,
  'stats-on': `<svg viewBox="0 0 24 24" fill="none"><path d="M4 20 H20" ${S} stroke-width="1.7" stroke-linecap="round"/><rect x="5" y="11.5" width="3.4" height="6.5" rx="0.8" fill="currentColor"/><rect x="10.3" y="7.5" width="3.4" height="10.5" rx="0.8" fill="currentColor"/><rect x="15.6" y="4" width="3.4" height="14" rx="0.8" fill="currentColor"/></svg>`,
  sources: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 6.2 C10 4.6 6 4.6 4 5.6 V18.4 C6 17.4 10 17.4 12 19 C14 17.4 18 17.4 20 18.4 V5.6 C18 4.6 14 4.6 12 6.2 Z" ${S} stroke-width="1.6" stroke-linejoin="round"/><path d="M12 6.2 V19" ${S} stroke-width="1.5"/></svg>`,
  'sources-on': `<svg viewBox="0 0 24 24"><path d="M12 6.2 C10 4.6 6 4.6 4 5.6 V18.4 C6 17.4 10 17.4 12 19 C14 17.4 18 17.4 20 18.4 V5.6 C18 4.6 14 4.6 12 6.2 Z" fill="currentColor" ${S} stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  triage: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 L7 5 H17 L19 12.5 V18 H5 Z" ${S} stroke-width="1.6" stroke-linejoin="round"/><path d="M5 12.5 H8.6 L10 15 H14 L15.4 12.5 H19" ${S} stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  'triage-on': `<svg viewBox="0 0 24 24"><path d="M5 12.5 L7 5 H17 L19 12.5 V18 H5 Z" fill="currentColor" ${S} stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  // ── UI monoline ──
  search: `<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" ${S} stroke-width="1.8"/><path d="M15.5 15.5 L20.5 20.5" ${S} stroke-width="1.8" stroke-linecap="round"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" ${S} stroke-width="1.7"/><path d="M3.5 9.5 H20.5 M8 3.4 V6.6 M16 3.4 V6.6" ${S} stroke-width="1.7" stroke-linecap="round"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 5 L16 12 L9 19" ${S} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none"><path d="M15 5 L8 12 L15 19" ${S} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6 L18 18 M18 6 L6 18" ${S} stroke-width="1.9" stroke-linecap="round"/></svg>`,
  checkmark: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 L10 17.5 L19 6.5" ${S} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none"><path d="M13 4 H20 V11 M20 4 L11 13" ${S} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 14.5 V19 A1.5 1.5 0 0 1 16.5 20.5 H5 A1.5 1.5 0 0 1 3.5 19 V7.5 A1.5 1.5 0 0 1 5 6 H9.5" ${S} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5 A8.5 8.5 0 1 1 9.5 4 A6.6 6.6 0 0 0 20 14.5 Z" ${S} stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" ${S} stroke-width="1.7"/><path d="M12 2.6 V4.8 M12 19.2 V21.4 M4.8 12 H2.6 M21.4 12 H19.2 M5.7 5.7 L7.2 7.2 M16.8 16.8 L18.3 18.3 M18.3 5.7 L16.8 7.2 M7.2 16.8 L5.7 18.3" ${S} stroke-width="1.7" stroke-linecap="round"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.6 L21.5 20 H2.5 Z" fill="__F__" fill-opacity="0.16" ${S} stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.6 V14 M12 16.8 V17.1" ${S} stroke-width="1.8" stroke-linecap="round"/></svg>`,
  'map-pin': `<svg viewBox="0 0 24 24" fill="none"><path d="M12 21 C12 21 19 14.5 19 9.5 A7 7 0 0 0 5 9.5 C5 14.5 12 21 12 21 Z" fill="__F__" fill-opacity="0.16" ${S} stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.4" ${S} stroke-width="1.6"/></svg>`,
  dot: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 10 A5.5 5.5 0 0 1 17.5 10 C17.5 14.2 19 16 19 16 H5 C5 16 6.5 14.2 6.5 10 Z" ${S} stroke-width="1.7" stroke-linejoin="round"/><path d="M9.8 19 A2.2 2.2 0 0 0 14.2 19" ${S} stroke-width="1.7" stroke-linecap="round"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none"><circle cx="6" cy="12" r="2.5" ${S} stroke-width="1.7"/><circle cx="18" cy="6" r="2.5" ${S} stroke-width="1.7"/><circle cx="18" cy="18" r="2.5" ${S} stroke-width="1.7"/><path d="M8.2 10.9 L15.8 7.1 M8.2 13.1 L15.8 16.9" ${S} stroke-width="1.6"/></svg>`,
  'bell-on': `<svg viewBox="0 0 24 24"><path d="M6.5 10 A5.5 5.5 0 0 1 17.5 10 C17.5 14.2 19 16 19 16 H5 C5 16 6.5 14.2 6.5 10 Z" fill="currentColor" ${S} stroke-width="1.7" stroke-linejoin="round"/><path d="M9.8 19 A2.2 2.2 0 0 0 14.2 19" ${S} stroke-width="1.7" stroke-linecap="round"/></svg>`,
};

// Glyphe générique — `color` = trait (currentColor), `fill` = teinte de remplissage (`__F__`, défaut = color).
export const Glyph = React.memo(function Glyph({ name, size = 22, color = C.ink, fill, style }) {
  const raw = ICONS[name];
  if (!raw) return null;
  const xml = raw.indexOf('__F__') >= 0 ? raw.replace(/__F__/g, fill || color) : raw;
  return <SvgXml xml={xml} width={size} height={size} color={color} style={style} />;
});

// Icône d'AXE/RUBRIQUE (duotone AA) : trait = jeton texte AA (AXT), remplissage = teinte vive (AX).
// État actif (sur fond cobalt) : blanc plein.
export function AxisGlyph({ axis, size = 18, active = false }) {
  if (!ICONS[axis]) return null;
  const stroke = active ? '#ffffff' : (AXT[axis] || C.ink);
  const fill = active ? '#ffffff' : (AX[axis] || C.cobalt);
  return <Glyph name={axis} size={size} color={stroke} fill={fill} />;
}

// Icône de SECTEUR transversal : NEUTRE au repos (trait + aplat ink) pour se distinguer des axes colorés
// ET réserver le cobalt au SIGNAL D'ACTION (pastille active). État actif (sur fond cobalt) : blanc plein.
export function SectorGlyph({ sectorKey, size = 18, active = false }) {
  if (!ICONS[sectorKey]) return null;
  const tone = active ? '#ffffff' : C.inkDim;
  return <Glyph name={sectorKey} size={size} color={tone} fill={tone} />;
}

export { ICONS };
