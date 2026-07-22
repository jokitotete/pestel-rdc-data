jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MajeursSection } from '../src/screens/Majeurs';
import Home from '../src/screens/Home';
import Axes from '../src/screens/Axes';
import { applyTheme, LIGHT, DARK, TOUCH } from '../src/theme';
import { getEdition, latestDate } from '../src/store';
import { MAX_MAJEURS } from '../src/majeurs';

// ═══════════════════════════════════════════════════════════════════════════════
// LOT-I — LA BATTERIE D'ÉTATS, MESURÉE SUR LE RENDU RÉEL
// ═══════════════════════════════════════════════════════════════════════════════
// __tests__/majeurs.test.js prouve que le MODÈLE sélectionne bien. Il ne prouve RIEN sur ce que le lecteur
// voit : une sélection parfaite dans un composant jamais monté est une victoire imaginaire. Ici, on rend
// les VRAIS écrans (« À la une » et « Axes ») avec une édition porteuse de désignations, en thème clair ET
// sombre, et on compte ce qui sort.
//
// LA BATTERIE, MOT POUR MOT : 0 majeur → RIEN ; 1 → 1 ; 2 → 2 ; 3 → 3 ; 4 candidats → 3 + le choix TRACÉ.

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
  return { json, textes: texte.join(' | '), brut: JSON.stringify(json) };
};

const MOTIF = 'Décision institutionnelle chiffrée, sourcée et datée : elle engage la trajectoire de l’axe.';
const D = (rang, statut = 'validee') => ({ majeur: true, rang, statut, motif: MOTIF });

/** n faits de l'axe Politique, dont les `rangs` désignés majeurs (par index). */
const faits = (n, designations = {}) =>
  Array.from({ length: n }, (_, i) => ({
    code: 'P-' + (i + 1),
    title: 'Titre du fait numéro ' + (i + 1),
    text: 'Corps du fait numéro ' + (i + 1) + '.',
    analysis: 'Analyse.',
    reliability: 'established',
    sources: [1],
    ...(designations[i] ? { designation: designations[i] } : {}),
  }));

/** Édition SYNTHÉTIQUE de la forme RÉELLE (clés relevées sur src/data/pestel.js). */
const edition = (items, vacance = null) => ({
  date: '2026-07-22', label: '22 juillet 2026', generated: '', period: '', focus: '',
  headline: [],
  axes: [{
    key: 'P', name: 'Politique', short: 'Politique', lens: 'Analyste politique', icon: '', highlight: '',
    items, ...(vacance ? { designationVacance: vacance } : {}),
  }],
  signals: [], agenda: [], charts: [],
  sources: [{ id: 1, items: ['P-1'], name: 'ACP', type: 'Dépêche', reliability: 'A', date: '22/07/2026', url: 'https://acp.cd/a' }],
});

const semer = (filtre) => ({ seed: { filter: filtre, n: Math.random() }, onSeedApplied: () => {} });
const surAxe = (ed) => ({ ed, onOpen: () => {}, feed: [], triage: [], ...semer({ type: 'axis', key: 'P' }) });

afterEach(() => applyTheme('light'));

