import React, { useState, useMemo, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, SP, TYPE, RADIUS, HIT, MAP_RAMP, MAP_CATS, mapLevel } from '../theme';
import { Card, RelBadge, Icon, PageHeader, SourceLine } from '../ui';
import { projectPaths, mapAspect, activityByProvince } from '../geo';
import { primarySource } from '../store';

// Mini-barre segmentée (0..3) — encodage NON-coloriel du niveau d'activité, redondant avec la catégorie texte.
const LevelBar = ({ level }) => (
  <View style={{ flexDirection: 'row', gap: SP.hair }} accessible={false} importantForAccessibility="no-hide-descendants">
    {[1, 2, 3].map((i) => (
      <View key={i} style={{ width: 10, height: 4, borderRadius: RADIUS.xs, backgroundColor: i <= level ? MAP_RAMP[level] : C.border2 }} />
    ))}
  </View>
);

// « Carte des actualités » — 26 provinces, coloriées par activité (rampe DISCRÈTE), sélection tactile.
// A11Y (RS1-12) : le SVG est décoratif (masqué aux lecteurs d'écran) ; la LISTE des provinces est le chemin
// accessible primaire (chaque ligne = bouton avec nom + compte + catégorie + état sélectionné).
export default function MapScreen({ ed, onOpen, seed, onSeedApplied }) {
  const mapW = Dimensions.get('window').width - 36 - 24; // largeur écran - padding - padding carte
  const mapH = Math.round(mapW * mapAspect);
  const paths = useMemo(() => projectPaths(mapW, mapH), [mapW, mapH]);
  const activity = useMemo(() => activityByProvince(ed), [ed]);
  const [sel, setSel] = useState(null);
  // RS1-19 : une province semée par un lien croisé (Detail → Carte) est présélectionnée, puis consommée.
  useEffect(() => { if (seed && seed.province) { setSel(seed.province); onSeedApplied && onSeedApplied(); } }, [seed]);

  const maxN = Math.max(1, ...Object.values(activity).map((a) => a.length));
  const selItems = sel ? activity[sel] || [] : [];
  const actives = Object.keys(activity).sort((a, b) => activity[b].length - activity[a].length);
  const levelOf = (name) => mapLevel((activity[name] || []).length, maxN);

  // Transparence du dénominateur : la carte ne couvre que les actualités géolocalisées.
  const totalItems = ed.axes.reduce((n, a) => n + a.items.length, 0);
  const localisedCodes = new Set();
  Object.values(activity).forEach((items) => items.forEach((it) => localisedCodes.add(it.code)));
  const nLoc = localisedCodes.size;

  const fillFor = (name) => (sel === name ? C.cobalt : MAP_RAMP[levelOf(name)]);

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Cartographie" title="Carte" subtitle="par province · touchez pour explorer" />

      {/* Dénominateur explicite : la carte ne couvre que les actualités géolocalisées. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginBottom: SP.md, flexWrap: 'wrap' }}>
        <Icon name="map-pin" size={13} color={C.cobalt} />
        <Text style={[TYPE.label, { color: C.ink }]}>{nLoc} localisée{nLoc > 1 ? 's' : ''} / {totalItems}</Text>
        <Text style={[TYPE.caption, { color: C.inkMut }]}>{totalItems - nLoc} nationales · un item peut couvrir plusieurs provinces</Text>
      </View>

      <Card style={{ padding: SP.md, alignItems: 'center' }}>
        {/* Carte SVG = illustration DÉCORATIVE : masquée aux lecteurs d'écran (la liste ci-dessous est le
            chemin accessible). Les <Path> restent tactiles à la souris/au doigt. */}
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Svg width={mapW} height={mapH}>
            {paths.map((p) => (
              <Path key={p.name} d={p.d} fill={fillFor(p.name)} stroke={C.mapStroke} strokeWidth={0.7}
                onPress={() => setSel(sel === p.name ? null : p.name)} />
            ))}
          </Svg>
        </View>
        {/* Légende QUANTIFIÉE (RS1-13) : 4 catégories nommées, pas un dégradé continu. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: SP.md, marginTop: SP.sm }}>
          {MAP_CATS.map((cat, i) => (
            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs }}>
              <View style={{ width: 11, height: 11, borderRadius: RADIUS.xs, backgroundColor: MAP_RAMP[i], borderWidth: i === 0 ? 1 : 0, borderColor: C.border }} />
              <Text style={[TYPE.caption, { color: C.inkMut }]}>{cat}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Détail province sélectionnée */}
      {sel ? (
        <View style={{ marginTop: SP.gutter }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.sm2 }}>
            <Icon name="map-pin" size={16} color={C.cobalt} />
            <Text style={[TYPE.serifLead, { color: C.ink, flex: 1 }]}>{sel}</Text>
            <TouchableOpacity onPress={() => setSel(null)} hitSlop={HIT.lg} accessibilityRole="button" accessibilityLabel="Fermer la province"><Icon name="close" size={18} color={C.inkMut} /></TouchableOpacity>
          </View>
          {selItems.length ? selItems.map((it) => (
            <Card key={it.code} accent={C.cobalt} onPress={() => onOpen(it.code)} style={{ padding: SP.md2, marginBottom: SP.sm2 }}>
              <Text style={[TYPE.cardTitle, { color: C.ink, marginBottom: SP.xs2 }]} numberOfLines={3}>{it.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm }}>
                <SourceLine source={primarySource(ed, it)} style={{ flex: 1 }} />
                <RelBadge reliability={it.reliability} />
                <Icon name="chevron" size={15} color={C.inkMut} />
              </View>
            </Card>
          )) : (
            <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.md }]}>
              Aucune actualité localisée dans cette province pour cette édition.
            </Text>
          )}
        </View>
      ) : (
        <View style={{ marginTop: SP.gutter }}>
          <Text style={[TYPE.label, { color: C.inkDim, marginBottom: SP.sm2 }]}>Provinces actives cette édition</Text>
          {actives.length ? actives.map((name) => {
            const n = activity[name].length, level = levelOf(name);
            return (
              <TouchableOpacity key={name} onPress={() => setSel(name)}
                accessibilityRole="button" accessibilityState={{ selected: sel === name }}
                accessibilityLabel={`${name}, ${n} actualité${n > 1 ? 's' : ''}, activité ${MAP_CATS[level]}`}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SP.md, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, flex: 1 }}>
                  <View style={{ width: 12, height: 12, borderRadius: RADIUS.xs, backgroundColor: MAP_RAMP[level], borderWidth: level === 0 ? 1 : 0, borderColor: C.border }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPE.cardTitle, { color: C.ink }]}>{name}</Text>
                    <Text style={[TYPE.caption, { color: C.inkMut }]}>activité {MAP_CATS[level]}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
                  <LevelBar level={level} />
                  <Text style={[TYPE.mono, { color: C.cobalt }]}>{n}</Text>
                  <Icon name="chevron" size={14} color={C.inkMut} />
                </View>
              </TouchableOpacity>
            );
          }) : <Text style={[TYPE.bodySm, { color: C.inkMut }]}>—</Text>}
        </View>
      )}
    </ScrollView>
  );
}
