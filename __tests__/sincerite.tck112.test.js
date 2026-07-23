jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import Home from '../src/screens/Home';
import { N1Card } from '../src/ui';
import { fenetreFil, fmtConfiance, mentionN1, normaliserN1, SEUIL_CONFIANCE } from '../src/n1';
import { fmtJourLong, estAujourdhui } from '../src/theme';
import { getEdition, latestDate, getFeed } from '../src/store';

// ─────────────────────────────────────────────────────────────────────────────
// TCK-112 · PORTE PRT_SINCE — TROIS AFFIRMATIONS DE L'INTERFACE QUI N'ÉTAIENT PAS TENUES
// ─────────────────────────────────────────────────────────────────────────────
// Ce fichier est écrit AVANT les corrections et il ÉCHOUE avant elles. Chaque bloc a été éprouvé par
// MUTATION (le défaut remis, le test redevient rouge) — un test qui ne peut pas échouer ne prouve rien.
//
//   DÉFAUT 1 — l'enveloppe temporelle MENTAIT. Le fil servi couvre 21 jours (2 → 22 juillet 2026, MESURÉ
//              sur public/pestel-data.json), et trois surfaces affirmaient le contraire : le pied des
//              « Captées » (« captées AUJOURD'HUI »), le bandeau « Aujourd'hui » posé sur une édition du
//              21 juillet lue un 22, et le sous-titre « les faits qui comptent aujourd'hui ».
//   DÉFAUT 2 — « classé <axe> · confiance faible » se contredisait dans la même phrase pour des items que
//              le moteur déclare justement NON classés au sens du seuil. Et l'arrondi affichait « 0,15 »
//              — la valeur EXACTE du seuil — pour 18 items mesurés dont la confiance est SOUS le seuil.
//   DÉFAUT 3 — le compteur « Divers » était mémoïsé sur [triage] alors qu'applyRemote MUTE ce tableau EN
//              PLACE : la référence ne bougeant pas, le calcul n'était jamais relancé après une synchro.

const rendre = (el) => {
  let t;
  act(() => { t = renderer.create(el); });
  const textes = [];
  const marcher = (n) => {
    if (n == null) return;
    if (typeof n === 'string') { textes.push(n); return; }
    if (Array.isArray(n)) { n.forEach(marcher); return; }
    marcher(n.children);
  };
  marcher(t.toJSON());
  const out = { textes: textes.join(' | ') };
  act(() => t.unmount());
  return out;
};

const ed = () => getEdition(latestDate());
// Un fil de laboratoire dont la fenêtre est CONNUE : 2 → 22 juillet 2026, 21 jours.
const filLarge = () => ([
  { title: 'Captée du 2 juillet', url: 'https://acp.cd/a', source: 'ACP', axis: 'P', confidence: 0.31, statut: 'classe', publishedAt: '2026-07-02T06:00:00.000Z' },
  { title: 'Captée du 15 juillet', url: 'https://acp.cd/b', source: 'ACP', axis: 'T', confidence: 0.141, statut: 'faible', publishedAt: '2026-07-15T21:49:57.000Z' },
  { title: 'Captée du 22 juillet', url: 'https://acp.cd/c', source: 'ACP', axis: 'S', confidence: 0.19, statut: 'classe', publishedAt: '2026-07-22T14:53:33.000Z' },
]);

