import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { C, F, AX, AXT, AX_SHORT, AX_ORDER, RUBRIQUES, tint, pick, SP, TYPE, RADIUS } from '../theme';
import { Card, RelBadge, Pill, AxisGlyph, PageHeader, SourceLine, Icon } from '../ui';
import { SECTORS, itemInSector } from '../sectors';
import { upcomingEvents, primarySource } from '../store';
import { DiversList } from './Triage';

// Groupe de filtres étiqueté (rangée horizontale de pastilles).
const FilterRow = ({ label, children }) => (
  <>
    <Text style={[TYPE.overline, { color: C.inkMut, marginLeft: SP.hair, marginBottom: SP.sm }]}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.md2, marginHorizontal: -SP.gutter }} contentContainerStyle={{ paddingHorizontal: SP.gutter, gap: SP.sm }}>
      {children}
    </ScrollView>
  </>
);

// « Décryptage » — navigation par AXE PESTEL, par RUBRIQUE (Culture & Arts, Sports) ou par SECTEUR transversal.
export default function Axes({ ed, onOpen, triage = [], onOpenEvent, seed, onSeedApplied }) {
  const [filter, setFilter] = useState({ type: 'all' }); // {type:'all'|'axis'|'sector'|'divers', key}
  // RS1-19/20 : filtre semé par un lien croisé (item→axe/secteur depuis le Détail), consommé une fois.
  useEffect(() => { if (seed && seed.filter) { setFilter(seed.filter); onSeedApplied && onSeedApplied(); } }, [seed]);
  const sector = filter.type === 'sector' ? SECTORS.find((s) => s.key === filter.key) : null;

  const axes = ed.axes
    .filter((a) => filter.type !== 'axis' || a.key === filter.key)
    .map((a) => ({ ...a, items: sector ? a.items.filter((it) => itemInSector(it, sector)) : a.items }))
    .filter((a) => a.items.length > 0);
  const total = axes.reduce((n, a) => n + a.items.length, 0);

  const activeLabel = filter.type === 'sector' ? (sector && sector.label)
    : filter.type === 'axis' ? AX_SHORT[filter.key]
      : filter.type === 'divers' ? 'Divers' : null;
  const isRubrique = filter.type === 'axis' && RUBRIQUES.indexOf(filter.key) >= 0;
  const isEvents = filter.type === 'axis' && filter.key === 'Ev';   // Events = agrégat 3 semaines (P3)

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="PESTEL" title="Axes" subtitle="décrypter l’actualité, axe par axe" />
      {/* Groupe 1 : Axes PESTEL */}
      <FilterRow label="AXES PESTEL">
        <Pill label="Tous" active={filter.type === 'all'} onPress={() => setFilter({ type: 'all' })} />
        {AX_ORDER.map((k) => {
          const a = ed.axes.find((x) => x.key === k);
          if (!a) return null;
          return <Pill key={k} label={a.short || a.name} axis={k} active={filter.type === 'axis' && filter.key === k} onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />;
        })}
      </FilterRow>

      {/* Groupe 2 : Rubriques (hors PESTEL) — « Divers » (captées non classées) à côté d'Events */}
      <FilterRow label="RUBRIQUES">
        {RUBRIQUES.map((k) => (
          <Pill key={k} label={AX_SHORT[k]} axis={k} active={filter.type === 'axis' && filter.key === k} onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />
        ))}
        <Pill label="Divers" icon="triage" active={filter.type === 'divers'} onPress={() => setFilter(filter.type === 'divers' ? { type: 'all' } : { type: 'divers' })} />
      </FilterRow>

      {/* Groupe 3 : Secteurs transversaux */}
      <FilterRow label="SECTEURS TRANSVERSAUX">
        {SECTORS.map((s) => (
          <Pill key={s.key} label={s.label} sectorKey={s.key} active={filter.type === 'sector' && filter.key === s.key} onPress={() => setFilter(filter.type === 'sector' && filter.key === s.key ? { type: 'all' } : { type: 'sector', key: s.key })} />
        ))}
      </FilterRow>

      {/* Bandeau de contexte quand un filtre est actif (hors Events, qui a sa propre vue) */}
      {activeLabel && !isEvents ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.xs, marginBottom: SP.md2 }}>
          <Text style={[TYPE.label, { color: filter.type === 'divers' ? C.ink : pick(AXT, filter.key, C.cobalt) }]}>{activeLabel}</Text>
          {filter.type === 'sector' ? <Text style={[TYPE.caption, { color: C.inkMut }]}>tous axes confondus</Text>
            : filter.type === 'divers' ? <Text style={[TYPE.caption, { color: C.inkMut }]}>capté automatiquement, hors classement</Text> : null}
        </View>
      ) : null}

      {filter.type === 'divers' ? (
        <DiversList items={triage} />
      ) : isEvents ? (
        <EventsList onOpenEvent={onOpenEvent} />
      ) : total === 0 ? (
        <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.xl, textAlign: 'center' }]}>
          {activeLabel ? `Aucun item « ${activeLabel} » dans cette édition.` : 'Aucun item.'}
          {isRubrique ? '\nRubrique couverte à partir des prochaines veilles.' : ''}
        </Text>
      ) : axes.map((a) => {
        const c = pick(AX, a.key, C.cobalt);   // RS3 : prototype-safe (a.key vient de l'édition NON FIABLE)
        return (
          <View key={a.key} style={{ marginBottom: SP.xl2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm2, marginBottom: SP.sm2 }}>
              <View style={{ width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: tint(c, 0.15), borderWidth: 1, borderColor: tint(c, 0.4), alignItems: 'center', justifyContent: 'center' }}>
                <AxisGlyph axis={a.key} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.serifLead, { color: C.ink }]}>{a.short || a.name}</Text>
                <Text style={[TYPE.caption, { color: C.inkMut }]}>{a.lens}</Text>
              </View>
              <View style={{ backgroundColor: tint(c, 0.14), borderRadius: RADIUS.chip, paddingHorizontal: SP.sm, paddingVertical: SP.xs }}>
                <Text style={[TYPE.mono, { color: pick(AXT, a.key, C.ink) }]}>{a.items.length}</Text>
              </View>
            </View>

            {a.items.map((it) => (
              <Card key={it.code} accent={c} onPress={() => onOpen(it.code)} style={{ padding: SP.md2, marginBottom: SP.sm }}>
                <Text style={[TYPE.cardTitle, { color: C.ink, marginBottom: SP.xs }]} numberOfLines={3}>
                  {it.title}
                </Text>
                <Text style={[TYPE.bodySm, { color: C.inkDim }]} numberOfLines={2}>
                  {it.text}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SP.sm, gap: SP.sm }}>
                  <SourceLine source={primarySource(ed, it)} style={{ flex: 1 }} />
                  <RelBadge reliability={it.reliability} />
                  <Icon name="chevron" size={15} color={C.inkMut} />
                </View>
              </Card>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// Events (P3, NB1) — rendez-vous à venir sur une fenêtre glissante de 3 semaines, agrégés des AGENDAS
// RÉELS de toutes les éditions (sourcés via leur code, non fabriqués). La ligne ouvre le dossier lié.
function EventsList({ onOpenEvent }) {
  const events = upcomingEvents(21);
  const Ec = AX.Ev || C.cobalt;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.xs, marginBottom: SP.md2 }}>
        <AxisGlyph axis="Ev" size={15} />
        <Text style={[TYPE.label, { color: AXT.Ev || C.cobalt }]}>Events</Text>
        <Text style={[TYPE.caption, { color: C.inkMut }]}>rendez-vous à venir · 3 semaines</Text>
      </View>
      {events.length === 0 ? (
        <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.xl, textAlign: 'center' }]}>
          Aucun rendez-vous daté sur les 3 prochaines semaines.{'\n'}Rubrique alimentée par les agendas des prochaines veilles.
        </Text>
      ) : (
        <Card style={{ paddingVertical: SP.xs }}>
          {events.map((e, i) => (
            <View key={i}>
              <TouchableOpacity activeOpacity={e.code ? 0.7 : 1} onPress={() => e.code && onOpenEvent(e.code, e.edDate)}
                accessibilityRole={e.code ? 'button' : 'text'} accessibilityLabel={e.what}
                style={{ flexDirection: 'row', gap: SP.sm2, paddingVertical: SP.md, paddingHorizontal: SP.md2, alignItems: 'flex-start' }}>
                <View style={{ alignSelf: 'flex-start', backgroundColor: tint(Ec, 0.14), borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.xs, marginTop: SP.hair }}>
                  <Text style={[TYPE.mono, { color: AXT.Ev || C.ink }]} numberOfLines={1}>{e.when}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[TYPE.bodySm, { color: C.inkDim }]}>{e.what}</Text>
                  {e.code ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, marginTop: SP.xs2 }}>
                      <Text style={[TYPE.label, { color: AXT.Ev || C.cobalt }]}>voir le dossier</Text>
                      <AxisGlyph axis="Ev" size={12} />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
              {i < events.length - 1 ? <View style={{ height: 1, backgroundColor: C.border2, marginHorizontal: SP.md2 }} /> : null}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
