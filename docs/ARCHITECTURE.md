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
js/players.js           couleurs et avatars des joueurs
js/stats.js             calculs des statistiques (classement, séries, face-à-face)
js/chart.js             courbe de l'évolution des scores (SVG)
js/tools.js             boîte à outils de partie : dés, premier joueur, minuteur
js/games/index.js       liste des jeux (GAMES), getGame() et catégories de l'accueil
js/games/<jeu>.js       un module par jeu
icons/                  icônes de l'application (PNG générés + SVG)
tools/serve.mjs         serveur statique de développement
tools/make-icons.mjs    génère les icônes PNG sans dépendance
```

## Navigation

La navigation passe par le hash de l'URL. `route()` dans [js/app.js](../js/app.js) lit le hash et affiche l'écran correspondant :

| Hash | Écran |
| --- | --- |
| `#/` | Accueil : partie en cours, jeux récents, recherche, catégories et favoris, liens vers l'historique, les statistiques et les joueurs |
| `#/new/<id>` | Préparation : joueurs, extensions, options |
| `#/play` | Partie en cours, affichée par le module du jeu |
| `#/result/<id>` | Classement d'une partie terminée, évolution des scores, revanche, partage, modification, suppression |
| `#/history` | Parties terminées |
| `#/stats` | Vue d'ensemble, classement général, face-à-face, détail par jeu ; envoi, export et import de la sauvegarde |
| `#/players` | Joueurs : renommer, fusionner, avatar, couleur, retrait de la liste rapide |

Le bouton retour d'Android fonctionne naturellement, puisque chaque écran a sa propre entrée dans l'historique du navigateur.

Le démarrage (`route()` et le service worker) est placé à la fin de [js/app.js](../js/app.js) : les constantes du fichier doivent être initialisées avant le premier affichage.

Un écran peut définir `cleanup`, appelé au changement d'écran. L'écran de partie s'en sert pour libérer le verrou qui garde l'écran allumé (Wake Lock).

## Données

Tout est stocké sous la clé `gamescoring:v1` de `localStorage` ([js/store.js](../js/store.js)) :

```js
{
  players: ['Alice', 'Bob'],   // liste rapide des joueurs, du plus récent au plus ancien
  profiles: { Alice: { avatar: '🦊', color: 2 } }, // avatar et couleur (indice 0 à 7) choisis
  favorites: ['qwixx'],        // jeux favoris de l'accueil
  current: {                   // partie en cours, ou null
    id, gameId, startedAt,
    players: ['Alice', 'Bob'],
    options: { ..., expansions: ['athena'] },
    data: { ... },             // propre à chaque jeu, créé par game.init()
    editing: true              // présent quand on modifie une partie terminée (même id)
  },
  history: [{                  // parties terminées, de la plus récente à la plus ancienne
    id, gameId, startedAt, endedAt, players, options,
    scores: [42, 37],          // un score par joueur, dans l'ordre des joueurs
    winners: [0],              // indices des gagnants
    lowerWins: false,          // vrai si le plus petit score gagne
    unit: 'pts',
    details: ['🌳 7 · ⛰️ 3'],  // résumé facultatif par joueur
    data: { ... },             // état final du jeu (depuis 1.6) : modification et graphique
    editedAt                   // date de la dernière modification, s'il y en a eu une
  }]
}
```

Les points importants :
- La partie en cours est sauvegardée à chaque modification, via `ctx.save()`. Fermer l'appli ne perd donc rien.
- Les scores sont figés dans l'historique au moment de « Terminer ». Une correction future d'une règle ne modifie pas les anciennes parties.
- Depuis la version 1.6, chaque partie terminée garde aussi l'état du jeu (`data`). On peut donc la **modifier** : « Modifier » la rouvre comme partie en cours, avec le même `id`, et « Enregistrer » remplace l'ancienne version. Les parties plus anciennes n'ont pas cet état et ne sont pas modifiables.
- **Renommer un joueur** modifie son nom dans tout l'historique et dans la partie en cours. Si le nouveau nom existe déjà, les deux joueurs fusionnent, sauf s'ils ont joué une même partie.
- **Couleurs** : chaque joueur garde la couleur choisie dans son profil quand elle est libre ; les autres prennent les couleurs restantes dans l'ordre (`colorsFor` dans [js/players.js](../js/players.js)). La palette de 8 couleurs (`--p1` à `--p8`, une version claire et une sombre) a été validée pour le daltonisme.
- L'export produit ce même JSON, sans la partie en cours. L'import fusionne les parties par `id` : un même fichier importé deux fois ne crée pas de doublon.

## Mode hors ligne

[sw.js](../sw.js) met en cache la liste `ASSETS` à l'installation. Il répond ensuite depuis le cache et met à jour le cache en arrière-plan (stale-while-revalidate).

Pour que les mises à jour arrivent sur les téléphones :

- le service worker ignore le cache HTTP du navigateur (`cache: 'reload'` à l'installation, `no-cache` en arrière-plan), car GitHub Pages sert les fichiers avec `max-age=600` ;
- l'appli cherche une nouvelle version à chaque retour au premier plan (`registration.update()`), car une PWA installée n'est pas rechargée quand on la rouvre ;
- quand la nouvelle version prend le relais (`controllerchange`), la page se recharge d'elle-même. La partie en cours n'est pas perdue, puisqu'elle est sauvegardée en continu.

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

## Statistiques et graphique

- [js/stats.js](../js/stats.js) calcule le classement d'une partie (les égalités partagent le même rang), puis, par joueur :
  - parties jouées et victoires ;
  - record ;
  - meilleure série de victoires ;
  - rang moyen.

  Il calcule aussi le face-à-face entre deux joueurs : sur leurs parties communes, qui a fini devant l'autre.
- [js/chart.js](../js/chart.js) dessine l'évolution des scores pour les jeux qui fournissent `timeline`. La courbe affiche :
  - des traits de 2 px et une légende ;
  - les noms au bout des courbes jusqu'à 4 joueurs ;
  - une infobulle au toucher ;
  - une vue « tableau ».

## Tests

Le dépôt n'a pas de suite de tests automatisés. Pendant le développement, chaque jeu a été vérifié dans Chrome headless, piloté par le protocole DevTools : saisie de valeurs connues, puis comparaison des totaux avec ceux attendus par les règles. Pour vérifier une modification à la main, lancez `npm start`, ouvrez l'appli en vue mobile dans les outils de développement du navigateur, et jouez une partie de test.
