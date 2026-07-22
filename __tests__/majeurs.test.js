import fs from 'fs';
import path from 'path';
import {
  lireDesignation, lireVacance, selectionnerMajeurs, selectionnerParConteneur,
  MAX_MAJEURS, RANGS, STATUTS,
} from '../src/majeurs';
import { EDITIONS } from '../src/data/pestel';

// ═══════════════════════════════════════════════════════════════════════════════
// LOT-I — LE MODÈLE : « 3 max, sinon rien, JAMAIS un mineur »
// ═══════════════════════════════════════════════════════════════════════════════
// La batterie d'états est OBLIGATOIRE et exhaustive : 0 → rien ; 1 → 1 ; 2 → 2 ; 3 → 3 ; 4 → 3 + trace.
// Le reste de ce fichier existe pour une seule raison : prouver que la sélection LIT une désignation et
// ne DÉDUIT rien d'une position — ce qui est exactement ce que l'arbitrage D-11 interdit.

const fait = (code, extra = {}) => ({ code, title: 'Fait ' + code, text: 'Texte.', axis: 'P', ...extra });
const D = (rang, statut = 'validee') => ({
  majeur: true, rang, statut,
  motif: 'Décision institutionnelle chiffrée et sourcée : fait majeur désigné de l’axe.',
});

describe('LOT-I · BATTERIE D’ÉTATS — 0, 1, 2, 3, 4 candidats', () => {
  it('0 majeur → on n’affiche RIEN, et c’est un état NORMAL (pas une erreur)', () => {
    const s = selectionnerMajeurs([fait('P-1'), fait('P-2'), fait('P-3')]);
    expect(s.candidats).toBe(0);
    expect(s.affiches).toEqual([]);
    expect(s.ecartes).toEqual([]);
    expect(s.etat).toBe('non_designe');       // « non désigné » ≠ « en erreur »
    expect(s.anomalies.illisibles).toBe(0);   // rien d'anormal : personne n'a désigné, voilà tout
  });

  it('1 majeur → on en affiche 1', () => {
    const s = selectionnerMajeurs([fait('P-1'), fait('P-2', { designation: D(1) }), fait('P-3')]);
    expect(s.candidats).toBe(1);
    expect(s.affiches.map((a) => a.item.code)).toEqual(['P-2']);
    expect(s.etat).toBe('designe');
    expect(s.ecartes).toEqual([]);
  });

  it('2 majeurs → on en affiche 2, dans l’ordre des RANGS DÉSIGNÉS', () => {
    // Volontairement écrits à l'envers dans la source : si l'ordre suivait la POSITION, P-3 sortirait
    // premier. Il sort second, parce que son rang DÉSIGNÉ est 2.
    const s = selectionnerMajeurs([fait('P-3', { designation: D(2) }), fait('P-1', { designation: D(1) })]);
    expect(s.affiches.map((a) => a.item.code)).toEqual(['P-1', 'P-3']);
    expect(s.affiches.map((a) => a.rang)).toEqual([1, 2]);
  });

  it('3 majeurs → on en affiche 3 (le plafond est atteint, rien n’est écarté)', () => {
    const s = selectionnerMajeurs([
      fait('P-1', { designation: D(1) }), fait('P-2', { designation: D(2) }), fait('P-3', { designation: D(3) }),
    ]);
    expect(s.affiches).toHaveLength(3);
    expect(s.ecartes).toEqual([]);
    expect(s.candidats).toBe(3);
  });

  // FAIT DE STRUCTURE, découvert en écrivant ce test et qu'il faut nommer : il n'existe que TROIS rangs
  // licites. Un axe à QUATRE candidats porte donc TOUJOURS une anomalie de schéma — soit un rang attribué
  // deux fois, soit un majeur sans rang. Le validateur du moteur refuse les deux ; l'application, elle,
  // peut les recevoir (donnée distante non fiable, ou publiée par une version antérieure du linter).
  // Les deux cas sont donc éprouvés séparément, parce qu'ils n'écartent PAS le même fait.

  it('4 candidats (le 4ᵉ sans rang) → on en affiche 3, ET LE CHOIX EST TRACÉ (jamais un « slice » muet)', () => {
    const s = selectionnerMajeurs([
      fait('P-1', { designation: D(1) }), fait('P-2', { designation: D(2) }), fait('P-3', { designation: D(3) }),
      fait('P-4', { designation: { majeur: true, statut: 'validee', motif: 'x'.repeat(30) } }),   // sans rang
    ]);
    expect(s.candidats).toBe(4);
    expect(s.affiches).toHaveLength(MAX_MAJEURS);
    expect(s.affiches.map((a) => a.item.code)).toEqual(['P-1', 'P-2', 'P-3']);
    expect(s.ecartes).toHaveLength(1);                          // le 4ᵉ n'a pas DISPARU
    expect(s.ecartes[0].item.code).toBe('P-4');
    expect(s.ecartes[0].titre).toBe('Fait P-4');                // il est NOMMÉ
    expect(s.ecartes[0].motif).toContain('plafond de 3');       // et le MOTIF est écrit
    // Arithmétique de la promesse « rien n'est écarté en silence » : tout candidat est affiché OU compté.
    expect(s.affiches.length + s.ecartes.length).toBe(s.candidats);
    expect(s.anomalies.sansRang).toBe(1);
  });

  it('4 candidats avec un RANG EN DOUBLE : c’est le rang 3 qui saute — conséquence ASSUMÉE et tracée', () => {
    const s = selectionnerMajeurs([
      fait('P-1', { designation: D(1) }), fait('P-2', { designation: D(2) }),
      fait('P-3', { designation: D(3) }), fait('P-4', { designation: D(2) }),   // rang 2 attribué deux fois
    ]);
    // L'ordre suit les RANGS DÉSIGNÉS (1, 2, 2, 3) ; le plafond tombe donc sur le rang 3, pas sur le
    // doublon. C'est contre-intuitif et c'est VOULU : réordonner pour « sauver » P-3 exigerait un critère
    // que la donnée ne porte pas — c'est-à-dire une DÉDUCTION, exactement ce que D-11 interdit. Le défaut
    // est dans la donnée (le moteur la refuse) ; l'application le SIGNALE au lieu de le rattraper en douce.
    expect(s.affiches.map((a) => a.item.code)).toEqual(['P-1', 'P-2', 'P-4']);
    expect(s.ecartes).toHaveLength(1);
    expect(s.ecartes[0].item.code).toBe('P-3');
    expect(s.affiches.length + s.ecartes.length).toBe(s.candidats);
    expect(s.anomalies.rangsEnDouble).toBe(1);                  // l'anomalie de schéma est vue, pas tue
  });

  it('5, 6, 7 candidats : le plafond tient, et le compte des écartés est exact à chaque fois', () => {
    for (const n of [5, 6, 7]) {
      const items = Array.from({ length: n }, (_, i) =>
        fait('P-' + i, { designation: { majeur: true, rang: RANGS[i % 3], statut: 'validee', motif: 'x'.repeat(30) } }));
      const s = selectionnerMajeurs(items);
      expect(s.candidats).toBe(n);
      expect(s.affiches).toHaveLength(MAX_MAJEURS);
      expect(s.ecartes).toHaveLength(n - MAX_MAJEURS);
      expect(s.affiches.length + s.ecartes.length).toBe(n);
    }
  });
});

