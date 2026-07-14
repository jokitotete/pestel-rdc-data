import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { C, F, AX, AXT, pick } from '../theme';
import { Card, RelBadge, Icon, AxisGlyph, SourceLine } from '../ui';
import { search, primarySource } from '../store';

// Recherche transversale dans tous les items de l'édition.
export default function Search({ ed, onOpen }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => search(ed, q), [ed, q]);
  const active = q.trim().length >= 2;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* Champ de recherche */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 18 }}>
        <Icon name="search" size={18} color={C.inkMut} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un fait, un thème…"
          placeholderTextColor={C.inkMut}
          style={{ flex: 1, fontFamily: F.body, fontSize: 14.5, color: C.ink }}
          autoCorrect={false}
          returnKeyType="search"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ('')} hitSlop={12}
            accessibilityRole="button" accessibilityLabel="Effacer la recherche"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 }}>
            <Icon name="close" size={18} color={C.inkMut} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!active ? (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Icon name="search" size={34} color={C.inkMut} style={{ marginBottom: 10 }} />
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkMut, textAlign: 'center', lineHeight: 20 }}>
            Tapez au moins 2 lettres pour chercher{'\n'}dans les {ed.axes.reduce((n, a) => n + a.items.length, 0)} items de l'édition.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut, marginBottom: 12 }}>
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </Text>
          {results.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Icon name="search" size={30} color={C.inkMut} style={{ marginBottom: 10 }} />
              <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkMut, textAlign: 'center', lineHeight: 20 }}>
                Aucun résultat pour « {q} ».{'\n'}Essayez d'autres mots-clés.
              </Text>
            </View>
          ) : null}
          {results.map((it) => {
            const c = pick(AX, it.axis, C.cobalt);   // RS3 : prototype-safe (it.axis vient de l'édition NON FIABLE)
            return (
              <Card key={it.code} accent={c} onPress={() => onOpen(it.code)} style={{ padding: 14, marginBottom: 9 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <AxisGlyph axis={it.axis} size={14} />
                  <Text style={{ fontFamily: F.bodySemi, fontSize: 11.5, color: pick(AXT, it.axis, C.ink) }}>{it.axisName}</Text>
                  <View style={{ flex: 1 }} />
                  <RelBadge reliability={it.reliability} />
                  <Icon name="chevron" size={15} color={C.inkMut} style={{ marginLeft: 4 }} />
                </View>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.ink, lineHeight: 20, marginBottom: 6 }} numberOfLines={2}>{it.title}</Text>
                <SourceLine source={primarySource(ed, it)} />
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
