jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// ═══════════════════════════════════════════════════════════════════════════════
// LOT-G — LE TROU DE LA BATTERIE PRINCIPALE, NOMMÉ ET FERMÉ
// ═══════════════════════════════════════════════════════════════════════════════
// __tests__/lotG.sincerite.test.js rend tous les écrans et refuse toute promesse à l'affichage. Il a UN
// angle mort, découvert en éprouvant la garde par MUTATION plutôt qu'en la relisant :
//
//   L'ÉTAT VIDE DE LA VUE « Events » N'EST PAS ATTEIGNABLE PAR LES PROPS.
//   `EventsView` appelle `store.upcomingEvents(21)`, qui balaie les agendas de TOUTES les éditions
//   embarquées — MESURÉ : 100 entrées d'agenda sur les 18 éditions. La liste n'est donc jamais vide en
//   test, la branche vide n'est jamais rendue, et la phrase qu'elle contient n'était contrôlée que par le
//   balayage des littéraux (volet B), jamais par le rendu (volet A).
//
// Un angle mort qu'on connaît et qu'on ne ferme pas est une omission muette de plus. On le ferme ici, en
// FORÇANT l'état par un doublure de `upcomingEvents` — la seule chose que le test simule est l'ABSENCE de
// rendez-vous, ce que le calendrier produira tôt ou tard tout seul.
//
// Même traitement pour l'état vide d'une RUBRIQUE : il est atteignable par les props (une édition sans
// l'axe), mais il dépend de la donnée embarquée du jour — aujourd'hui l'axe « Culture & Arts » est absent
// de l'édition la plus récente, demain il pourra être présent et la branche cesserait d'être éprouvée sans
// que rien ne l'annonce. On la force donc sur une édition SYNTHÉTIQUE, indépendante du contenu du jour.
jest.mock('../src/store', () => {
  const reel = jest.requireActual('../src/store');
  return { ...reel, upcomingEvents: () => [] };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Home from '../src/screens/Home';
import Axes from '../src/screens/Axes';
import { applyTheme } from '../src/theme';
import { NOTE_RUBRIQUE_VIDE, NOTE_EVENTS_VIDE } from '../src/copie';

const rendre = (el) => {
  let t;
  act(() => { t = renderer.create(el); });
  const json = t.toJSON();
  const texte = [];
  const marcher = (n) => {
    if (n == null) return;
    if (typeof n === 'string') { texte.push(n); return; }
    if (Array.isArray(n)) { n.forEach(marcher); return; }
    marcher(n.children);
  };
  marcher(json);
  act(() => t.unmount());
  return texte.join(' | ');
};

// Édition SYNTHÉTIQUE : un seul axe peuplé (Politique), donc TOUTES les rubriques sont vides, quel que
// soit le contenu réel du jour.
const EDITION = {
  date: '2026-07-22', label: '22 juillet 2026', generated: '', period: '', focus: '',
  headline: [],
  axes: [{
    key: 'P', name: 'Politique', short: 'Politique', lens: 'Analyste politique', icon: '', highlight: '',
    items: [{ code: 'P-1', title: 'Un fait politique', text: 'Corps.', analysis: 'Analyse.', reliability: 'established', sources: [1] }],
  }],
  signals: [], agenda: [], charts: [],
  sources: [{ id: 1, items: ['P-1'], name: 'ACP', type: 'Dépêche', reliability: 'A', date: '22/07/2026', url: 'https://acp.cd/a' }],
};
const semer = (filtre) => ({ seed: { filter: filtre, n: Math.random() }, onSeedApplied: () => {} });

// Les mêmes interdits que la batterie principale — recopiés à dessein : ce fichier doit pouvoir échouer
// SEUL. (Ce n'est pas la duplication d'un PRÉDICAT de production, c'est celle d'un critère de test.)
const INTERDITS = [
  /à\s+trait(er|ement)/i, /à\s+trier/i, /file\s+d[’'`]attente/i,
  /prochaines?\s+veilles?/i, /prochainement/i, /bientôt/i,
  /sera\s+(traité|couvert|complété|enrichi|analysé)/i,
  /nos?\s+(analystes|équipes?|rédacteurs?)/i,
];

afterEach(() => applyTheme('light'));

describe('LOT-G · état vide d’une RUBRIQUE — forcé, donc réellement rendu', () => {
  for (const mode of ['light', 'dark']) {
    for (const [nom, el] of [
      ['À la une · Culture & Arts', (k) => <Home ed={EDITION} onOpen={() => {}} feed={[]} triage={[]} {...semer({ type: 'axis', key: k })} />],
      ['Axes · Culture & Arts', (k) => <Axes ed={EDITION} onOpen={() => {}} triage={[]} {...semer({ type: 'axis', key: k })} />],
    ]) {
      it(`[${mode}] ${nom} : la branche vide est bien atteinte, et elle ne promet rien`, () => {
        applyTheme(mode);
        const t = rendre(el('C'));
        expect(t).toContain('Aucun item « Culture & Arts » dans cette édition.');   // la branche EST atteinte
        expect(t).toContain(NOTE_RUBRIQUE_VIDE.trim());                              // et c'est la bonne phrase
        for (const re of INTERDITS) expect(t).not.toMatch(re);
      });
    }
  }
});

describe('LOT-G · état vide d’« Events » — inatteignable par les props, forcé par doublure', () => {
  for (const mode of ['light', 'dark']) {
    it(`[${mode}] « À la une » · Events sans aucun rendez-vous : aucune promesse d’approvisionnement`, () => {
      applyTheme(mode);
      const t = rendre(<Home ed={EDITION} onOpen={() => {}} feed={[]} triage={[]} onOpenEvent={() => {}} {...semer({ type: 'axis', key: 'Ev' })} />);
      expect(t).toContain('Aucun rendez-vous daté sur les 3 prochaines semaines.');
      expect(t).toContain('agendas des éditions déjà publiées');
      for (const re of INTERDITS) expect(t).not.toMatch(re);
    });

    it(`[${mode}] « Axes » · Events sans aucun rendez-vous : même phrase, même absence de promesse`, () => {
      applyTheme(mode);
      const t = rendre(<Axes ed={EDITION} onOpen={() => {}} triage={[]} onOpenEvent={() => {}} {...semer({ type: 'axis', key: 'Ev' })} />);
      expect(t).toContain(NOTE_EVENTS_VIDE.split('\n')[0]);
      expect(t).toContain('agendas des éditions déjà publiées');
      for (const re of INTERDITS) expect(t).not.toMatch(re);
    });
  }

  it('la doublure fait bien ce qu’elle prétend (garde de la garde : sans elle, la branche n’est pas vide)', () => {
    const { upcomingEvents } = require('../src/store');
    expect(upcomingEvents(21)).toEqual([]);
    // Et le module RÉEL, lui, en renvoie : la branche vide n'était donc pas atteignable sans doublure.
    expect(jest.requireActual('../src/store').upcomingEvents(21).length).toBeGreaterThan(0);
  });
});
