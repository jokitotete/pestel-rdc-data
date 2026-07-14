import React, { useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { C, F, AX, AXT, AX_SHORT, AX_ORDER, RUBRIQUES, tint, pick } from '../theme';
import { Card, SectionHead, Pill, Icon, Rule, AxisGlyph, SectorGlyph, NewsCard, PageHeader, SourceLine } from '../ui';
import { allItems, upcomingEvents, primarySource, findItem } from '../store';
import { SECTORS, itemInSector } from '../sectors';
import { confirmOpenURL, hostOf, isSafeUrl } from '../safeUrl';
import { DiversList } from './Triage';

// Groupe de filtres étiqueté (rangée horizontale de pastilles) — identique à « Axes ».
const FilterRow = ({ label, children }) => (
  <>
    <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMut, letterSpacing: 0.8, marginLeft: 2, marginBottom: 7 }}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
      {children}
    </ScrollView>
  </>
);

// Fil « À traiter » (collecte étage 1) : infos captées du jour, pas encore décryptées. Rend l'OMISSION
// VISIBLE. On n'affiche que les items à URL https sûre ; ouverture via confirmOpenURL (domaine + confirm).
function ToTreatSection({ feed }) {
  const items = (feed || []).filter((f) => f && f.title && isSafeUrl(f.url)).slice(0, 12);
  if (!items.length) return null;
  return (
    <View style={{ marginTop: 22 }}>
      <SectionHead title="À traiter" icon="triage" lens="capté aujourd’hui · à décrypter" />
      <Card style={{ paddingVertical: 4 }}>
        {items.map((f, i, arr) => {
          const ct = pick(AXT, f.axis, C.inkDim);   // RS3 : prototype-safe (f.axis vient du feed NON FIABLE)
          return (
            <View key={i}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => confirmOpenURL(f.url)}
                accessibilityRole="link" accessibilityLabel={`Ouvrir ${hostOf(f.url)} : ${f.title}`}
                style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {f.axis && f.axis !== '?' ? <AxisGlyph axis={f.axis} size={13} /> : null}
                  <Text style={{ fontFamily: F.monoSemi, fontSize: 10, color: ct }}>{f.axisLabel || 'à trier'}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={{ backgroundColor: tint(C.gold, 0.16), borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: F.monoSemi, fontSize: 9, color: C.goldText }}>à traiter</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 13.5, color: C.ink, lineHeight: 19 }} numberOfLines={2}>{f.title}</Text>
                <SourceLine source={{ name: f.source, host: hostOf(f.url) }} style={{ marginTop: 3 }} />
              </TouchableOpacity>
              {i < arr.length - 1 && <Rule style={{ marginHorizontal: 14 }} />}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

// Liste d'items filtrés (axe / rubrique / secteur) — cartes « langage vivant » (NewsCard).
function FilteredList({ items, emptyLabel, isRubrique, onOpen, ed }) {
  if (!items.length) {
    return (
      <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkMut, paddingVertical: 20, textAlign: 'center', lineHeight: 19 }}>
        {emptyLabel}
        {isRubrique ? '\nRubrique couverte à partir des prochaines veilles.' : ''}
      </Text>
    );
  }
  return (
    <View>
      {items.map((it) => (
        <NewsCard key={it.code} axis={it.axis} title={it.title} text={it.text}
          reliability={it.reliability} source={primarySource(ed, it)} onPress={() => onOpen(it.code)} titleLines={3} />
      ))}
    </View>
  );
}

// (Bandeau « Votre Une · [secteur] » désormais rendu par le composant PARTAGÉ PageHeader — cf. ui.js.)

// Vue « Events » (rubrique Ev) — rendez-vous à venir agrégés sur 3 semaines (agendas réels, sourcés).
function EventsView({ onOpenEvent }) {
  const events = upcomingEvents(21);
  const Ec = AX.Ev || C.cobalt;
  if (!events.length) {
    return (
      <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkMut, paddingVertical: 20, textAlign: 'center', lineHeight: 19 }}>
        Aucun rendez-vous daté sur les 3 prochaines semaines.{'\n'}Rubrique alimentée par les agendas des prochaines veilles.
      </Text>
    );
  }
  return (
    <Card style={{ paddingVertical: 4 }}>
      {events.map((e, i, arr) => (
        <View key={i}>
          <TouchableOpacity activeOpacity={e.code ? 0.7 : 1} onPress={() => e.code && onOpenEvent && onOpenEvent(e.code, e.edDate)}
            accessibilityRole={e.code ? 'button' : 'text'} accessibilityLabel={e.what}
            style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'flex-start' }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: tint(Ec, 0.14), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 1 }}>
              <Text style={{ fontFamily: F.monoSemi, fontSize: 10, color: AXT.Ev || C.ink }} numberOfLines={1}>{e.when}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkDim, lineHeight: 18 }}>{e.what}</Text>
              {e.code ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  <Text style={{ fontFamily: F.bodySemi, fontSize: 11, color: AXT.Ev || C.cobalt }}>voir le dossier</Text>
                  <AxisGlyph axis="Ev" size={12} />
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          {i < arr.length - 1 ? <Rule style={{ marginHorizontal: 14 }} /> : null}
        </View>
      ))}
    </Card>
  );
}