// ─────────────────────────────────────────────────────────────────────────────
// LA BATTERIE — sur l'écran « À la une », filtré sur l'axe Politique
// ─────────────────────────────────────────────────────────────────────────────
describe('LOT-I · BATTERIE D’ÉTATS SUR L’ÉCRAN RÉEL (« À la une » · axe Politique)', () => {
  for (const mode of ['light', 'dark']) {
    it(`[${mode}] 0 majeur → la section n’apparaît PAS du tout (état normal, pas une erreur)`, () => {
      applyTheme(mode);
      const r = rendre(<Home {...surAxe(edition(faits(6)))} />);
      expect(r.textes).not.toContain('Sujet majeur');
      expect(r.textes).not.toContain('Sujets majeurs');
      expect(r.textes).not.toContain('SUJET MAJEUR');
      // ET le reste de l'écran fonctionne : on n'a pas masqué la section en cassant l'axe.
      expect(r.textes).toContain('Titre du fait numéro 1');
    });

    it(`[${mode}] 1 majeur → 1 affiché, au singulier, avec son rang et son motif`, () => {
      applyTheme(mode);
      const r = rendre(<Home {...surAxe(edition(faits(6, { 3: D(1) })))} />);
      expect(r.textes).toContain('Sujet majeur');            // singulier
      expect(r.textes).not.toContain('Sujets majeurs');
      expect(r.textes).toContain('SUJET MAJEUR · RANG 1');
      expect(r.textes).toContain('1 sujet désigné majeur de l’axe « Politique »');
      expect(r.textes).toContain(MOTIF);
      expect((r.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(1);
    });

    it(`[${mode}] 2 majeurs → 2 affichés, dans l’ordre des RANGS et non des positions`, () => {
      applyTheme(mode);
      // Le rang 1 est porté par le DERNIER fait de la liste : si l'écran suivait la position, il sortirait
      // second. C'est l'arbitrage D-11 vérifié à l'écran, pas seulement dans le modèle.
      const r = rendre(<Home {...surAxe(edition(faits(6, { 0: D(2), 5: D(1) })))} />);
      expect((r.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(2);
      expect(r.textes.indexOf('Titre du fait numéro 6')).toBeLessThan(r.textes.indexOf('SUJET MAJEUR · RANG 2'));
      expect(r.textes).toContain('2 sujets désignés majeurs de l’axe « Politique »');
    });

    it(`[${mode}] 3 majeurs → 3 affichés, aucun écarté, aucune trace de plafond`, () => {
      applyTheme(mode);
      const r = rendre(<Home {...surAxe(edition(faits(6, { 0: D(1), 1: D(2), 2: D(3) })))} />);
      expect((r.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(MAX_MAJEURS);
      expect(r.textes).not.toContain('au-delà du plafond');
    });

    it(`[${mode}] 4 candidats → 3 affichés ET LE CHOIX EST TRACÉ à l’écran`, () => {
      applyTheme(mode);
      const r = rendre(<Home {...surAxe(edition(faits(6, {
        0: D(1), 1: D(2), 2: D(3),
        3: { majeur: true, statut: 'validee', motif: MOTIF },        // 4ᵉ, sans rang
      })))} />);
      expect((r.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(MAX_MAJEURS);
      expect(r.textes).toContain('1 sujet désigné majeur au-delà du plafond de 3');
      expect(r.textes).toContain('Titre du fait numéro 4');          // l'écarté est NOMMÉ
      expect(r.textes).toContain('rang non attribué');               // et son état est dit
    });
  }
});

describe('LOT-I · AUCUN REPÊCHAGE À L’ÉCRAN — « JAMAIS un mineur »', () => {
  it('1 majeur parmi 6 faits : la section ne montre QUE lui, jamais un voisin pour faire nombre', () => {
    const r = rendre(<MajeursSection items={faits(6, { 2: D(1) })} label="Politique" onOpen={() => {}} />);
    expect((r.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(1);
    expect(r.textes).toContain('Titre du fait numéro 3');
    for (const autre of [1, 2, 4, 5, 6]) expect(r.textes).not.toContain('Titre du fait numéro ' + autre);
  });

  // ══ ASSERTION RETOURNÉE PAR LA CORRECTION 2 ══════════════════════════════════════════════════════
  // CE QUI ÉTAIT AFFIRMÉ ICI JUSQU'AU 22/07/2026 : « une VACANCE motivée n'affiche pas davantage qu'une
  // absence : 0 majeur → RIEN » — `expect(r.json).toBeNull()`. Ce test était VERT et il VERROUILLAIT le
  // défaut : il faisait de l'impossibilité d'afficher la vacance une propriété VOULUE du produit, alors
  // que le mécanisme de vacance était par ailleurs présenté comme tenant la règle D-11 (« une vacance non
  // expliquée est un orphelin »). Une vacance MOTIVÉE est une décision éditoriale écrite : la taire, c'est
  // retirer de l'information au lecteur. Ce qui reste vrai, et qui est vérifié juste en dessous : elle
  // n'affiche AUCUN sujet — ni un majeur, ni un mineur repêché pour faire nombre.
  it('une VACANCE motivée s’AFFICHE (avec son motif) — mais n’affiche toujours AUCUN sujet', () => {
    const vac = { motif: 'Aucun fait de l’axe n’atteint le seuil de majeur sur la période couverte.', statut: 'validee' };
    const r = rendre(<MajeursSection items={faits(4)} label="Politique" porteur={{ designationVacance: vac }} onOpen={() => {}} />);
    expect(r.json).not.toBeNull();
    expect(r.textes).toContain('Aucun sujet majeur');
    expect(r.textes).toContain(vac.motif);
    // La règle produit tient toujours : zéro sujet montré, zéro repêchage.
    expect(r.textes).not.toContain('SUJET MAJEUR ·');
    for (const i of [1, 2, 3, 4]) expect(r.textes).not.toContain('Titre du fait numéro ' + i);
  });

  it('0 candidat → le composant rend `null`, pas un conteneur vide qui laisserait un blanc', () => {
    expect(rendre(<MajeursSection items={faits(10)} label="Politique" onOpen={() => {}} />).json).toBeNull();
    expect(rendre(<MajeursSection items={[]} label="Politique" onOpen={() => {}} />).json).toBeNull();
    expect(rendre(<MajeursSection label="Politique" onOpen={() => {}} />).json).toBeNull();
  });
});

describe('LOT-I · CE QUE LA CARTE DIT DU STATUT ET DU MOTIF', () => {
  it('une désignation PROPOSÉE est affichée ET qualifiée — ni cachée, ni présentée comme tranchée', () => {
    const r = rendre(<MajeursSection items={faits(3, { 0: D(1, 'proposee') })} label="Politique" onOpen={() => {}} />);
    expect(r.textes).toContain('SUJET MAJEUR · RANG 1');
    expect(r.textes).toContain('PROPOSÉE · NON VALIDÉE');
  });

  it('une désignation VALIDÉE ne porte pas la mention « proposée »', () => {
    const r = rendre(<MajeursSection items={faits(3, { 0: D(1) })} label="Politique" onOpen={() => {}} />);
    expect(r.textes).not.toContain('PROPOSÉE');
  });

  it('un motif ABSENT est AVOUÉ, jamais remplacé par un motif fabriqué', () => {
    const r = rendre(<MajeursSection items={faits(3, { 0: { majeur: true, rang: 1, statut: 'validee' } })} label="Politique" onOpen={() => {}} />);
    expect(r.textes).toContain('Motif de la désignation non transmis.');
  });

  it('le motif transmis est rendu INTÉGRALEMENT, précédé de son étiquette', () => {
    const r = rendre(<MajeursSection items={faits(3, { 0: D(2) })} label="Politique" onOpen={() => {}} />);
    expect(r.textes).toContain('Motif de la désignation : ' + MOTIF);
  });
});

describe('LOT-I · L’ÉCRAN « Axes » applique la MÊME règle (un seul prédicat, deux écrans — cf. F2)', () => {
  for (const mode of ['light', 'dark']) {
    it(`[${mode}] 0 majeur → rien ; 2 majeurs → 2 ; 4 candidats → 3 + trace`, () => {
      applyTheme(mode);
      const rien = rendre(<Axes ed={edition(faits(5))} onOpen={() => {}} triage={[]} />);
      expect(rien.textes).not.toContain('SUJET MAJEUR');
      expect(rien.textes).toContain('Titre du fait numéro 1');       // l'axe rend bien par ailleurs

      const deux = rendre(<Axes ed={edition(faits(5, { 1: D(1), 4: D(2) }))} onOpen={() => {}} triage={[]} />);
      expect((deux.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(2);

      const quatre = rendre(<Axes ed={edition(faits(5, { 0: D(1), 1: D(2), 2: D(3), 3: D(2) }))} onOpen={() => {}} triage={[]} />);
      expect((quatre.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(MAX_MAJEURS);
      expect(quatre.textes).toContain('au-delà du plafond de 3');
    });
  }

  it('les DEUX écrans affichent la même sélection pour le même axe (aucune divergence d’offre)', () => {
    const ed = edition(faits(6, { 0: D(3), 2: D(1), 5: D(2) }));
    const home = rendre(<Home {...surAxe(ed)} />);
    const axes = rendre(<Axes ed={ed} onOpen={() => {}} triage={[]} />);
    for (const attendu of ['Titre du fait numéro 3', 'Titre du fait numéro 6', 'Titre du fait numéro 1']) {
      expect(home.textes).toContain(attendu);
      expect(axes.textes).toContain(attendu);
    }
    expect((home.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(3);
    expect((axes.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(3);
  });
});

describe('LOT-I · ARBITRAGE DÉCLARÉ — un sujet majeur reste AUSSI dans la liste complète', () => {
  // Le choix : la section « Sujets majeurs » s'AJOUTE, elle ne RETIRE rien. Un fait désigné majeur paraît
  // donc deux fois sur l'écran de son axe — en tête, avec son rang et son motif, puis à sa place dans la
  // liste. L'autre option (le sortir de la liste) aurait été une TRONCATURE de la liste — la famille de
  // défauts la plus coûteuse de ce dépôt — et une régression de comportement sur un écran existant.
  // C'est un arbitrage de LISIBILITÉ, à confirmer par le commanditaire ; il est verrouillé ici pour qu'un
  // changement d'avis soit un acte explicite et non une dérive.
  it('« À la une » · axe : le fait désigné paraît en tête ET dans la liste (aucune troncature)', () => {
    const r = rendre(<Home {...surAxe(edition(faits(4, { 1: D(1) })))} />);
    expect(r.textes).toContain('SUJET MAJEUR · RANG 1');
    // Deux occurrences du titre : une dans la section, une dans la liste complète.
    expect((r.textes.match(/Titre du fait numéro 2/g) || []).length).toBeGreaterThanOrEqual(2);
    // Et la liste reste COMPLÈTE : les quatre faits sont là.
    for (const i of [1, 2, 3, 4]) expect(r.textes).toContain('Titre du fait numéro ' + i);
  });

  it('« Axes » : même arbitrage, la liste de l’axe garde tous ses items', () => {
    const r = rendre(<Axes ed={edition(faits(4, { 0: D(1), 3: D(2) }))} onOpen={() => {}} triage={[]} />);
    for (const i of [1, 2, 3, 4]) expect(r.textes).toContain('Titre du fait numéro ' + i);
    expect((r.textes.match(/SUJET MAJEUR/g) || [])).toHaveLength(2);
  });
});

describe('LOT-I · SECTEURS TRANSVERSAUX — la règle vaut aussi hors axe PESTEL', () => {
  it('un secteur porte lui aussi 1 à 3 majeurs, avec la formulation qui lui convient', () => {
    const r = rendre(<MajeursSection items={faits(4, { 1: D(1) })} label="Mines & Ressources" genre="secteur" onOpen={() => {}} />);
    expect(r.textes).toContain('1 sujet désigné majeur du secteur « Mines & Ressources »');
  });

  it('une rubrique porte la formulation « de la rubrique »', () => {
    const r = rendre(<MajeursSection items={faits(4, { 1: D(1) })} label="Culture & Arts" genre="rubrique" onOpen={() => {}} />);
    expect(r.textes).toContain('de la rubrique « Culture & Arts »');
  });
});

describe('LOT-I · THÈMES, ACCESSIBILITÉ ET CIBLES TACTILES', () => {
  it('le même texte est rendu en clair et en sombre (le sens ne dépend pas de la couleur)', () => {
    const el = () => <MajeursSection items={faits(4, { 0: D(1), 1: D(2) })} label="Politique" onOpen={() => {}} />;
    applyTheme('light');
    const clair = rendre(el()).textes;
    applyTheme('dark');
    const sombre = rendre(el()).textes;
    expect(sombre).toBe(clair);
  });

  it('aucune couleur du thème CLAIR ne subsiste en thème sombre', () => {
    applyTheme('dark');
    const r = rendre(<MajeursSection items={faits(4, { 0: D(1) })} label="Politique" onOpen={() => {}} />);
    expect(r.brut).toContain(DARK.goldText);
    expect(r.brut).not.toContain(LIGHT.panel);
    expect(r.brut).not.toContain(LIGHT.goldText);
  });

  it('chaque sujet majeur est un bouton étiqueté par son titre (lecteur d’écran)', () => {
    const r = rendre(<MajeursSection items={faits(4, { 0: D(1) })} label="Politique" onOpen={() => {}} />);
    expect(r.brut).toContain('"accessibilityRole":"button"');
    expect(r.brut).toContain('Titre du fait numéro 1');
  });

  it('la carte du sujet majeur ouvre bien le DOSSIER du fait désigné (et pas d’un autre)', () => {
    // On travaille sur l'ARBRE D'INSTANCES (`t.root`) et non sur `toJSON()` : `onPress` est un
    // gestionnaire de TouchableOpacity, il n'existe PAS dans la sortie JSON (qui ne porte que les props
    // hôtes). Chercher `onPress` dans le JSON aurait donné un test vert par absence de cible.
    const ouverts = [];
    let t;
    act(() => {
      t = renderer.create(<MajeursSection items={faits(4, { 2: D(1) })} label="Politique" onOpen={(c) => ouverts.push(c)} />);
    });
    const cibles = t.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === 'Titre du fait numéro 3' && typeof n.props.onPress === 'function',
      { deep: true }
    );
    expect(cibles.length).toBeGreaterThan(0);
    act(() => cibles[0].props.onPress());
    expect(ouverts).toEqual(['P-3']);
    act(() => t.unmount());
  });

  it('le jeton de cible tactile minimale reste celui du dépôt (≥ 44 px, WCAG 2.5.8)', () => {
    expect(TOUCH.min).toBeGreaterThanOrEqual(44);
  });
});

describe('LOT-I · NON-RÉGRESSION — l’édition RÉELLE embarquée MONTRE ses majeurs, et les avoue non validés', () => {
  // TCK-074 — RE-POINTÉ, PAS ASSOUPLI. Ce test exigeait l'ABSENCE du libellé « SUJET MAJEUR » parce
  // qu'aucune désignation n'existait dans le corpus. Elles existent : exiger encore l'absence
  // reviendrait à interdire de publier ce qui vient d'être instruit. On garde la seule chose qui ne
  // se périme pas — ça rend sans planter — et on AJOUTE la contrainte de sincérité D-11 : tout majeur
  // affiché doit porter, à l'écran, la mention qu'il n'est qu'une PROPOSITION.
  const ed = getEdition(latestDate());
  for (const mode of ['light', 'dark']) {
    it(`[${mode}] « À la une » et « Axes » rendent sans planter ; tout majeur affiché est dit NON VALIDÉ`, () => {
      applyTheme(mode);
      let vus = 0;
      for (const el of [
        <Home ed={ed} onOpen={() => {}} feed={[]} triage={[]} {...semer({ type: 'axis', key: 'E' })} />,
        <Home ed={ed} onOpen={() => {}} feed={[]} triage={[]} {...semer({ type: 'sector', key: 'mines' })} />,
        <Axes ed={ed} onOpen={() => {}} triage={[]} />,
      ]) {
        const r = rendre(el);
        expect(r.textes.length).toBeGreaterThan(0);
        const tout = r.textes;   // `rendre` renvoie DÉJÀ une chaîne (texte.join(' | '))
        const majeurs = (tout.match(/SUJET MAJEUR/g) || []).length;
        vus += majeurs;
        if (majeurs) {
          // Un majeur affiché SANS l'aveu « NON VALIDÉE » serait une hiérarchie présentée comme
          // opposable alors qu'elle est encore une proposition. C'est cela qu'on interdit désormais.
          expect(tout).toMatch(/NON\s+VALID(ÉE|EE)/i);
        }
      }
      // L'écran « Axes » de la dernière édition porte des majeurs : si ce compte tombait à 0, ce ne
      // serait pas un progrès mais une perte d'affichage — le test le dirait.
      expect(vus).toBeGreaterThan(0);
    });
  }
});
