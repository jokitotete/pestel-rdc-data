import {
  SEUIL_CONFIANCE, CAP_CAPTEES, AXES_N1, SEUIL_SOUPAPE,
  statutN1, normaliserN1, mentionN1, fmtConfiance,
  partitionnerN1, repartitionParAxe, grouperParAxe,
  motifDivers, instrumenterDivers, filtreEffectif, analyserSoupape,
} from '../src/n1';
import { isSafeUrl } from '../src/safeUrl';

// LOT-F / LOT-H — l'étage N1 et la soupape « Divers ».
// Ces tests portent sur le MODULE PARTAGÉ (src/n1.js), celui-là même que les écrans consomment. Ils ne
// recopient AUCUN calcul : c'est le point du lot. L'ancien __tests__/feed.test.js recopiait l'arithmétique
// de Home.js pour la tester, avec un commentaire « doit rester aligné » — un test qui recopie ne teste que
// sa copie, et le jour où l'écran dérive, il reste vert.

const https = 'https://acp.cd/a';

describe('LOT-F · statut N1 — classé / faible / orphelin', () => {
  it('sans axe (ou « ? ») → orphelin', () => {
    expect(statutN1({ title: 't' })).toBe('orphelin');
    expect(statutN1({ title: 't', axis: '?' })).toBe('orphelin');
    expect(statutN1(null)).toBe('orphelin');
  });
  it('axe + confiance AU-DESSUS du seuil → classé', () => {
    expect(statutN1({ axis: 'E', confidence: SEUIL_CONFIANCE })).toBe('classe');
    expect(statutN1({ axis: 'E', confidence: 0.42 })).toBe('classe');
  });
  it('axe + confiance SOUS le seuil → faible', () => {
    expect(statutN1({ axis: 'E', confidence: SEUIL_CONFIANCE - 0.01 })).toBe('faible');
    expect(statutN1({ axis: 'E', confidence: 0 })).toBe('faible');
  });
  it('axe SANS confiance transmise → classé (on ne fabrique pas une confiance absente)', () => {
    expect(statutN1({ axis: 'E' })).toBe('classe');
  });
  it('un axe INCONNU n’est jamais promu en clé de jeton (anti prototype/valeur inventée)', () => {
    for (const mauvais of ['constructor', '__proto__', 'toString', 'ZZZ', 42, {}, null]) {
      expect(statutN1({ axis: mauvais })).toBe('orphelin');
      expect(normaliserN1({ axis: mauvais }).axe).toBe(null);
    }
  });
});

describe('LOT-F · la carte N1 NE PEUT PAS mentir — liste blanche de champs', () => {
  // Le contrat le plus important du lot : un item N1 n'a NI résumé NI analyse. Si la vue portait un champ
  // « texte » facultatif, quelqu'un finirait par le remplir avec le titre, ou pire avec un texte d'édition.
  it('la vue ne porte AUCUN champ de résumé/analyse, même si l’item en contient', () => {
    const v = normaliserN1({
      title: 'Titre capté', url: https, source: 'ACP', axis: 'E', confidence: 0.4,
      text: 'RÉSUMÉ QUI NE DOIT PAS PASSER', analysis: 'ANALYSE INTERDITE', zoom: { context: 'x' },
    });
    const cles = Object.keys(v).sort();
    expect(cles).toEqual(['axe', 'axeLabel', 'candidat', 'confiance', 'date', 'host', 'mention', 'note', 'source', 'statut', 'titre', 'url']);
    expect(JSON.stringify(v)).not.toContain('RÉSUMÉ');
    expect(JSON.stringify(v)).not.toContain('ANALYSE');
  });
  it('l’hôte affiché vient de l’URL, jamais du libellé de source (le libellé peut mentir)', () => {
    const v = normaliserN1({ title: 't', url: 'https://evil.example/x', source: 'Actualité.cd' });
    expect(v.host).toBe('evil.example');
  });
});

