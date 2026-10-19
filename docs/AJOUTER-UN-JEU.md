# Ajouter un jeu

Un jeu est un module de [js/games/](../js/games/) qui exporte par défaut un objet décrivant le jeu. L'application s'occupe du reste : choix des joueurs, extensions et options, sauvegarde, résultat, historique et statistiques.

## Étapes

1. Créer `js/games/monjeu.js` (modèle ci-dessous).
2. L'importer, l'ajouter au tableau `GAMES` et lui donner une catégorie dans `CATEGORY_OF` ([js/games/index.js](../js/games/index.js)).
3. Ajouter `'js/games/monjeu.js'` à la liste `ASSETS` de [sw.js](../sw.js), et incrémenter `CACHE`.
4. Ajouter une ligne au tableau des jeux du [README](../README.md) et au [CHANGELOG](../CHANGELOG.md).
5. Documenter les sources des règles dans [REGLES.md](REGLES.md).

## Description d'un jeu

| Propriété | Obligatoire | Rôle |
| --- | --- | --- |
| `id` | oui | Identifiant stable, utilisé dans l'URL et l'historique. Ne jamais le changer après publication. |
| `name`, `icon`, `color`, `tagline` | oui | Affichage sur l'accueil |
| `minPlayers`, `maxPlayers` | oui | Nombre de joueurs autorisé |
| `maxPlayersFor(options)` | non | Maximum qui dépend des extensions (par exemple 6 joueurs avec une extension) |
| `expansions` | non | `[{ key, name, description }]` : cases à cocher dans « Extensions » |
| `options` | non | Réglages de la partie (voir plus bas) |
| `titleFor(options)` | non | Nom affiché à la place de `name`, calculé à partir des options (la feuille libre affiche le nom saisi). Utilisé aussi pour regrouper les statistiques. |
| `templates` | non | `true` pour proposer, à la création, les réglages des parties déjà jouées avec ce jeu |
| `timeline({ players, options, data })` | non | Pour les jeux en manches : renvoie `{ points, unit?, roundLabel? }`, où `points[manche][joueur]` est le cumul après chaque manche. Active le graphique « Évolution des scores ». `cumulate(lignes)` (components) fait le cumul. |
| `dice` | non | Dés proposés par l'outil « Dés » : `{ count, sides, labels?, colors?, numeric? }`, par exemple `{ count: 8, sides: 6, labels: { 6: '🪱' } }` |
| `showBest` | non | `false` pour masquer la colonne « Record » des statistiques (jeux de points de vie, par exemple) |
| `init(players, options)` | oui | Renvoie l'état initial `data`, qui doit être sérialisable en JSON |
| `render(root, ctx)` | oui | Construit l'écran de partie dans `root` |
| `results(game)` | oui | Calcule le résultat final |

### Options

```js
options: [
  { key: 'side', type: 'choice', label: 'Face du plateau', default: 'A', choices: [
    { value: 'A', label: 'A' },
    { value: 'C', label: 'C', requires: 'crescendo' },   // visible seulement avec l'extension
  ] },
  { key: 'spirits', type: 'checkbox', label: 'Variante', default: false },
]
```

Types d'options :

| Type | Champ affiché | Propriétés utiles |
| --- | --- | --- |
| `checkbox` | Case à cocher | — |
| `choice` | Boutons à choix unique | `choices: [{ value, label }]` |
| `text` | Champ texte | `placeholder`, `maxLength`, `hint` |
| `textarea` | Texte sur plusieurs lignes | `placeholder`, `hint` |
| `number` | Champ numérique | `hint` |

Une option peut aussi dépendre d'une autre avec `visible: (options) => booléen`. Exemple : la liste des catégories de la feuille libre n'apparaît qu'en mode « Par catégories ». Une option masquée garde sa valeur.

Une option, ou un choix d'option, qui porte `requires: '<clé d'extension>'` n'apparaît que si cette extension est cochée. Si l'extension est décochée, l'option revient à sa valeur par défaut. Les extensions cochées sont disponibles dans `options.expansions`, que l'on teste avec `hasExpansion(options, 'clé')`.

### Le contexte `ctx` passé à `render`

| Champ | Rôle |
| --- | --- |
| `ctx.players` | Noms des joueurs, dans l'ordre choisi |
| `ctx.options` | Options et extensions de la partie |
| `ctx.data` | État du jeu ; le modifier directement, puis appeler `ctx.save()` |
| `ctx.save()` | Enregistre la partie en cours ; à appeler après chaque modification |
| `ctx.finish()` | Demande confirmation, puis termine la partie (pratique dans un bandeau de fin) |

### Le résultat renvoyé par `results({ players, options, data })`

```js
{
  scores: [42, 37],        // un nombre par joueur, dans l'ordre des joueurs
  winners: [0],            // indices des gagnants, départage compris
  lowerWins: false,        // facultatif : le plus petit score gagne
  unit: 'pts',             // facultatif : 'PV', 'lore', 'vers'…
  details: ['…', '…'],     // facultatif : résumé affiché sous chaque joueur
}
```

Le départage propre au jeu se calcule ici : par exemple les pierres à Akropolis, ou le plus haut pickomino à Pikomino.

## Modèle

```js
import { h } from '../dom.js';
import { hasExpansion, scoreGrid, sum, winnersBy } from '../components.js';

const ROWS = [
  { key: 'a', icon: '🅰️', label: 'Catégorie A', hint: '2 pts chacune' },
  { key: 'b', icon: '🅱️', label: 'Catégorie B' },
];
const total = (sheet) => sum(ROWS.map((r) => sheet[r.key]));

export default {
  id: 'monjeu',
  name: 'Mon jeu',
  icon: '🎯',
  color: '#0ea5e9',
  tagline: 'Description courte',
  minPlayers: 2,
  maxPlayers: 4,
  expansions: [{ key: 'ext', name: 'Mon extension', description: 'Ce qu’elle change' }],

  init: (players) => players.map(() => ({})),

  render(root, ctx) {
    root.append(scoreGrid({
      players: ctx.players,
      rows: ROWS.map((r) => ({
        ...r,
        get: (i) => ctx.data[i][r.key] ?? 0,
        set: (i, v) => { ctx.data[i][r.key] = v; ctx.save(); },
      })),
      total: (i) => total(ctx.data[i]),
    }));
  },

  results({ data }) {
    const scores = data.map(total);
    return { scores, winners: winnersBy(scores) };
  },
};
```

## Bonnes pratiques

- **Compatibilité des données.** Une partie en cours peut avoir été créée par une version précédente du module. Lisez les champs ajoutés plus tard avec une valeur par défaut, par exemple `sheet.doubled?.[key] ?? 0` ou `data.targets ??= …`.
- **Couleurs des joueurs.** Utilisez `PLAYER_COLORS[i % PLAYER_COLORS.length]` : l'appli y place les couleurs des joueurs de la partie avant d'afficher le jeu.
- **Zone de dessin.** `render` reçoit sa propre zone (`root`) : il peut la redessiner entièrement sans effacer les éléments ajoutés par l'appli, comme le graphique.
- **Mises à jour ciblées.** Ne reconstruisez pas tout l'écran à chaque frappe dans un champ numérique, sinon le clavier se ferme. Mettez à jour seulement les totaux, comme le fait `scoreGrid`.
- **Règles.** Écrivez à côté du code la règle qu'il applique, en commentaire, et signalez dans [REGLES.md](REGLES.md) ce qui n'a pas pu être confirmé dans un livret officiel.
