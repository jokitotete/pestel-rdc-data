import React, { useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { C, F, AX_SHORT, AX_ORDER, RUBRIQUES } from '../theme';
import { Pill, NewsCard, PageHeader, Icon } from '../ui';
import { SECTORS, itemInSector } from '../sectors';

// Groupe de filtres étiqueté — IDENTIQUE à « À la une » / « Axes » (cohérence demandée par l'user).
const FilterRow = ({ label, children }) => (
  <>
    <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMut, letterSpacing: 0.8, marginLeft: 2, marginBottom: 7 }}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
      {children}
    </ScrollView>
  </>
);

// « Favoris » — les articles ÉTOILÉS, PERSISTANTS : restent visibles quel que soit le jour tant que l'étoile
// est sélectionnée (snapshots autonomes de l'édition). Filtrables par Axes / Rubriques / Secteurs, comme
// les autres écrans. On retire un favori en rouvrant l'article (l'étoile s'y bascule).
export default function Favoris({ favs = [], onOpen, onToggleFav }) {
  const [filter, setFilter] = useState({ type: 'all' });
  const sector = filter.type === 'sector' ? SECTORS.find((s) => s.key === filter.key) : null;

  const list = favs.filter((f) => {
    if (filter.type === 'axis') return f.axis === filter.key;
    if (filter.type === 'sector') return sector && itemInSector({ title: f.title, text: f.text, analysis: '' }, sector);
    return true;
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Vos étoiles" title="Favoris" subtitle="vos articles étoilés, jour après jour" />

      {favs.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 36 }}>
          <Icon name="star" size={34} color={C.inkMut} style={{ marginBottom: 12 }} />
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkMut, textAlign: 'center', lineHeight: 20 }}>
            Aucun favori pour l’instant.{'\n'}Touchez l’étoile d’un article pour l’ajouter — il restera ici, quel que soit le jour.
          </Text>
        </View>
      ) : (
        <>
          <FilterRow label="AXES PESTEL">
            <Pill label="Tous" active={filter.type === 'all'} onPress={() => setFilter({ type: 'all' })} />
            {AX_ORDER.map((k) => (
              <Pill key={k} label={AX_SHORT[k]} axis={k} active={filter.type === 'axis' && filter.key === k}
                onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />
            ))}
          </FilterRow>
          <FilterRow label="RUBRIQUES">
            {RUBRIQUES.map((k) => (
              <Pill key={k} label={AX_SHORT[k]} axis={k} active={filter.type === 'axis' && filter.key === k}
                onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />
            ))}
          </FilterRow>
          <FilterRow label="SECTEURS TRANSVERSAUX">
            {SECTORS.map((s) => (
              <Pill key={s.key} label={s.label} sectorKey={s.key} active={filter.type === 'sector' && filter.key === s.key}
                onPress={() => setFilter(filter.type === 'sector' && filter.key === s.key ? { type: 'all' } : { type: 'sector', key: s.key })} />
            ))}
          </FilterRow>

          {list.length ? list.map((f) => (
            <NewsCard key={f.id} axis={f.axis} title={f.title} text={f.text} reliability={f.reliability}
              source={f.source} onStar={() => onToggleFav && onToggleFav(f)} starred onPress={() => onOpen(f)} titleLines={3} />
          )) : (
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkMut, paddingVertical: 20, textAlign: 'center', lineHeight: 19 }}>
              Aucun favori dans ce filtre.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
