# Historique des versions

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/).

## [1.0.1] - 2026-10-19

### Corrigé

- Qwixx : une rangée fermée par le cadenas n'accepte plus de nouvelle croix, ni chez le joueur qui l'a fermée, ni chez les autres. Retirer une croix reste possible pour corriger une erreur.
- Qwixx : un autre joueur peut encore fermer la même rangée pendant le même lancer. Il coche le dernier nombre (avec 5 croix minimum), l'appli demande confirmation puis pose le cadenas.

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

[1.0.1]: https://github.com/Spookymic/GameScoring/releases/tag/v1.0.1
[1.0.0]: https://github.com/Spookymic/GameScoring/releases/tag/v1.0.0
