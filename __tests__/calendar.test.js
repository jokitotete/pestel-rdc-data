import { parseISO, toISO, monthGrid, monthsOf, libelleMois, MOIS_FR, JOURS_FR } from '../src/calendar';
import { MANIFEST } from '../src/data/pestel';

// v1.3 — le selecteur d'edition passe d'une LISTE a un CALENDRIER : on met en surbrillance ce qui porte de
// la donnee (meme langage que la carte). La logique de dates est PURE, donc testable sans rendu.
describe('calendar.parseISO / toISO', () => {
  it('lit une date ISO reelle', () => {
    expect(parseISO('2026-07-15')).toEqual({ y: 2026, m: 6, d: 15 });   // m = index 0-11
  });
  it('rejette tout ce qui n est pas une date ISO (fail-closed)', () => {
    for (const v of ['15/07/2026', '2026-7-5', '2026-13-01', '2026-00-10', '2026-07-32', '', null, 42, {}, [], 'hack']) {
      expect(parseISO(v)).toBeNull();
    }
  });
  it('aller-retour ISO', () => {
    expect(toISO(2026, 6, 15)).toBe('2026-07-15');
    expect(toISO(2026, 0, 1)).toBe('2026-01-01');
    expect(parseISO(toISO(2026, 11, 31))).toEqual({ y: 2026, m: 11, d: 31 });
  });
});

describe('calendar.monthGrid — grille du mois (semaine FRANCAISE, lundi d abord)', () => {
  it('juillet 2026 commence un mercredi -> 2 cases vides avant le 1er', () => {
    const g = monthGrid(2026, 6);
    expect(g[0].slice(0, 3)).toEqual([null, null, 1]);   // L, M vides ; le 1er tombe un mercredi
    expect(g[0][2]).toBe(1);
  });
  it('chaque semaine fait 7 cases et le mois est complet, sans doublon', () => {
    for (const [y, m] of [[2026, 0], [2026, 1], [2026, 6], [2026, 11], [2024, 1]]) {
      const g = monthGrid(y, m);
      for (const sem of g) expect(sem.length).toBe(7);
      const jours = g.flat().filter((d) => d != null);
      const attendu = new Date(y, m + 1, 0).getDate();
      expect(jours.length).toBe(attendu);
      expect(jours).toEqual(Array.from({ length: attendu }, (_, i) => i + 1));   // 1..n, dans l ordre
    }
  });
  it('fevrier bissextile 2024 = 29 jours', () => {
    expect(monthGrid(2024, 1).flat().filter(Boolean).length).toBe(29);
  });
});

describe('calendar.monthsOf — ne navigue QUE dans les mois porteurs de donnee', () => {
  it('dedoublonne et trie du plus recent au plus ancien', () => {
    expect(monthsOf(['2026-07-15', '2026-07-03', '2026-06-30', '2026-08-01']))
      .toEqual([{ y: 2026, m: 7 }, { y: 2026, m: 6 }, { y: 2026, m: 5 }]);
  });
  it('ignore les entrees illisibles sans planter', () => {
    expect(monthsOf(['2026-07-15', 'nope', null, 42, '15/07/2026'])).toEqual([{ y: 2026, m: 6 }]);
    expect(monthsOf(null)).toEqual([]);
    expect(monthsOf([])).toEqual([]);
  });
  it('sur le MANIFESTE REEL : au moins un mois, et chaque edition tombe dans un mois propose', () => {
    const mois = monthsOf(MANIFEST.map((m) => m.date));
    expect(mois.length).toBeGreaterThanOrEqual(1);
    const cles = new Set(mois.map((x) => x.y * 12 + x.m));
    for (const m of MANIFEST) {
      const p = parseISO(m.date);
      expect(p).not.toBeNull();
      expect(cles.has(p.y * 12 + p.m)).toBe(true);   // aucune edition orpheline de la navigation
    }
  });
  it('chaque edition reelle retrouve sa case dans la grille de son mois', () => {
    for (const m of MANIFEST) {
      const p = parseISO(m.date);
      const jours = monthGrid(p.y, p.m).flat();
      expect(jours).toContain(p.d);
      expect(toISO(p.y, p.m, p.d)).toBe(m.date);   // la case renvoie bien la cle d edition
    }
  });
});

describe('calendar — libelles francais', () => {
  it('mois et jours', () => {
    expect(libelleMois(2026, 6)).toBe('juillet 2026');
    expect(MOIS_FR.length).toBe(12);
    expect(JOURS_FR).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);   // lundi d abord
  });
});