// ─────────────────────────────────────────────────────────────────────────────
describe('TCK-112 · DÉFAUT 1 — la fenêtre du fil est LISIBLE et VRAIE', () => {
  it('fenetreFil borne le fil sur ses dates réelles et compte les jours COUVERTS (bornes incluses)', () => {
    const f = fenetreFil(filLarge());
    expect(f.debut).toBe('2026-07-02');
    expect(f.fin).toBe('2026-07-22');
    expect(f.jours).toBe(21);
    expect(f.libelle).toBe('du 2 au 22 juillet 2026');
  });

  it('un fil d’un SEUL jour ne se raconte pas comme une plage', () => {
    const f = fenetreFil([{ publishedAt: '2026-07-22T01:00:00.000Z' }, { publishedAt: '2026-07-22T23:00:00.000Z' }]);
    expect(f.jours).toBe(1);
    expect(f.libelle).toBe('le 22 juillet 2026');
  });

  it('deux MOIS et deux ANNÉES s’écrivent en entier — jamais « du 28 au 3 juillet »', () => {
    expect(fenetreFil([{ publishedAt: '2026-06-28' }, { publishedAt: '2026-07-03' }]).libelle)
      .toBe('du 28 juin au 3 juillet 2026');
    expect(fenetreFil([{ publishedAt: '2025-12-28' }, { publishedAt: '2026-01-03' }]).libelle)
      .toBe('du 28 décembre 2025 au 3 janvier 2026');
  });

  it('les items SANS date sont comptés, jamais absorbés dans la fenêtre', () => {
    const f = fenetreFil([{ publishedAt: '2026-07-22' }, { title: 'sans date' }, {}]);
    expect(f.total).toBe(3);
    expect(f.dates).toBe(1);
    expect(f.sansDate).toBe(2);
  });

  it('un fil VIDE ou sans aucune date n’invente aucune fenêtre', () => {
    for (const v of [[], null, [{ title: 'x' }]]) {
      const f = fenetreFil(v);
      expect(f.libelle).toBe('');
      expect(f.debut).toBe(null);
      expect(f.jours).toBe(0);
    }
  });

  // TCK-121 — INVARIANT, plus INSTANTANÉ. Ce test écrivait « du 2 au 22 juillet 2026 » et « 21 jours »
  // en dur : il décrivait un corpus, pas une règle. Il a cassé le 23/07 dès que le fil a été recollecté
  // sur une autre fenêtre — un rafraîchissement de données, pas un défaut. Or le commanditaire va
  // rafraîchir souvent, et un test qui casse à chaque collecte finit par être ignoré.
  // Ce qui doit tenir QUOI QU'IL ARRIVE : la fenêtre annoncée décrit la fenêtre RÉELLE du fil servi.
  it('MESURE sur le fil RÉELLEMENT servi : la fenêtre annoncée est celle des données, quelle qu\'elle soit', () => {
    const fil = getFeed();
    const f = fenetreFil(fil);
    expect(f.total).toBeGreaterThan(0);

    // Bornes recalculées depuis les données elles-mêmes, jamais recopiées.
    const jours = fil.map((x) => String(x && x.publishedAt || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    const attendu = Math.round((Date.parse(jours[jours.length - 1]) - Date.parse(jours[0])) / 864e5) + 1;
    expect(f.jours).toBe(attendu);

    // Le libellé nomme les DEUX bornes réelles, et jamais « aujourd'hui » pour un fil multi-jours.
    expect(f.libelle).toContain(String(Number(jours[0].slice(8, 10))));
    expect(f.libelle).toContain(String(Number(jours[jours.length - 1].slice(8, 10))));
    if (attendu > 1) expect(f.libelle.toLowerCase()).not.toContain('aujourd');
  });

  it('l’écran ÉCRIT la fenêtre du fil et ne dit plus « aujourd’hui » de ce qui couvre 21 jours', () => {
    const r = rendre(<Home ed={ed()} onOpen={() => {}} feed={filLarge()} triage={[]} maintenant={Date.parse('2026-07-22T09:00:00.000Z')} />);
    expect(r.textes).toContain('du 2 au 22 juillet 2026');
    expect(r.textes.toLowerCase()).not.toContain('captées aujourd’hui');
    expect(r.textes.toLowerCase()).not.toContain('captée aujourd’hui');
  });

  it('le pied de plafond nomme la FENÊTRE, pas « aujourd’hui »', () => {
    // 14 captées ouvrables > plafond 12 → le pied « + N autres » s'affiche.
    const gros = [];
    for (let i = 0; i < 14; i++) {
      gros.push({ title: `Captée ${i}`, url: `https://acp.cd/${i}`, source: 'ACP', axis: 'P', confidence: 0.31, statut: 'classe', publishedAt: '2026-07-0' + ((i % 8) + 1) + 'T06:00:00.000Z' });
    }
    const r = rendre(<Home ed={ed()} onOpen={() => {}} feed={gros} triage={[]} maintenant={Date.parse('2026-07-22T09:00:00.000Z')} />);
    expect(r.textes).toContain('+ 2 autres captées');
    expect(r.textes).not.toContain('aujourd’hui, non affichées');
  });

  it('« Aujourd’hui » n’est écrit QUE le jour même — le 22, une édition du 21 est « dernière édition »', () => {
    // estAujourdhui est PUR et prend son « maintenant » : la vérité de ce test ne dépend pas du jour où on le joue.
    expect(estAujourdhui('2026-07-22', Date.parse('2026-07-22T09:00:00.000Z'))).toBe(true);
    expect(estAujourdhui('2026-07-21', Date.parse('2026-07-22T09:00:00.000Z'))).toBe(false);
    expect(estAujourdhui(null, Date.parse('2026-07-22T09:00:00.000Z'))).toBe(false);
    const r = rendre(<Home ed={ed()} onOpen={() => {}} feed={[]} triage={[]} maintenant={Date.parse('2026-07-22T09:00:00.000Z')} />);
    expect(r.textes).not.toContain('Aujourd’hui');
    expect(r.textes).toContain('Dernière édition');
  });

  it('fmtJourLong écrit la date en toutes lettres, et rien sur une entrée illisible', () => {
    expect(fmtJourLong('2026-07-22T14:53:33.000Z')).toBe('22 juillet 2026');
    expect(fmtJourLong('2026-01-01')).toBe('1 janvier 2026');
    for (const v of [null, '', 'demain', '2026-13-01', 42]) expect(fmtJourLong(v)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('TCK-112 · DÉFAUT 2 — un item « faible » n’est pas dit « classé »', () => {
  it('la mention d’un faible ne contient plus « classé » et dit que le moteur PENCHE', () => {
    const m = mentionN1({ axe: 'S', axeLabel: 'Social', statut: 'faible', confiance: 0.1427 });
    expect(m).not.toMatch(/class[ée]/i);
    expect(m).toContain('penche vers Social');
    expect(m).toContain('pas assez sûr');
  });

  it('l’autre piste reste dite, sans réintroduire « classé »', () => {
    const m = mentionN1({ axe: 'P', axeLabel: 'Politique', statut: 'faible', confiance: 0.0899, candidat: { axe: 'S', label: 'Social' } });
    expect(m).not.toMatch(/class[ée]/i);
    expect(m).toContain('autre piste : Social');
  });

  it('un item réellement CLASSÉ garde sa mention affirmative (aucune régression)', () => {
    expect(mentionN1({ axe: 'S', axeLabel: 'Social', statut: 'classe', confiance: 0.1906 })).toBe('Social · confiance 0,19');
    expect(mentionN1({ axe: 'S', axeLabel: 'Social', statut: 'classe', confiance: null })).toBe('Social · confiance non transmise');
  });

  it('ARRONDI — aucune confiance SOUS le seuil ne peut s’écrire comme le seuil', () => {
    // C'était le cas exact relevé : 0,1497 → « 0,15 », soit la valeur du seuil, sur un item déclaré faible.
    expect(fmtConfiance(0.1497)).toBe('0,14');
    expect(fmtConfiance(0.1499)).toBe('0,14');
    expect(fmtConfiance(0.1451)).toBe('0,14');
    expect(fmtConfiance(0.1478)).toBe('0,14');
    // Et le seuil lui-même reste écrit tel quel (il est ATTEINT, donc classé).
    expect(fmtConfiance(0.15)).toBe('0,15');
    expect(fmtConfiance(0.1556)).toBe('0,16');
  });

  it('INVARIANT sur le fil RÉEL : la chaîne affichée d’un faible se relit toujours SOUS le seuil', () => {
    const faibles = getFeed().filter((x) => x && x.statut === 'faible' && typeof x.confidence === 'number');
    // TCK-121 — la borne à 100 visait « ne pas tester à vide », mais elle était calée sur un fil de
    // 21 jours (374 faibles au 22/07). Un fil D'UNE SEULE JOURNÉE en compte 40, et le test cassait pour
    // une collecte plus courte — pas pour un défaut. On garde la garde anti-test-vide, sans la calibrer
    // sur la taille d'hier : ce qui compte est que l'invariant soit VÉRIFIÉ SUR TOUS les faibles présents.
    expect(faibles.length).toBeGreaterThan(0);
    for (const it of faibles) {
      const s = fmtConfiance(it.confidence);
      expect(Number(s.replace(',', '.'))).toBeLessThan(SEUIL_CONFIANCE);
    }
  });

  it('la CARTE rendue d’un faible ne porte pas le mot « classé »', () => {
    const v = normaliserN1({ title: 'Titre capté', url: 'https://acp.cd/a', source: 'ACP', axis: 'S', confidence: 0.1497, statut: 'faible' });
    const r = rendre(<N1Card vue={v} onPress={() => {}} />);
    expect(r.textes).not.toMatch(/class[ée] Social/i);
    expect(r.textes).toContain('penche vers Social');
    expect(r.textes).toContain('0,14');
    expect(r.textes).not.toContain('0,15');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('TCK-112 · DÉFAUT 3 — le compteur « Divers » suit la synchro', () => {
  it('un tableau MUTÉ EN PLACE (ce que fait applyRemote) remet le compteur à jour', () => {
    // Reproduction FIDÈLE du défaut : même RÉFÉRENCE de tableau, contenu remplacé — exactement
    // store.applyRemote (`TRIAGE.length = 0; d.triage.forEach(x => TRIAGE.push(x))`).
    const triage = [
      { title: 'Non classée 1', url: 'https://acp.cd/x1', source: 'ACP', publishedAt: '2026-07-22' },
      { title: 'Non classée 2', url: 'https://acp.cd/x2', source: 'ACP', publishedAt: '2026-07-22' },
    ];
    let t;
    const el = (ver) => (
      <Home ed={ed()} onOpen={() => {}} feed={[]} triage={triage} dataVer={ver}
        maintenant={Date.parse('2026-07-22T09:00:00.000Z')} />
    );
    act(() => { t = renderer.create(el(0)); });
    const lire = () => {
      const out = [];
      const marcher = (n) => {
        if (n == null) return;
        if (typeof n === 'string') { out.push(n); return; }
        if (Array.isArray(n)) { n.forEach(marcher); return; }
        marcher(n.children);
      };
      marcher(t.toJSON());
      return out.join(' | ');
    };
    expect(lire()).toContain('Divers · 2');

    // SYNCHRO : la même référence reçoit 5 items.
    triage.length = 0;
    for (let i = 0; i < 5; i++) triage.push({ title: `Non classée ${i}`, url: `https://acp.cd/y${i}`, source: 'ACP', publishedAt: '2026-07-22' });
    act(() => { t.update(el(1)); });

    expect(lire()).toContain('Divers · 5');
    expect(lire()).not.toContain('Divers · 2');
    act(() => t.unmount());
  });

  it('le store PUBLIE une version de données, et applyRemote l’incrémente', () => {
    const { dataVersion, applyRemote } = require('../src/store');
    const avant = dataVersion();
    const d = JSON.parse(JSON.stringify(require('../public/pestel-data.json')));
    expect(applyRemote(d)).toBe(true);
    expect(dataVersion()).toBe(avant + 1);
    // Un rejet (contrat invalide) ne doit PAS faire croire à un changement.
    expect(applyRemote({ nawak: true })).toBe(false);
    expect(dataVersion()).toBe(avant + 1);
  });

  it('GARDE DE CÂBLAGE — App.js transmet réellement dataVer à Home', () => {
    // Le mémo peut être correct et la valeur ne jamais arriver : c'est le même défaut, un étage plus haut.
    const src = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');
    expect(src).toMatch(/const \[dataVer, setDataVer\]/);
    expect(src).toMatch(/<Home[^>]*dataVer=\{dataVer\}/s);
    // L'écran « Axes » porte la MÊME pastille « Divers » et portait le MÊME mémo figé : corriger l'un
    // sans l'autre aurait recréé la classe F2 (deux surfaces, deux fraîcheurs) au lieu de la fermer.
    expect(src).toMatch(/<Axes[^>]*dataVer=\{dataVer\}/s);
    const axes = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'Axes.js'), 'utf8');
    expect(axes).toMatch(/instrumenterDivers\(triage[^)]*\)[^[]*\[triage, dataVer\]/s);
  });
});
