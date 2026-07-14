import { parseWhen, upcomingEvents, sectorItems, findItem, getEdition, latestDate, allItems } from '../src/store';

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

describe('store.sectorItems — Lentille (match fort)', () => {
  const ed = getEdition(latestDate());
  it('gère les cas limites sans crash', () => {
    expect(sectorItems(null, 'banques')).toEqual([]);
    expect(sectorItems(ed, 'inexistant')).toEqual([]);
    expect(sectorItems(ed, null)).toEqual([]);
    expect(Array.isArray(sectorItems(ed, 'banques'))).toBe(true);
  });
  it('ne retourne que des items de l’édition (sous-ensemble)', () => {
    const codes = allItems(ed).map((i) => i.code);
    for (const it of sectorItems(ed, 'mines')) expect(codes).toContain(it.code);
  });
});
