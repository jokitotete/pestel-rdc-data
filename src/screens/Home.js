import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { C, AX, AXT, AX_SHORT, AX_ORDER, RUBRIQUES, tint, pick, SP, TYPE, RADIUS, HIT, isFollowableAxis , fmtJour} from '../theme';
import { Card, SectionHead, Pill, Icon, Rule, AxisGlyph, SectorGlyph, NewsCard, PageHeader, SourceLine } from '../ui';
import { allItems, upcomingEvents, primarySource, findItem, followedItems } from '../store';
import { SECTORS, itemInSector } from '../sectors';
import { confirmOpenURL, hostOf, isSafeUrl } from '../safeUrl';
import { DiversList } from './Triage';

// Groupe de filtres étiqueté (rangée horizontale de pastilles) — identique à « Axes ».
const FilterRow = ({ label, children }) => (
  <>
    <Text style={[TYPE.overline, { color: C.inkMut, marginLeft: SP.hair, marginBottom: SP.sm }]}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.md2, marginHorizontal: -SP.gutter }} contentContainerStyle={{ paddingHorizontal: SP.gutter, gap: SP.sm }}>
      {children}
    </ScrollView>
  </>
);

// Fil « À traiter » (collecte étage 1) : infos captées du jour, pas encore décryptées. Rend l'OMISSION
// VISIBLE. On n'affiche que les items à URL https sûre ; ouverture via confirmOpenURL (domaine + confirm).
// Plafond d'affichage : au-delà, la carte devient un mur. On PLAFONNE le rendu — on ne JETTE rien,
// et on écrit combien reste dessous (cf. ci-dessous : c'était le mensonge le plus grave du fascicule).
const CAP_A_TRAITER = 12;