describe('LOT-I · AUCUN REPÊCHAGE, AUCUN GARNISSAGE — « JAMAIS un mineur »', () => {
  it('1 seul majeur parmi 30 faits : on en affiche UN, on ne complète pas jusqu’à 3', () => {
    const items = Array.from({ length: 30 }, (_, i) => fait('P-' + i));
    items[17].designation = D(2);
    const s = selectionnerMajeurs(items);
    expect(s.affiches).toHaveLength(1);
    expect(s.affiches[0].item.code).toBe('P-17');
  });

  it('un fait NON désigné n’est jamais promu, même s’il est le premier de la liste', () => {
    const s = selectionnerMajeurs([fait('P-0'), fait('P-9', { designation: D(3) })]);
    expect(s.affiches.map((a) => a.item.code)).toEqual(['P-9']);
    expect(s.affiches.map((a) => a.item.code)).not.toContain('P-0');
  });

  it('un fait explicitement désigné NON MAJEUR reste hors sélection', () => {
    const s = selectionnerMajeurs([
      fait('P-1', { designation: { majeur: false, statut: 'validee' } }),
      fait('P-2', { designation: D(1) }),
    ]);
    expect(s.candidats).toBe(1);
    expect(s.affiches.map((a) => a.item.code)).toEqual(['P-2']);
  });

  it('la sélection ne dépend PAS de l’ordre d’entrée (preuve par permutation exhaustive)', () => {
    // D-11 en une assertion : si la position comptait, permuter la liste changerait le résultat.
    const base = [fait('A', { designation: D(2) }), fait('B', { designation: D(1) }), fait('C'), fait('D', { designation: D(3) })];
    const permutations = [];
    const permuter = (reste, acc) => {
      if (!reste.length) { permutations.push(acc); return; }
      reste.forEach((x, i) => permuter(reste.filter((_, j) => j !== i), acc.concat([x])));
    };
    permuter(base, []);
    expect(permutations).toHaveLength(24);
    for (const p of permutations) {
      expect(selectionnerMajeurs(p).affiches.map((a) => a.item.code)).toEqual(['B', 'A', 'D']);
    }
  });
});

