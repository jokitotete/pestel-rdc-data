import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TextInput } from 'react-native';
import { C, F, AX, AX_ICON } from '../theme';
import { Card, CodeChip, RelBadge, Icon } from '../ui';
import { search } from '../store';

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
        {q ? <Icon name="close" size={18} color={C.inkMut} onPress={() => setQ('')} /> : null}
      </View>

      {!active ? (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Text style={{ fontSize: 34, marginBottom: 10 }}>🔎</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkMut, textAlign: 'center', lineHeight: 20 }}>
            Tapez au moins 2 lettres pour chercher{'\n'}dans les {ed.axes.reduce((n, a) => n + a.items.length, 0)} items de l'édition.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut, marginBottom: 12 }}>
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </Text>
          {results.map((it) => {
            const c = AX[it.axis] || C.cobalt;
            return (
              <Card key={it.code} accent={c} onPress={() => onOpen(it.code)} style={{ padding: 14, marginBottom: 9 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <CodeChip code={it.code} />
                  <Text style={{ fontSize: 12 }}>{AX_ICON[it.axis]}</Text>
                  <Text style={{ fontFamily: F.bodySemi, fontSize: 11.5, color: c }}>{it.axisName}</Text>
                  <View style={{ flex: 1 }} />
                  <RelBadge reliability={it.reliability} />
                </View>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.ink, lineHeight: 20 }} numberOfLines={2}>{it.title}</Text>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
