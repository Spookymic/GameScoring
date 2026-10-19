# Historique des versions

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/).

## [1.6.0] - 2026-10-19

### Ajouté

- **Gestion des joueurs** (écran « Joueurs ») :
  - renommer un joueur dans tout l'historique, ou le fusionner avec un autre ;
  - avatar et couleur gardés d'une partie à l'autre ;
  - retrait de la liste rapide.
- **Modifier une partie terminée** : elle se rouvre telle qu’elle était, et « Enregistrer » remplace le résultat. Cela concerne les parties terminées à partir de cette version.
- **Accueil** : jeux joués récemment, recherche, catégories et favoris.
- **Partager un résultat** : partage natif d'Android (WhatsApp, SMS…), ou copie dans le presse-papiers.
- **Boîte à outils en partie** : dés (ceux du 421, de Qwixx, de Pikomino et des Œufs sont faits sont préréglés), tirage du premier joueur, minuteur avec vibration et bip.
- **Évolution des scores** : courbe manche par manche dans la partie et sur le résultat, avec infobulle et vue en tableau.
- **Statistiques** :
  - vue d'ensemble et classement général tous jeux confondus ;
  - meilleure série de victoires et rang moyen ;
  - face-à-face entre deux joueurs.
- **Envoi de la sauvegarde** vers un autre téléphone, par le partage de fichier.

### Modifié

- Couleurs des joueurs : nouvelle palette de 8 couleurs validée pour le daltonisme, en clair et en sombre.

## [1.5.0] - 2026-10-19

### Ajouté

- **Flip 7** : calculateur de manche par joueur, jusqu'à 200 points, égalité rejouée.
  - Cartes nombres, bonus +2 à +10, x2, saut à 0, bonus Flip 7 de +15.
  - Édition **Flip 7 Vengeance** : nombres jusqu'à 13, malus et ÷2, Zéro, et mode sans pitié en option.
- **Uno** : le gagnant de la manche marque les cartes restées dans les autres mains, comptées par type.
  - Éditions **classique**, **Uno Flip** (côté clair ou sombre) et **No Mercy** (1000 points, +250 par joueur éliminé).
  - Décompte alternatif officiel : chacun marque ses propres points et le plus bas gagne.
- **6 qui prend !** : saisie des numéros des cartes ramassées (les têtes de bœuf sont calculées) ou directement des têtes.
  - Fin à 66, configurable : « 66 ou plus » ou « au-delà de 66 ».
  - Édition **6 qui surprend !** en 2 manches.

## [1.4.0] - 2026-10-19

### Ajouté

- **Star Wars: Unlimited** : suivi des dégâts sur la base de chaque joueur.
  - Les PV de chaque base sont réglables (30 par défaut).
  - Le jeton d'initiative se donne d'un toucher.
  - Une alerte s'affiche quand une base est détruite.
  - À 3 ou 4 joueurs (format Twin Suns) : bouton « blast » (1 dégât à chaque adversaire), et la base qui a le plus de PV restants gagne.

## [1.3.0] - 2026-10-19

### Ajouté

- **421** : suivi des jetons en charge puis en décharge.
  - À chaque tour, on choisit la meilleure combinaison et les joueurs concernés ; l'appli déplace les jetons.
  - Les joueurs sans jeton en décharge sont libérés, et le dernier qui a encore des jetons perd la partie.
  - Plusieurs parties s'enchaînent : le score est le nombre de défaites, le plus petit gagne.
  - On règle le nombre de jetons, la valeur du 4-2-1 et la règle de la nénette.

## [1.2.0] - 2026-10-19

### Ajouté

- **Feuille libre** : une feuille de score générique et paramétrable, pour les jeux qui n'ont pas leur propre écran. On règle :
  - le nom du jeu ;
  - la saisie, par manches ou par catégories (catégories au choix) ;
  - le vainqueur, au score le plus haut ou le plus bas ;
  - un score de fin de partie et un nombre de manches, tous deux facultatifs.
- Les feuilles déjà utilisées sont proposées comme modèles à la création d'une partie.
- Les statistiques séparent chaque feuille libre selon son nom.

## [1.1.1] - 2026-10-19

### Corrigé

- Mises à jour sur mobile : l'appli installée cherche une nouvelle version à chaque fois qu'on y revient, puis se recharge d'elle-même. La partie en cours est conservée.
- Le cache hors ligne ne récupère plus d'anciens fichiers depuis le cache du navigateur.

## [1.1.0] - 2026-10-19

### Ajouté

- Le numéro de version de l'application est affiché en bas de la page d'accueil.

## [1.0.1] - 2026-10-19

### Corrigé

- Qwixx : une rangée fermée par le cadenas n'accepte plus de nouvelle croix, ni chez le joueur qui l'a fermée, ni chez les autres. Retirer une croix reste possible pour corriger une erreur.
- Qwixx : un autre joueur peut encore fermer la même rangée pendant le même lancer. Il coche le dernier nombre (avec 5 croix minimum), l'appli demande confirmation puis pose le cadenas.
- Qwixx : on coche de gauche à droite. Les nombres situés à gauche de la dernière croix d'une rangée ne sont plus cochables.

## [1.0.0] - 2026-10-19

Première version.

### Ajouté

- PWA installable sur Android, utilisable hors ligne, sans dépendance.
- 14 jeux :
  - Harmonies
  - Les œufs sont faits
  - Akropolis
  - Qwixx
  - Magic: The Gathering
  - Lorcana
  - Pixies
  - Sea Salt & Paper
  - Courtisans
  - Faraway
  - Pikomino
  - Encore !
  - Skyjo
  - Dix
- Extensions cochables au moment de créer la partie :
  - Harmonies : Pulse, Crescendo
  - Akropolis : Athena et les variantes officielles
  - Qwixx : Big Points, Bonus, Connected
  - Pixies : Flower Power
  - Sea Salt & Paper : Extra Salt, Extra Pepper
  - Courtisans : Diplomates & Confidents
  - Faraway : Les Peuples du Dessous, Sous un ciel d'étoiles
  - Pikomino : Extrawurm
  - Encore ! : Encore et encore !
  - Skyjo : Skyjo Action, Skyjo – Extension
- Formats de Magic (Commander, Brawl) et de Lorcana (Format Coconut).
- Partie en cours sauvegardée en continu, revanche, historique, statistiques par joueur, export et import JSON.
- L'écran reste allumé pendant une partie.

[1.6.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.6.0
[1.5.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.5.0
[1.4.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.4.0
[1.3.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.3.0
[1.2.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.2.0
[1.1.1]: https://github.com/Spookymic/GameScoring/releases/tag/v1.1.1
[1.1.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.1.0
[1.0.1]: https://github.com/Spookymic/GameScoring/releases/tag/v1.0.1
[1.0.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.0.0
