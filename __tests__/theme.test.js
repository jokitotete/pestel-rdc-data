import { pick, tint, AX, mapLevel, MAP_RAMP, MAP_CATS } from '../src/theme';

// RS3 (campagne 2026-07-14) : `MAP[cléNonFiable]` résout aussi les propriétés HÉRITÉES du prototype
// (constructor/__proto__/toString…) — toutes truthy — donc `MAP[clé] || fallback` ne se replie pas et une
// valeur non-couleur file vers le rendu = crash. `pick` (comme getEdition) n'accepte que les clés PROPRES.
describe('theme.pick — lookup prototype-safe', () => {
  it('renvoie le fallback pour les clés héritées du prototype', () => {
    for (const k of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf']) {
      expect(pick(AX, k, 'FB')).toBe('FB');
    }
  });
  it('renvoie le fallback pour les clés non-string / absentes', () => {
    for (const k of [null, undefined, 42, {}, [], 'inexistant']) expect(pick(AX, k, 'FB')).toBe('FB');
  });
  it('résout une vraie clé PROPRE', () => {
    expect(pick(AX, 'P', 'FB')).toBe(AX.P);
    expect(pick(AX, 'Env', 'FB')).toBe(AX.Env);
  });
});

// RS3 : défense en profondeur — tint() ne doit jamais lever `hex.replace is not a function` si une couleur
// non-string lui parvenait malgré pick (fonction/objet/undefined) ; elle retombe sur cobalt.
// RS1-13 : palier d'activité DISCRET de la carte (0=calme, 1..3 par tiers) + rampe/catégories alignées.
describe('theme.mapLevel — palier discret de la carte', () => {
  it('0 actu → calme (0) ; sinon 1..3 par tiers de n/maxN', () => {
    expect(mapLevel(0, 10)).toBe(0);
    expect(mapLevel(1, 9)).toBe(1);
    expect(mapLevel(5, 9)).toBe(2);
    expect(mapLevel(9, 9)).toBe(3);
    expect(mapLevel(50, 9)).toBe(3);   // plafonné à 3
  });
  it('MAP_RAMP et MAP_CATS ont 4 paliers alignés', () => {
    expect(MAP_RAMP.length).toBe(4);
    expect(MAP_CATS).toEqual(['calme', 'faible', 'modérée', 'forte']);
  });
});

describe('theme.tint — jamais de crash sur couleur non-string', () => {
  it('retombe sur une rgba valide pour un hex non-string', () => {
    for (const bad of [undefined, null, 42, {}, Object, () => {}]) {
      expect(tint(bad, 0.2)).toMatch(/^rgba\(\d+,\d+,\d+,0\.2\)$/);
    }
  });
  it('teinte correctement un hex normal', () => {
    expect(tint('#ffffff', 0.5)).toBe('rgba(255,255,255,0.5)');
  });
});
