import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Glyph, AxisGlyph, SectorGlyph } from './icons';
import { C, F, AX, AXT, REL, RELT, TOUCH, tint, pick, relFr, relIsOk, HERO_GRAD, SP, TYPE, RADIUS, HIT, ELEV } from './theme';

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

// ─────────────────────────────────────────────────────────────────────────────
// LOT-F — CARTE N1 : une information CAPTÉE ET TRIÉE, pas une information TRAVAILLÉE
// ─────────────────────────────────────────────────────────────────────────────
// Elle doit être reconnaissable EN UN COUP D'ŒIL, sans lire un mot, comme n'étant pas un fait rédigé.
// Quatre différences DÉLIBÉRÉES avec NewsCard (le fait rédigé) :
//   1. bordure TIRETÉE (borderStyle) — le vocabulaire universel du « pas fini » ;
//   2. surface EN RETRAIT (C.panel2, le plan de travail) au lieu de la surface d'édition (C.panel) ;
//   3. AUCUNE barre d'accent d'axe ni pastille ronde colorée — la couleur d'axe ne PORTE plus la carte,
//      elle qualifie seulement une ligne de texte ; rien n'affirme visuellement un axe ;
//   4. AUCUN corps de texte : le composant n'accepte PAS de résumé (cf. n1.normaliserN1, liste blanche).
//
// CONTRASTE — mesuré, pas jugé à l'œil (__tests__/contrast.test.js) : sur C.panel2, un texte d'axe AXT
// posé sur un fond TEINTÉ tint(AX,0.14) tombe à 4,16–4,49:1 en thème clair — SOUS l'AA. C'est pourquoi
// la mention d'axe est ici du texte NU sur panel2 (4,73–5,11:1) et jamais une pastille teintée. La
// pastille « captée » utilise, elle, C.bg (paire inkMut/bg déjà garantie AA dans les deux thèmes).
export const N1Card = ({ vue, onPress }) => {
  const v = vue || {};
  // Statut « faible »/« orphelin » = signal (or, jeton TEXTE AA) ; « classé » = couleur d'axe (AA sur panel2).
  const ct = (v.statut === 'classe' && v.axe) ? pick(AXT, v.axe, C.inkDim) : C.goldText;
  const a11y = [v.titre, v.mention, v.source ? `source ${v.source}` : null, 'ouvrir la source']
    .filter(Boolean).join('. ');
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      accessibilityRole="link" accessibilityLabel={a11y}
      style={{
        minHeight: TOUCH.min, backgroundColor: C.panel2, borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
        padding: SP.md2, marginBottom: SP.sm,
      }}>
      {/* TCK-125 — La VRAIE cause de « CAPTÉE · NON RÉD… » n'était NI l'espace NI le flexShrink : c'était
          la POLICE. `overline` est monospace (chasse fixe 0,6 em) AVEC letterSpacing 1,0 — chaque lettre
          porte un espace ajouté. « CAPTÉE · NON RÉDIGÉE » = 20 caractères ainsi rendus est structurellement
          PLUS LARGE que la carte, quel que soit le flexShrink. La preuve était sous nos yeux : « Approfondir »
          (11 car., police `label` normale, sans espacement) tient sur la carte de la Une. Or cette étiquette
          est un LIBELLÉ, pas une donnée chiffrée : rien ne justifiait le monospace espacé. Passée en `label`,
          elle tient. On garde flexShrink 0 en ceinture-bretelles, mais ce n'est plus lui qui fait le travail. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginBottom: SP.xs2 }}>
        <View style={{ backgroundColor: C.bg, borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.hair, flexShrink: 0 }}>
          <Text style={[TYPE.label, { color: C.inkMut, fontSize: 10.5 }]} numberOfLines={1}>CAPTÉE · NON RÉDIGÉE</Text>
        </View>
        <View style={{ flex: 1 }} />
        {v.date ? <Text style={[TYPE.caption, { color: C.inkMut }]} numberOfLines={1}>{v.date}</Text> : null}
        {v.note ? <SrcDot rel={v.note} /> : null}
      </View>
      <Text style={[TYPE.cardTitle, { color: C.ink }]} numberOfLines={2}>{v.titre}</Text>
      {/* La MENTION remplace l'axe affirmé : « Économie · confiance 0,42 », « classé Économie ·
          confiance faible (0,09) · autre piste : Social », « non classé · meilleur candidat : … ». */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, marginTop: SP.xs }}>
        {v.statut === 'classe' && v.axe ? <AxisGlyph axis={v.axe} size={12} /> : null}
        <Text style={[TYPE.caption, { color: ct, flex: 1 }]} numberOfLines={2}>{v.mention}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm, marginTop: SP.sm }}>
        <SourceLine source={{ name: v.source, host: v.host }} style={{ flex: 1, minWidth: 0 }} />
        {/* flexShrink 0 : un nom de source long comprimait ce mot jusqu'à « ouvri ». C'est l'ACTION
            de la carte — la source peut être coupée, l'action jamais. */}
        <Text style={[TYPE.label, { color: C.cobalt, flexShrink: 0 }]} numberOfLines={1}>ouvrir</Text>
      </View>
    </TouchableOpacity>
  );
};

// BLOC VIDE ASSUMÉ (lot-F) — un axe sans rien à montrer AFFICHE son vide. Il n'emprunte pas à un autre
// axe et il ne s'efface pas de la liste : une rubrique qui disparaît quand elle est vide laisse croire
// qu'elle n'existe pas, et c'est une omission muette de plus.
export const BlocVide = ({ texte }) => (
  <View style={{
    borderWidth: 1, borderColor: C.border2, borderStyle: 'dashed', borderRadius: RADIUS.md,
    paddingVertical: SP.md2, paddingHorizontal: SP.md2, marginBottom: SP.sm, alignItems: 'center',
  }}>
    <Text style={[TYPE.caption, { color: C.inkMut, textAlign: 'center' }]}>{texte}</Text>
  </View>
);

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
