import React from 'react';
import { Text, View, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Glyph, AxisGlyph, SectorGlyph } from './icons';
import { C, F, AX, AXT, REL, RELT, TOUCH, tint, pick, relFr, relIsOk, HERO_GRAD } from './theme';
export { Glyph, AxisGlyph, SectorGlyph } from './icons';

// En-tête de PAGE unifié — bandeau cobalt (dégradé de marque) présent sur TOUS les écrans (cohérence).
// Porte le CONTEXTE de l'écran (kicker + titre + sous-titre), jamais la fraîcheur (déjà dans l'en-tête Ntongo)
// ni un compteur technique. Blanc ≥ 4,96:1 sur l'extrémité la plus claire (AA vérifié). Full-bleed via marges.
export const PageHeader = ({ eyebrow, title, subtitle, glyph, children }) => (
  <View style={{ marginHorizontal: -18, marginTop: -18, marginBottom: 16 }}>
    <LinearGradient colors={HERO_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 18 }}>
      {(eyebrow || glyph) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          {glyph || null}
          {eyebrow ? <Text style={{ fontFamily: F.mono, fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 }}>{eyebrow}</Text> : null}
        </View>
      ) : null}
      <Text style={{ fontFamily: F.displayBold, fontSize: 25, color: '#ffffff', letterSpacing: 0.2 }}>{title}</Text>
      {subtitle ? <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{subtitle}</Text> : null}
      {children}
    </LinearGradient>
  </View>
);

export const shadowSm = Platform.select({
  ios: { shadowColor: '#1a2740', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  android: { elevation: 2 },
});
export const shadow = Platform.select({
  ios: { shadowColor: '#1a2740', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  android: { elevation: 6 },
});

// Icône générique — puise dans le JEU UNIQUE (src/icons.js, SVG vectoriel). Plus d'Ionicons ni d'emoji.
export const Icon = ({ name, size = 22, color = C.ink, style }) => (
  <Glyph name={name} size={size} color={color} style={style} />
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
  const r = pick(REL, rel, REL.C);       // RS3 : prototype-safe — `REL['constructor']` renverrait une fonction
  const rt = pick(RELT, rel, C.ink);     // (truthy) et `|| REL.C` ne se replierait pas → tint(fonction) planterait
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: tint(r.c, 0.16), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.monoSemi, fontSize: 11, color: rt }}>{rel}</Text>
    </View>
  );
};

// Tag d'axe : glyphe duotone + libellé court (texte en jeton AA AXT).
export const AxisTag = ({ axis, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <AxisGlyph axis={axis} size={15} />
    <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: pick(AXT, axis, C.ink) }}>{label}</Text>
  </View>
);

// En-tête de section : glyphe optionnel + titre serif + « loupe » (sous-titre interprétatif).
export const SectionHead = ({ title, lens, icon }) => (
  <View style={{ marginBottom: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon ? <Glyph name={icon} size={18} color={C.inkDim} /> : null}
      <Text style={{ fontFamily: F.display, fontSize: 21, color: C.ink, letterSpacing: 0.2 }}>{title}</Text>
    </View>
    {lens ? <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut, marginTop: 3 }}>{lens}</Text> : null}
  </View>
);

// Pastille ronde d'axe (« avatar » de carte) — glyphe duotone dans un cercle teinté de la couleur d'axe.
export const AxisAvatar = ({ axis, size = 38 }) => {
  const c = pick(AX, axis, C.cobalt);   // RS3 : prototype-safe (cf. pick/theme.js)
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint(c, 0.16), borderWidth: 1, borderColor: tint(c, 0.38), alignItems: 'center', justifyContent: 'center' }}>
      <AxisGlyph axis={axis} size={Math.round(size * 0.56)} />
    </View>
  );
};

// Ligne de SOURCE — app d'agrégation : on cite systématiquement d'où vient l'info (« {nom} · {hôte} »),
// en bas à gauche. Icône lien + texte neutre (jeton AA inkMut). Remplace les codes internes sur les cartes.
export const SourceLine = ({ source, style }) => {
  // RS3 : name/host viennent de la donnée distante NON FIABLE (feed) — coercition STRICTE en string. Un
  // nombre/objet ferait planter `.replace` (crash plein écran de la Une), et on n'affiche jamais « [object Object] ».
  const name = source && typeof source.name === 'string' ? source.name : '';
  const host = source && typeof source.host === 'string' ? source.host : '';
  if (!name && !host) return null;
  // Dédup nom/hôte : replier les DIACRITIQUES (NFD) AVANT de retirer les non-alphanum — sinon « Actualité »
  // → « actualitcd » ≠ hôte « actualitecd » et la redondance « Actualité.cd · actualite.cd » réapparaît.
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const nn = norm(name), hh = norm(host);
  const label = (name && host && nn && !hh.startsWith(nn) && !nn.startsWith(hh)) ? `${name} · ${host}` : (host || name);
  if (!label) return null;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, style]}>
      <Glyph name="link" size={12} color={C.inkMut} />
      <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }} numberOfLines={1}>{label}</Text>
    </View>
  );
};

