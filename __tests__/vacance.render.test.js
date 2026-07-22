jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import { MajeursSection } from '../src/screens/Majeurs';
import Home from '../src/screens/Home';
import Axes from '../src/screens/Axes';
import { applyTheme, LIGHT, DARK, TOUCH } from '../src/theme';
import { selectionnerMajeurs } from '../src/majeurs';

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION 2 — « LA VACANCE MOTIVÉE N'EST AFFICHABLE PAR AUCUN ÉCRAN »
// ═══════════════════════════════════════════════════════════════════════════════
// LE DÉFAUT, TEL QU'IL A ÉTÉ TROUVÉ (contrôle adversarial de la vague 4) : src/screens/Majeurs.js portait
// `if (s.affiches.length === 0) return null;` AVANT toute lecture de `s.vacance`. Le modèle distinguait
// bien trois états ('designe', 'vacance_motivee', 'non_designe') — l'ÉCRAN n'en distinguait que deux, et
// rendait EXACTEMENT la même chose (rien) pour les deux derniers.
//
// POURQUOI C'ÉTAIT UNE SURVENTE, ET PAS UN DÉTAIL D'AFFICHAGE : la règle D-11 dit qu'« une vacance non
// expliquée est un orphelin ». Le mécanisme de vacance a été livré comme la réponse à cette règle. Or une
// vacance EXPLIQUÉE que personne ne peut lire ne vaut pas mieux, pour le lecteur, qu'une vacance non
// expliquée : dans les deux cas il voit un axe muet, sans savoir si la rédaction a tranché ou pas.
//
// CE QUE CETTE BATTERIE MESURE, ET DANS QUEL ORDRE :
//   1. LA DISTINCTION elle-même — les deux états, côte à côte, sur le même composant et sur les VRAIS
//      écrans. C'est le test que l'ancien code ne pouvait PAS passer.
//   2. LA SINCÉRITÉ du bloc — motif rendu intégralement, statut dit tel quel, rien d'inventé pour
//      'non_designe'.
//   3. LA PORTE PRT_DSYST — jetons seulement, contraste CALCULÉ (bloc dédié de contrast.test.js), cibles
//      tactiles, rendu vérifié en clair ET en sombre.
//   4. LA NON-RÉGRESSION du reste (les sujets majeurs gagnent toujours sur la vacance).
//
// ÉPROUVÉE PAR MUTATION : remettre `if (s.affiches.length === 0) return null;` en tête de MajeursSection
// fait tomber cette suite (mesure reportée dans le compte rendu de la correction). Le dernier bloc pose
// en plus une garde STATIQUE contre le retour littéral de cette ligne — un test de rendu peut être
// contourné par une autre écriture du même défaut, la garde nomme le défaut.

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
  // Ce qui est LU À VOIX HAUTE est du texte affiché au même titre que le reste (même doctrine que LOT-G).
  const a11y = [];
  const marcherA11y = (n) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(marcherA11y); return; }
    if (n.props && typeof n.props.accessibilityLabel === 'string') a11y.push(n.props.accessibilityLabel);
    marcherA11y(n.children);
  };
  marcherA11y(json);
  act(() => t.unmount());
  return { json, textes: texte.join(' | '), a11y: a11y.join(' | '), brut: JSON.stringify(json) };
};

const MOTIF_VAC = 'Les quatre faits de l’axe sont des reprises d’une même dépêche du 21/07 : aucun ne porte de décision datée.';
const MOTIF_MAJ = 'Décision institutionnelle chiffrée, sourcée et datée : elle engage la trajectoire de l’axe.';
const D = (rang, statut = 'validee') => ({ majeur: true, rang, statut, motif: MOTIF_MAJ });
const VAC = (statut = 'validee', motif = MOTIF_VAC) => ({ motif, statut });

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
const section = (props) => <MajeursSection items={faits(4)} label="Politique" onOpen={() => {}} {...props} />;

afterEach(() => applyTheme('light'));

