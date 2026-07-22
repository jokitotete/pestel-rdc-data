jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { N1Card, NewsCard } from '../src/ui';
import { DiversList } from '../src/screens/Triage';
import Home from '../src/screens/Home';
import Axes from '../src/screens/Axes';
import { normaliserN1 } from '../src/n1';
import { applyTheme, LIGHT, DARK } from '../src/theme';
import { getEdition, latestDate } from '../src/store';

// LOT-F / LOT-H — TESTS DE RENDU RÉEL (react-test-renderer). Ce dépôt n'en avait AUCUN : les gardes
// existantes (portée, imports, jetons, contraste) contrôlent le CODE et les JETONS, jamais l'arbre
// effectivement produit. Or les deux exigences centrales de ce lot ne sont vérifiables que là :
//   • « la carte N1 ne porte NI résumé NI analyse » — il faut regarder ce qui est RENDU, pas ce qui est écrit ;
//   • « Divers est masquée quand elle est vide » — il faut compter les pastilles rendues.
// On rend en clair ET en sombre : un composant peut être correct dans un thème et illisible dans l'autre.

// Rend un composant hors cycle React et renvoie l'arbre JSON (démonté proprement après lecture).
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
  const styles = [];
  const marcherStyle = (n) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(marcherStyle); return; }
    if (n.props && n.props.style) styles.push(JSON.stringify(n.props.style));
    marcherStyle(n.children);
  };
  marcherStyle(json);
  act(() => t.unmount());
  return { json, texte, textes: texte.join(' | '), styles: styles.join(' '), brut: JSON.stringify(json) };
};

const captee = (extra = {}) => normaliserN1({
  title: 'Kinshasa · dépêche captée', url: 'https://acp.cd/a', source: 'ACP',
  axis: 'E', confidence: 0.42, ...extra,
});

afterEach(() => applyTheme('light'));