describe('LOT-I · VACANCE — « sinon RIEN » est une DÉCISION, pas un vide', () => {
  const MOTIF = 'Aucun fait de l’axe n’atteint le seuil de majeur sur la période couverte.';

  it('0 majeur + vacance MOTIVÉE → état « vacance_motivee » (et toujours rien d’affiché)', () => {
    const s = selectionnerMajeurs([fait('P-1')], { porteur: { designationVacance: { motif: MOTIF, statut: 'validee' } } });
    expect(s.affiches).toEqual([]);
    expect(s.etat).toBe('vacance_motivee');
    expect(s.vacance.motif).toBe(MOTIF);
  });

  it('0 majeur + vacance SANS motif → « non_designe » : une vacance non expliquée est un orphelin', () => {
    const s = selectionnerMajeurs([fait('P-1')], { porteur: { designationVacance: { statut: 'validee' } } });
    expect(s.etat).toBe('non_designe');
  });

  it('une vacance déclarée sur un axe qui PORTE un majeur ne l’efface pas — la donnée observable gagne', () => {
    const s = selectionnerMajeurs([fait('P-1', { designation: D(1) })], { porteur: { designationVacance: { motif: MOTIF, statut: 'validee' } } });
    expect(s.etat).toBe('designe');
    expect(s.affiches).toHaveLength(1);
  });
});

describe('LOT-I · LECTURE TOLÉRANTE — la donnée distante est NON FIABLE et ne doit jamais faire planter', () => {
  const hostiles = [
    undefined, null, 0, '', 'majeur', [], NaN, true,
    { designation: 'majeur' }, { designation: [] }, { designation: 42 },
    { designation: { majeur: 'true' } }, { designation: { majeur: 1 } }, { designation: { majeur: 'oui' } },
    { designation: { majeur: true, rang: 0 } }, { designation: { majeur: true, rang: 4 } },
    { designation: { majeur: true, rang: '1' } }, { designation: { majeur: true, statut: 'valide' } },
    { designation: { __proto__: { majeur: true } } },
  ];

  it('aucune forme hostile ne lève, aucune ne devient « majeur » par coercition', () => {
    for (const h of hostiles) {
      expect(() => lireDesignation(h)).not.toThrow();
      const d = lireDesignation(h);
      if (h && typeof h === 'object' && h.designation && h.designation.majeur === true) continue;  // majeur légitime
      expect(d.majeur).toBe(false);
    }
  });

  it('une désignation de forme INATTENDUE est comptée comme ANOMALIE, pas confondue avec le silence', () => {
    const s = selectionnerMajeurs([fait('P-1', { designation: 'oui' }), fait('P-2', { designation: [1] }), fait('P-3')]);
    expect(s.anomalies.illisibles).toBe(2);
    expect(s.candidats).toBe(0);
    expect(s.affiches).toEqual([]);
  });

  it('un majeur SANS rang lisible est retenu, placé APRÈS les rangs désignés, et compté', () => {
    const s = selectionnerMajeurs([
      fait('P-1', { designation: { majeur: true, statut: 'validee', motif: 'x'.repeat(30) } }),   // pas de rang
      fait('P-2', { designation: D(1) }),
    ]);
    expect(s.affiches.map((a) => a.item.code)).toEqual(['P-2', 'P-1']);   // le rang désigné passe devant
    expect(s.anomalies.sansRang).toBe(1);
  });

  it('selectionnerMajeurs ne lève sur AUCUNE entrée aberrante', () => {
    for (const x of [undefined, null, 'texte', 42, {}, [null, undefined, 3, 'a']]) {
      expect(() => selectionnerMajeurs(x)).not.toThrow();
      expect(selectionnerMajeurs(x).affiches).toEqual([]);
    }
  });

  it('lireVacance est tolérante de la même façon', () => {
    for (const x of [undefined, null, 42, { designationVacance: 'oui' }, { designationVacance: [] }]) {
      expect(() => lireVacance(x)).not.toThrow();
      expect(lireVacance(x).validee).toBe(false);
    }
  });
});

