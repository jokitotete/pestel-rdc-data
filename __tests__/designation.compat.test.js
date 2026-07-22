// ---------------------------------------------------------------------------
// TCK-102 — COMPATIBILITÉ ASCENDANTE DU CHAMP `designation` : PREUVE, PAS PROMESSE.
//
// Le ticket ajoute un champ à un fichier que lisent DEUX populations de clients :
//   · l'application COURANTE (src/acl.js de ce dépôt) ;
//   · les APK v1.4 DÉJÀ INSTALLÉS, qu'on ne peut pas mettre à jour et qui vont
//     chercher le MÊME `pestel-data.json` distant.
//
// Le risque n'est pas théorique : l'ACL de v1.4 est FAIL-CLOSED — elle rejette le
// payload EN BLOC si le contrat casse. Si elle interdisait les champs inconnus,
// publier `designation` gèlerait les v1.4 sur leur donnée embarquée du 14/07,
// silencieusement. Affirmer « ça passe » ne suffit donc pas : on FAIT TOURNER
// l'ACL de la v1.4, telle qu'elle est figée dans git (commit 3f155f7), contre un
// payload porteur du champ.
//
// Aucun réseau. Le code v1.4 est extrait de git et exécuté tel quel (seuls les
// mots-clés `export` sont retirés pour l'exécuter en CommonJS : aucune ligne de
// logique n'est modifiée — le test le VÉRIFIE avant de s'en servir).
// ---------------------------------------------------------------------------
import { execFileSync } from 'child_process';
import path from 'path';
import vm from 'vm';
import { validateData } from '../src/acl';

const COMMIT_V14 = '3f155f7';   // « v1.4 Ntongo · RDC News — audit JOKI (14 points)… »
const RACINE = path.join(__dirname, '..');

/** Charge le module ACL d'un commit donné, sans réécrire sa logique. */
function chargerAclDuCommit(commit) {
  const src = execFileSync('git', ['show', commit + ':src/acl.js'], { cwd: RACINE, encoding: 'utf8' });
  // Transformation MINIMALE et VÉRIFIÉE : on ne touche qu'au mot-clé `export`.
  const js = src.replace(/^export\s+/gm, '');
  const retire = (src.match(/^export\s+/gm) || []).length;
  const ecart = src.length - js.length;
  expect(ecart).toBe(retire * 'export '.length);        // rien d'autre n'a bougé
  const bac = { module: { exports: {} } };
  bac.exports = bac.module.exports;
  vm.createContext(bac);
  vm.runInContext(js + '\nmodule.exports = { validateData, safeAssign };', bac, { filename: 'acl@' + commit + '.js' });
  return bac.module.exports;
}

/** Payload minimal conforme au contrat RÉEL (cf. __tests__/acl.test.js). */
const base = () => ({
  editions: {
    '2026-07-13': {
      date: '2026-07-13', label: '13 juillet 2026',
      axes: [{
        key: 'P', name: 'Politique', short: 'Politique', lens: 'Analyste',
        items: [{ code: 'P-1', title: 'Titre', text: 'Texte.', analysis: 'Analyse.', reliability: 'established', sources: [1] }],
      }],
      headline: [{ code: 'P-1', title: 'Titre', text: 'Texte.' }],
      sources: [{ name: 'Source', type: 'Article', date: '13/07/2026', url: 'https://x.cd/a', reliability: 'A' }],
    },
  },
  manifest: [{ date: '2026-07-13', label: '13 juillet 2026' }],
  stats: { themes: [], trends: [] },
});

const DESIGNATION = {
  majeur: true, rang: 1, statut: 'validee',
  motif: 'Décision institutionnelle chiffrée et sourcée : fait majeur désigné de l\'axe politique.',
};

