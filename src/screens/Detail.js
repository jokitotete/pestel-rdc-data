import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { C, F, AX, AX_ICON, tint, relFr, relIsOk } from '../theme';
import { CodeChip, RelBadge, SrcDot, Icon, Rule } from '../ui';
import { findItem, sourcesFor } from '../store';

// Zoom sur un item : texte intégral, analyse, contexte, chronologie, acteurs, perspectives, sources.
export default function Detail({ ed, code, onOpen }) {
  const it = findItem(ed, code);
  if (!it) return null;
  const c = AX[it.axis] || C.cobalt;
  const z = it.zoom || {};
  const srcs = sourcesFor(ed, it.sources);

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CodeChip code={it.code} />
        <Text style={{ fontSize: 14 }}>{AX_ICON[it.axis]}</Text>
        <Text style={{ fontFamily: F.bodySemi, fontSize: 12.5, color: c }}>{it.axisName}</Text>
        <View style={{ flex: 1 }} />
        <RelBadge reliability={it.reliability} />
      </View>

      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.ink, lineHeight: 29, marginBottom: 14 }}>
        {it.title}
      </Text>

      <Text style={{ fontFamily: F.body, fontSize: 14.5, color: C.inkDim, lineHeight: 23 }}>{it.text}</Text>

      {/* Analyse */}
      {it.analysis ? (
        <View style={{ backgroundColor: tint(c, 0.08), borderLeftWidth: 3, borderLeftColor: c, borderRadius: 10, padding: 14, marginTop: 16 }}>
          <Text style={{ fontFamily: F.monoSemi, fontSize: 10.5, color: c, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Analyse</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkDim, lineHeight: 21, fontStyle: 'italic' }}>{it.analysis}</Text>
        </View>
      ) : null}

      {/* Contexte */}
      {z.context ? (
        <Block title="Contexte">
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkDim, lineHeight: 21 }}>{z.context}</Text>
        </Block>
      ) : null}

      {/* Chronologie */}
      {z.timeline && z.timeline.length ? (
        <Block title="Chronologie">
          {z.timeline.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginTop: 4 }} />
                {i < z.timeline.length - 1 && <View style={{ width: 1.5, flex: 1, backgroundColor: C.border, marginTop: 2 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 4 }}>
                <Text style={{ fontFamily: F.monoSemi, fontSize: 11, color: c, marginBottom: 2 }}>{t.d}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkDim, lineHeight: 19 }}>{t.e}</Text>
              </View>
            </View>
          ))}
        </Block>
      ) : null}

      {/* Acteurs */}
      {z.actors ? (
        <Block title="Acteurs">
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkDim, lineHeight: 21 }}>
            {Array.isArray(z.actors) ? z.actors.join(' · ') : z.actors}
          </Text>
        </Block>
      ) : null}

      {/* Perspectives */}
      {z.outlook ? (
        <Block title="Perspectives">
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkDim, lineHeight: 21 }}>{z.outlook}</Text>
        </Block>
      ) : null}

      {/* Items liés */}
      {it.related && it.related.length ? (
        <Block title="Liés">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {it.related.map((rc) => <CodeChip key={rc} code={rc} onPress={() => onOpen(rc)} />)}
          </View>
        </Block>
      ) : null}

      {/* Sources */}
      {srcs.length ? (
        <Block title={`Sources (${srcs.length})`}>
          {srcs.map((s) => (
            <TouchableOpacity key={s.id} activeOpacity={0.7} onPress={() => s.url && Linking.openURL(s.url)}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 9 }}>
              <SrcDot rel={s.reliability} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.inkDim, lineHeight: 18 }} numberOfLines={3}>{s.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }}>{s.type} · {s.date}</Text>
                  {s.url ? <Icon name="link" size={12} color={C.cobalt} /> : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Block>
      ) : null}
    </ScrollView>
  );
}

const Block = ({ title, children }) => (
  <View style={{ marginTop: 18 }}>
    <Text style={{ fontFamily: F.displayBold, fontSize: 15, color: C.ink, marginBottom: 10 }}>{title}</Text>
    {children}
  </View>
);