function ToTreatSection({ feed }) {
  // QA v1.4 — « Rien n'est écarté en silence » (fascicule commercial) était FAUX, et vérifié faux :
  //   • `.slice(0, 12)` jetait 18 des 30 captées SANS le dire ;
  //   • `isSafeUrl` écarte les liens non-https, aussi en silence.
  // La page qui vend « nous vous montrons nos trous » avait son propre trou, et le cachait. C'est le
  // pire échec possible pour CE produit : montrer l'omission est le seul attribut qu'un concurrent
  // gratuit ne peut pas copier. On corrige le CODE, pas la promesse — affaiblir la phrase aurait
  // sacrifié la valeur du produit pour couvrir une paresse d'implémentation.
  const sains = (feed || []).filter((f) => f && f.title);
  const ouvrables = sains.filter((f) => isSafeUrl(f.url));
  const nonOuvrables = sains.length - ouvrables.length;     // lien non https : montré, jamais effacé
  const items = ouvrables.slice(0, CAP_A_TRAITER);
  const enPlus = ouvrables.length - items.length;           // plafonnées pour tenir l'écran, PAS jetées
  if (!sains.length) return null;
  return (
    <View style={{ marginTop: SP.xl2 }}>
      <SectionHead title="À traiter" icon="triage"
        lens={`${sains.length} captée${sains.length > 1 ? 's' : ''} · à décrypter`} />
      <Card style={{ paddingVertical: SP.xs }}>
        {items.map((f, i, arr) => {
          const ct = pick(AXT, f.axis, C.inkDim);   // RS3 : prototype-safe (f.axis vient du feed NON FIABLE)
          return (
            <View key={i}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => confirmOpenURL(f.url)}
                accessibilityRole="link" accessibilityLabel={`Ouvrir ${hostOf(f.url)} : ${f.title}`}
                style={{ paddingVertical: SP.md, paddingHorizontal: SP.md2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginBottom: SP.xs }}>
                  {f.axis && f.axis !== '?' ? <AxisGlyph axis={f.axis} size={13} /> : null}
                  <Text style={[TYPE.mono, { color: ct }]}>{f.axisLabel || 'à trier'}</Text>
                  <View style={{ flex: 1 }} />
                  {/* La DATE de parution — 30/30 items la portent en donnée, aucun ne l'affichait.
                      Elle rend visible la péremption du fil (le 15/07, il servait des items du 13/07). */}
                  {fmtJour(f.publishedAt) ? (
                    <Text style={[TYPE.mono, { color: C.inkMut }]}>{fmtJour(f.publishedAt)}</Text>
                  ) : null}
                  <View style={{ backgroundColor: tint(C.gold, 0.16), borderRadius: RADIUS.chip, paddingHorizontal: SP.sm, paddingVertical: SP.hair }}>
                    <Text style={[TYPE.mono, { color: C.goldText }]}>à traiter</Text>
                  </View>
                </View>
                <Text style={[TYPE.cardTitle, { color: C.ink }]} numberOfLines={2}>{f.title}</Text>
                <SourceLine source={{ name: f.source, host: hostOf(f.url) }} style={{ marginTop: SP.xs }} />
              </TouchableOpacity>
              {i < arr.length - 1 && <Rule style={{ marginHorizontal: SP.md2 }} />}
            </View>
          );
        })}
        {/* CE QUI N'EST PAS MONTRÉ — le pied qui rend la phrase « rien n'est écarté en silence » VRAIE.
            Sans lui, 18 captées sur 30 disparaissaient sans trace. */}
        {enPlus || nonOuvrables ? (
          <>
            <Rule style={{ marginHorizontal: SP.md2 }} />
            <View style={{ paddingVertical: SP.md, paddingHorizontal: SP.md2 }}>
              {enPlus ? (
                <Text style={[TYPE.bodySm, { color: C.inkMut }]}>
                  {`+ ${enPlus} autre${enPlus > 1 ? 's' : ''} captée${enPlus > 1 ? 's' : ''} aujourd’hui, non affichée${enPlus > 1 ? 's' : ''} ici.`}
                </Text>
              ) : null}
              {nonOuvrables ? (
                <Text style={[TYPE.bodySm, { color: C.goldText, marginTop: enPlus ? SP.xs : 0 }]}>
                  {`${nonOuvrables} captée${nonOuvrables > 1 ? 's' : ''} non ouvrable${nonOuvrables > 1 ? 's' : ''} : lien non sécurisé (http).`}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </Card>
    </View>
  );
}

// Liste d'items filtrés (axe / rubrique / secteur) — cartes « langage vivant » (NewsCard).
function FilteredList({ items, emptyLabel, isRubrique, onOpen, ed }) {
  if (!items.length) {
    return (
      <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.xl, textAlign: 'center' }]}>
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
      <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.xl, textAlign: 'center' }]}>
        Aucun rendez-vous daté sur les 3 prochaines semaines.{'\n'}Rubrique alimentée par les agendas des prochaines veilles.
      </Text>
    );
  }
  return (
    <Card style={{ paddingVertical: SP.xs }}>
      {events.map((e, i, arr) => (
        <View key={i}>
          <TouchableOpacity activeOpacity={e.code ? 0.7 : 1} onPress={() => e.code && onOpenEvent && onOpenEvent(e.code, e.edDate)}
            accessibilityRole={e.code ? 'button' : 'text'} accessibilityLabel={e.what}
            style={{ flexDirection: 'row', gap: SP.sm2, paddingVertical: SP.md, paddingHorizontal: SP.md2, alignItems: 'flex-start' }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: tint(Ec, 0.14), borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.xs, marginTop: SP.hair }}>
              <Text style={[TYPE.mono, { color: AXT.Ev || C.ink }]} numberOfLines={1}>{e.when}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.bodySm, { color: C.inkDim }]}>{e.what}</Text>
              {e.code ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginTop: SP.xs2 }}>
                  <Text style={[TYPE.label, { color: AXT.Ev || C.cobalt }]}>voir le dossier</Text>
                  <AxisGlyph axis="Ev" size={12} />
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          {i < arr.length - 1 ? <Rule style={{ marginHorizontal: SP.md2 }} /> : null}
        </View>
      ))}
    </Card>
  );
}