// Carte d'actualité « langage vivant » — accent arrondi (couleur d'axe) + pastille d'axe + titre + SOURCE.
// `rank` (« 01 ») = priorité éditoriale des titres à la une. Plus de code interne (P-1…) : la carte cite la
// SOURCE (site) en bas à gauche. PAS de fraîcheur par carte (P2 : fraîcheur = niveau édition, en-tête global).
export const NewsCard = ({ axis, rank, title, text, reliability, cta, source, onStar, starred, onPress, titleLines = 3 }) => {
  const c = pick(AX, axis, C.cobalt);    // RS3 : prototype-safe (axis vient de donnée distante NON FIABLE)
  const ct = pick(AXT, axis, C.cobalt);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={title}
      style={[{ backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 }, shadowSm]}>
      <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 5, borderRadius: 3, backgroundColor: c }} />
      <View style={{ padding: 15, paddingLeft: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 }}>
          <AxisAvatar axis={axis} size={rank ? 40 : 34} />
          {rank ? <Text style={{ fontFamily: F.displayBold, fontSize: 20, color: ct }}>{rank}</Text> : null}
          <View style={{ flex: 1 }} />
          {reliability ? <RelBadge reliability={reliability} /> : null}
          {onStar ? (
            <TouchableOpacity onPress={onStar} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: !!starred }}
              accessibilityLabel={starred ? 'Retirer des favoris' : 'Ajouter aux favoris'} style={{ minHeight: 32, justifyContent: 'center', paddingLeft: 8 }}>
              <Glyph name={starred ? 'star-on' : 'star'} size={18} color={starred ? C.gold : C.inkMut} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={{ fontFamily: rank ? F.bodyBold : F.bodySemi, fontSize: rank ? 16 : 14.5, color: C.ink, lineHeight: rank ? 22 : 20, marginBottom: text ? 6 : 0 }} numberOfLines={titleLines}>{title}</Text>
        {text ? <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkDim, lineHeight: 19.5 }} numberOfLines={rank ? 4 : 2}>{text}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
          {source ? <SourceLine source={source} style={{ flex: 1 }} /> : <View style={{ flex: 1 }} />}
          {cta ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: ct }}>{cta}</Text>
              <Glyph name="chevron" size={14} color={ct} />
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Chip de filtre générique (état actif/inactif). Cible tactile pilotée par le jeton TOUCH.min (A11Y-03) :
// minHeight 44 + centrage, au lieu de ~29 px, pour un pouce en mouvement (jeton TOUCH.min).
export const Pill = ({ label, active, onPress, axis, sectorKey, icon }) => {
  // Évolution « chip » : repos = pastille pleine claire (pas un simple contour gris) ; actif = SURFACE D'ACTION
  // (jeton actionFill, blanc AA 6,17:1 clair ET sombre) + légère élévation + libellé semibold.
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      accessibilityRole="button" accessibilityState={{ selected: !!active }} accessibilityLabel={label}
      style={[{ minHeight: TOUCH.min, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', backgroundColor: active ? C.actionFill : C.panel, borderColor: active ? C.actionFill : C.border, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14 }, active ? shadowSm : null]}>
      {axis ? <AxisGlyph axis={axis} size={16} active={active} /> : sectorKey ? <SectorGlyph sectorKey={sectorKey} size={16} active={active} /> : icon ? <Glyph name={icon} size={16} color={active ? C.onAction : C.inkDim} /> : null}
      <Text style={{ fontFamily: active ? F.bodySemi : F.bodyMed, fontSize: 12.5, color: active ? C.onAction : C.inkDim }}>{label}</Text>
    </TouchableOpacity>
  );
};

// Trait fin de séparation.
export const Rule = ({ style }) => <View style={[{ height: 1, backgroundColor: C.border2 }, style]} />;
