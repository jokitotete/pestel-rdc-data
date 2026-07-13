import React from 'react';
import { Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, AX, AXT, AX_ICON, REL, RELT, TOUCH, tint, relFr, relIsOk } from './theme';

export const shadowSm = Platform.select({
  ios: { shadowColor: '#1a2740', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  android: { elevation: 2 },
});
export const shadow = Platform.select({
  ios: { shadowColor: '#1a2740', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  android: { elevation: 6 },
});

// Icône de navigation (Ionicons, bundlé). Table unique nom → glyphe.
const NAV = {
  home: 'sparkles-outline', 'home-on': 'sparkles',
  axes: 'compass-outline', 'axes-on': 'compass',
  stats: 'stats-chart-outline', 'stats-on': 'stats-chart',
  map: 'map-outline', 'map-on': 'map',
  search: 'search-outline', 'search-on': 'search',
  sources: 'library-outline', 'sources-on': 'library',
  back: 'chevron-back', close: 'close', chevron: 'chevron-forward',
  calendar: 'calendar-outline', link: 'open-outline', dot: 'ellipse',
  'map-pin': 'location-outline', checkmark: 'checkmark',
  moon: 'moon-outline', sun: 'sunny-outline', warning: 'warning-outline',
};
export const Icon = ({ name, size = 22, color = C.ink, style }) => (
  <Ionicons name={NAV[name] || name} size={size} color={color} style={style} />
);

// Carte de base — rayon/bordure/ombre cohérents partout.
export const Card = ({ children, style, onPress, accent }) => {
  const base = [
    { backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    accent ? { borderLeftWidth: 3, borderLeftColor: accent } : null,
    shadowSm, style,
  ];
  const inner = <View style={base}>{children}</View>;
  return onPress ? <TouchableOpacity activeOpacity={0.85} onPress={onPress}>{inner}</TouchableOpacity> : inner;
};

// Pastille de code d'item "P-1", teintée par la couleur de son axe.
// c = couleur d'axe GRAPHIQUE (fond/bordure) ; ct = couleur de TEXTE conforme AA (jeton AXT).
export const CodeChip = ({ code, onPress }) => {
  const ax = (code || '').split('-')[0];
  const c = AX[ax] || C.cobalt;
  const ct = AXT[ax] || C.ink;
  const el = (
    <View style={{ alignSelf: 'flex-start', backgroundColor: tint(c, 0.14), borderColor: tint(c, 0.4), borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontFamily: F.monoSemi, fontSize: 11, color: ct, letterSpacing: 0.3 }}>{code}</Text>
    </View>
  );
  if (!onPress) return el;
  // Zone tactile étendue vers TOUCH.min sans changer le dessin (~19 px), MAIS plafonnée à 10 px de slop
  // pour que deux chips espacés de columnGap:20 (grille « Liés ») ne se CHEVAUCHENT pas (A11Y-04).
  const hs = Math.min(10, Math.max(0, Math.round((TOUCH.min - 19) / 2)));
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} hitSlop={{ top: hs, bottom: hs, left: hs, right: hs }}
      accessibilityRole="button" accessibilityLabel={`Ouvrir l'item ${code}`}>
      {el}
    </TouchableOpacity>
  );
};

// Badge de fiabilité de l'item (établi / à confirmer). Point = graphique ; texte = jeton AA.
export const RelBadge = ({ reliability }) => {
  const ok = relIsOk(reliability);
  const c = ok ? C.ok : C.gold;              // point (graphique, >= 3:1)
  const ct = ok ? C.okText : C.goldText;     // texte (>= 4,5:1)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
      <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: ct }}>{relFr(reliability)}</Text>
    </View>
  );
};

// Pastille lettre de fiabilité d'une source (A/B/C/D). Fond teinté (graphique) ; lettre = jeton AA.
export const SrcDot = ({ rel }) => {
  const r = REL[rel] || REL.C;
  const rt = RELT[rel] || C.ink;
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: tint(r.c, 0.16), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.monoSemi, fontSize: 11, color: rt }}>{rel}</Text>
    </View>
  );
};

// Tag d'axe : emoji + libellé court (texte en jeton AA AXT).
export const AxisTag = ({ axis, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Text style={{ fontSize: 13 }}>{AX_ICON[axis]}</Text>
    <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: AXT[axis] || C.ink }}>{label}</Text>
  </View>
);

// En-tête de section : titre serif + « loupe » (sous-titre interprétatif).
export const SectionHead = ({ title, lens }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ fontFamily: F.display, fontSize: 21, color: C.ink, letterSpacing: 0.2 }}>{title}</Text>
    {lens ? <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut, marginTop: 3 }}>{lens}</Text> : null}
  </View>
);

// Chip de filtre générique (état actif/inactif). Cible tactile pilotée par le jeton TOUCH.min (A11Y-03) :
// minHeight 44 + centrage, au lieu de ~29 px, pour un pouce en mouvement — cohérent avec CodeChip.
export const Pill = ({ label, active, onPress, color }) => {
  const c = color || C.cobalt;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}
      accessibilityRole="button" accessibilityState={{ selected: !!active }} accessibilityLabel={label}
      style={{ minHeight: TOUCH.min, justifyContent: 'center', backgroundColor: active ? c : C.panel, borderColor: active ? c : C.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: active ? '#fff' : C.inkDim }}>{label}</Text>
    </TouchableOpacity>
  );
};

// Trait fin de séparation.
export const Rule = ({ style }) => <View style={[{ height: 1, backgroundColor: C.border2 }, style]} />;
