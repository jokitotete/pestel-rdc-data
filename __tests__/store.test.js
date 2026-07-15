import { parseWhen, upcomingEvents, findItem, getEdition, latestDate, allItems, primarySource, searchAll, followedItems, normalizeActors } from '../src/store';
import { SECTORS, itemInSector } from '../src/sectors';

describe('store.parseWhen — fuzz', () => {
  it('parse les formats datés réels', () => {
    expect(parseWhen('05/07/2026')).toBe(new Date(2026, 6, 5).getTime());
    expect(parseWhen('24-25/07/2026')).toBe(new Date(2026, 6, 24).getTime()); // plage → 1er jour
    expect(parseWhen('22 juillet 2026')).toBe(new Date(2026, 6, 22).getTime());
    expect(parseWhen('Août 2026')).toBe(new Date(2026, 7, 1).getTime());       // mois → 1er
  });
  it('renvoie null sur les non-dates et entrées hostiles', () => {
    for (const w of ['S2 2026', 'Semaines à venir', 'Budget 2026', 'En continu', '2026-2027', null, undefined, 42, {}, '']) {
      expect(parseWhen(w)).toBeNull();
    }
  });
});

describe('store.upcomingEvents — Event → BON dossier', () => {
  const ev = upcomingEvents(21);
  it('renvoie une liste triée et dédupliquée par IDENTITÉ (date + code/libellé)', () => {
    expect(Array.isArray(ev)).toBe(true);
    const ts = ev.map((e) => e._t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));   // trié croissant
    // RS1 : dédup par IDENTITÉ (date + code/libellé), PAS par la seule date — deux rendez-vous distincts
    // le même jour doivent coexister ; un même répété entre éditions n'apparaît qu'une fois.
    const keys = ev.map((e) => e._t + '|' + (e.code || (e.what || '').trim().toLowerCase()));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('chaque événement porte son édition source et ouvre un item RÉEL', () => {
    for (const e of ev) {
      expect(e.edDate).toBeTruthy();
      if (e.code) {
        // le code doit résoudre dans SON édition d'origine (les codes ne sont pas uniques globalement)
        expect(findItem(getEdition(e.edDate), e.code)).not.toBeNull();
      }
    }
  });
});

// RS_Sec (campagne 2026-07-14) : getEdition ne doit JAMAIS résoudre une clé héritée du prototype
// (__proto__/constructor/toString) — sinon un edDate falsifié d'un favori relu ferait planter le rendu.
describe('store.getEdition — anti prototype-pollution (lecture)', () => {
  it('retourne null pour les clés du prototype et les non-string', () => {
    for (const k of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', null, undefined, 42, {}]) {
      expect(getEdition(k)).toBeNull();
    }
  });
  it('résout normalement une édition réelle', () => {
    const d = latestDate();
    expect(getEdition(d)).toBeTruthy();
    expect(getEdition(d).date || d).toBeTruthy();
  });
});

// RS3.3 : primarySource ne doit JAMAIS planter sur une source dont name/url ne sont pas des strings
// (défense en profondeur — l'ACL les type déjà, mais .split sur un objet planterait avant le rendu).
describe('store.primarySource — coercition défensive', () => {
  const edWith = (src) => ({ sources: [src], axes: [] });
  it('ne crash pas et coerce name/url non-string', () => {
    const it = { sources: [1] };
    expect(() => primarySource(edWith({ id: 1, name: { x: 1 }, url: { y: 2 } }), it)).not.toThrow();
    const r = primarySource(edWith({ id: 1, name: { x: 1 }, url: { y: 2 } }), it);
    expect(r.name).toBe('');       // objet -> string vide (jamais [object Object] ni crash)
    expect(r.url).toBeNull();      // url non-string -> null
  });
  it('extrait l’outlet d’un name string normal', () => {
    const r = primarySource(edWith({ id: 1, name: 'Actualité.cd — « x »', url: 'https://actualite.cd/a' }), { sources: [1] });
    expect(r.name).toBe('Actualité.cd');
    expect(r.host).toBe('actualite.cd');
  });
  it('renvoie null si aucune source résolue', () => {
    expect(primarySource(edWith({ id: 9 }), { sources: [1] })).toBeNull();
    expect(primarySource({ sources: [] }, { sources: [] })).toBeNull();
  });
});

// RS1-09 : recherche MULTI-ÉDITIONS — chaque résultat porte son édition source (ouvrable là), dédup par titre,
// trié du plus récent au plus ancien. Rend la veille longitudinale (retrouver un fait d'une édition passée).
describe('store.searchAll — recherche multi-éditions', () => {
  it('chaque résultat porte une édition source RÉSOLVABLE, triés du récent à l’ancien, dédup par titre', () => {
    const r = searchAll('congo');
    expect(Array.isArray(r)).toBe(true);
    let prev = '￿';
    const seen = new Set();
    for (const it of r) {
      expect(typeof it.edDate).toBe('string');
      expect(it.edLabel).toBeTruthy();
      expect(getEdition(it.edDate)).toBeTruthy();       // ouvrable dans son édition
      expect(it.edDate <= prev).toBe(true);             // tri décroissant (date ISO)
      prev = it.edDate;
      const k = (it.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
      expect(seen.has(k)).toBe(false);                  // pas de doublon de titre
      seen.add(k);
    }
  });
  it('balaie plusieurs éditions (pas seulement la dernière) quand le terme y figure', () => {
    // terme large très probablement présent sur >1 édition de la veille RDC
    const r = searchAll('rdc');
    const editions = new Set(r.map((x) => x.edDate));
    expect(editions.size).toBeGreaterThanOrEqual(1);    // au moins une édition datée
  });
  it('moins de 2 lettres → vide', () => {
    expect(searchAll('a')).toEqual([]);
    expect(searchAll('')).toEqual([]);
    expect(searchAll(null)).toEqual([]);
  });
});

// RS1-23 : « Pour vous » — items de l'édition correspondant aux axes/secteurs suivis.
describe('store.followedItems — Pour vous', () => {
  const ed = getEdition(latestDate());
  it('ne renvoie que les items de l’axe suivi', () => {
    const r = followedItems(ed, [{ type: 'axis', key: 'P' }]);
    for (const it of r) expect(it.axis).toBe('P');
  });
  it('vide si aucun suivi / entrées manquantes', () => {
    expect(followedItems(ed, [])).toEqual([]);
    expect(followedItems(ed, null)).toEqual([]);
    expect(followedItems(null, [{ type: 'axis', key: 'P' }])).toEqual([]);
  });

  // F2 (QA v1.1) — PROMESSE TENUE. « Suivre ce sujet » n'est proposé QUE sous un filtre de secteur (Home.js),
  // et la liste affichée à cet instant est le match FAIBLE (itemInSector, corps du texte inclus). « Pour vous »
  // doit donc restituer EXACTEMENT cette liste. L'implémentation initiale utilisait le match FORT
  // (itemInSectorStrong), réservé à la Lentille qui PROMEUT en tête de Une : l'utilisateur suivait ce qu'il
  // voyait (N items) et n'en retrouvait qu'un sous-ensemble. Ce test échoue si l'on revient au match fort.
  it('secteur suivi : rend EXACTEMENT la liste que le filtre montrait au moment du clic (match FAIBLE)', () => {
    for (const s of SECTORS) {
      const vu = [];                                     // ce que Home affiche sous le filtre `sector`
      const seen = new Set();
      for (const it of allItems(ed)) {
        if (itemInSector(it, s) && !seen.has(it.code)) { seen.add(it.code); vu.push(it.code); }
      }
      expect(followedItems(ed, [{ type: 'sector', key: s.key }]).map((i) => i.code)).toEqual(vu);
    }
  });
});

// (Tests de sectorItems retirés — QA v1.2 : la « Lentille » n'existe plus depuis 0bac2d0. Ces tests
// étaient le DERNIER consommateur du code : du code mort qui se testait lui-même, donc semblait vivant.)

// BUG UTILISATEUR (15/07) : « les acteurs sont vides sur les articles ». Cause : le portail est passe de la
// PROSE a la structure {a, p} au commit de donnees b18014b, et le rendu « defensif » de Detail ne connaissait
// que {name, role} / {text} / {acteur} -> chaque acteur retombait sur '', le filter(Boolean) les supprimait
// tous, et le bloc « Acteurs » s'affichait AVEC DU VIDE dessous. Il n'a pas plante : il a echoue EN SILENCE.
describe('store.normalizeActors — les DEUX formes reelles (la veille est longitudinale)', () => {
  it('structure {a, p} du portail (editions >= 15/07) — LE bug signale', () => {
    const r = normalizeActors([
      { a: 'États-Unis (Marco Rubio)', p: "Parrain de l'accord ; crédibilité engagée." },
      { a: 'AFC/M23', p: 'Contrôle le site.' },
    ]);
    expect(r).toEqual([
      { nom: 'États-Unis (Marco Rubio)', position: "Parrain de l'accord ; crédibilité engagée." },
      { nom: 'AFC/M23', position: 'Contrôle le site.' },
    ]);
  });
  it('prose des editions anterieures (<= 14/07) — ne doit PAS regresser', () => {
    expect(normalizeActors('OMS : coordination. Autorités RDC : centres de traitement.'))
      .toEqual([{ nom: null, position: 'OMS : coordination. Autorités RDC : centres de traitement.' }]);
  });
  it('formes historiques tolerees {name, role} / {text} / {acteur}', () => {
    expect(normalizeActors([{ name: 'X', role: 'r' }])).toEqual([{ nom: 'X', position: 'r' }]);
    expect(normalizeActors([{ text: 'brut' }])).toEqual([{ nom: null, position: 'brut' }]);
    expect(normalizeActors([{ acteur: 'Y' }])).toEqual([{ nom: 'Y', position: null }]);
  });
  it('renvoie [] sur tout ce qui n est pas exploitable -> l ecran n affiche RIEN (pas un titre vide)', () => {
    for (const v of [null, undefined, '', '   ', [], [{}], [42], [null], [{ zz: 1 }], [[1, 2]]]) {
      expect(normalizeActors(v)).toEqual([]);
    }
  });
  it('ne plante sur AUCUNE donnee reelle des 13 editions, et rend ce qui existe', () => {
    let rendus = 0, avecActeurs = 0;
    for (const d of Object.keys(require('../src/data/pestel').EDITIONS)) {
      const ed = getEdition(d);
      for (const it of allItems(ed)) {
        const a = it.zoom && it.zoom.actors;
        if (a == null) continue;
        avecActeurs++;
        const r = normalizeActors(a);
        expect(Array.isArray(r)).toBe(true);
        if (r.length) rendus++;
      }
    }
    // Le coeur du bug : AVANT le correctif, les items du 15/07 comptaient dans `avecActeurs`
    // mais rendaient du VIDE. On exige desormais que TOUT item porteur d acteurs en rende.
    expect(avecActeurs).toBeGreaterThan(0);
    expect(rendus).toBe(avecActeurs);
  });
});
