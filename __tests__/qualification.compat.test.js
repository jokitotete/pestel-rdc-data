// ---------------------------------------------------------------------------
// TCK-103 — LA QUALIFICATION TRAVERSE JUSQU'À L'APPLICATION, ET NE CASSE PERSONNE.
//
// CE QUI ÉTAIT CASSÉ (MESURÉ par le LOT-F sur les 30 items du fil réel)
// ------------------------------------------------------------------------
//   confidence 0/30 · runnerUp 0/30 · sourceGrade 0/30 · level 0/30
// Chaque carte N1 affichait donc « confiance non transmise » : l'application
// AVOUAIT un manque au lieu d'informer. Cause principale : `publish.js`
// projetait le fil champ par champ et n'en retenait que six. Elle est corrigée
// côté collecteur (pestel-collector, lib/projection.js — contrat DÉCLARÉ,
// autocontrôle bloquant contre le schéma, éprouvé par mutation).
//
// CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS
// ------------------------------------------------------------------------
// Il PROUVE, sur des items EXTRAITS D'UN RUN RÉEL (voir provenance ci-dessous) :
//   1. que l'ACL FAIL-CLOSED des APK v1.4 DÉJÀ INSTALLÉS — celle qui est figée
//      dans git au commit 3f155f7, exécutée telle quelle — ACCEPTE un payload
//      dont le fil porte les nouveaux champs. Si elle les refusait, ces APK
//      resteraient gelés sur leur donnée embarquée du 14/07, silencieusement ;
//   2. que l'ACL courante les accepte aussi, et continue de refuser ce qu'elle
//      doit refuser ;
//   3. que la carte N1 dit désormais la confiance au lieu de s'excuser ;
//   4. que les six champs historiques sont transportés à l'identique (le lot est
//      purement ADDITIF : aucun champ retiré, aucune valeur modifiée).
// Il NE PROUVE PAS que le fil actuellement EMBARQUÉ dans l'application porte ces
// champs : il ne les porte pas, et pour une raison qui n'est PAS la projection —
// les pools des 13 et 15/07 d'où il sort ont été collectés AVANT le schéma du
// lot-E et ne portent eux-mêmes aucun de ces champs (mesuré : 0/30 au pool, cf.
// pestel-collector/mesure/rapports/TCK-103-qualification-flux.json). On ne
// transporte pas ce qui n'existe pas. Cela se corrige à la collecte, pas ici.
// ---------------------------------------------------------------------------
import { execFileSync } from 'child_process';
import path from 'path';
import vm from 'vm';
import { validateData } from '../src/acl';
import { normaliserN1, partitionnerN1, motifDivers } from '../src/n1';
import { isSafeUrl } from '../src/safeUrl';

const COMMIT_V14 = '3f155f7';   // « v1.4 Ntongo · RDC News — audit JOKI (14 points)… »
const RACINE = path.join(__dirname, '..');

/** Charge le module ACL d'un commit donné, sans réécrire sa logique (cf. designation.compat.test.js). */
function chargerAclDuCommit(commit) {
  const src = execFileSync('git', ['show', commit + ':src/acl.js'], { cwd: RACINE, encoding: 'utf8' });
  const js = src.replace(/^export\s+/gm, '');
  const retire = (src.match(/^export\s+/gm) || []).length;
  expect(src.length - js.length).toBe(retire * 'export '.length);   // rien d'autre n'a bougé
  const bac = { module: { exports: {} } };
  bac.exports = bac.module.exports;
  vm.createContext(bac);
  vm.runInContext(js + '\nmodule.exports = { validateData, safeAssign };', bac, { filename: 'acl@' + commit + '.js' });
  return bac.module.exports;
}

