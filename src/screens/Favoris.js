import React, { useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { C, TYPE, SP, RADIUS, HIT, AX_SHORT, AX_ORDER, RUBRIQUES } from '../theme';
import { Pill, NewsCard, PageHeader, Icon } from '../ui';
import { SECTORS, itemInSector } from '../sectors';

// Groupe de filtres étiqueté — IDENTIQUE à « À la une » / « Axes » (cohérence demandée par l'user).
const FilterRow = ({ label, children }) => (
  <>
    <Text style={[TYPE.overline, { color: C.inkMut, marginLeft: SP.hair, marginBottom: SP.sm }]}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.md2, marginHorizontal: -SP.gutter }} contentContainerStyle={{ paddingHorizontal: SP.gutter, gap: SP.sm }}>
      {children}
    </ScrollView>
  </>
);

// « Favoris » — les articles ÉTOILÉS, PERSISTANTS : restent visibles quel que soit le jour tant que l'étoile
// est sélectionnée (snapshots autonomes de l'édition). Filtrables par Axes / Rubriques / Secteurs, comme
// les autres écrans. On retire un favori en rouvrant l'article (l'étoile s'y bascule).
export default function Favoris({ favs = [], onOpen, onToggleFav, onSearch }) {
  const [filter, setFilter] = useState({ type: 'all' });
  const sector = filter.type === 'sector' ? SECTORS.find((s) => s.key === filter.key) : null;

  const list = favs.filter((f) => {
    if (filter.type === 'axis') return f.axis === filter.key;
    if (filter.type === 'sector') return sector && itemInSector({ title: f.title, text: f.text, analysis: '' }, sector);
    return true;
  });

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Vos étoiles" title="Favoris" subtitle="vos articles étoilés, jour après jour" />

      {favs.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: SP.huge }}>
          <Icon name="star" size={34} color={C.inkMut} style={{ marginBottom: SP.md }} />
          <Text style={[TYPE.bodySm, { color: C.inkMut, textAlign: 'center', marginBottom: SP.xl }]}>
            Aucun favori pour l’instant.{'\n'}Touchez l’étoile d’un article pour l’ajouter — il restera ici, quel que soit le jour.
          </Text>
          {/* RS1-11 : point d'entrée LIBELLÉ vers la recherche multi-éditions (au-delà de la loupe d'en-tête). */}
          {onSearch ? (
            <TouchableOpacity onPress={onSearch} hitSlop={HIT.md} accessibilityRole="button" accessibilityLabel="Rechercher dans les éditions"
              style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, minHeight: 44, paddingHorizontal: SP.lg, backgroundColor: C.actionFill, borderRadius: RADIUS.chip }}>
              <Icon name="search" size={16} color={C.onAction} />
              <Text style={[TYPE.label, { color: C.onAction }]}>Rechercher dans les éditions</Text>
            </TouchableOpacity>
          ) : null}
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
            <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.xl, textAlign: 'center' }]}>
              Aucun favori dans ce filtre.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
