# GameScoring

Application pour suivre les scores de nos jeux de société, installable sur Android.

C'est une PWA (application web installable) : elle fonctionne hors ligne, garde toutes les données sur le téléphone et n'a aucune dépendance.

**Application en ligne :** <https://spookymic.github.io/GameScoring/> (une fois GitHub Pages activé, voir plus bas)

## Jeux pris en charge

| Jeu | Saisie | Extensions et variantes |
| --- | --- | --- |
| Harmonies | Tableau par catégorie, cubes animaux pour départager | Esprits de la nature, Pulse, Crescendo (faces C et D, Sanctuaires, Murmures) |
| Les œufs sont faits | Calculateur de tour : œufs au plat, œuf dur, poulets (piste 1-2-3-4-5-4-3-2-1), œufs pourris ; fin au-delà de 99 points | Aucune extension n'existe |
| Akropolis | Étoiles × quartiers pour chaque couleur, plus les pierres (qui départagent) | Athena (statue : 5 points par pierre), les 5 variantes officielles qui doublent des points |
| Qwixx | Feuille à cocher par joueur : rangées cochées de gauche à droite, cadenas (fermeture possible par plusieurs joueurs au même lancer), pénalités, fin de partie détectée | Big Points, Bonus (version B), Connected ; Mixx, X-Change et Characters ne changent pas le décompte |
| Magic: The Gathering | Points de vie, poison, dégâts de commandant ; en duel, la carte du haut est retournée | Classique (20), Commander (40), Brawl (25 / 30) |
| Lorcana | Compteur de lore, objectif modifiable pour chaque joueur | Format Coconut (25), effet « adversaires à 25 » |
| Pixies | 3 manches : cartes validées, spirales, croix, plus grande zone × 2 / 3 / 4 | Flower Power (cartes face cachée à 5 points, jusqu'à 6 joueurs) |
| Sea Salt & Paper | Calculateur de cartes par joueur ; fin de manche STOP, Dernière chance ou pioche vide ; 4 sirènes | Extra Salt, Extra Pepper (événement de la manche) |
| Courtisans | Statut de chaque famille à la table de la reine, cartes de chaque famille dans le domaine, missions (+3) | Diplomates & Confidents (jusqu'à 6 joueurs, mode équipes) |
| Faraway | Points des 8 régions (comptées à rebours) et des sanctuaires, plus petite carte pour départager | Les Peuples du Dessous (7 joueurs), Sous un ciel d'étoiles |
| Pikomino | Pickominos de chaque joueur à toucher (un vol passe la tuile d'une pile à l'autre), vers comptés | Extrawurm (pickominos 11 et 13, vers grillés) |
| Encore ! | Colonnes (1er ou plus tard), couleurs (5 / 3), jokers, étoiles ; fin à 2 couleurs | Encore et encore ! (cœurs, lignes, dés spéciaux), blocs de feuilles I à VI |
| Skyjo | Score de manche, doublé pour celui qui finit sans avoir strictement le plus petit ; fin à 100, le plus bas gagne | Skyjo Action, Skyjo – Extension (rappels de règles) |
| Dix | Plus longue suite par couleur (une suite de 1 à 9 vaut 10), départage par la monnaie puis le nombre de cartes | Aucune extension n'existe |
| 421 | Jetons en charge (pris au pot) puis en décharge (donnés au perdant du tour) : on choisit la meilleure combinaison et les joueurs, l'appli déplace les jetons ; plusieurs parties, le score est le nombre de défaites | Règles locales paramétrables : nombre de jetons, valeur du 4-2-1, nénette |
| **Feuille libre** | Feuille paramétrable : nom du jeu, saisie par manches ou par catégories, score le plus haut ou le plus bas, score de fin et nombre de manches facultatifs ; les feuilles déjà utilisées sont proposées comme modèles | — |

Les extensions se cochent au moment de créer la partie. Les options qui dépendent d'une extension n'apparaissent que si elle est cochée.

Pour tous les jeux :

- la partie en cours est sauvegardée en continu ;
- on peut lancer une revanche avec les mêmes joueurs ;
- l'appli tient un historique et des statistiques par joueur (victoires, record) ;
- on peut exporter et importer les données en JSON, depuis l'écran « Statistiques » ;
- l'écran reste allumé pendant une partie.

Les sources des règles et les points encore à confirmer sont listés dans [docs/REGLES.md](docs/REGLES.md).

## Installer sur Android

La PWA doit être servie en **HTTPS** pour être installable et fonctionner hors ligne. Ce dépôt est prévu pour GitHub Pages :

1. Sur GitHub, ouvrir *Settings → Pages* et choisir la branche `main`, dossier `/ (root)`.
2. Ouvrir <https://spookymic.github.io/GameScoring/> dans Chrome sur le téléphone.
3. Menu ⋮ → **Installer l'application**.

## Développer

Il faut seulement Node.js, pour le serveur local et la génération des icônes. Il n'y a ni dépendance ni étape de build.

```bash
npm start            # serveur local sur http://localhost:8080
npm run icons        # régénère les icônes PNG dans icons/
```

Pour publier une nouvelle version :

1. Incrémenter `CACHE` dans [sw.js](sw.js), par exemple `gamescoring-v6` → `gamescoring-v7`. Sinon, les téléphones qui ont déjà installé l'appli garderont l'ancienne version.
2. Mettre le nouveau numéro de version dans [js/version.js](js/version.js) (affiché en bas de l'accueil) et dans [package.json](package.json).
3. Ajouter une entrée au [CHANGELOG.md](CHANGELOG.md), puis créer le tag `vX.Y.Z`.

Pour aller plus loin :

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : organisation du code, données, navigation, mode hors ligne.
- [docs/AJOUTER-UN-JEU.md](docs/AJOUTER-UN-JEU.md) : comment ajouter un jeu ou une extension.
- [CHANGELOG.md](CHANGELOG.md) : historique des versions.