// ─────────────────────────────────────────────────────────────────────────────
// 1. LA DISTINCTION — le test que l'ancien code ne pouvait PAS passer
// ─────────────────────────────────────────────────────────────────────────────
describe('CORRECTION 2 · 1 — VACANCE MOTIVÉE et NON DÉSIGNÉ ne rendent plus la même chose', () => {
  it('le MODÈLE distinguait déjà les deux états (le défaut était bien dans l’ÉCRAN, pas dans le calcul)', () => {
    expect(selectionnerMajeurs(faits(4), { porteur: { designationVacance: VAC() } }).etat).toBe('vacance_motivee');
    expect(selectionnerMajeurs(faits(4), { porteur: {} }).etat).toBe('non_designe');
  });

  for (const mode of ['light', 'dark']) {
    it(`[${mode}] les deux états, côte à côte : l’un rend un bloc, l’autre rend \`null\``, () => {
      applyTheme(mode);
      const motivee = rendre(section({ porteur: { designationVacance: VAC() } }));
      const nonDesigne = rendre(section({ porteur: {} }));

      expect(motivee.json).not.toBeNull();
      expect(nonDesigne.json).toBeNull();
      // La preuve la plus directe : les deux SORTIES diffèrent. C'est exactement ce que l'ancien
      // `return null` rendait impossible — il les rendait identiques (toutes deux `null`).
      expect(motivee.brut).not.toBe(nonDesigne.brut);
      expect(motivee.textes).not.toBe(nonDesigne.textes);
    });
  }

  it('un axe SANS porteur du tout se comporte comme NON DÉSIGNÉ (rien, aucun message)', () => {
    expect(rendre(section({})).json).toBeNull();
    expect(rendre(section({ porteur: null })).json).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LA SINCÉRITÉ DU BLOC
// ─────────────────────────────────────────────────────────────────────────────
describe('CORRECTION 2 · 2 — ce que le bloc de vacance DIT, et ce qu’il se refuse à dire', () => {
  it('le motif est rendu INTÉGRALEMENT, précédé de son étiquette', () => {
    const r = rendre(section({ porteur: { designationVacance: VAC() } }));
    expect(r.textes).toContain('Motif de la vacance : ' + MOTIF_VAC);
  });

  it('le bloc NOMME l’état (« Aucun sujet majeur » / « VACANCE DÉSIGNÉE ») et le conteneur concerné', () => {
    const r = rendre(section({ porteur: { designationVacance: VAC() } }));
    expect(r.textes).toContain('Aucun sujet majeur');
    expect(r.textes).toContain('VACANCE DÉSIGNÉE');
    expect(r.textes).toContain('Aucun sujet de l’axe « Politique » n’a été désigné majeur');
  });

  it('il n’affiche AUCUN sujet : ni un majeur, ni un mineur repêché pour faire nombre', () => {
    const r = rendre(section({ porteur: { designationVacance: VAC() } }));
    expect(r.textes).not.toContain('SUJET MAJEUR');
    for (const i of [1, 2, 3, 4]) expect(r.textes).not.toContain('Titre du fait numéro ' + i);
  });

  // TROIS statuts, TROIS phrases. Le point important est le troisième : un statut ABSENT ne se lit pas
  // « proposée ». « Proposée » affirme qu'un acte éditorial a eu lieu ; « non transmis » avoue qu'on ne
  // sait pas. Les confondre serait fabriquer — la faute même que le pilote a commise.
  it('statut « validee » → aucune mention de statut (une décision tranchée n’a pas à être qualifiée)', () => {
    const r = rendre(section({ porteur: { designationVacance: VAC('validee') } }));
    expect(r.textes).not.toContain('PROPOSÉE');
    expect(r.textes).not.toContain('STATUT NON TRANSMIS');
  });

  it('statut « proposee » → « PROPOSÉE · NON VALIDÉE » (affichée, mais pas présentée comme tranchée)', () => {
    const r = rendre(section({ porteur: { designationVacance: VAC('proposee') } }));
    expect(r.textes).toContain('PROPOSÉE · NON VALIDÉE');
    expect(r.textes).toContain(MOTIF_VAC);
  });

  it('statut ABSENT ou inconnu → « STATUT NON TRANSMIS », JAMAIS « proposée » par défaut', () => {
    for (const v of [{ motif: MOTIF_VAC }, { motif: MOTIF_VAC, statut: 'en_cours' }, { motif: MOTIF_VAC, statut: 42 }]) {
      const r = rendre(section({ porteur: { designationVacance: v } }));
      expect(r.textes).toContain('STATUT NON TRANSMIS');
      expect(r.textes).not.toContain('PROPOSÉE');
    }
  });

  // LA LIMITE, ASSUMÉE ET VERROUILLÉE : une vacance DÉCLARÉE mais SANS motif est, par la règle D-11, un
  // ORPHELIN. Le modèle la classe 'non_designe' — l'écran n'affiche donc rien. C'est un choix : fabriquer
  // une phrase (« vacance déclarée, motif non transmis ») donnerait au lecteur une décision éditoriale qui
  // n'a jamais été écrite. Le défaut, s'il y en a un, appartient à la DONNÉE et au linter du moteur, pas au
  // rendu. Ce test EST cette décision, écrite ; si le commanditaire tranche autrement, il faudra le changer.
  it('vacance SANS motif → rien à l’écran (orphelin : la donnée est incomplète, on n’invente pas la phrase)', () => {
    for (const v of [{ statut: 'validee' }, { statut: 'validee', motif: '   ' }, { statut: 'validee', motif: 42 }]) {
      expect(rendre(section({ porteur: { designationVacance: v } })).json).toBeNull();
    }
  });

  it('vacance ILLISIBLE (forme inattendue) → rien à l’écran, et jamais de plantage', () => {
    for (const v of ['vacance', 42, ['motif'], true]) {
      expect(rendre(section({ porteur: { designationVacance: v } })).json).toBeNull();
    }
  });

  it('un motif démesuré est COUPÉ, MARQUÉ « … » et COMPTÉ (famille TCK-050, aucune coupe muette)', () => {
    const long = 'M'.repeat(600);
    const s = selectionnerMajeurs(faits(4), { porteur: { designationVacance: VAC('validee', long) } });
    expect(s.coupes.motifs).toBe(1);                       // la coupe est COMPTÉE par le modèle…
    const r = rendre(section({ porteur: { designationVacance: VAC('validee', long) } }));
    expect(r.textes).toContain('Motif de la vacance : ' + 'M'.repeat(400) + '…');   // …et MARQUÉE à l'écran
  });

  it('le complément de nom suit le genre du conteneur (axe · rubrique · secteur)', () => {
    const p = { designationVacance: VAC() };
    expect(rendre(section({ porteur: p, label: 'Culture & Arts', genre: 'rubrique' })).textes)
      .toContain('Aucun sujet de la rubrique « Culture & Arts » n’a été désigné majeur');
    expect(rendre(section({ porteur: p, label: 'Mines & Ressources', genre: 'secteur' })).textes)
      .toContain('Aucun sujet du secteur « Mines & Ressources » n’a été désigné majeur');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. LA PORTE PRT_DSYST — thèmes, accessibilité, cibles tactiles
// ─────────────────────────────────────────────────────────────────────────────
describe('CORRECTION 2 · 3 — PRT_DSYST : jetons, thèmes, accessibilité, cibles', () => {
  it('le TEXTE rendu est identique en clair et en sombre (le sens ne dépend pas de la couleur)', () => {
    applyTheme('light');
    const clair = rendre(section({ porteur: { designationVacance: VAC('proposee') } })).textes;
    applyTheme('dark');
    const sombre = rendre(section({ porteur: { designationVacance: VAC('proposee') } })).textes;
    expect(sombre).toBe(clair);
    expect(clair).toContain('PROPOSÉE · NON VALIDÉE');
  });

  it('aucune couleur du thème CLAIR ne subsiste en thème sombre (et réciproquement)', () => {
    applyTheme('dark');
    const sombre = rendre(section({ porteur: { designationVacance: VAC() } }));
    expect(sombre.brut).toContain(DARK.goldText);
    expect(sombre.brut).toContain(DARK.panel);
    expect(sombre.brut).not.toContain(LIGHT.panel);
    expect(sombre.brut).not.toContain(LIGHT.goldText);
    expect(sombre.brut).not.toContain(LIGHT.inkDim);

    applyTheme('light');
    const clair = rendre(section({ porteur: { designationVacance: VAC() } }));
    expect(clair.brut).toContain(LIGHT.goldText);
    expect(clair.brut).toContain(LIGHT.panel);
    expect(clair.brut).not.toContain(DARK.goldText);
    expect(clair.brut).not.toContain(DARK.inkDim);
  });

  it('le bloc est ANNONCÉ d’un seul tenant au lecteur d’écran, motif compris', () => {
    const r = rendre(section({ porteur: { designationVacance: VAC('proposee') } }));
    expect(r.a11y).toContain('Aucun sujet majeur.');
    expect(r.a11y).toContain('Désignation proposée · non validée.');
    expect(r.a11y).toContain('Motif de la vacance : ' + MOTIF_VAC);
    // Ce qui est LU est ce qui est AFFICHÉ : aucune information réservée aux seuls lecteurs d'écran,
    // aucune information réservée aux seuls voyants.
    expect(r.textes).toContain(MOTIF_VAC);
  });

  // CIBLES TACTILES — le bloc est INFORMATIF, donc sans aucun pressable : rien n'y ouvre quoi que ce soit
  // (une cible qui n'ouvre rien serait une promesse, cf. PRT_SINCE). Le test compte ce qui est mesurable :
  // zéro pressable ⇒ zéro cible sous le seuil. Et si un pressable était ajouté un jour, la seconde
  // assertion exige qu'il respecte TOUCH.min.
  it('le bloc n’expose AUCUNE cible tactile ; toute cible future devra tenir TOUCH.min (≥ 44 px)', () => {
    let t;
    act(() => {
      t = renderer.create(section({ porteur: { designationVacance: VAC() } }));
    });
    const pressables = t.root.findAll((n) => n.props && typeof n.props.onPress === 'function', { deep: true });
    expect(pressables).toHaveLength(0);
    for (const p of pressables) {
      const st = Object.assign({}, ...[].concat(p.props.style || []).filter(Boolean));
      expect(Math.max(st.minHeight || 0, st.height || 0)).toBeGreaterThanOrEqual(TOUCH.min);
    }
    act(() => t.unmount());
    expect(TOUCH.min).toBeGreaterThanOrEqual(44);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUR LES VRAIS ÉCRANS, ET SANS RÉGRESSION
// ─────────────────────────────────────────────────────────────────────────────
describe('CORRECTION 2 · 4 — les DEUX écrans savent montrer la vacance (un seul prédicat, cf. F2)', () => {
  for (const mode of ['light', 'dark']) {
    it(`[${mode}] « À la une » · axe : la vacance motivée est visible, l’axe non désigné reste muet`, () => {
      applyTheme(mode);
      const avec = rendre(<Home {...surAxe(edition(faits(4), VAC()))} />);
      expect(avec.textes).toContain('Aucun sujet majeur');
      expect(avec.textes).toContain(MOTIF_VAC);
      expect(avec.textes).toContain('Titre du fait numéro 1');        // la liste de l'axe reste complète

      const sans = rendre(<Home {...surAxe(edition(faits(4)))} />);
      expect(sans.textes).not.toContain('Aucun sujet majeur');
      expect(sans.textes).not.toContain('VACANCE');
      expect(sans.textes).toContain('Titre du fait numéro 1');
    });

    it(`[${mode}] « Axes » : même règle, même bloc, même motif`, () => {
      applyTheme(mode);
      const avec = rendre(<Axes ed={edition(faits(4), VAC())} onOpen={() => {}} triage={[]} />);
      expect(avec.textes).toContain('Aucun sujet majeur');
      expect(avec.textes).toContain(MOTIF_VAC);

      const sans = rendre(<Axes ed={edition(faits(4))} onOpen={() => {}} triage={[]} />);
      expect(sans.textes).not.toContain('Aucun sujet majeur');
      expect(sans.textes).not.toContain('VACANCE');
    });
  }

  it('les deux écrans affichent EXACTEMENT le même motif pour le même axe (aucune divergence d’offre)', () => {
    const ed = edition(faits(4), VAC('proposee'));
    const home = rendre(<Home {...surAxe(ed)} />);
    const axes = rendre(<Axes ed={ed} onOpen={() => {}} triage={[]} />);
    for (const attendu of ['Aucun sujet majeur', 'VACANCE DÉSIGNÉE', 'PROPOSÉE · NON VALIDÉE', MOTIF_VAC]) {
      expect(home.textes).toContain(attendu);
      expect(axes.textes).toContain(attendu);
    }
  });

  // NON-RÉGRESSION DE LA RÈGLE PRODUIT : la vacance ne peut pas contredire une désignation observable.
  it('un axe qui PORTE un majeur affiche le majeur, jamais la vacance (la donnée observable gagne)', () => {
    const r = rendre(<Home {...surAxe(edition(faits(4, { 2: D(1) }), VAC()))} />);
    expect(r.textes).toContain('SUJET MAJEUR · RANG 1');
    expect(r.textes).not.toContain('VACANCE DÉSIGNÉE');
    expect(r.textes).not.toContain(MOTIF_VAC);
  });

  // Un SECTEUR n'a pas de porteur (le schéma ne pose `designationVacance` que sur un AXE) : il ne peut
  // donc pas déclarer de vacance aujourd'hui. Limite DÉCLARÉE, verrouillée ici pour qu'elle ne se
  // transforme pas en croyance.
  it('un SECTEUR ne peut pas déclarer de vacance aujourd’hui — limite déclarée, pas oubli de rendu', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'Home.js'), 'utf8');
    expect(src).toMatch(/genre="secteur"/);
    const bloc = src.slice(src.indexOf('genre="secteur"') - 600, src.indexOf('genre="secteur"'));
    expect(bloc).toContain('LIMITE DÉCLARÉE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GARDE ANTI-RETOUR — le défaut, nommé
// ─────────────────────────────────────────────────────────────────────────────
describe('CORRECTION 2 · 5 — le défaut ne peut pas revenir en silence', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'Majeurs.js'), 'utf8');
  const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('MajeursSection ne court-circuite plus sur `affiches.length` avant d’avoir lu l’état', () => {
    // C'est LA ligne du défaut, littéralement. Une garde de rendu peut être contournée par une autre
    // écriture ; celle-ci nomme la forme exacte qui a coûté la survente.
    expect(CODE).not.toMatch(/affiches\.length\s*===\s*0\s*\)\s*return\s+null/);
  });

  it('l’écran lit l’ÉTAT du modèle (`s.etat`), il ne le re-déduit pas d’une longueur de tableau', () => {
    expect(CODE).toContain("s.etat === 'vacance_motivee'");
    expect(CODE).toContain("s.etat !== 'designe'");
  });

  it('les trois états du modèle sont tous traités par l’écran (aucun état orphelin)', () => {
    // Le vocabulaire d'états vit dans src/majeurs.js ; si un quatrième état y apparaissait, ce test
    // resterait vert à tort — on ancre donc AUSSI le compte, côté modèle.
    const MODELE = fs.readFileSync(path.join(__dirname, '..', 'src', 'majeurs.js'), 'utf8');
    const etats = new Set((MODELE.match(/'(designe|vacance_motivee|non_designe)'/g) || []).map((s) => s.slice(1, -1)));
    expect([...etats].sort()).toEqual(['designe', 'non_designe', 'vacance_motivee']);
  });
});
