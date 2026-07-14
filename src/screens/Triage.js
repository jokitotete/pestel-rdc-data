import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { C, tint, SP, TYPE, RADIUS } from '../theme';
import { Card, Icon, Rule, SourceLine } from '../ui';
import { confirmOpenURL, hostOf, isSafeUrl } from '../safeUrl';

// « Divers » — infos CAPTÉES automatiquement mais NON classées (axe « ? »), hors classement PESTEL.
// N'est plus un onglet : rendu comme LISTE réutilisable, embarquée dans le filtre « Divers » de la rubrique
// (« À la une » et « Axes »). Lien externe via confirmOpenURL (domaine affiché + confirmation).
export function DiversList({ items = [] }) {
  const list = (items || []).filter((f) => f && f.title && isSafeUrl(f.url));
  if (list.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: SP.xxxl }}>
        <Icon name="checkmark" size={30} color={C.inkMut} style={{ marginBottom: SP.sm2 }} />
        <Text style={[TYPE.bodySm, { color: C.inkMut, textAlign: 'center' }]}>
          Rien pour l’instant.{'\n'}Les infos captées non classées apparaîtront ici.
        </Text>
      </View>
    );
  }
  return (
    <Card style={{ paddingVertical: SP.xs }}>
      {list.map((f, i, arr) => (
        <View key={i}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => confirmOpenURL(f.url)}
            accessibilityRole="link" accessibilityLabel={`Ouvrir ${hostOf(f.url)} : ${f.title}`}
            style={{ paddingVertical: SP.md, paddingHorizontal: SP.md2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginBottom: SP.xs }}>
              <View style={{ backgroundColor: tint(C.gold, 0.16), borderRadius: RADIUS.chip, paddingHorizontal: SP.sm, paddingVertical: SP.hair }}>
                <Text style={[TYPE.mono, { color: C.goldText }]}>divers</Text>
              </View>
              <View style={{ flex: 1 }} />
              {f.publishedAt ? (
                <Text style={[TYPE.caption, { color: C.inkMut }]}>{String(f.publishedAt).slice(0, 10)}</Text>
              ) : null}
            </View>
            <Text style={[TYPE.cardTitle, { color: C.ink }]} numberOfLines={2}>{f.title}</Text>
            <SourceLine source={{ name: f.source, host: hostOf(f.url) }} style={{ marginTop: SP.xs }} />
          </TouchableOpacity>
          {i < arr.length - 1 && <Rule style={{ marginHorizontal: SP.md2 }} />}
        </View>
      ))}
    </Card>
  );
}
