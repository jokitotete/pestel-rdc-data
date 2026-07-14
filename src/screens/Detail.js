import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, Share } from 'react-native';
import { C, F, AX, AXT, tint, pick, relFr, relIsOk, TYPE, SP, RADIUS, HIT } from '../theme';
import { RelBadge, SrcDot, Icon, Rule, AxisGlyph, StateView } from '../ui';
import { findItem, sourcesFor, primarySource } from '../store';
import { confirmOpenURL, hostOf, isSafeUrl } from '../safeUrl';

// Zoom sur un item : texte intégral, analyse, contexte, chronologie, acteurs, perspectives, sources.
export default function Detail({ ed, code, onOpen, isFav, onToggleFav }) {
  const it = findItem(ed, code);
  // ROB-04 : jamais de feuille MUETTE. Un code introuvable (agenda orphelin, course de synchro) affiche
  // un état vide EXPLICITE au lieu de `return null` (qui laissait une modale sans contenu ni message).
  if (!it) return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <StateView glyph="triage" title="Dossier indisponible"
        body="Cet élément n'existe pas (ou plus) dans l'édition affichée. Il a pu changer lors d'une mise à jour." />
    </View>
  );
  const c = pick(AX, it.axis, C.cobalt);   // graphique (bordure/tint/point) — RS3 : prototype-safe
  const ct = pick(AXT, it.axis, C.ink);    // texte conforme AA — RS3 : prototype-safe
  const z = it.zoom || {};
  const srcs = sourcesFor(ed, it.sources);
  const psrc = primarySource(ed, it);

  // Partager (P2 PO) — feuille de partage système : titre + source + URL (uniquement si https sûre, SEC) +
  // signature. Aucune donnée perso ; hors-ligne OK (intent système).
  const onShare = () => {
    const url = psrc && psrc.url && isSafeUrl(psrc.url) ? psrc.url : null;
    const msg = [it.title, psrc && psrc.name ? `— ${psrc.name}` : null, url, 'via Ntongo · RDC'].filter(Boolean).join('\n');
    Share.share({ message: msg, title: it.title }).catch(() => {});
  };

  // FAVORIS — snapshot complet (autonome de l'édition) : reste affichable quel que soit le jour.
  const favId = `${ed.date}:${it.code}`;
  const starred = isFav ? isFav(favId) : false;
  const toggleStar = () => onToggleFav && onToggleFav({
    id: favId, edDate: ed.date, code: it.code, axis: it.axis, axisName: it.axisName,
    title: it.title, text: it.text, reliability: it.reliability, source: psrc,
  });

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.giant }} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.md }}>
        <AxisGlyph axis={it.axis} size={16} />
        <Text style={[TYPE.label, { color: ct }]}>{it.axisName}</Text>
        <View style={{ flex: 1 }} />
        <RelBadge reliability={it.reliability} />
        <TouchableOpacity onPress={toggleStar} hitSlop={HIT.md} accessibilityRole="button"
          accessibilityState={{ selected: starred }} accessibilityLabel={starred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          style={{ minHeight: 32, justifyContent: 'center', paddingLeft: SP.xs }}>
          <Icon name={starred ? 'star-on' : 'star'} size={19} color={starred ? C.gold : C.inkDim} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} hitSlop={HIT.md} accessibilityRole="button" accessibilityLabel="Partager cet article"
          style={{ minHeight: 32, justifyContent: 'center', paddingLeft: SP.xs }}>
          <Icon name="share" size={18} color={C.cobalt} />
        </TouchableOpacity>
      </View>

      <Text style={[TYPE.serifLead, { color: C.ink, marginBottom: SP.md2 }]}>
        {it.title}
      </Text>

      <Text style={[TYPE.body, { color: C.inkDim }]}>{it.text}</Text>

      {/* Analyse */}
      {it.analysis ? (
        <View style={{ backgroundColor: tint(c, 0.08), borderLeftWidth: 3, borderLeftColor: c, borderRadius: RADIUS.md, padding: SP.md2, marginTop: SP.lg }}>
          <Text style={[TYPE.overline, { color: ct, textTransform: 'uppercase', marginBottom: SP.xs2 }]}>Analyse</Text>
          <Text style={[TYPE.body, { color: C.inkDim, fontStyle: 'italic' }]}>{it.analysis}</Text>
        </View>
      ) : null}

      {/* Contexte */}
      {z.context ? (
        <Block title="Contexte">
          <Text style={[TYPE.body, { color: C.inkDim }]}>{z.context}</Text>
        </Block>
      ) : null}

      {/* Chronologie — RS3 : Array.isArray (le seul `.length` laissait passer une CHAÎNE, puis .map plantait) */}
      {Array.isArray(z.timeline) && z.timeline.length ? (
        <Block title="Chronologie">
          {z.timeline.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: SP.md, marginBottom: SP.sm2 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: RADIUS.half(8), backgroundColor: c, marginTop: SP.xs }} />
                {i < z.timeline.length - 1 && <View style={{ width: 1.5, flex: 1, backgroundColor: C.border, marginTop: SP.hair }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: SP.xs }}>
                <Text style={[TYPE.mono, { color: ct, marginBottom: SP.hair }]}>{t.d}</Text>
                <Text style={[TYPE.bodySm, { color: C.inkDim }]}>{t.e}</Text>
              </View>
            </View>
          ))}
        </Block>
      ) : null}

      {/* Acteurs — rendu défensif : texte, tableau de textes, ou tableau d'objets {name, role}. */}
      {z.actors ? (
        <Block title="Acteurs">
          <Text style={[TYPE.body, { color: C.inkDim }]}>
            {(Array.isArray(z.actors) ? z.actors : [z.actors])
              .map((a) => (typeof a === 'string' ? a
                : a && a.name ? (a.role ? `${a.name} — ${a.role}` : a.name)
                : (a && (a.text || a.acteur)) || ''))
              .filter(Boolean).join(' · ')}
          </Text>
        </Block>
      ) : null}

      {/* Perspectives */}
      {z.outlook ? (
        <Block title="Perspectives">
          <Text style={[TYPE.body, { color: C.inkDim }]}>{z.outlook}</Text>
        </Block>
      ) : null}

      {/* Sources */}
      {srcs.length ? (
        <Block title={`Sources (${srcs.length})`}>
          {srcs.map((s) => (
            <TouchableOpacity key={s.id} activeOpacity={0.7} onPress={() => s.url && confirmOpenURL(s.url)}
              accessibilityRole="link" accessibilityLabel={s.url ? `Ouvrir la source ${hostOf(s.url)}` : s.name}
              style={{ flexDirection: 'row', gap: SP.sm2, alignItems: 'flex-start', paddingVertical: SP.sm2 }}>
              <SrcDot rel={s.reliability} />
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.bodySm, { color: C.inkDim }]} numberOfLines={3}>{s.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginTop: SP.xs, flexWrap: 'wrap' }}>
                  <Text style={[TYPE.caption, { color: C.inkMut }]}>{s.type} · {s.date}</Text>
                  {/* SEC-01 : on montre le DOMAINE réel de destination, pas seulement une icône de lien. */}
                  {s.url ? <Icon name="link" size={12} color={C.cobalt} /> : null}
                  {s.url ? <Text style={[TYPE.caption, { color: C.cobalt }]} numberOfLines={1}>{hostOf(s.url)}</Text> : null}
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
  <View style={{ marginTop: SP.gutter }}>
    <Text style={[TYPE.heading, { color: C.ink, marginBottom: SP.sm2 }]}>{title}</Text>
    {children}
  </View>
);
