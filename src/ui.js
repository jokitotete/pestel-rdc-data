import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, Platform, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Glyph, AxisGlyph, SectorGlyph } from './icons';
import { C, F, AX, AXT, REL, RELT, TOUCH, tint, pick, relFr, relIsOk, HERO_GRAD, SP, TYPE, RADIUS, HIT, ELEV, STATE } from './theme';

// RS1-16 — préférence système « réduire les animations » (WCAG 2.3.3). Hook partagé : les composants animés
// (ScreenFade, Welcome, press-scale) le lisent et suppriment translate/scale si activé.
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(!!v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { alive = false; if (sub && sub.remove) sub.remove(); };
  }, []);
  return reduce;
}
export { Glyph, AxisGlyph, SectorGlyph } from './icons';

// En-tête de PAGE unifié — bandeau cobalt (dégradé de marque) présent sur TOUS les écrans (cohérence).
// Porte le CONTEXTE de l'écran (kicker + titre + sous-titre), jamais la fraîcheur (déjà dans l'en-tête Ntongo)
// ni un compteur technique. Blanc ≥ 4,96:1 sur l'extrémité la plus claire (AA vérifié). Full-bleed via marges.
export const PageHeader = ({ eyebrow, title, subtitle, glyph, children }) => (
  <View style={{ marginHorizontal: -SP.gutter, marginTop: -SP.gutter, marginBottom: SP.lg }}>
    <LinearGradient colors={HERO_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingHorizontal: SP.gutter, paddingTop: SP.xl, paddingBottom: SP.gutter }}>
      {(eyebrow || glyph) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.xs2 }}>
          {glyph || null}
          {eyebrow ? <Text style={[TYPE.overline, { color: C.onHeroDim }]}>{eyebrow}</Text> : null}
        </View>
      ) : null}
      <Text style={[TYPE.display, { color: C.onHero }]}>{title}</Text>
      {subtitle ? <Text style={[TYPE.caption, { color: C.onHeroDim, marginTop: SP.xs }]}>{subtitle}</Text> : null}
      {children}
    </LinearGradient>
  </View>
);

export const shadowSm = ELEV.sm;
export const shadow = ELEV.md;

// Icône générique — puise dans le JEU UNIQUE (src/icons.js, SVG vectoriel). Plus d'Ionicons ni d'emoji.
export const Icon = ({ name, size = 22, color = C.ink, style }) => (
  <Glyph name={name} size={size} color={color} style={style} />
);

// Carte de base — rayon/bordure/ombre cohérents partout.
export const Card = ({ children, style, onPress, accent }) => {
  const base = [
    { backgroundColor: C.panel, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border },
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs }}>
      <View style={{ width: 6, height: 6, borderRadius: RADIUS.half(6), backgroundColor: c }} />
      <Text style={[TYPE.label, { color: ct }]}>{relFr(reliability)}</Text>
    </View>
  );
};

// Pastille lettre de fiabilité d'une source (A/B/C/D). Fond teinté (graphique) ; lettre = jeton AA.
export const SrcDot = ({ rel }) => {
  const r = pick(REL, rel, REL.C);       // RS3 : prototype-safe — `REL['constructor']` renverrait une fonction
  const rt = pick(RELT, rel, C.ink);     // (truthy) et `|| REL.C` ne se replierait pas → tint(fonction) planterait
  return (
    <View style={{ width: 20, height: 20, borderRadius: RADIUS.half(20), backgroundColor: tint(r.c, 0.16), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[TYPE.mono, { color: rt }]}>{rel}</Text>
    </View>
  );
};

// Tag d'axe : glyphe duotone + libellé court (texte en jeton AA AXT).
export const AxisTag = ({ axis, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2 }}>
    <AxisGlyph axis={axis} size={15} />
    <Text style={[TYPE.label, { color: pick(AXT, axis, C.ink) }]}>{label}</Text>
  </View>
);

