import { h } from '../dom.js';
import { hasExpansion, scoreGrid, sum } from '../components.js';

const ROWS = [
  ...Array.from({ length: 8 }, (_, k) => ({ key: `r${8 - k}`, icon: '🗺️', label: `Région ${8 - k}`, hint: k === 0 ? 'Révélée et comptée en premier' : null })),
  { key: 'sanctuaries', icon: '⛩️', label: 'Sanctuaires', hint: 'Comptés après les 8 régions' },
];
// Départage : la carte avec le plus petit temps d'exploration.
const TIEBREAK = { key: 'lowest', icon: '⏱️', label: 'Plus petite carte', hint: 'Départage, non compté' };

const total = (sheet) => sum(ROWS.map((r) => sheet[r.key]));

export default {
  id: 'faraway',
  name: 'Faraway',
  icon: '🏜️',
  color: '#c2410c',
  tagline: '8 régions comptées à rebours',
  minPlayers: 2,
  maxPlayers: 6,
  maxPlayersFor: (options) => (hasExpansion(options, 'dessous') ? 7 : 6),
  expansions: [
    { key: 'dessous', name: 'Les Peuples du Dessous', description: 'Havres mystiques, jusqu’à 7 joueurs' },
    { key: 'etoiles', name: 'Sous un ciel d’étoiles', description: 'Météores et régions de même chiffre restent visibles dès le début' },
  ],

  init: (players) => players.map(() => ({})),

  render(root, ctx) {
    root.append(
      h('p', { class: 'muted small' }, 'Retournez les 8 régions, puis révélez-les de la dernière jouée à la première. Chaque région ne compte que les cartes visibles et les sanctuaires.'),
      hasExpansion(ctx.options, 'etoiles') && h('p', { class: 'muted small' }, '🌠 Les météores, et les régions dont le temps d’exploration finit par le même chiffre qu’un de vos météores, restent visibles dès le début du décompte. Un sanctuaire détruit ne compte plus.'),
      scoreGrid({
        players: ctx.players,
        rows: [...ROWS, TIEBREAK].map((r) => ({
          ...r,
          get: (i) => ctx.data[i][r.key] ?? 0,
          set: (i, v) => { ctx.data[i][r.key] = v; ctx.save(); },
        })),
        total: (i) => total(ctx.data[i]),
      }));
  },

  results({ data }) {
    const scores = data.map(total);
    const best = Math.max(...scores);
    const tied = scores.flatMap((s, i) => (s === best ? [i] : []));
    const lowest = Math.min(...tied.map((i) => data[i].lowest || Infinity));
    const winners = tied.filter((i) => (data[i].lowest || Infinity) === lowest);
    return { scores, winners, details: data.map((s) => `⛩️ ${s.sanctuaries ?? 0}`) };
  },
};