// « À la une » — filtres IDENTIQUES à « Axes » : 3 groupes (Axes PESTEL · Rubriques · Secteurs transversaux).
// Sans filtre (« Tous ») : l'essentiel national + le fil « À traiter » + l'agenda.
export default function Home({ ed, onOpen, feed = [], triage = [], onOpenEvent, onRefresh, refreshing, seed, onSeedApplied, follows = [], isFollowing, onToggleFollow }) {
  const [filter, setFilter] = useState({ type: 'all' });   // {type:'all'|'axis'|'sector'|'divers'|'follow', key}
  // RS1-19/20 : applique un filtre semé par un lien croisé (item→axe/secteur), puis le consomme (one-shot).
  useEffect(() => { if (seed && seed.filter) { setFilter(seed.filter); onSeedApplied && onSeedApplied(); } }, [seed]);
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
      : filter.type === 'follow'
        ? { eyebrow: 'Le Réveil', title: 'Pour vous', subtitle: 'les axes et secteurs que vous suivez' }
        : filter.type === 'axis'
          ? { eyebrow: isRubrique ? 'Rubrique' : 'Axe PESTEL', title: AX_SHORT[filter.key], subtitle: isEvents ? 'rendez-vous à venir · 3 semaines' : 'les faits de cet axe' }
          : { eyebrow: 'Aujourd’hui', title: 'À la une', subtitle: 'les faits qui comptent aujourd’hui' };

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.cobalt} colors={[C.cobalt]} /> : undefined}>
      <PageHeader eyebrow={header.eyebrow} title={header.title} subtitle={header.subtitle}
        glyph={header.sector && sector ? <SectorGlyph sectorKey={sector.key} size={16} active /> : undefined} />

      {/* Filtres — identiques à « Axes » (+ « Pour vous » RS1-23 si des sujets sont suivis) */}
      <FilterRow label="AXES PESTEL">
        {follows && follows.length ? (
          <Pill label="Pour vous" icon="star" active={filter.type === 'follow'} onPress={() => setFilter(filter.type === 'follow' ? { type: 'all' } : { type: 'follow' })} />
        ) : null}
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

      {/* RS1-23 : « Suivre » un axe/secteur filtré — bascule locale qui alimente « Pour vous ».
          QA v1.2 : n'offrir le suivi QUE là où « Pour vous » saura rendre quelque chose. Events (axe synthétique)
          affichait 12 rendez-vous et proposait « Suivre » — mais aucun item ne porte axis:'Ev', donc « Pour vous »
          restait vide À PERPÉTUITÉ alors que le bouton affichait « Suivi ». Signature F2 exacte : offrir une action
          dont le résultat est calculé par un prédicat DIFFÉRENT de celui qui a produit la liste affichée. */}
      {onToggleFollow && ((filter.type === 'axis' && isFollowableAxis(filter.key)) || filter.type === 'sector') ? (() => {
        const following = isFollowing && isFollowing(filter.type, filter.key);
        return (
          <TouchableOpacity onPress={() => onToggleFollow(filter.type, filter.key)} accessibilityRole="button"
            accessibilityState={{ selected: !!following }} accessibilityLabel={following ? 'Ne plus suivre ce sujet' : 'Suivre ce sujet'} hitSlop={HIT.sm}
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: SP.xs, minHeight: 36, paddingHorizontal: SP.md, marginBottom: SP.md, borderRadius: RADIUS.chip, backgroundColor: following ? C.actionFill : C.panel, borderWidth: 1, borderColor: following ? C.actionFill : C.border }}>
            <Icon name={following ? 'star-on' : 'star'} size={14} color={following ? C.onAction : C.cobalt} />
            <Text style={[TYPE.label, { color: following ? C.onAction : C.cobalt }]}>{following ? 'Suivi' : 'Suivre ce sujet'}</Text>
          </TouchableOpacity>
        );
      })() : null}

      {filter.type === 'follow' ? (
        <FilteredList items={followedItems(ed, follows)} emptyLabel={'Aucun article de vos sujets suivis dans cette édition.'} isRubrique={false} onOpen={onOpen} ed={ed} />
      ) : filter.type === 'divers' ? (
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
            <View style={{ marginTop: SP.gutter }}>
              <SectionHead title="À suivre" icon="calendar" lens="agenda des prochains jalons" />
              <Card style={{ paddingVertical: SP.xs }}>
                {ed.agenda.slice(0, 5).map((a, i, arr) => (
                  <View key={i}>
                    <View style={{ flexDirection: 'row', gap: SP.md, paddingVertical: SP.md, paddingHorizontal: SP.md2, alignItems: 'flex-start' }}>
                      <Text style={[TYPE.mono, { color: C.inkDim, width: 92 }]}>{a.when}</Text>
                      <Text style={[TYPE.bodySm, { color: C.inkDim, flex: 1 }]}>{a.what}</Text>
                    </View>
                    {i < arr.length - 1 && <Rule style={{ marginHorizontal: SP.md2 }} />}
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
