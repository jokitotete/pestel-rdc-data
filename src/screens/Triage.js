import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { C, F, tint } from '../theme';
import { Card, Icon, Rule } from '../ui';
import { confirmOpenURL, hostOf, isSafeUrl } from '../safeUrl';

// « Divers » — infos CAPTÉES automatiquement mais NON classées (axe « ? »), hors classement PESTEL.
// N'est plus un onglet : rendu comme LISTE réutilisable, embarquée dans le filtre « Divers » de la rubrique
// (« À la une » et « Axes »). Lien externe via confirmOpenURL (domaine affiché + confirmation).
export function DiversList({ items = [] }) {
  const list = (items || []).filter((f) => f && f.title && isSafeUrl(f.url));
  if (list.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 30 }}>
        <Icon name="checkmark" size={30} color={C.inkMut} style={{ marginBottom: 10 }} />
        <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkMut, textAlign: 'center', lineHeight: 20 }}>
          Rien pour l’instant.{'\n'}Les infos captées non classées apparaîtront ici.
        </Text>
      </View>
    );
  }
  return (
    <Card style={{ paddingVertical: 4 }}>
      {list.map((f, i, arr) => (
        <View key={i}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => confirmOpenURL(f.url)}
            accessibilityRole="link" accessibilityLabel={`Ouvrir ${hostOf(f.url)} : ${f.title}`}
            style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: tint(C.gold, 0.16), borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontFamily: F.monoSemi, fontSize: 9, color: C.goldText }}>divers</Text>
              </View>
              <View style={{ flex: 1 }} />
              {f.publishedAt ? (
                <Text style={{ fontFamily: F.mono, fontSize: 9.5, color: C.inkMut }}>{String(f.publishedAt).slice(0, 10)}</Text>
              ) : null}
            </View>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 13.5, color: C.ink, lineHeight: 19 }} numberOfLines={2}>{f.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <Icon name="link" size={11} color={C.cobalt} />
              <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }} numberOfLines={1}>{f.source || hostOf(f.url)} · {hostOf(f.url)}</Text>
            </View>
          </TouchableOpacity>
          {i < arr.length - 1 && <Rule style={{ marginHorizontal: 14 }} />}
        </View>
      ))}
    </Card>
  );
}
