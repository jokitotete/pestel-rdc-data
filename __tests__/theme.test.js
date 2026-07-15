import { pick, tint, AX, mapLevel, MAP_RAMP, MAP_CATS, isFollowableAxis, AX_ORDER, RUBRIQUES, SYNTHETIC_AXES } from '../src/theme';

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

// QA v1.2 — « suivable » : UN SEUL PREDICAT, DEUX CONSOMMATEURS (l'OFFRE dans Home, le STOCKAGE dans
// prefs.loadFollows). Le bug F2 est ne d'un predicat dedouble ; ce test ancre la source de verite unique.
describe('theme.isFollowableAxis — ce qu on peut suivre (fermeture de la classe F2)', () => {
  it('un axe PESTEL et une rubrique REELLE sont suivables', () => {
    for (const k of AX_ORDER) expect(isFollowableAxis(k)).toBe(true);
    expect(isFollowableAxis('C')).toBe(true);    // Culture & Arts : des items portent axis:'C'
    expect(isFollowableAxis('Sp')).toBe(true);   // Sports : idem
  });
  it('un axe SYNTHETIQUE n est PAS suivable — « Pour vous » ne pourrait jamais rien en rendre', () => {
    // « Events » affiche 12 rendez-vous (agregat temporel des agendas) mais AUCUN item ne porte axis:'Ev' :
    // offrir « Suivre » y promettait une liste qui serait restee vide a perpetuite.
    expect(SYNTHETIC_AXES).toContain('Ev');
    expect(isFollowableAxis('Ev')).toBe(false);
  });
  it('une cle inconnue ou hostile n est pas suivable (fail-closed)', () => {
    for (const k of ['', 'ZZ', '__proto__', 'constructor', 'toString']) expect(isFollowableAxis(k)).toBe(false);
  });
  it('tout axe synthetique est bien declare dans la taxonomie (coherence interne)', () => {
    for (const k of SYNTHETIC_AXES) expect(AX_ORDER.concat(RUBRIQUES)).toContain(k);
  });
});