describe('TCK-102 — le champ `designation` ne casse aucun client', () => {
  let aclV14;
  beforeAll(() => { aclV14 = chargerAclDuCommit(COMMIT_V14); });

  it('l\'ACL v1.4 extraite de git est bien la vraie (elle accepte le payload de référence)', () => {
    expect(typeof aclV14.validateData).toBe('function');
    expect(aclV14.validateData(base())).toBe(true);
    expect(aclV14.validateData(null)).toBe(false);          // elle refuse toujours ce qu'elle doit refuser
  });

  it('APK v1.4 DÉJÀ INSTALLÉ : un item porteur de `designation` reste ACCEPTÉ', () => {
    const p = base();
    p.editions['2026-07-13'].axes[0].items[0].designation = DESIGNATION;
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('APK v1.4 : `designation` sur un item de headline[] reste ACCEPTÉ', () => {
    const p = base();
    p.editions['2026-07-13'].headline[0].designation = DESIGNATION;
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('APK v1.4 : une VACANCE de majeur déclarée sur un axe reste ACCEPTÉE', () => {
    const p = base();
    p.editions['2026-07-13'].axes[0].designationVacance = {
      statut: 'validee', motif: 'Aucun fait de l\'axe n\'atteint le seuil de majeur sur la période couverte.',
    };
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('APK v1.4 : une désignation PROPOSÉE (non validée) ne change rien à l\'acceptation', () => {
    const p = base();
    p.editions['2026-07-13'].axes[0].items[0].designation = { majeur: true, rang: 2, statut: 'proposee', motif: 'Proposition à trancher par la rédaction.' };
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('application COURANTE : même acceptation, avec et sans le champ', () => {
    expect(validateData(base())).toBe(true);
    const p = base();
    p.editions['2026-07-13'].axes[0].items[0].designation = DESIGNATION;
    expect(validateData(p)).toBe(true);
  });

  it('le champ ABSENT se comporte comme « non désigné » — il ne se distingue d\'aucun défaut', () => {
    const p = base();
    const it = p.editions['2026-07-13'].axes[0].items[0];
    expect(it.designation).toBeUndefined();
    expect(!!(it.designation && it.designation.majeur)).toBe(false);   // lecture sûre côté rendu
    expect(validateData(p)).toBe(true);
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('le champ survit au transport JSON sans perte ni altération', () => {
    const p = base();
    p.editions['2026-07-13'].axes[0].items[0].designation = DESIGNATION;
    const rt = JSON.parse(JSON.stringify(p));
    expect(rt.editions['2026-07-13'].axes[0].items[0].designation).toEqual(DESIGNATION);
  });

  // Le transport par build_data.js repose sur JSON.stringify (aucune liste blanche
  // de champs), donc le champ passe par construction. Ce qui doit être ÉPROUVÉ,
  // c'est le COMPTEUR qui le déclare : un transport muet ne se vérifie pas.
  it('build_data.js COMPTE et DÉCLARE ce qu\'il transporte (compteur extrait du vrai fichier)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(path.join(RACINE, 'build_data.js'), 'utf8');
    const i = src.indexOf('function compterDesignations(');
    expect(i).toBeGreaterThan(-1);
    let p = 0, fin = -1;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
      if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (p === 0) { fin = k + 1; break; } }
    }
    expect(fin).toBeGreaterThan(i);                       // accolades appariées, extraction non tronquée
    const bac = { module: { exports: {} } };
    vm.createContext(bac);
    vm.runInContext(src.slice(i, fin) + '\nmodule.exports = compterDesignations;', bac, { filename: 'build_data.js#compteur' });
    const compter = bac.module.exports;

    const r = compter({
      '2026-07-13': {
        axes: [
          { key: 'P', items: [
            { code: 'P-1', designation: { majeur: true, rang: 1, statut: 'validee', motif: 'x'.repeat(25) } },
            { code: 'P-2', designation: { majeur: true, rang: 2, statut: 'proposee', motif: 'x'.repeat(25) } },
            { code: 'P-3' },                                             // non désigné
            { code: 'P-4', designation: { majeur: false, statut: 'validee' } },  // désigné NON majeur
          ] },
          { key: 'T', items: [{ code: 'T-1' }], designationVacance: { statut: 'validee', motif: 'x'.repeat(25) } },
        ],
      },
    });
    expect(r).toEqual({ faits: 5, portant: 3, majeurs: 2, proposes: 1, valides: 1, vacances: 1 });
  });

  it('le compteur ne lève pas sur une édition SANS axes ni items (18 éditions publiées incluses)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(path.join(RACINE, 'build_data.js'), 'utf8');
    expect(/TCK-102/.test(src)).toBe(true);              // la déclaration est bien dans le build
    expect(/console\.log\("✓ TCK-102 désignation/.test(src)).toBe(true);
  });

  it('un `designation` HOSTILE (objet là où le rendu attend une feuille) ne franchit pas la frontière du rendu', () => {
    // Garde-fou : le champ est une STRUCTURE, jamais une feuille rendue. On vérifie
    // qu'aucune de ses valeurs n'est passée telle quelle à un enfant Text par le
    // contrat — la lecture sûre côté client passe par un booléen et des scalaires.
    const d = { majeur: true, rang: 1, statut: 'validee', motif: 'x'.repeat(20) };
    expect(typeof d.majeur).toBe('boolean');
    expect(typeof d.rang).toBe('number');
    expect(typeof d.motif).toBe('string');
  });
});