describe('LOT-I · STATUT — une PROPOSITION n’est pas une décision de la rédaction', () => {
  it('une désignation « proposee » est retenue mais SIGNALÉE (elle n’est pas cachée, elle est qualifiée)', () => {
    // ARBITRAGE DÉCLARÉ, à confirmer par DIR_CHEFP : on ne l'EXCLUT pas (l'exclure serait une omission
    // muette de plus — la donnée dirait « majeur » et l'écran ne montrerait rien) ; on ne la présente pas
    // non plus comme validée. `validee` porte l'information et la carte l'écrit.
    const s = selectionnerMajeurs([fait('P-1', { designation: D(1, 'proposee') })]);
    expect(s.affiches).toHaveLength(1);
    expect(s.affiches[0].validee).toBe(false);
    expect(s.affiches[0].statut).toBe('proposee');
    expect(s.proposees).toBe(1);
  });

  it('une désignation « validee » est marquée comme telle', () => {
    const s = selectionnerMajeurs([fait('P-1', { designation: D(1) })]);
    expect(s.affiches[0].validee).toBe(true);
    expect(s.proposees).toBe(0);
  });
});

describe('LOT-I · PAR CONTENEUR — le plafond de 3 s’applique PAR axe, jamais au corpus entier', () => {
  it('trois axes portant chacun 3 majeurs donnent 9 affichés au total, 3 par axe', () => {
    const axe = (k) => ({ cle: k, label: k, items: [1, 2, 3].map((r) => fait(k + '-' + r, { designation: D(r) })) });
    const r = selectionnerParConteneur([axe('P'), axe('E'), axe('S')]);
    expect(r).toHaveLength(3);
    for (const c of r) expect(c.selection.affiches).toHaveLength(3);
    expect(r.reduce((n, c) => n + c.selection.affiches.length, 0)).toBe(9);
  });

  it('un conteneur vide reste présent, avec 0 affiché et l’état « non_designe »', () => {
    const r = selectionnerParConteneur([{ cle: 'Env', label: 'Environnement', items: [] }]);
    expect(r[0].selection.affiches).toEqual([]);
    expect(r[0].selection.etat).toBe('non_designe');
  });
});

describe('LOT-I · MESURE SUR LE CORPUS RÉELLEMENT EMBARQUÉ', () => {
  it('0 fait désigné sur les 18 éditions publiées — donc 0 majeur affiché, et c’est CORRECT', () => {
    let items = 0, designes = 0, majeurs = 0, axes = 0;
    for (const ed of Object.values(EDITIONS)) {
      for (const a of (ed.axes || [])) {
        axes++;
        const s = selectionnerMajeurs(a.items, { porteur: a });
        items += (a.items || []).length;
        designes += (a.items || []).filter((it) => lireDesignation(it).presente).length;
        majeurs += s.affiches.length;
      }
    }
    expect(Object.keys(EDITIONS).length).toBe(18);
    expect(items).toBe(248);
    expect(designes).toBe(0);      // désigner est un acte éditorial de SKL_REDAC : il n'a pas eu lieu
    expect(majeurs).toBe(0);       // le module n'invente donc RIEN — c'est le résultat attendu
    expect(axes).toBeGreaterThan(0);
  });

  it('aucune anomalie de désignation dans le corpus embarqué (le silence est propre)', () => {
    for (const ed of Object.values(EDITIONS)) {
      for (const a of (ed.axes || [])) {
        const s = selectionnerMajeurs(a.items, { porteur: a });
        expect(s.anomalies).toEqual({ sansRang: 0, rangsEnDouble: 0, illisibles: 0 });
      }
    }
  });
});