describe('LOT-F · mention honnête plutôt qu’axe affirmé', () => {
  it('classé AVEC confiance : l’axe et le chiffre', () => {
    expect(normaliserN1({ title: 't', axis: 'E', confidence: 0.42 }).mention).toBe('Économie · confiance 0,42');
  });
  it('classé SANS confiance transmise : l’absence est DITE, pas comblée', () => {
    expect(normaliserN1({ title: 't', axis: 'E' }).mention).toBe('Économie · confiance non transmise');
  });
  it('sous le seuil : « classé … · confiance faible » + meilleur candidat', () => {
    const v = normaliserN1({ title: 't', axis: 'E', confidence: 0.09, runnerUp: { axis: 'S' } });
    expect(v.statut).toBe('faible');
    expect(v.mention).toBe('classé Économie · confiance faible (0,09) · autre piste : Social');
  });
  it('orphelin AVEC candidat : le meilleur candidat est montré, l’axe n’est PAS affirmé', () => {
    const v = normaliserN1({ title: 't', axis: '?', runnerUp: 'E' });
    expect(v.axe).toBe(null);
    expect(v.mention).toBe('non classé · meilleur candidat : Économie');
  });
  it('orphelin SANS candidat : « non classé », rien de plus', () => {
    expect(normaliserN1({ title: 't' }).mention).toBe('non classé');
  });
  it('la confiance est écrite à la FRANÇAISE et à 2 décimales (0,14 ≠ 0,15 = le seuil)', () => {
    expect(fmtConfiance(0.15)).toBe('0,15');
    expect(fmtConfiance(0.14)).toBe('0,14');
    expect(fmtConfiance(0.4)).toBe('0,40');    // deux décimales TOUJOURS : « 0,4 » se lirait comme tronqué
    expect(fmtConfiance('x')).toBe('');
    expect(fmtConfiance(null)).toBe('');
    // NOTE mesurée, pas supposée : toFixed arrondit sur la représentation BINAIRE — 0.145 rend « 0,14 »
    // (0,145 n'est pas représentable exactement). On l'ancre pour que personne ne « corrige » ce
    // comportement en croyant à un bug d'arrondi décimal.
    expect(fmtConfiance(0.145)).toBe('0,14');
  });
  it('mentionN1 tolère une vue vide sans planter', () => {
    expect(typeof mentionN1(null)).toBe('string');
  });
});

describe('LOT-F · cote de source A→D — jamais inventée', () => {
  it('A/B/C/D acceptées, tout le reste → null', () => {
    for (const g of ['A', 'B', 'C', 'D']) expect(normaliserN1({ sourceGrade: g }).note).toBe(g);
    for (const g of ['E', 'a', '', 1, null, {}]) expect(normaliserN1({ sourceGrade: g }).note).toBe(null);
  });
});

describe('LOT-F · « rien n’est écarté en silence » — l’arithmétique, calculée UNE fois', () => {
  const feed30 = Array.from({ length: 30 }, (_, i) => ({ title: 't' + i, url: 'https://a.cd/' + i, axis: 'E' }));

  it('l’invariant tient : affichées + en-plus + non-ouvrables = saines', () => {
    const p = partitionnerN1(feed30, { urlSure: isSafeUrl });
    expect(p.affiches.length + p.enPlus + p.nonOuvrables).toBe(p.sains);
    expect(p.affiches.length).toBe(CAP_CAPTEES);
    expect(p.enPlus).toBe(30 - CAP_CAPTEES);
  });
  it('un lien non-https est COMPTÉ, pas évaporé', () => {
    const p = partitionnerN1(
      [{ title: 'a', url: 'https://a.cd/1' }, { title: 'b', url: 'http://b.cd/2' }, { title: 'c', url: 'javascript:x' }],
      { urlSure: isSafeUrl }
    );
    expect(p.affiches.length).toBe(1);
    expect(p.nonOuvrables).toBe(2);
    expect(p.affiches.length + p.enPlus + p.nonOuvrables).toBe(p.sains);
  });
  it('un item SANS titre est compté à part (il n’a rien à afficher), jamais évaporé', () => {
    const p = partitionnerN1([{ url: https }, { title: '   ', url: https }, { title: 'ok', url: https }], { urlSure: isSafeUrl });
    expect(p.total).toBe(3);
    expect(p.sansTitre).toBe(2);
    expect(p.sains).toBe(1);
    expect(p.sansTitre + p.affiches.length + p.enPlus + p.nonOuvrables).toBe(p.total);
  });
  it('sous le plafond : aucun surplus annoncé (on n’invente pas un trou inexistant)', () => {
    const p = partitionnerN1([{ title: 'a', url: https }], { urlSure: isSafeUrl });
    expect(p.enPlus).toBe(0);
    expect(p.nonOuvrables).toBe(0);
  });
  it('cap: 0 = aucun plafond (vue par axe) — et le déclare', () => {
    const p = partitionnerN1(feed30, { cap: 0, urlSure: isSafeUrl });
    expect(p.affiches.length).toBe(30);
    expect(p.enPlus).toBe(0);
    expect(p.cap).toBe(0);
  });
  it('sur le FIL RÉEL embarqué, l’invariant tient', () => {
    const { FEED } = require('../src/store');
    const p = partitionnerN1(FEED, { urlSure: isSafeUrl });
    expect(p.affiches.length + p.enPlus + p.nonOuvrables).toBe(p.sains);
    if (p.sains > CAP_CAPTEES) expect(p.enPlus + p.nonOuvrables).toBeGreaterThan(0);
  });
  it('entrée hostile (non-tableau, éléments non-objets) → partition vide, pas de crash', () => {
    for (const bad of [null, 'x', 42, {}, [null, 'a', 7]]) {
      const p = partitionnerN1(bad, { urlSure: isSafeUrl });
      expect(p.affiches).toEqual([]);
      expect(p.sains).toBe(0);
    }
  });
});

