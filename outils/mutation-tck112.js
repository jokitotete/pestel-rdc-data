#!/usr/bin/env node
// ÉPREUVE PAR MUTATION — TCK-112.
//
// Un test qui ne peut pas échouer ne prouve rien. Cet outil REMET chacun des trois défauts dans le code
// de production, un par un, rejoue la batterie et EXIGE qu'elle devienne ROUGE. Si un test reste vert
// alors que le défaut est revenu, ce test ne surveille pas ce qu'il prétend surveiller — et l'outil sort
// en échec. Il restaure TOUJOURS les fichiers (finally), y compris si jest plante.
//
// PIÈGE PAYÉ ICI (à ne pas repayer) : les fichiers de ce dépôt sont en CRLF. Une ancre multi-lignes
// écrite avec « \n » ne se trouve JAMAIS — et la mutation passe alors pour « appliquée puis non
// détectée », ou pire, pour « détectée » si l'outil ne vérifie pas que l'ancre existe. Les ancres sont
// donc appariées par EXPRESSION, insensiblement à la fin de ligne, et l'application est VÉRIFIÉE.
//
//   node outils/mutation-tck112.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const R = path.join(__dirname, '..');
const f = (p) => path.join(R, p);

// Ancre littérale → expression tolérante à \n comme à \r\n.
const rx = (s) => new RegExp(s.split('\n').map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'));

const MUTATIONS = [
  {
    nom: 'DÉFAUT 1a — le pied des Captées redit « aujourd’hui » d’un fil de 21 jours',
    fichier: 'src/screens/Home.js',
    de: '${fen.libelle ? ` ${fen.libelle}` : \'\'}, non affichée',
    vers: ' aujourd’hui, non affichée',
  },
  {
    nom: 'DÉFAUT 1b — « Aujourd’hui » redevient synonyme de « la plus récente »',
    fichier: 'src/screens/Home.js',
    de: 'const jourMeme = estAujourdhui(ed && ed.date, maintenant === undefined ? Date.now() : maintenant);',
    vers: 'const jourMeme = !!(ed && ed.date === latestDate());',
  },
  {
    nom: 'DÉFAUT 1c — la fenêtre du fil n’est plus écrite à l’écran',
    fichier: 'src/screens/Home.js',
    de: 'const fen = fenetreFil(feed);\n  if (!p.sains) return null;',
    vers: 'const fen = { libelle: \'\', jours: 0, sansDate: 0 };\n  if (!p.sains) return null;',
  },
  {
    nom: 'DÉFAUT 2a — « classé <axe> · confiance faible » revient',
    fichier: 'src/n1.js',
    de: '`le moteur penche vers ${label} · pas assez sûr pour trancher${c === null',
    vers: '`classé ${label} · confiance faible${c === null',
  },
  {
    nom: 'DÉFAUT 2b — l’arrondi peut de nouveau franchir le seuil (0,1497 → « 0,15 »)',
    fichier: 'src/n1.js',
    de: 'if (Number.isFinite(seuil)) {\n    const relu = Number(s);',
    vers: 'if (false) {\n    const relu = Number(s);',
  },
  {
    nom: 'DÉFAUT 3a — le mémo « Divers » de « À la une » retourne sur la seule référence',
    fichier: 'src/screens/Home.js',
    de: 'instrumenterDivers(triage, { urlSure: isSafeUrl }), [triage, dataVer]);',
    vers: 'instrumenterDivers(triage, { urlSure: isSafeUrl }), [triage]);',
  },
  {
    nom: 'DÉFAUT 3b — l’écran « Axes » retourne sur la seule référence',
    fichier: 'src/screens/Axes.js',
    de: 'instrumenterDivers(triage, { urlSure: isSafeUrl }), [triage, dataVer]);',
    vers: 'instrumenterDivers(triage, { urlSure: isSafeUrl }), [triage]);',
  },
  {
    nom: 'DÉFAUT 3c — le store cesse d’incrémenter sa version de données',
    fichier: 'src/store.js',
    de: 'VERSION++;\n    return true;',
    vers: 'return true;',
  },
  {
    nom: 'DÉFAUT 3d — App.js cesse de transmettre dataVer à Home',
    fichier: 'App.js',
    de: 'getTriage() : []} dataVer={dataVer} onOpenEvent={openEvent} onRefresh={refresh}',
    vers: 'getTriage() : []} onOpenEvent={openEvent} onRefresh={refresh}',
  },
];

// PIÈGE N°2 PAYÉ ICI : lancé par `npx.cmd`, Windows finit par rendre « spawnSync npx.cmd EINVAL » au
// bout de quelques dizaines de lancements. L'erreur n'a NI status NI sortie — un outil naïf la compte
// comme « la batterie est rouge », donc comme « la mutation est détectée ». Une mutation non détectée
// serait alors déclarée prouvée : le contraire de ce que cet outil existe pour établir.
// Deux parades : on appelle le binaire jest par `node` (pas de shim .cmd), et on DISTINGUE l'échec de
// TESTS (status 1) de l'échec de LANCEMENT (status absent), qui devient une erreur bruyante.
const JEST = path.join(R, 'node_modules', 'jest', 'bin', 'jest.js');
const jest = () => {
  try {
    execFileSync(process.execPath, [JEST, '--silent'], { cwd: R, stdio: 'pipe', encoding: 'utf8' });
    return { vert: true, lance: true, sortie: '' };
  } catch (e) {
    const lance = typeof (e && e.status) === 'number';
    const brut = String((e && (e.stderr || e.stdout)) || e.message || '');
    return {
      vert: false, lance,
      sortie: brut.split('\n').slice(-25).join('\n') || `(aucune sortie) status=${e && e.status} code=${e && e.code}`,
    };
  }
};

let echecs = 0;
console.log('ÉPREUVE PAR MUTATION — TCK-112\n');
for (const m of MUTATIONS) {
  const p = f(m.fichier);
  const avant = fs.readFileSync(p, 'utf8');
  const re = rx(m.de);
  if (!re.test(avant)) {
    console.log(`  ⛔ ${m.nom}\n     ANCRE INTROUVABLE dans ${m.fichier} — mutation NON APPLIQUÉE, donc NON PROUVÉE.`);
    echecs++;
    continue;
  }
  let r;
  try {
    const mute = avant.replace(re, (s) => s.replace(rx(m.de), m.vers.replace(/\n/g, s.includes('\r\n') ? '\r\n' : '\n')));
    if (mute === avant) { console.log(`  ⛔ ${m.nom}\n     REMPLACEMENT SANS EFFET — mutation non appliquée.`); echecs++; continue; }
    fs.writeFileSync(p, mute, 'utf8');
    r = jest();
  } finally {
    fs.writeFileSync(p, avant, 'utf8');
  }
  if (!r.lance) { console.log(`  ⛔ ${m.nom}\n     JEST N'A PAS DÉMARRÉ — rien n'est prouvé (${r.sortie}).`); echecs++; }
  else if (r.vert) { console.log(`  ⛔ ${m.nom}\n     LA BATTERIE EST RESTÉE VERTE avec le défaut remis : aucun test ne le surveille.`); echecs++; }
  else { console.log(`  ✔ ${m.nom}\n     batterie ROUGE — le défaut est bien surveillé.`); }
}

// Contrôle final : le code restauré doit repasser au vert (sinon la restauration a échoué).
const fin = jest();
console.log(`\nRestauration : batterie ${fin.vert ? 'VERTE' : 'ROUGE'}.`);
if (!fin.vert) { echecs++; console.log(fin.sortie); }
console.log(echecs === 0
  ? `\nRÉSULTAT : ${MUTATIONS.length} mutations sur ${MUTATIONS.length} détectées, code restauré.`
  : `\nRÉSULTAT : ${echecs} PROBLÈME(S).`);
process.exit(echecs === 0 ? 0 : 1);