// En-tête de section : glyphe optionnel + titre serif + « loupe » (sous-titre interprétatif).
export const SectionHead = ({ title, lens, icon }) => (
  <View style={{ marginBottom: SP.md2 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
      {icon ? <Glyph name={icon} size={18} color={C.inkDim} /> : null}
      <Text style={[TYPE.title, { color: C.ink }]}>{title}</Text>
    </View>
    {lens ? <Text style={[TYPE.caption, { color: C.inkMut, marginTop: SP.xs }]}>{lens}</Text> : null}
  </View>
);

// Pastille ronde d'axe (« avatar » de carte) — glyphe duotone dans un cercle teinté de la couleur d'axe.
export const AxisAvatar = ({ axis, size = 38 }) => {
  const c = pick(AX, axis, C.cobalt);   // RS3 : prototype-safe (cf. pick/theme.js)
  return (
    <View style={{ width: size, height: size, borderRadius: RADIUS.half(size), backgroundColor: tint(c, 0.16), borderWidth: 1, borderColor: tint(c, 0.38), alignItems: 'center', justifyContent: 'center' }}>
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
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2 }, style]}>
      <Glyph name="link" size={12} color={C.inkMut} />
      <Text style={[TYPE.caption, { color: C.inkMut }]} numberOfLines={1}>{label}</Text>
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
      style={[{ backgroundColor: C.panel, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, marginBottom: SP.md }, shadowSm]}>
      <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 5, borderRadius: RADIUS.xs, backgroundColor: c }} />
      <View style={{ padding: SP.lg, paddingLeft: SP.gutter }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm2, marginBottom: SP.sm2 }}>
          <AxisAvatar axis={axis} size={rank ? 40 : 34} />
          {rank ? <Text style={[TYPE.data, { color: ct }]}>{rank}</Text> : null}
          <View style={{ flex: 1 }} />
          {reliability ? <RelBadge reliability={reliability} /> : null}
          {onStar ? (
            <TouchableOpacity onPress={onStar} hitSlop={HIT.md} accessibilityRole="button" accessibilityState={{ selected: !!starred }}
              accessibilityLabel={starred ? 'Retirer des favoris' : 'Ajouter aux favoris'} style={{ minHeight: 32, justifyContent: 'center', paddingLeft: SP.sm }}>
              <Glyph name={starred ? 'star-on' : 'star'} size={18} color={starred ? C.gold : C.inkMut} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={[rank ? TYPE.heading : TYPE.cardTitle, { color: C.ink, marginBottom: text ? SP.xs2 : SP.none }]} numberOfLines={titleLines}>{title}</Text>
        {text ? <Text style={[TYPE.bodySm, { color: C.inkDim }]} numberOfLines={rank ? 4 : 2}>{text}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SP.sm2, gap: SP.sm }}>
          {source ? <SourceLine source={source} style={{ flex: 1 }} /> : <View style={{ flex: 1 }} />}
          {cta ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2 }}>
              <Text style={[TYPE.label, { color: ct }]}>{cta}</Text>
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
      style={[{ minHeight: TOUCH.min, flexDirection: 'row', alignItems: 'center', gap: SP.xs2, justifyContent: 'center', backgroundColor: active ? C.actionFill : C.panel, borderColor: active ? C.actionFill : C.border, borderWidth: 1, borderRadius: RADIUS.chip, paddingHorizontal: SP.md2 }, active ? shadowSm : null]}>
      {axis ? <AxisGlyph axis={axis} size={16} active={active} /> : sectorKey ? <SectorGlyph sectorKey={sectorKey} size={16} active={active} /> : icon ? <Glyph name={icon} size={16} color={active ? C.onAction : C.inkDim} /> : null}
      <Text style={[TYPE.label, { fontFamily: active ? F.bodySemi : F.bodyMed, color: active ? C.onAction : C.inkDim }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// Trait fin de séparation.
export const Rule = ({ style }) => <View style={[{ height: 1, backgroundColor: C.border2 }, style]} />;

// RS1-18 — En-tête de MODALE unifié (Detail / Recherche) : même chrome, contexte « où suis-je » (eyebrow +
// titre optionnels), fermeture ≥44 px. Une seule source pour la parité visuelle des deux modales plein écran.
export const ModalHeader = ({ eyebrow, title, onClose, closeLabel = 'Fermer' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.md2, paddingVertical: SP.sm2, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
    <View style={{ flex: 1 }}>
      {eyebrow ? <Text style={[TYPE.caption, { color: C.inkMut }]} numberOfLines={1}>{eyebrow}</Text> : null}
      {title ? <Text style={[TYPE.subtitle, { color: C.ink }]} numberOfLines={1}>{title}</Text> : null}
    </View>
    <TouchableOpacity onPress={onClose} hitSlop={HIT.lg} accessibilityRole="button" accessibilityLabel={closeLabel}
      style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, minHeight: 44, justifyContent: 'center', paddingLeft: SP.sm }}>
      <Text style={[TYPE.label, { color: C.cobalt }]}>{closeLabel}</Text>
      <Glyph name="close" size={18} color={C.cobalt} />
    </TouchableOpacity>
  </View>
);

// RS1-17 — LANGAGE D'ÉTAT unifié : un seul composant pour tous les états vides/erreur (Home/Search/Favoris/
// Map/Detail/Triage + ErrorBoundary), dans la langue duotone (glyphe cobalt dans un cercle teinté) + jetons.
export const StateView = ({ glyph = 'triage', title, body, action, tone = C.inkMut }) => (
  <View style={{ alignItems: 'center', paddingVertical: SP.xxxl, paddingHorizontal: SP.lg }}>
    <View style={{ width: 56, height: 56, borderRadius: RADIUS.half(56), backgroundColor: tint(C.cobalt, 0.1), alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
      <Glyph name={glyph} size={26} color={C.cobalt} />
    </View>
    {title ? <Text style={[TYPE.cardTitle, { color: C.ink, textAlign: 'center', marginBottom: SP.xs }]}>{title}</Text> : null}
    {body ? <Text style={[TYPE.bodySm, { color: tone, textAlign: 'center' }]}>{body}</Text> : null}
    {action ? (
      <TouchableOpacity onPress={action.onPress} hitSlop={HIT.md} accessibilityRole="button" accessibilityLabel={action.label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, minHeight: 44, paddingHorizontal: SP.lg, backgroundColor: C.actionFill, borderRadius: RADIUS.chip, marginTop: SP.lg }}>
        {action.icon ? <Glyph name={action.icon} size={16} color={C.onAction} /> : null}
        <Text style={[TYPE.label, { color: C.onAction }]}>{action.label}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

// RS1-17 — Squelettes de chargement : RETIRÉS (QA v1.1). Ils étaient construits mais rendus NULLE PART, et
// l'analyse montre qu'ils ne pouvaient pas l'être honnêtement : les données sont EMBARQUÉES dans le bundle
// (store.js importe statiquement ./data/pestel) → au premier rendu de Home elles sont déjà là, synchrones ;
// il n'existe aucun instant « écran sans données ». L'état `net === 'loading'` désigne le RAFRAÎCHISSEMENT
// réseau d'une édition plus récente, pendant lequel l'app affiche l'édition embarquée : y substituer un
// squelette remplacerait du contenu RÉEL par du placeholder (régression). La fenêtre de démarrage est déjà
// couverte par le Welcome (plancher 4 s). Les câbler aurait exigé d'INVENTER un état de chargement pour
// justifier du code déjà écrit. À rétablir si un jour les données deviennent asynchrones (fetch au boot).