// « À la une » — filtres IDENTIQUES à « Axes » : 3 groupes (Axes PESTEL · Rubriques · Secteurs transversaux).
// Sans filtre (« Tous ») : l'essentiel national + le fil « À traiter » + l'agenda.
export default function Home({ ed, onOpen, feed = [], triage = [], onOpenEvent, onRefresh, refreshing }) {
  const [filter, setFilter] = useState({ type: 'all' });   // {type:'all'|'axis'|'sector'|'divers', key}
  const sector = filter.type === 'sector' ? SECTORS.find((s) => s.key === filter.key) : null;

  const items = filter.type === 'axis'
    ? allItems(ed).filter((it) => it.axis === filter.key)
    : filter.type === 'sector'
      ? allItems(ed).filter((it) => itemInSector(it, sector))
      : [];

  const activeLabel = filter.type === 'sector' ? (sector && sector.label) : filter.type === 'axis' ? AX_SHORT[filter.key] : null;
  const isRubrique = filter.type === 'axis' && RUBRIQUES.indexOf(filter.key) >= 0;
  const isEvents = filter.type === 'axis' && filter.key === 'Ev';

  // En-tête de page (bandeau cobalt unifié) : CONTEXTE de l'écran, SANS fraîcheur (déjà dans l'en-tête Ntongo)
  // ni compteur technique (retours user). Le secteur porte son glyphe ; sinon kicker « Édition/Axe/Rubrique ».
  const header = filter.type === 'sector'
    ? { eyebrow: 'Votre Une', title: sector ? sector.label : 'Secteur', subtitle: 'les actualités de votre secteur', sector: true }
    : filter.type === 'divers'
      ? { eyebrow: 'En vrac', title: 'Divers', subtitle: 'capté automatiquement, hors classement PESTEL' }
      : filter.type === 'axis'
        ? { eyebrow: isRubrique ? 'Rubrique' : 'Axe PESTEL', title: AX_SHORT[filter.key], subtitle: isEvents ? 'rendez-vous à venir · 3 semaines' : 'les faits de cet axe' }
        : { eyebrow: 'Aujourd’hui', title: 'À la une', subtitle: 'les faits qui comptent aujourd’hui' };

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.cobalt} colors={[C.cobalt]} /> : undefined}>
      <PageHeader eyebrow={header.eyebrow} title={header.title} subtitle={header.subtitle}
        glyph={header.sector && sector ? <SectorGlyph sectorKey={sector.key} size={16} active /> : undefined} />

      {/* Filtres — identiques à « Axes » */}
      <FilterRow label="AXES PESTEL">
        <Pill label="Tous" active={filter.type === 'all'} onPress={() => setFilter({ type: 'all' })} />
        {AX_ORDER.map((k) => (
          <Pill key={k} label={AX_SHORT[k]} axis={k} active={filter.type === 'axis' && filter.key === k} onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />
        ))}
      </FilterRow>
      <FilterRow label="RUBRIQUES">
        {RUBRIQUES.map((k) => (
          <Pill key={k} label={AX_SHORT[k]} axis={k} active={filter.type === 'axis' && filter.key === k} onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />
        ))}
        <Pill label="Divers" icon="triage" active={filter.type === 'divers'} onPress={() => setFilter(filter.type === 'divers' ? { type: 'all' } : { type: 'divers' })} />
      </FilterRow>
      <FilterRow label="SECTEURS TRANSVERSAUX">
        {SECTORS.map((s) => (
          <Pill key={s.key} label={s.label} sectorKey={s.key} active={filter.type === 'sector' && filter.key === s.key} onPress={() => setFilter(filter.type === 'sector' && filter.key === s.key ? { type: 'all' } : { type: 'sector', key: s.key })} />
        ))}
      </FilterRow>

      {filter.type === 'divers' ? (
        <DiversList items={triage} />
      ) : isEvents ? (
        <EventsView onOpenEvent={onOpenEvent} />
      ) : filter.type !== 'all' ? (
        <FilteredList items={items} emptyLabel={`Aucun item « ${activeLabel} » dans cette édition.`} isRubrique={isRubrique} onOpen={onOpen} ed={ed} />
      ) : (
        <>
          {ed.headline.map((h, i) => (
            <NewsCard key={h.code} axis={h.axis} rank={String(i + 1).padStart(2, '0')}
              title={h.title} text={h.text} reliability={h.reliability} cta="Approfondir"
              source={primarySource(ed, findItem(ed, h.code) || h)} onPress={() => onOpen(h.code)} titleLines={3} />
          ))}

          <ToTreatSection feed={feed} />

          {ed.agenda && ed.agenda.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <SectionHead title="À suivre" icon="calendar" lens="agenda des prochains jalons" />
              <Card style={{ paddingVertical: 4 }}>
                {ed.agenda.slice(0, 5).map((a, i, arr) => (
                  <View key={i}>
                    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'flex-start' }}>
                      <Text style={{ fontFamily: F.monoSemi, fontSize: 11.5, color: C.inkDim, width: 92 }}>{a.when}</Text>
                      <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkDim, flex: 1, lineHeight: 18 }}>{a.what}</Text>
                    </View>
                    {i < arr.length - 1 && <Rule style={{ marginHorizontal: 14 }} />}
                  </View>
                ))}
              </Card>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
