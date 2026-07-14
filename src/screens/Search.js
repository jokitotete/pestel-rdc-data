import React, { useState, useMemo, useEffect } from 'react';
import { Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { C, AX, AXT, pick, tint, SP, TYPE, RADIUS, HIT } from '../theme';
import { Card, RelBadge, Icon, AxisGlyph, SourceLine } from '../ui';
import { searchAll, getEdition, primarySource } from '../store';
import { loadRecent, pushRecent, clearRecent } from '../prefs';

// Recherche MULTI-ÉDITIONS (RS1-09/10) : cherche dans TOUTE la veille chargée ; chaque résultat porte son
// édition source (badge) et s'ouvre dans CETTE édition. Champ auto-focus ; requêtes récentes persistées (local).
export default function Search({ onOpen }) {
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState([]);
  const results = useMemo(() => searchAll(q), [q]);
  const active = q.trim().length >= 2;

  useEffect(() => { loadRecent().then(setRecent); }, []);

  const openResult = (it) => {
    pushRecent(q).then((r) => r && setRecent(r));   // mémorise la requête au moment où elle porte ses fruits
    onOpen(it.code, it.edDate);
  };

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
          autoFocus
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
        <View style={{ paddingTop: SP.sm }}>
          {/* Requêtes récentes (RS1-10) — reconnaissance plutôt que rappel */}
          {recent.length ? (
            <View style={{ marginBottom: SP.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SP.md }}>
                <Text style={[TYPE.overline, { color: C.inkMut, flex: 1 }]}>RECHERCHES RÉCENTES</Text>
                <TouchableOpacity onPress={() => { clearRecent(); setRecent([]); }} hitSlop={HIT.md} accessibilityRole="button" accessibilityLabel="Effacer les recherches récentes">
                  <Text style={[TYPE.caption, { color: C.cobalt }]}>Effacer</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
                {recent.map((r) => (
                  <TouchableOpacity key={r} onPress={() => setQ(r)}
                    accessibilityRole="button" accessibilityLabel={`Rechercher ${r}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, minHeight: 36, paddingHorizontal: SP.md, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.chip }}>
                    <Icon name="search" size={13} color={C.inkMut} />
                    <Text style={[TYPE.label, { color: C.inkDim }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ alignItems: 'center', paddingTop: SP.xxl }}>
            <Icon name="search" size={34} color={C.inkMut} style={{ marginBottom: SP.sm2 }} />
            <Text style={[TYPE.bodySm, { color: C.inkMut, textAlign: 'center' }]}>
              Tapez au moins 2 lettres pour chercher{'\n'}dans TOUTE la veille chargée (toutes les éditions).
            </Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={[TYPE.caption, { color: C.inkMut, marginBottom: SP.md }]}>
            {results.length} résultat{results.length > 1 ? 's' : ''} · toutes éditions
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
              <Card key={`${it.edDate}:${it.code}`} accent={c} onPress={() => openResult(it)} style={{ padding: SP.md2, marginBottom: SP.sm2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.xs2 }}>
                  <AxisGlyph axis={it.axis} size={14} />
                  <Text style={[TYPE.label, { color: pick(AXT, it.axis, C.ink) }]}>{it.axisName}</Text>
                  <View style={{ flex: 1 }} />
                  {/* Édition source (RS1-09) : la veille est longitudinale — on situe chaque fait dans le temps. */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, backgroundColor: tint(C.cobalt, 0.1), borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.hair }}>
                    <Icon name="calendar" size={11} color={C.cobalt} />
                    <Text style={[TYPE.caption, { color: C.cobalt }]} numberOfLines={1}>{it.edLabel}</Text>
                  </View>
                  <RelBadge reliability={it.reliability} />
                </View>
                <Text style={[TYPE.cardTitle, { color: C.ink, marginBottom: SP.xs2 }]} numberOfLines={2}>{it.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm }}>
                  <SourceLine source={primarySource(getEdition(it.edDate), it)} style={{ flex: 1 }} />
                  <Icon name="chevron" size={15} color={C.inkMut} />
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
