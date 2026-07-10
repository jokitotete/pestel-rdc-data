import React from 'react';
import { Text, View, ScrollView } from 'react-native';
import { C, F, AX, AX_ICON, tint } from '../theme';
import { Card, CodeChip, SectionHead, Icon, Rule } from '../ui';

// « À la une » — les 3 faits qui comptent + ce qu'il faut suivre.
export default function Home({ ed, onOpen }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.cobalt, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {ed.period}
      </Text>
      <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.inkMut, marginTop: 4, marginBottom: 18 }}>
        Focale · {ed.focus}
      </Text>

      <SectionHead title="⭐ À la une" lens="les 3 faits qui comptent" />

      {ed.headline.map((h, i) => {
        const c = AX[h.axis] || C.cobalt;
        return (
          <Card key={h.code} accent={c} onPress={() => onOpen(h.code)} style={{ padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 30, color: tint(c, 0.85) }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <CodeChip code={h.code} />
            </View>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: C.ink, lineHeight: 22, marginBottom: 6 }}>
              {h.title}
            </Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkDim, lineHeight: 19 }} numberOfLines={4}>
              {h.text}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: c }}>Approfondir</Text>
              <Icon name="chevron" size={14} color={c} />
            </View>
          </Card>
        );
      })}

      {ed.agenda && ed.agenda.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <SectionHead title="📌 À suivre" lens="agenda des prochains jalons" />
          <Card style={{ paddingVertical: 4 }}>
            {ed.agenda.slice(0, 5).map((a, i, arr) => (
              <View key={i}>
                <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: F.monoSemi, fontSize: 11.5, color: C.cobalt, width: 92 }}>{a.when}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkDim, flex: 1, lineHeight: 18 }}>{a.what}</Text>
                </View>
                {i < arr.length - 1 && <Rule style={{ marginHorizontal: 14 }} />}
              </View>
            ))}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
