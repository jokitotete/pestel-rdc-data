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
  it('renvoie une liste triée et dédupliquée par date', () => {
    expect(Array.isArray(ev)).toBe(true);
    const ts = ev.map((e) => e._t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));   // trié croissant
    expect(new Set(ts).size).toBe(ts.length);            // une seule entrée par date
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
