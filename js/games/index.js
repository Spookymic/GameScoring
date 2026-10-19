// Chaque jeu expose : id, name, icon, color, tagline, minPlayers, maxPlayers, maxPlayersFor?(options),
// options? (une option ou un choix peut porter `requires: '<extension>'` ou `visible(options)`), expansions? [{ key, name, description }],
// titleFor?(options) (nom affiché), templates? (propose les réglages des parties précédentes),
// init(players, options) -> data, render(root, ctx), results(game) -> { scores, winners, unit?, lowerWins?, details? }
import harmonies from './harmonies.js';
import oeufs from './oeufs.js';
import akropolis from './akropolis.js';
import qwixx from './qwixx.js';
import mtg from './mtg.js';
import lorcana from './lorcana.js';
import swu from './swu.js';
import pixies from './pixies.js';
import seasalt from './seasalt.js';
import courtisans from './courtisans.js';
import faraway from './faraway.js';
import pikomino from './pikomino.js';
import encore from './encore.js';
import skyjo from './skyjo.js';
import dix from './dix.js';
import dice421 from './dice421.js';
import flip7 from './flip7.js';
import uno from './uno.js';
import sixquiprend from './sixquiprend.js';
import custom from './custom.js';

export const GAMES = [harmonies, oeufs, akropolis, qwixx, mtg, lorcana, swu, pixies, seasalt, courtisans, faraway, pikomino, encore, skyjo, dix, dice421, flip7, uno, sixquiprend, custom];

export const getGame = (id) => GAMES.find((g) => g.id === id);
