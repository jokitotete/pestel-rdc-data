import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { C, AX, AXT, pick, SP, TYPE, RADIUS, HIT } from '../theme';
import { Card, RelBadge, Icon, AxisGlyph, SourceLine } from '../ui';
import { search, primarySource } from '../store';

// Recherche transversale dans tous les items de l'édition.
export default function Search({ ed, onOpen }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => search(ed, q), [ed, q]);
  const active = q.trim().length >= 2;

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* Champ de recherche */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, paddingHorizontal: SP.md2, height: 48, marginBottom: SP.gutter }}>
        <Icon name="search" size={18} color={C.inkMut} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un fait, un thème…"
          placeholderTextColor={C.inkMut}
          style={[TYPE.body, { flex: 1, color: C.ink }]}
          autoCorrect={false}
          returnKeyType="search"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ('')} hitSlop={HIT.md}
            accessibilityRole="button" accessibilityLabel="Effacer la recherche"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -SP.sm }}>
            <Icon name="close" size={18} color={C.inkMut} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!active ? (
        <View style={{ alignItems: 'center', paddingTop: SP.giant }}>
          <Icon name="search" size={34} color={C.inkMut} style={{ marginBottom: SP.sm2 }} />
          <Text style={[TYPE.bodySm, { color: C.inkMut, textAlign: 'center' }]}>
            Tapez au moins 2 lettres pour chercher{'\n'}dans les {ed.axes.reduce((n, a) => n + a.items.length, 0)} items de l'édition.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[TYPE.caption, { color: C.inkMut, marginBottom: SP.md }]}>
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </Text>
          {results.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: SP.huge }}>
              <Icon name="search" size={30} color={C.inkMut} style={{ marginBottom: SP.sm2 }} />
              <Text style={[TYPE.bodySm, { color: C.inkMut, textAlign: 'center' }]}>
                Aucun résultat pour « {q} ».{'\n'}Essayez d'autres mots-clés.
              </Text>
            </View>
          ) : null}
          {results.map((it) => {
            const c = pick(AX, it.axis, C.cobalt);   // RS3 : prototype-safe (it.axis vient de l'édition NON FIABLE)
            return (
              <Card key={it.code} accent={c} onPress={() => onOpen(it.code)} style={{ padding: SP.md2, marginBottom: SP.sm2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.xs2 }}>
                  <AxisGlyph axis={it.axis} size={14} />
                  <Text style={[TYPE.label, { color: pick(AXT, it.axis, C.ink) }]}>{it.axisName}</Text>
                  <View style={{ flex: 1 }} />
                  <RelBadge reliability={it.reliability} />
                  <Icon name="chevron" size={15} color={C.inkMut} style={{ marginLeft: SP.xs }} />
                </View>
                <Text style={[TYPE.cardTitle, { color: C.ink, marginBottom: SP.xs2 }]} numberOfLines={2}>{it.title}</Text>
                <SourceLine source={primarySource(ed, it)} />
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
