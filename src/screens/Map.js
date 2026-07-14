import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, tint, SP, TYPE, RADIUS, HIT } from '../theme';
import { Card, RelBadge, Icon, PageHeader, SourceLine } from '../ui';
import { projectPaths, mapAspect, activityByProvince } from '../geo';
import { primarySource } from '../store';

// « Carte des actualités » — 26 provinces, coloriées par activité, sélection tactile.
export default function MapScreen({ ed, onOpen }) {
  const mapW = Dimensions.get('window').width - 36 - 24; // largeur écran - padding - padding carte
  const mapH = Math.round(mapW * mapAspect);
  const paths = useMemo(() => projectPaths(mapW, mapH), [mapW, mapH]);
  const activity = useMemo(() => activityByProvince(ed), [ed]);
  const [sel, setSel] = useState(null);

  const maxN = Math.max(1, ...Object.values(activity).map((a) => a.length));
  const selItems = sel ? activity[sel] || [] : [];
  const actives = Object.keys(activity).sort((a, b) => activity[b].length - activity[a].length);

  // Transparence du dénominateur : la carte ne couvre que les actualités géolocalisées.
  const totalItems = ed.axes.reduce((n, a) => n + a.items.length, 0);
  const localisedCodes = new Set();
  Object.values(activity).forEach((items) => items.forEach((it) => localisedCodes.add(it.code)));
  const nLoc = localisedCodes.size;

  const fillFor = (name) => {
    if (sel === name) return C.cobalt;
    const n = (activity[name] || []).length;
    return n ? tint(C.cobalt, 0.16 + (n / maxN) * 0.42) : C.mapNeutral;
  };

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
        <Svg width={mapW} height={mapH}>
          {paths.map((p) => (
            <Path key={p.name} d={p.d} fill={fillFor(p.name)} stroke={C.mapStroke} strokeWidth={0.7}
              onPress={() => setSel(sel === p.name ? null : p.name)} />
          ))}
        </Svg>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginTop: SP.sm }}>
          <View style={{ width: 11, height: 11, borderRadius: RADIUS.xs, backgroundColor: C.mapNeutral }} />
          <Text style={[TYPE.caption, { color: C.inkMut }]}>calme</Text>
          <View style={{ width: 26, height: 8, borderRadius: RADIUS.xs, backgroundColor: tint(C.cobalt, 0.45), marginLeft: SP.xs2 }} />
          <Text style={[TYPE.caption, { color: C.inkMut }]}>plus d'actualités →</Text>
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
          {actives.length ? actives.map((name) => (
            <TouchableOpacity key={name} onPress={() => setSel(name)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SP.md, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
                <View style={{ width: 10, height: 10, borderRadius: RADIUS.xs, backgroundColor: fillFor(name) }} />
                <Text style={[TYPE.cardTitle, { color: C.ink }]}>{name}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2 }}>
                <Text style={[TYPE.mono, { color: C.cobalt }]}>{activity[name].length}</Text>
                <Icon name="chevron" size={14} color={C.inkMut} />
              </View>
            </TouchableOpacity>
          )) : <Text style={[TYPE.bodySm, { color: C.inkMut }]}>—</Text>}
        </View>
      )}
    </ScrollView>
  );
}
