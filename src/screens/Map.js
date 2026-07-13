import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F, tint } from '../theme';
import { Card, CodeChip, RelBadge, Icon, SectionHead } from '../ui';
import { projectPaths, mapAspect, activityByProvince } from '../geo';

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
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <SectionHead title="🗺️ Carte des actualités" lens="par province · touchez pour explorer" />

      {/* Dénominateur explicite : la carte ne couvre que les actualités géolocalisées. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Icon name="map-pin" size={13} color={C.cobalt} />
        <Text style={{ fontFamily: F.bodySemi, fontSize: 12.5, color: C.ink }}>{nLoc} localisée{nLoc > 1 ? 's' : ''} / {totalItems}</Text>
        <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMut }}>{totalItems - nLoc} nationales · un item peut couvrir plusieurs provinces</Text>
      </View>

      <Card style={{ padding: 12, alignItems: 'center' }}>
        <Svg width={mapW} height={mapH}>
          {paths.map((p) => (
            <Path key={p.name} d={p.d} fill={fillFor(p.name)} stroke={C.mapStroke} strokeWidth={0.7}
              onPress={() => setSel(sel === p.name ? null : p.name)} />
          ))}
        </Svg>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: C.mapNeutral }} />
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMut }}>calme</Text>
          <View style={{ width: 26, height: 8, borderRadius: 4, backgroundColor: tint(C.cobalt, 0.45), marginLeft: 6 }} />
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMut }}>plus d'actualités →</Text>
        </View>
      </Card>

      {/* Détail province sélectionnée */}
      {sel ? (
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="map-pin" size={16} color={C.cobalt} />
            <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink, flex: 1 }}>{sel}</Text>
            <TouchableOpacity onPress={() => setSel(null)} hitSlop={8}><Icon name="close" size={18} color={C.inkMut} /></TouchableOpacity>
          </View>
          {selItems.length ? selItems.map((it) => (
            <Card key={it.code} accent={C.cobalt} onPress={() => onOpen(it.code)} style={{ padding: 14, marginBottom: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <CodeChip code={it.code} />
                <RelBadge reliability={it.reliability} />
              </View>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.ink, lineHeight: 20 }} numberOfLines={3}>{it.title}</Text>
            </Card>
          )) : (
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkMut, paddingVertical: 12 }}>
              Aucune actualité localisée dans cette province pour cette édition.
            </Text>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.inkDim, marginBottom: 10 }}>Provinces actives cette édition</Text>
          {actives.length ? actives.map((name) => (
            <TouchableOpacity key={name} onPress={() => setSel(name)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: fillFor(name) }} />
                <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: C.ink }}>{name}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: F.monoSemi, fontSize: 12, color: C.cobalt }}>{activity[name].length}</Text>
                <Icon name="chevron" size={14} color={C.inkMut} />
              </View>
            </TouchableOpacity>
          )) : <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkMut }}>—</Text>}
        </View>
      )}
    </ScrollView>
  );
}