describe('LOT-F · la carte N1 ne rend RIEN qu’elle n’ait le droit de rendre', () => {
  it('rend le titre et la MENTION, jamais un résumé — même si l’item en portait un', () => {
    const v = normaliserN1({
      title: 'Titre capté', url: 'https://acp.cd/a', source: 'ACP', axis: 'E', confidence: 0.42,
      text: 'RESUME_INTERDIT', analysis: 'ANALYSE_INTERDITE',
    });
    const r = rendre(<N1Card vue={v} onPress={() => {}} />);
    expect(r.textes).toContain('Titre capté');
    expect(r.textes).toContain('Économie · confiance 0,42');
    expect(r.brut).not.toContain('RESUME_INTERDIT');
    expect(r.brut).not.toContain('ANALYSE_INTERDITE');
  });

  it('affiche l’étiquette d’étage : le lecteur sait que ce n’est pas un fait rédigé', () => {
    expect(rendre(<N1Card vue={captee()} onPress={() => {}} />).textes).toContain('CAPTÉE · NON RÉDIGÉE');
  });

  it('sous le seuil : l’axe n’est pas affirmé, la faiblesse et l’autre piste sont ÉCRITES', () => {
    const v = captee({ confidence: 0.09, runnerUp: { axis: 'S' } });
    const r = rendre(<N1Card vue={v} onPress={() => {}} />);
    expect(r.textes).toContain('classé Économie · confiance faible (0,09) · autre piste : Social');
  });

  it('orphelin : « non classé » + meilleur candidat, jamais un axe inventé', () => {
    const r = rendre(<N1Card vue={captee({ axis: '?', runnerUp: 'T' })} onPress={() => {}} />);
    expect(r.textes).toContain('non classé · meilleur candidat : Numérique');
  });

  it('l’étiquette d’accessibilité annonce l’ouverture EXTERNE (rôle « link »)', () => {
    const r = rendre(<N1Card vue={captee()} onPress={() => {}} />);
    expect(r.json.props.accessibilityRole).toBe('link');
    expect(r.json.props.accessibilityLabel).toContain('ouvrir la source');
  });

  it('cible tactile ≥ 44 px (WCAG 2.5.8 / HIG) — mesurée sur le style rendu', () => {
    const r = rendre(<N1Card vue={captee()} onPress={() => {}} />);
    expect(r.json.props.style.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('LOT-F · la carte N1 est VISIBLEMENT différente d’un fait rédigé', () => {
  it('N1 = bordure tiretée + surface en retrait ; le fait rédigé n’a ni l’une ni l’autre', () => {
    const n1 = rendre(<N1Card vue={captee()} onPress={() => {}} />);
    const redige = rendre(<NewsCard axis="E" title="Fait rédigé" text="Un résumé travaillé" reliability="established" source={{ name: 'ACP', host: 'acp.cd' }} onPress={() => {}} />);
    expect(n1.json.props.style.borderStyle).toBe('dashed');
    expect(n1.json.props.style.backgroundColor).toBe(LIGHT.panel2);
    expect(redige.brut).not.toContain('dashed');
    expect(redige.brut).toContain('Un résumé travaillé');       // le fait rédigé, lui, PORTE son texte
  });

  it('la carte N1 ne porte PAS de barre d’accent colorée d’axe (rien n’affirme l’axe visuellement)', () => {
    const n1 = rendre(<N1Card vue={captee()} onPress={() => {}} />);
    const redige = rendre(<NewsCard axis="E" title="x" text="y" onPress={() => {}} />);
    // La barre d'accent du fait rédigé est peinte avec la couleur d'axe VIVE (AX.E) en fond plein.
    expect(redige.styles).toContain('#eab308');
    expect(n1.styles).not.toContain('"backgroundColor":"#eab308"');
  });
});

describe('LOT-F · rendu en thème SOMBRE (aucune couleur figée en clair)', () => {
  it('la carte N1 prend les jetons de la palette sombre', () => {
    applyTheme('dark');
    const r = rendre(<N1Card vue={captee()} onPress={() => {}} />);
    expect(r.json.props.style.backgroundColor).toBe(DARK.panel2);
    expect(r.brut).toContain(DARK.ink);            // titre à l'encre sombre
    expect(r.brut).not.toContain(LIGHT.panel2);    // aucune surface du thème clair ne subsiste
  });
  it('le même arbre de texte est rendu dans les deux thèmes (le sens ne dépend pas de la couleur)', () => {
    applyTheme('light');
    const clair = rendre(<N1Card vue={captee()} onPress={() => {}} />).textes;
    applyTheme('dark');
    const sombre = rendre(<N1Card vue={captee()} onPress={() => {}} />).textes;
    expect(sombre).toBe(clair);
  });
});

describe('LOT-H · « Divers » — soupape instrumentée et masquée à vide', () => {
  const triage = [
    { title: 'Captée A', url: 'https://acp.cd/1', source: 'ACP' },
    { title: 'Captée B', url: 'https://acp.cd/2', source: 'ACP' },
    { title: 'Captée C', url: 'http://x.cd/3', source: 'Radio Okapi' },
  ];

  it('avec du contenu : le compteur dit COMBIEN, D’OÙ et POURQUOI', () => {
    const r = rendre(<DiversList items={triage} />);
    expect(r.textes).toContain('Soupape surveillée');
    expect(r.textes).toContain('3 captées');
    expect(r.textes).toContain('POURQUOI ELLES SONT ICI');
    expect(r.textes).toContain('motif non transmis');     // aveu, pas motif inventé
    expect(r.textes).toContain('D’OÙ ELLES VIENNENT');
    expect(r.textes).toContain('ACP');
    expect(r.textes).toContain('1 lien non sécurisé (http)');
  });

  it('vide : aucun compteur, un vide ASSUMÉ (et la rubrique n’est pas censée être atteignable)', () => {
    const r = rendre(<DiversList items={[]} />);
    expect(r.textes).not.toContain('Soupape surveillée');
    expect(r.textes).toContain('Aucune information non classée');
  });

  it('les captées de « Divers » sont rendues avec la MÊME carte N1 (même étage, même traitement)', () => {
    const r = rendre(<DiversList items={triage} />);
    expect(r.textes).toContain('CAPTÉE · NON RÉDIGÉE');
    expect(r.textes).toContain('Captée A');
  });
});

describe('LOT-F/H · écran « À la une » — non-régression et masquage de la pastille', () => {
  const ed = getEdition(latestDate());
  const feed = [{ title: 'Captée du fil', url: 'https://acp.cd/f', source: 'ACP', axis: 'E' }];

  it('l’écran rend sans planter, en clair ET en sombre, avec l’édition RÉELLE embarquée', () => {
    for (const mode of ['light', 'dark']) {
      applyTheme(mode);
      const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[]} />);
      expect(r.textes).toContain('À la une');
      expect(r.textes).toContain('Captées');           // la section N1 existe et est nommée
      expect(r.textes).toContain('Captée du fil');
    }
  });

  it('« Divers » N’EST PAS offerte quand la soupape est vide', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[]} />);
    expect(r.textes).not.toContain('Divers');
  });

  it('« Divers » est offerte AVEC SON COMPTE dès qu’elle a du contenu', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[{ title: 'x', url: 'https://a.cd/x' }]} />);
    expect(r.textes).toContain('Divers · 1');
  });

  it('la répartition par axe des captées AFFICHE LES ZÉROS (blocs vides assumés)', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[]} />);
    expect(r.textes).toContain('Économie 1');
    expect(r.textes).toContain('Social 0');            // l'axe vide est écrit, pas effacé
    expect(r.textes).toContain('Environnement 0');
  });

  // Le filtre d'axe est SEMÉ par la navigation croisée (prop `seed`, RS1-19/20) : c'est le chemin réel
  // de l'application, pas une manipulation d'état inventée pour le test.
  it('filtre sur un axe SANS captée : le bloc vide est AFFICHÉ, il n’emprunte pas à un autre axe', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[]} seed={{ filter: { type: 'axis', key: 'S' }, n: 1 }} onSeedApplied={() => {}} />);
    expect(r.textes).toContain('Aucune information captée pour « Social » dans cette collecte.');
    expect(r.textes).not.toContain('Captée du fil');   // la captée « Économie » ne remplit PAS l'axe Social
  });

  it('filtre sur l’axe QUI a des captées : elles sont rendues sous les faits rédigés', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[]} seed={{ filter: { type: 'axis', key: 'E' }, n: 2 }} onSeedApplied={() => {}} />);
    expect(r.textes).toContain('Captée du fil');
    expect(r.textes).toContain('CAPTÉE · NON RÉDIGÉE');
  });
});

describe('LOT-H · écran « Axes » — la soupape suit LA MÊME règle que « À la une »', () => {
  const ed = getEdition(latestDate());
  it('vide → pastille absente ; contenu → pastille avec son compte', () => {
    const vide = rendre(<Axes ed={ed} onOpen={() => {}} triage={[]} />);
    expect(vide.textes).not.toContain('Divers');
    const plein = rendre(<Axes ed={ed} onOpen={() => {}} triage={[{ title: 'x', url: 'https://a.cd/x' }, { title: 'y', url: 'https://a.cd/y' }]} />);
    expect(plein.textes).toContain('Divers · 2');
  });
  it('rend sans planter en clair ET en sombre (non-régression de l’écran existant)', () => {
    for (const mode of ['light', 'dark']) {
      applyTheme(mode);
      expect(rendre(<Axes ed={ed} onOpen={() => {}} triage={[]} />).textes).toContain('Axes');
    }
  });
});
