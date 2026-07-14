import React, { useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { C, F } from '../theme';
import { Pill, Icon, PageHeader } from '../ui';
import { ChartCard } from '../charts';
import { STATS } from '../store';
import { safeOpenURL } from '../safeUrl';

// « Statistiques & tendances » — indicateurs (KPI) + graphes, par secteur.
export default function Stats() {
  const [theme, setTheme] = useState('all');
  const W = Dimensions.get('window').width;
  const contentW = W - 36; // padding 18 de chaque côté
  const tileW = (contentW - 10) / 2;

  const themes = STATS.themes.filter((t) => theme === 'all' || t.key === theme);

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Tendances" title="Données" subtitle="les chiffres qui comptent" />
      {STATS.updated ? (
        <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkMut, marginBottom: 14 }}>sources primaires · maj {STATS.updated}</Text>
      ) : null}

      {/* Filtre secteurs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
        <Pill label="Tous" active={theme === 'all'} onPress={() => setTheme('all')} />
        {STATS.themes.map((t) => (
          <Pill key={t.key} label={t.label} active={theme === t.key} onPress={() => setTheme(t.key)} />
        ))}
      </ScrollView>

      {themes.map((t) => {
        const trends = STATS.trends.filter((x) => x.theme === t.key);
        return (
          <View key={t.key} style={{ marginBottom: 26 }}>
            {/* En-tête secteur */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.inkMut }} />
              <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>{t.label}</Text>
            </View>

            {/* KPI (indicateurs) */}
            {t.indicators && t.indicators.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {t.indicators.map((ind, i) => (
                  <View key={i} style={{ width: tileW, backgroundColor: C.panel, borderRadius: 14, borderTopWidth: 3, borderTopColor: C.cobalt, borderWidth: 1, borderColor: C.border, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                      <Text style={{ fontFamily: F.displayBold, fontSize: 21, color: C.ink }}>{ind.value}</Text>
                      {ind.unit ? <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.inkDim }}>{ind.unit}</Text> : null}
                    </View>
                    <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.ink, marginTop: 4, lineHeight: 16 }}>{ind.label}</Text>
                    {ind.note ? <Text style={{ fontFamily: F.body, fontSize: 10.5, color: C.inkMut, marginTop: 3, lineHeight: 14 }} numberOfLines={2}>{ind.note}</Text> : null}
                    {ind.src && ind.src.u ? (
                      <TouchableOpacity onPress={() => safeOpenURL(ind.src.u)} accessibilityRole="link"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                        <Icon name="link" size={10} color={C.cobalt} />
                        <Text style={{ fontFamily: F.mono, fontSize: 9.5, color: C.cobalt }} numberOfLines={1}>{ind.src.n || 'source'}</Text>
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