describe('LOT-F · BLOCS VIDES ASSUMÉS — un axe vide s’affiche, il n’emprunte rien', () => {
  const vues = [
    normaliserN1({ title: 'e1', axis: 'E', url: https }),
    normaliserN1({ title: 'e2', axis: 'E', url: https }),
    normaliserN1({ title: 'o1', url: https }),
  ];
  it('la répartition liste TOUS les axes, y compris ceux à 0', () => {
    const r = repartitionParAxe(vues);
    expect(r.map((x) => x.cle)).toEqual([...AXES_N1, '?']);
    expect(r.find((x) => x.cle === 'E').n).toBe(2);
    expect(r.find((x) => x.cle === 'S').n).toBe(0);      // présent ET à zéro : le vide est écrit
    expect(r.find((x) => x.cle === '?').n).toBe(1);
  });
  it('le groupement donne un groupe VIDE (jamais absent) pour un axe sans item', () => {
    const g = grouperParAxe(vues);
    const s = g.find((x) => x.cle === 'S');
    expect(s).toBeDefined();
    expect(s.items).toEqual([]);
  });
  it('aucun emprunt : la somme des groupes = le nombre de vues (rien dupliqué, rien perdu)', () => {
    const g = grouperParAxe(vues);
    expect(g.reduce((n, x) => n + x.items.length, 0)).toBe(vues.length);
  });
});

describe('LOT-H · la soupape « Divers » est masquée quand elle est vide', () => {
  it('vide (ou entrée hostile) → invisible', () => {
    for (const v of [[], null, 'x', 42]) expect(instrumenterDivers(v, { urlSure: isSafeUrl }).visible).toBe(false);
  });
  it('du contenu → visible, même si aucun lien n’est ouvrable (elle a quelque chose à DIRE)', () => {
    const s = instrumenterDivers([{ title: 'a', url: 'http://x.cd' }], { urlSure: isSafeUrl });
    expect(s.visible).toBe(true);
    expect(s.total).toBe(1);
    expect(s.nonOuvrables).toBe(1);
  });
  it('le filtre EFFECTIF retombe sur « Tous » si la rubrique n’est plus offerte (pas de cul-de-sac)', () => {
    expect(filtreEffectif({ type: 'divers' }, false)).toEqual({ type: 'all' });
    expect(filtreEffectif({ type: 'divers' }, true)).toEqual({ type: 'divers' });
    expect(filtreEffectif({ type: 'axis', key: 'E' }, false)).toEqual({ type: 'axis', key: 'E' });
    expect(filtreEffectif(null, false)).toEqual({ type: 'all' });
  });
});

