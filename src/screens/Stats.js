import React, { useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { C, SP, TYPE, RADIUS } from '../theme';
import { Pill, Icon, PageHeader } from '../ui';
import { ChartCard } from '../charts';
import { STATS } from '../store';
import { confirmOpenURL } from '../safeUrl';

// « Statistiques & tendances » — indicateurs (KPI) + graphes, par secteur.
export default function Stats() {
  const [theme, setTheme] = useState('all');
  const W = Dimensions.get('window').width;
  const contentW = W - 36; // padding 18 de chaque côté
  const tileW = (contentW - 10) / 2;

  const themes = STATS.themes.filter((t) => theme === 'all' || t.key === theme);

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Tendances" title="Données" subtitle="les chiffres qui comptent" />
      {STATS.updated ? (
        <Text style={[TYPE.caption, { color: C.inkMut, marginBottom: SP.md2 }]}>sources primaires · maj {STATS.updated}</Text>
      ) : null}

      {/* Filtre secteurs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.gutter, marginHorizontal: -SP.gutter }} contentContainerStyle={{ paddingHorizontal: SP.gutter, gap: SP.sm }}>
        <Pill label="Tous" active={theme === 'all'} onPress={() => setTheme('all')} />
        {STATS.themes.map((t) => (
          <Pill key={t.key} label={t.label} active={theme === t.key} onPress={() => setTheme(t.key)} />
        ))}
      </ScrollView>

      {themes.map((t) => {
        const trends = STATS.trends.filter((x) => x.theme === t.key);
        return (
          <View key={t.key} style={{ marginBottom: SP.xxl }}>
            {/* En-tête secteur */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.md }}>
              <View style={{ width: 7, height: 7, borderRadius: RADIUS.xs, backgroundColor: C.inkMut }} />
              <Text style={[TYPE.subtitle, { color: C.ink }]}>{t.label}</Text>
            </View>

            {/* KPI (indicateurs) */}
            {t.indicators && t.indicators.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm2, marginBottom: SP.md }}>
                {t.indicators.map((ind, i) => (
                  <View key={i} style={{ width: tileW, backgroundColor: C.panel, borderRadius: RADIUS.lg, borderTopWidth: 3, borderTopColor: C.cobalt, borderWidth: 1, borderColor: C.border, padding: SP.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SP.xs }}>
                      <Text style={[TYPE.data, { color: C.ink }]}>{ind.value}</Text>
                      {ind.unit ? <Text style={[TYPE.label, { color: C.inkDim }]}>{ind.unit}</Text> : null}
                    </View>
                    <Text style={[TYPE.label, { color: C.ink, marginTop: SP.xs }]}>{ind.label}</Text>
                    {/* QA v1.2 : rôle de PROSE (noteSm, sans) — `caption` (mono) coupait ~31 % de la note. */}
                    {ind.note ? <Text style={[TYPE.noteSm, { color: C.inkMut, marginTop: SP.xs }]} numberOfLines={2}>{ind.note}</Text> : null}
                    {ind.src && ind.src.u ? (
                      <TouchableOpacity onPress={() => confirmOpenURL(ind.src.u)} accessibilityRole="link"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, marginTop: SP.xs2 }}>
                        <Icon name="link" size={10} color={C.cobalt} />
                        <Text style={[TYPE.caption, { color: C.cobalt }]} numberOfLines={1}>{ind.src.n || 'source'}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Graphes (tendances) */}
            {trends.map((tr) => <ChartCard key={tr.id} trend={tr} width={contentW} />)}
          </View>
        );
      })}
    </ScrollView>
  );
}