describe('LOT-I · COUPLAGE DÉCLARÉ avec le schéma du moteur (pestel-collector)', () => {
  // Le vocabulaire est RÉÉCRIT ici (dépôts séparés, l'app embarque son code). Ce test le CONFRONTE au
  // module réel du collecteur quand il est présent sur le disque, et DIT quand il ne l'est pas — plutôt
  // que d'affirmer un accord invérifié.
  const CHEMIN = path.join('C:', 'dev', 'pestel-collector', 'lib', 'designation.js');
  const present = fs.existsSync(CHEMIN);
  // Chargé par `vm`, PAS par require : le module vit hors des racines de jest, dont le résolveur tenterait
  // de le transformer par babel-jest et échouerait sur ses helpers. `vm` l'exécute TEL QUEL — ce qui est
  // d'ailleurs ce qu'on veut mesurer : le code réel du moteur, pas une version transformée pour le test.
  const chargerMoteur = () => {
    const vm = require('vm');
    const bac = { module: { exports: {} }, require, console };
    bac.exports = bac.module.exports;
    vm.createContext(bac);
    vm.runInContext(fs.readFileSync(CHEMIN, 'utf8'), bac, { filename: 'designation.js@collector' });
    return bac.module.exports;
  };

  it(present ? 'rangs, statuts et plafond sont IDENTIQUES à lib/designation.js' : 'collecteur absent : couplage NON vérifié (déclaré)', () => {
    if (!present) {
      // Ce n'est pas un succès déguisé : le test rend l'absence VISIBLE dans son propre nom.
      expect(fs.existsSync(CHEMIN)).toBe(false);
      return;
    }
    const moteur = chargerMoteur();
    expect(RANGS).toEqual(moteur.RANGS.slice());
    expect(STATUTS).toEqual(moteur.STATUTS.slice());
    expect(MAX_MAJEURS).toBe(moteur.MAX_MAJEURS_PAR_AXE);
  });

  it(present ? 'la LECTURE de l’app et celle du moteur s’accordent sur toutes les formes éprouvées' : 'collecteur absent : accord de lecture NON vérifié (déclaré)', () => {
    if (!present) { expect(fs.existsSync(CHEMIN)).toBe(false); return; }
    const moteur = chargerMoteur();
    const formes = [
      {}, { designation: null }, { designation: D(1) }, { designation: D(3, 'proposee') },
      { designation: { majeur: false, statut: 'validee' } }, { designation: 'oui' },
      { designation: { majeur: true, rang: 9, statut: 'validee', motif: 'x'.repeat(30) } },
      { designation: { majeur: 'true' } },
    ];
    for (const f of formes) {
      const a = lireDesignation(f), b = moteur.lire(f);
      expect([a.majeur, a.rang, a.statut, a.validee]).toEqual([b.majeur, b.rang, b.statut, b.validee]);
    }
  });
});

describe('LOT-I · GARDE ANTI-DÉDUCTION — le code lui-même ne peut pas trahir D-11', () => {
  it('src/majeurs.js ne trie sur AUCUN critère autre que le rang désigné', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'majeurs.js'), 'utf8');
    // Un tri est le lieu naturel d'une déduction (fraîcheur, fiabilité, nombre de sources…). Il n'y a
    // qu'un `.sort(` dans ce module, et sa clé est `designation.rang`.
    const tris = src.match(/\.sort\(/g) || [];
    expect(tris).toHaveLength(1);
    expect(src).toMatch(/avec\.sort\(\(a, b\) => a\.designation\.rang - b\.designation\.rang\)/);
    for (const interdit of ['publishedAt', 'reliability', 'sourceGrade', 'confidence', 'sources.length']) {
      expect(src).not.toContain(interdit);
    }
  });

  it('le seul critère de candidature est `designation.majeur === true`', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'majeurs.js'), 'utf8');
    expect(src).toContain('d.majeur === true');
  });

  // Le champ `designation` a UNE SEULE porte de lecture dans toute l'application : lireDesignation /
  // lireVacance. Un écran qui écrirait `item.designation.majeur` recréerait un second lecteur — donc une
  // seconde règle, donc la classe de défaut F2. La garde est faite sur l'AST, pas sur le texte : un
  // commentaire qui CITE `item.designation.majeur` (il y en a) ne doit pas la déclencher, et un accès réel
  // écrit autrement (`d['designation']`) ne doit pas lui échapper.
  it('le champ `designation` n’est lu QUE dans src/majeurs.js (une seule porte, cf. F2)', () => {
    const parser = require('@babel/parser');
    const traverse = require('@babel/traverse').default;
    const ROOT = path.join(__dirname, '..');
    const EXTS = ['.js', '.jsx'];
    const walk = (dir, out = []) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (EXTS.some((x) => e.name.endsWith(x))) out.push(p);
      }
      return out;
    };
    const fichiers = [path.join(ROOT, 'App.js'), ...walk(path.join(ROOT, 'src'))]
      .filter((f) => !f.split(path.sep).join('/').includes('/src/data/'));
    expect(fichiers.length).toBeGreaterThanOrEqual(20);      // garde de la garde

    const lecteurs = new Set();
    for (const f of fichiers) {
      const ast = parser.parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
      traverse(ast, {
        MemberExpression(p) {
          const n = p.node.property;
          const nom = p.node.computed
            ? (n.type === 'StringLiteral' ? n.value : null)
            : (n.type === 'Identifier' ? n.name : null);
          if (nom === 'designation' || nom === 'designationVacance') {
            lecteurs.add(path.relative(ROOT, f).split(path.sep).join('/'));
          }
        },
      });
    }
    expect([...lecteurs].sort()).toEqual(['src/majeurs.js']);
  });
});
