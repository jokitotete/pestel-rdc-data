import React, { useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { C, F, AX, AX_ICON, AX_ORDER, tint } from '../theme';
import { Card, CodeChip, RelBadge, Pill } from '../ui';
import { SECTORS, itemInSector } from '../sectors';

// « Décryptage par axe » — filtrable par AXE (P/E/S/T/Env/L) ou par SECTEUR transversal.
export default function Axes({ ed, onOpen }) {
  const [filter, setFilter] = useState({ type: 'all' }); // {type:'all'|'axis'|'sector', key}
  const sector = filter.type === 'sector' ? SECTORS.find((s) => s.key === filter.key) : null;

  // Axes affichés ; en mode secteur, on ne garde que les items qui matchent, et on masque les axes vides.
  const axes = ed.axes
    .filter((a) => filter.type !== 'axis' || a.key === filter.key)
    .map((a) => ({ ...a, items: sector ? a.items.filter((it) => itemInSector(it, sector)) : a.items }))
    .filter((a) => a.items.length > 0);
  const total = axes.reduce((n, a) => n + a.items.length, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Rangée 1 : par axe */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
        <Pill label="Tous" active={filter.type === 'all'} onPress={() => setFilter({ type: 'all' })} />
        {AX_ORDER.map((k) => {
          const a = ed.axes.find((x) => x.key === k);
          if (!a) return null;
          return <Pill key={k} label={`${AX_ICON[k]} ${a.short || a.name}`} active={filter.type === 'axis' && filter.key === k} color={AX[k]} onPress={() => setFilter({ type: 'axis', key: k })} />;
        })}
      </ScrollView>

      {/* Rangée 2 : par secteur (transversal, par contenu) */}
      <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMut, letterSpacing: 0.8, marginLeft: 2, marginBottom: 7 }}>SECTEURS TRANSVERSAUX</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
        {SECTORS.map((s) => (
          <Pill key={s.key} label={`${s.icon} ${s.label}`} active={filter.type === 'sector' && filter.key === s.key} onPress={() => setFilter({ type: 'sector', key: s.key })} />
        ))}
      </ScrollView>

      {/* Contexte quand un secteur est actif */}
      {sector ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.cobalt }}>{sector.icon} {sector.label}</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkMut }}>{total} item{total > 1 ? 's' : ''} · tous axes confondus</Text>
        </View>
      ) : null}

      {total === 0 ? (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkMut, paddingVertical: 20, textAlign: 'center' }}>
          Aucun item de ce secteur dans cette édition.
        </Text>
      ) : axes.map((a) => {
        const c = AX[a.key] || C.cobalt;
        return (
          <View key={a.key} style={{ marginBottom: 22 }}>
            {/* En-tête d'axe */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: tint(c, 0.15), borderWidth: 1, borderColor: tint(c, 0.4), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{AX_ICON[a.key]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 17, color: C.ink }}>{a.short || a.name}</Text>
                <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }}>{a.lens}</Text>
              </View>
              <View style={{ backgroundColor: tint(c, 0.14), borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ fontFamily: F.monoSemi, fontSize: 11, color: c }}>{a.items.length}</Text>
              </View>
            </View>

            {/* Items de l'axe */}
            {a.items.map((it) => (
              <Card key={it.code} accent={c} onPress={() => onOpen(it.code)} style={{ padding: 14, marginBottom: 9 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <CodeChip code={it.code} />
                  <RelBadge reliability={it.reliability} />
                </View>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 14.5, color: C.ink, lineHeight: 20, marginBottom: 5 }} numberOfLines={3}>
                  {it.title}
                </Text>
                <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.inkDim, lineHeight: 18 }} numberOfLines={2}>
                  {it.text}
                </Text>
              </Card>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
