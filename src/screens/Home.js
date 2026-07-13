import React from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { C, F, AX, AXT, AX_ICON, tint, SLOGAN } from '../theme';
import { Card, CodeChip, SectionHead, Icon, Rule } from '../ui';
import { sectorItems } from '../store';
import { sectorByKey } from '../sectors';
import { confirmOpenURL, hostOf, isSafeUrl } from '../safeUrl';

// Chip du secteur actif (ou « Choisir ») — ouvre le sélecteur de secteur.
function SectorChip({ sec, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Changer de secteur"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.panel, borderWidth: 1, borderColor: sec ? tint(C.cobalt, 0.45) : C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }}>
      <Text style={{ fontSize: 13 }}>{sec ? sec.icon : '➕'}</Text>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 12.5, color: C.cobalt }}>{sec ? sec.label : 'Choisir'}</Text>
      <Icon name="chevron" size={13} color={C.cobalt} />
    </TouchableOpacity>
  );
}

// Fil « À traiter » (collecte étage 1) : infos captées du jour, pas encore décryptées. Rend l'OMISSION
// VISIBLE. On n'affiche que les items à URL https sûre ; ouverture via confirmOpenURL (domaine + confirm).
function ToTreatSection({ feed }) {
  const items = (feed || []).filter((f) => f && f.title && isSafeUrl(f.url)).slice(0, 12);
  if (!items.length) return null;
  return (
    <View style={{ marginTop: 22 }}>
      <SectionHead title="🗞️ À traiter" lens={`capté aujourd’hui · pas encore décrypté (${items.length})`} />
      <Card style={{ paddingVertical: 4 }}>
        {items.map((f, i, arr) => {
          const ct = AXT[f.axis] || C.inkDim;
          return (
            <View key={i}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => confirmOpenURL(f.url)}
                accessibilityRole="link" accessibilityLabel={`Ouvrir ${hostOf(f.url)} : ${f.title}`}
                style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {f.axis && f.axis !== '?' ? <Text style={{ fontSize: 11 }}>{AX_ICON[f.axis] || '•'}</Text> : null}
                  <Text style={{ fontFamily: F.monoSemi, fontSize: 10, color: ct }}>{f.axisLabel || 'à trier'}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={{ backgroundColor: tint(C.gold, 0.16), borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: F.monoSemi, fontSize: 9, color: C.goldText }}>à traiter</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 13.5, color: C.ink, lineHeight: 19 }} numberOfLines={2}>{f.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <Icon name="link" size={11} color={C.cobalt} />
                  <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }} numberOfLines={1}>{f.source || hostOf(f.url)} · {hostOf(f.url)}</Text>
                </View>
              </TouchableOpacity>
              {i < arr.length - 1 && <Rule style={{ marginHorizontal: 14 }} />}
            </View>
          );
        })}
      </Card>
      <Text style={{ fontFamily: F.body, fontSize: 11, color: C.inkMut, marginTop: 8, lineHeight: 15 }}>
        Ces infos ont été captées automatiquement et attendent l’analyse PESTEL. Rien n’est omis en silence.
      </Text>
    </View>
  );
}

// « À la une » = UN SEUL fil classé. Le secteur choisi RE-CLASSE la Une : ses items passent EN TÊTE
// (badgés « pour vous »), puis l'essentiel national suit — sans jamais masquer le national.
export default function Home({ ed, onOpen, sector, onChangeSector, feed = [] }) {
  const sec = sectorByKey(sector);
  const secItems = sec ? sectorItems(ed, sector) : [];
  const secCodes = new Set(secItems.map((i) => i.code));
  const hasSec = sec && secItems.length > 0;

  // Fusion : au plus 3 items secteur en tête, puis les titres nationaux non déjà présents. Numérotation continue.
  const lead = secItems.slice(0, 3).map((it) => ({ ...it, _forYou: true }));
  const nationals = ed.headline.filter((h) => !secCodes.has(h.code)).map((h) => ({ ...h, _forYou: false }));
  const laUne = [...lead, ...nationals];

  const lens = hasSec
    ? `votre secteur en tête · puis l'essentiel national`
    : 'les faits qui comptent aujourd’hui';

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.cobalt, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Édition du {ed.label}
      </Text>
      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.ink, marginTop: 5, lineHeight: 20 }}>
        {SLOGAN}
      </Text>
      <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.inkMut, marginTop: 6, marginBottom: 16 }}>
        Focale · {ed.focus}
      </Text>

      {/* En-tête de la Une : titre + « loupe » + chip secteur (le secteur RE-CLASSE ce fil). */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 21, color: C.ink, letterSpacing: 0.2 }}>⭐ À la une</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut, marginTop: 3 }}>{lens}</Text>
        </View>
        <SectorChip sec={sec} onPress={onChangeSector} />
      </View>

      {/* Bandeau discret quand un secteur est choisi mais sans nouveauté du jour (silence non-présomptif). */}
      {sec && !hasSec ? (
        <View style={{ marginBottom: 12, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: C.inkDim, lineHeight: 17 }}>
            🎯 {sec.label} — rien de neuf aujourd’hui. Voici l’essentiel national.
          </Text>
        </View>
      ) : null}

      {laUne.map((h, i) => {
        const c = AX[h.axis] || C.cobalt;
        const ct = AXT[h.axis] || C.cobalt;   // texte AA
        return (
          <Card key={`${h._forYou ? 's' : 'n'}-${h.code}`} accent={h._forYou ? C.cobalt : c} onPress={() => onOpen(h.code)} style={{ padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 30, color: tint(h._forYou ? C.cobalt : c, 0.85) }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {h._forYou ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tint(C.cobalt, 0.12), borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10 }}>🎯</Text>
                    <Text style={{ fontFamily: F.monoSemi, fontSize: 9.5, color: C.cobalt }} numberOfLines={1}>pour vous · {sec.label}</Text>
                  </View>
                ) : null}
                <CodeChip code={h.code} />
              </View>
            </View>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: C.ink, lineHeight: 22, marginBottom: 6 }}>
              {h.title}
            </Text>
            {h.text ? (
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkDim, lineHeight: 19 }} numberOfLines={4}>
                {h.text}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: ct }}>Approfondir</Text>
              <Icon name="chevron" size={14} color={ct} />
            </View>
          </Card>
        );
      })}

      <ToTreatSection feed={feed} />

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
