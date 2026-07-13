# Kit d'identité « Ntongo » — assets de marque (PROPOSITION)

Déclinaison de l'icône **« l'aube cobalt »** issue de l'atelier d'identité (deck v2).
⚠️ **Proposition** — le nom « Ntongo » doit être **validé juridiquement avant intégration** :
disponibilité au registre national congolais (la RDC n'est **pas** membre de l'OAPI) et absence
de collision de nom sur l'App Store / Google Play.

Ces fichiers sont volontairement **dans un sous-dossier** : ils **ne remplacent pas** les assets
actuels de « RDC · Veille ». Pour les activer, pointer `app.json` dessus (voir ci-dessous).

## Fichiers

| Fichier | Taille | Usage |
|---|---|---|
| `icon.png` | 1024² | Icône d'app (iOS + général). Fond plein, l'OS applique son masque. |
| `adaptive-icon.png` | 1024² | Android — **foreground** (glyphe transparent, dans la zone sûre). |
| `adaptive-background.png` | 1024² | Android — **background** (dégradé cobalt). |
| `splash-icon.png` | 1024² | Logo centré pour l'écran de démarrage (expo-splash-screen). |
| `splash-preview.png` | 1242×2688 | Aperçu portrait complet du splash (marketing / validation). |
| `favicon.png` | 196² | Web. |
| `favicon-32.png` | 32² | Web (petite taille). |

Palette : indigo nuit `#121C5C` → cobalt `#1D3FC4` ; soleil or `#F4B740` → `#FFE7A6` ;
horizon & rayons `#FFFFFF` ; fond splash sombre `#0A1330`.

## Intégration (Expo SDK 56) — extrait `app.json`

```jsonc
{
  "expo": {
    "name": "Ntongo",                       // (le slug/package restent inchangés)
    "icon": "./assets/ntongo/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/ntongo/adaptive-icon.png",
        "backgroundImage": "./assets/ntongo/adaptive-background.png"
      }
    },
    "web": { "favicon": "./assets/ntongo/favicon.png" },
    "plugins": [
      ["expo-splash-screen", {
        "image": "./assets/ntongo/splash-icon.png",
        "imageWidth": 220,
        "backgroundColor": "#0A1330"
      }]
    ]
  }
}
```

> Après modif : `npx expo prebuild --clean` (ou nouveau build EAS) pour régénérer les icônes natives.
> Les PNG sont générés par `scratchpad/make_assets.py` (Pillow) — réexécuter pour régénérer/ajuster.