describe('LOT-H · la soupape est INSTRUMENTÉE — ce qui y tombe, et pourquoi', () => {
  const triage = [
    { title: 'a', url: https, source: 'ACP' },
    { title: 'b', url: https, source: 'ACP' },
    { title: 'c', url: https, source: 'Actualite.cd', confidence: 0.05 },
    { title: 'd', url: 'http://x.cd', source: 'Radio Okapi', motif: 'hors périmètre' },
    { url: https, source: 'ACP' },
  ];
  const s = instrumenterDivers(triage, { urlSure: isSafeUrl });

  it('les compteurs bouclent : total = sains + sans-titre, sains = ouvrables + non-ouvrables', () => {
    expect(s.total).toBe(5);
    expect(s.sansTitre).toBe(1);
    expect(s.ouvrables + s.nonOuvrables).toBe(s.total - s.sansTitre);
  });
  it('répartition par SOURCE, la plus fournie d’abord', () => {
    expect(s.parSource[0]).toEqual({ cle: 'ACP', n: 3 });
    expect(s.parSource.reduce((n, x) => n + x.n, 0)).toBe(s.total);
  });
  it('répartition par MOTIF — et le motif NON TRANSMIS est nommé, pas deviné', () => {
    const m = Object.fromEntries(s.parMotif.map((x) => [x.cle, x.n]));
    expect(m['hors périmètre']).toBe(1);
    expect(m['sous le seuil de confiance']).toBe(1);
    expect(m['motif non transmis']).toBe(3);
    expect(s.parMotif.reduce((n, x) => n + x.n, 0)).toBe(s.total);
  });
  it('motifDivers : un motif transmis prime, sinon il est dérivé, sinon il est AVOUÉ', () => {
    expect(motifDivers({ rejectRule: 'R-12 hors RDC' })).toBe('R-12 hors RDC');
    expect(motifDivers({ axis: 'E' })).toBe('classé mais non sélectionné');
    expect(motifDivers({ runnerUp: 'E' })).toBe('candidat sans décision');
    expect(motifDivers({})).toBe('motif non transmis');
  });
  it('sur le FIL RÉEL embarqué, les compteurs bouclent', () => {
    const { TRIAGE } = require('../src/store');
    const r = instrumenterDivers(TRIAGE, { urlSure: isSafeUrl });
    expect(r.ouvrables + r.nonOuvrables + r.sansTitre).toBe(r.total);
    expect(r.parSource.reduce((n, x) => n + x.n, 0)).toBe(r.total);
    expect(r.parMotif.reduce((n, x) => n + x.n, 0)).toBe(r.total);
  });
});

describe('LOT-H · porte PRT_SOUPA — 14 éditions consécutives OBSERVÉES, mesurées et non affirmées', () => {
  it('journal vide → 0 observation, précondition NON atteinte', () => {
    const a = analyserSoupape([]);
    expect(a.editionsObservees).toBe(0);
    expect(a.consecutivesVides).toBe(0);
    expect(a.preconditionAtteinte).toBe(false);
    expect(a.seuil).toBe(SEUIL_SOUPAPE);
  });
  it('une seule édition NON vide remet la série à zéro', () => {
    const j = Array.from({ length: 20 }, (_, i) => ({ date: `2026-07-${String(i + 1).padStart(2, '0')}`, n: 0 }));
    j[19] = { date: '2026-07-20', n: 3 };
    expect(analyserSoupape(j).consecutivesVides).toBe(0);
  });
  it('13 éditions vides consécutives ne suffisent PAS ; 14 atteignent la précondition', () => {
    const serie = (k) => Array.from({ length: k }, (_, i) => ({ date: `2026-07-${String(i + 1).padStart(2, '0')}`, n: 0 }));
    expect(analyserSoupape(serie(13)).preconditionAtteinte).toBe(false);
    expect(analyserSoupape(serie(14)).preconditionAtteinte).toBe(true);
  });
  it('l’ordre du journal n’influence pas le résultat (tri par date interne)', () => {
    const j = [{ date: '2026-07-03', n: 0 }, { date: '2026-07-01', n: 5 }, { date: '2026-07-02', n: 0 }];
    expect(analyserSoupape(j).consecutivesVides).toBe(2);
    expect(analyserSoupape(j).derniere.date).toBe('2026-07-03');
  });
  it('entrées corrompues (stockage falsifié) ignorées, jamais de crash', () => {
    const a = analyserSoupape([null, 'x', { n: 0 }, { date: '2026-07-01', n: 'beaucoup' }]);
    expect(a.editionsObservees).toBe(1);
    expect(a.consecutivesVides).toBe(0);   // n non numérique n'est PAS compté comme « vide »
  });
});
