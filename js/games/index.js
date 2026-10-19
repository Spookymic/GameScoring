// Chaque jeu expose : id, name, icon, color, tagline, minPlayers, maxPlayers, maxPlayersFor?(options),
// options? (une option ou un choix peut porter `requires: '<extension>'`), expansions? [{ key, name, description }],
// init(players, options) -> data, render(root, ctx), results(game) -> { scores, winners, unit?, lowerWins?, details? }
import harmonies from './harmonies.js';
import oeufs from './oeufs.js';
import akropolis from './akropolis.js';
import qwixx from './qwixx.js';
import mtg from './mtg.js';
import lorcana from './lorcana.js';
import pixies from './pixies.js';
import seasalt from './seasalt.js';
import courtisans from './courtisans.js';
import faraway from './faraway.js';
import pikomino from './pikomino.js';
import encore from './encore.js';
import skyjo from './skyjo.js';
import dix from './dix.js';

export const GAMES = [harmonies, oeufs, akropolis, qwixx, mtg, lorcana, pixies, seasalt, courtisans, faraway, pikomino, encore, skyjo, dix];

export const getGame = (id) => GAMES.find((g) => g.id === id);
