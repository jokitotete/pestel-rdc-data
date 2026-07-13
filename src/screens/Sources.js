import React, { useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { C, F, REL } from '../theme';
import { Card, SrcDot, Pill, CodeChip, Icon } from '../ui';
import { confirmOpenURL, hostOf } from '../safeUrl';

// Traçabilité : toutes les sources de l'édition, filtrables par fiabilité A→D.
export default function Sources({ ed, onOpen }) {
  const [rel, setRel] = useState('all');
  const list = ed.sources.filter((s) => rel === 'all' || s.reliability === rel);

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
        <Pill label={`Toutes (${ed.sources.length})`} active={rel === 'all'} onPress={() => setRel('all')} />
        {['A', 'B', 'C', 'D'].map((r) => (
          <Pill key={r} label={REL[r].label} active={rel === r} color={REL[r].c} onPress={() => setRel(r)} />
        ))}
      </ScrollView>

      {list.map((s) => (
        <Card key={s.id} style={{ padding: 14, marginBottom: 9 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <SrcDot rel={s.reliability} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.ink, lineHeight: 19 }}>{s.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }}>{s.type} · {s.date}</Text>
                {(s.items || []).map((code) => <CodeChip key={code} code={code} onPress={() => onOpen(code)} />)}
              </View>
              {s.url ? (
                <TouchableOpacity activeOpacity={0.7} onPress={() => confirmOpenURL(s.url)} accessibilityRole="link"
                  accessibilityLabel={`Ouvrir la source ${hostOf(s.url)}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                  <Icon name="link" size={13} color={C.cobalt} />
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: C.cobalt }} numberOfLines={1}>Ouvrir</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }} numberOfLines={1}>· {hostOf(s.url) || 'lien externe'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