// ── PROVENANCE DES ITEMS ────────────────────────────────────────────────────
// Recopiés OCTET POUR OCTET de `public/pestel-data.json` produit le 2026-07-22 par :
//   pestel-collector> node publish.js 2026-07-22 --pool <pool de mesure> --out <dossier>
//   pestel-mobile>    FEED_JSON=<…>/feed.json TRIAGE_JSON=<…>/triage.json node build_data.js
// Le pool de mesure est le pool RÉEL du 22/07 (recollecte TCK-090, 3 005 items,
// conforme au schéma du lot-E) dans lequel une sélection de 30 items a été
// SIMULÉE — aucun item n'y était sélectionné par l'admin. Rien n'a été inventé :
// les valeurs ci-dessous sont celles du moteur.
const FEED_REEL = [
  {
    id: 'acp-cd-province-ebola-la-rdc-passe-dun-a-19-laboratoires-capables-de-diagnostiqu-1080',
    title: 'Ebola la rdc passe dun a 19 laboratoires capables de diagnostiquer la maladie charge des operations',
    url: 'https://acp.cd/province/ebola-la-rdc-passe-dun-a-19-laboratoires-capables-de-diagnostiquer-la-maladie-charge-des-operations/',
    source: 'ACP (Agence Congolaise de Presse)',
    publishedAt: '2026-07-22T14:53:33.000Z',
    axis: 'S', axisLabel: 'Social',
    level: 'N1', reliability: 'non-evaluee', statut: 'faible',
    confidence: 0.0725, runnerUp: null, sourceGrade: 'A',
  },
  {
    id: 'beto-cd-esu-le-gouvernement-adopte-un-bareme-salarial-intermediaire-pour-apaiser-6',
    title: 'ESU : le gouvernement adopte un barème salarial intermédiaire pour apaiser les tensions sociales',
    url: 'https://beto.cd/esu-le-gouvernement-adopte-un-bareme-salarial-intermediaire-pour-apaiser-les-tensions-sociales/',
    source: 'Beto.cd (ex-Politico.cd)',
    publishedAt: '2026-07-22T14:45:42.000Z',
    axis: 'P', axisLabel: 'Politique',
    level: 'N1', reliability: 'non-evaluee', statut: 'faible',
    confidence: 0.0899, runnerUp: 'S', sourceGrade: 'C',
  },
];
const TRIAGE_REEL = [
  {
    id: 'acp-cd-affaire-judiciare-et-droits-humains-rdc-seance-de-travail-annoncee-a-lord-1081',
    title: 'RDC : séance de travail annoncée à l’ordre national des avocats pour quatre bâtonniers - ACP',
    url: 'https://acp.cd/affaire-judiciare-et-droits-humains/rdc-seance-de-travail-annoncee-a-lordre-national-des-avocats-pour-quatre-batonniers/',
    source: 'ACP (Agence Congolaise de Presse)',
    publishedAt: '2026-07-22T14:49:31.000Z',
    axis: '?', axisLabel: 'Non classé',
    level: 'N1', reliability: 'non-evaluee', statut: 'orphelin',
    confidence: 0, runnerUp: null, sourceGrade: 'A',
  },
];

/** Payload minimal conforme au contrat RÉEL (même base que designation.compat.test.js). */
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

