// ═══════════════════════════════════════════════════════════════════════════════
// CONTRÔLE ADVERSARIAL — TCK-050, FAMILLE « TRONCATURE MUETTE »
// ═══════════════════════════════════════════════════════════════════════════════
// Le projet a déjà payé quatre fois cette famille (TCK-004, TCK-050, la table du lot-B, select.js oublié
// par un recensement « exhaustif »). Les lots F/H/I ont correctement instrumenté les plafonds de LISTE
// (`enPlus`, `ecartes`, « + N autres sources ») — mais pas les plafonds de CHAÎNE : `chaine()` coupait à
// 200/240/400/80 points de code sans marque et sans compteur, dans les deux modules, et l'étiquette
// d'accessibilité composée par ui.js héritait de la coupe sans le dire.
//
// CE QUE CETTE GARDE INTERDIT DÉSORMAIS :
//   · qu'une chaîne coupée se rende comme une chaîne complète (elle doit porter « … ») ;
//   · qu'une coupe ne se compte pas (partition.titresCoupes, selection.coupes).
//
// ÉPROUVÉE PAR MUTATION : retirer l'ellipse de src/n1.js ou de src/majeurs.js fait tomber ce fichier.

import { partitionnerN1 } from '../src/n1';
import { selectionnerMajeurs } from '../src/majeurs';

const ELLIPSE = '…';
const LONG = 'É'.repeat(600);   // caractère non-ASCII : vérifie aussi que la coupe compte des POINTS DE CODE

const designation = (rang) => ({
  majeur: true, rang, statut: 'validee',
  motif: 'M'.repeat(600),
});

describe('TCK-050 — aucune coupe de chaîne ne reste muette', () => {
  test('n1 : un titre trop long est coupé, MARQUÉ et COMPTÉ', () => {
    const p = partitionnerN1([{ title: LONG, url: 'https://exemple.cd/a', axis: 'P' }]);
    const titre = p.affiches[0].titre;
    expect(titre.endsWith(ELLIPSE)).toBe(true);
    expect([...titre].length).toBe(241);          // 240 points de code + l'ellipse
    expect(p.titresCoupes).toBe(1);
  });

  test('n1 : un titre court n’est NI coupé NI compté (pas de faux positif)', () => {
    const p = partitionnerN1([{ title: 'Titre bref', url: 'https://exemple.cd/b', axis: 'P' }]);
    expect(p.affiches[0].titre).toBe('Titre bref');
    expect(p.titresCoupes).toBe(0);
  });

  test('majeurs : titre ET motif coupés sont marqués et comptés', () => {
    const s = selectionnerMajeurs([{ title: LONG, designation: designation(1) }]);
    expect(s.affiches[0].titre.endsWith(ELLIPSE)).toBe(true);
    expect(s.affiches[0].motif.endsWith(ELLIPSE)).toBe(true);
    expect(s.coupes.titres).toBe(1);
    expect(s.coupes.motifs).toBe(1);
  });

  test('majeurs : la coupe des ÉCARTÉS compte aussi (le plafond ne masque pas la coupe)', () => {
    const items = [1, 2, 3].map((r) => ({ title: 'court', designation: designation(r) }));
    items.push({ title: LONG, designation: { ...designation(3), motif: 'motif suffisamment long ici' } });
    const s = selectionnerMajeurs(items);
    expect(s.ecartes.length).toBe(1);
    expect(s.ecartes[0].titre.endsWith(ELLIPSE)).toBe(true);
    expect(s.coupes.titres).toBe(1);
    // BOUCLAGE conservé malgré la correction : rien n'a été perdu en route.
    expect(s.candidats).toBe(s.affiches.length + s.ecartes.length);
  });

  test('majeurs : rien de coupé → compteurs à zéro', () => {
    const s = selectionnerMajeurs([{ title: 'court', designation: { majeur: true, rang: 1, statut: 'validee', motif: 'motif suffisamment long ici' } }]);
    expect(s.coupes).toEqual({ titres: 0, motifs: 0 });
  });
});

describe('TCK-050 — pas de nouvelle coupe muette dans les modules purs', () => {
  const fs = require('fs');
  const path = require('path');
  for (const rel of ['src/n1.js', 'src/majeurs.js']) {
    test(`${rel} : toute borne de chaîne passe par chaine() (qui marque et compte)`, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      // `.slice(0, N)` sur une CHAÎNE hors de chaine() est précisément le défaut corrigé.
      const suspects = (src.match(/\.trim\(\)\.slice\(0,/g) || []);
      expect(suspects).toEqual([]);
    });
  }
});
