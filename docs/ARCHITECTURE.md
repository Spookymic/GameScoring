# Architecture

GameScoring est une application web statique écrite en JavaScript natif (modules ES), sans framework, sans dépendance et sans étape de build. Les fichiers du dépôt sont servis tels quels.

## Organisation des fichiers

```
index.html              page unique, charge css/app.css et js/app.js
manifest.webmanifest    manifeste PWA (nom, icônes, couleurs, mode standalone)
sw.js                   service worker : cache hors ligne
css/app.css             tout le style (thèmes clair et sombre via variables CSS)
js/app.js               navigation et écrans communs
js/dom.js               h() pour créer des éléments, uid()
js/version.js           numéro de version affiché en bas de l'accueil
js/store.js             persistance dans localStorage
js/components.js        composants partagés par les jeux
js/games/index.js       liste des jeux (GAMES) et getGame()
js/games/<jeu>.js       un module par jeu
icons/                  icônes de l'application (PNG générés + SVG)
tools/serve.mjs         serveur statique de développement
tools/make-icons.mjs    génère les icônes PNG sans dépendance
```

## Navigation

La navigation passe par le hash de l'URL. `route()` dans [js/app.js](../js/app.js) lit le hash et affiche l'écran correspondant :

| Hash | Écran |
| --- | --- |
| `#/` | Accueil : partie en cours, liste des jeux, liens vers l'historique et les statistiques |
| `#/new/<id>` | Préparation : joueurs, extensions, options |
| `#/play` | Partie en cours, affichée par le module du jeu |
| `#/result/<id>` | Classement d'une partie terminée, revanche, suppression |
| `#/history` | Parties terminées |
| `#/stats` | Statistiques par jeu et par joueur, export et import JSON |

Le bouton retour d'Android fonctionne naturellement, puisque chaque écran a sa propre entrée dans l'historique du navigateur.

Un écran peut définir `cleanup`, appelé au changement d'écran. L'écran de partie s'en sert pour libérer le verrou qui garde l'écran allumé (Wake Lock).

## Données

Tout est stocké sous la clé `gamescoring:v1` de `localStorage` ([js/store.js](../js/store.js)) :

```js
{
  players: ['Alice', 'Bob'],   // joueurs connus, du plus récent au plus ancien
  current: {                   // partie en cours, ou null
    id, gameId, startedAt,
    players: ['Alice', 'Bob'],
    options: { ..., expansions: ['athena'] },
    data: { ... }              // propre à chaque jeu, créé par game.init()
  },
  history: [{                  // parties terminées, de la plus récente à la plus ancienne
    id, gameId, startedAt, endedAt, players, options,
    scores: [42, 37],          // un score par joueur, dans l'ordre des joueurs
    winners: [0],              // indices des gagnants
    lowerWins: false,          // vrai si le plus petit score gagne
    unit: 'pts',
    details: ['🌳 7 · ⛰️ 3']   // résumé facultatif par joueur
  }]
}
```

Les points importants :
- La partie en cours est sauvegardée à chaque modification, via `ctx.save()`. Fermer l'appli ne perd donc rien.
- Les scores sont figés dans l'historique au moment de « Terminer ». Une correction future d'une règle ne modifie pas les anciennes parties.
- L'export produit ce même JSON, sans la partie en cours. L'import fusionne les parties par `id` : un même fichier importé deux fois ne crée pas de doublon.

## Mode hors ligne

[sw.js](../sw.js) met en cache la liste `ASSETS` à l'installation. Il répond ensuite depuis le cache et met à jour le cache en arrière-plan (stale-while-revalidate).

À chaque publication :
- **incrémenter `CACHE`**, pour que l'ancien cache soit supprimé ;
- **ajouter tout nouveau fichier à `ASSETS`**, sinon il ne sera pas disponible hors ligne.

## Composants partagés

[js/components.js](../js/components.js) fournit les briques utilisées par les jeux :

| Export | Rôle |
| --- | --- |
| `stepper(value, onChange, { min, max, label })` | Boutons − valeur + |
| `numInput(value, onChange, { label })` | Champ numérique (une valeur vide vaut 0) |
| `playerTabs(labels, { label, renderPanel })` | Onglets ; renvoie `{ el, refresh, rerender }` |
| `scoreGrid({ players, rows, total })` | Tableau de saisie lignes × joueurs avec total en direct |
| `banner(texte, action)` | Bandeau d'information (fin de partie, victoire) |
| `winnersBy(scores, lowerWins)` | Indices des meilleurs scores |
| `hasExpansion(options, key)` | Vrai si l'extension est cochée |
| `sum(values)`, `PLAYER_COLORS` | Utilitaires |

## Tests

Le dépôt n'a pas de suite de tests automatisés. Pendant le développement, chaque jeu a été vérifié dans Chrome headless, piloté par le protocole DevTools : saisie de valeurs connues, puis comparaison des totaux avec ceux attendus par les règles. Pour vérifier une modification à la main, lancez `npm start`, ouvrez l'appli en vue mobile dans les outils de développement du navigateur, et jouez une partie de test.