describe('TCK-103 — compatibilité ASCENDANTE : le fil qualifié ne casse aucun client', () => {
  let aclV14;
  beforeAll(() => { aclV14 = chargerAclDuCommit(COMMIT_V14); });

  it('l’ACL v1.4 extraite de git est bien la vraie (elle accepte la base, refuse le vide)', () => {
    expect(typeof aclV14.validateData).toBe('function');
    expect(aclV14.validateData(base())).toBe(true);
    expect(aclV14.validateData(null)).toBe(false);
  });

  it('APK v1.4 DÉJÀ INSTALLÉ : un fil PORTEUR de la qualification reste ACCEPTÉ', () => {
    const p = base();
    p.feed = FEED_REEL;
    p.triage = TRIAGE_REEL;
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('APK v1.4 : les valeurs LIMITES du fil réel passent (confiance 0, runnerUp null, axe « ? »)', () => {
    const p = base();
    p.feed = [{ ...FEED_REEL[0], confidence: 0, runnerUp: null }];
    p.triage = [{ ...TRIAGE_REEL[0], axis: '?', confidence: 0 }];
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('APK v1.4 : un fil portant EN PLUS une `designation` (TCK-102) reste ACCEPTÉ', () => {
    const p = base();
    p.feed = [{ ...FEED_REEL[0], designation: { majeur: true, rang: 1, statut: 'validee', motif: 'x'.repeat(25) } }];
    expect(aclV14.validateData(p)).toBe(true);
  });

  it('APK v1.4 : le contrat qu’elle EXIGE vraiment (title/axisLabel scalaires) est toujours refusé s’il casse', () => {
    // Contre-épreuve : sans elle, le test ci-dessus prouverait seulement que l’ACL dit « oui » à tout.
    const p = base();
    p.feed = [{ ...FEED_REEL[0], title: { objet: 'hostile' } }];
    expect(aclV14.validateData(p)).toBe(false);
    const q = base();
    q.feed = [{ ...FEED_REEL[0], axisLabel: ['tableau'] }];
    expect(aclV14.validateData(q)).toBe(false);
  });

  it('application COURANTE : même acceptation, et le typage des nouveaux champs mord', () => {
    const p = base();
    p.feed = FEED_REEL;
    p.triage = TRIAGE_REEL;
    expect(validateData(p)).toBe(true);
    // L’ACL courante TYPE confidence/sourceGrade/statut/runnerUp : un objet à leur
    // place doit être refusé EN BLOC (fail-closed), pas absorbé par le rendu.
    for (const casse of [{ confidence: {} }, { sourceGrade: [] }, { statut: {} }, { runnerUp: ['E'] }]) {
      const q = base();
      q.feed = [{ ...FEED_REEL[0], ...casse }];
      expect(validateData(q)).toBe(false);
    }
  });

  it('un client qui IGNORE ces champs lit exactement ce qu’il lisait — le lot est ADDITIF', () => {
    const historiques = ['title', 'url', 'source', 'axis', 'axisLabel', 'publishedAt'];
    for (const it of FEED_REEL) {
      for (const c of historiques) {
        expect(typeof it[c]).toBe('string');            // présent, et du type d’avant
      }
    }
    // Aucun champ historique n’a disparu du fil.
    const cles = new Set(Object.keys(FEED_REEL[0]));
    for (const c of historiques) expect(cles.has(c)).toBe(true);
  });
});

describe('TCK-103 — la carte N1 informe au lieu de s’excuser', () => {
  it('AVANT (fil à 6 champs) : la mention avoue le manque', () => {
    const avant = (it) => {
      const o = {};
      for (const c of ['title', 'url', 'source', 'axis', 'axisLabel', 'publishedAt']) o[c] = it[c];
      return o;
    };
    const v = normaliserN1(avant(FEED_REEL[0]));
    expect(v.mention).toBe('Social · confiance non transmise');
    expect(v.confiance).toBe(null);
    expect(v.note).toBe(null);
  });

  it('APRÈS (fil qualifié) : la confiance, le statut et la note de média arrivent', () => {
    const v = normaliserN1(FEED_REEL[0]);
    expect(v.confiance).toBe(0.0725);
    expect(v.statut).toBe('faible');                    // sous le seuil 0,15 — DIT, pas caché
    expect(v.note).toBe('A');
    // TCK-112 — « classé … · confiance faible » retiré : contradiction dans la même phrase (cf. n1.js).
    expect(v.mention).toBe('le moteur penche vers Social · pas assez sûr pour trancher (0,07)');
    expect(v.mention).not.toMatch(/non transmise/);
  });

  it('APRÈS : le meilleur candidat écarté est nommé quand il existe', () => {
    const v = normaliserN1(FEED_REEL[1]);
    expect(v.candidat).toEqual({ axe: 'S', label: 'Social' });
    expect(v.mention).toBe('le moteur penche vers Politique · pas assez sûr pour trancher (0,09) · autre piste : Social');
  });

  it('un `runnerUp: null` explicite ne fabrique aucun candidat', () => {
    expect(normaliserN1(FEED_REEL[0]).candidat).toBe(null);
  });

  it('la carte N1 reste une LISTE BLANCHE : les champs nouveaux qu’elle ne rend pas n’entrent pas dans la vue', () => {
    const v = normaliserN1({ ...FEED_REEL[0], level: 'N1', reliability: 'non-evaluee', id: 'x', designation: { majeur: true } });
    for (const interdit of ['level', 'reliability', 'id', 'designation', 'text', 'resume', 'analyse']) {
      expect(v[interdit]).toBeUndefined();
    }
  });

  it('« Divers » : le motif d’un orphelin cesse d’être « motif non transmis »', () => {
    expect(motifDivers({ title: 't' })).toBe('motif non transmis');          // fil d’avant
    expect(motifDivers(TRIAGE_REEL[0])).toBe('sous le seuil de confiance');  // fil qualifié
  });

  it('la partition du fil qualifié tient son invariant (rien d’écarté en silence)', () => {
    const p = partitionnerN1(FEED_REEL, { urlSure: isSafeUrl });
    expect(p.affiches.length + p.enPlus + p.nonOuvrables).toBe(p.sains);
    expect(p.affiches.every((v) => v.confiance !== null)).toBe(true);
  });
});
