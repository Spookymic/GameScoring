import { h } from '../dom.js';
import { cumulate, hasExpansion, playerTabs, scoreGrid, sum, winnersBy } from '../components.js';

const ROUNDS = 3;
const zoneValue = (round) => round + 2; // 2 / 3 / 4 points par carte de la plus grande zone
const FACE_DOWN_POINTS = 5;

function rows(options, round) {
  return [
    { key: 'validated', icon: '✅', label: 'Cartes validées', hint: 'Somme des valeurs (1 à 9)', sign: 1 },
    { key: 'spirals', icon: '🌀', label: 'Spirales', hint: '+1 chacune', sign: 1 },
    { key: 'crosses', icon: '❌', label: 'Croix', hint: '−1 chacune', sign: -1 },
    { key: 'zone', icon: '🟦', label: 'Plus grande zone', hint: `Nb de cartes × ${zoneValue(round)}`, sign: zoneValue(round) },
    hasExpansion(options, 'flowerpower') && { key: 'faceDown', icon: '🂠', label: 'Cartes face cachée', hint: `Non recouvertes × ${FACE_DOWN_POINTS}`, sign: FACE_DOWN_POINTS },
  ].filter(Boolean);
}

const roundScore = (sheet, options, round) => sum(rows(options, round).map((r) => (sheet[r.key] ?? 0) * r.sign));
const total = (data, options, i) => sum(data.map((round, r) => roundScore(round[i], options, r)));

export default {
  id: 'pixies',
  name: 'Pixies',
  icon: '🧚',
  color: '#ec4899',
  tagline: '3 manches, grille de 9 cartes',
  minPlayers: 2,
  maxPlayers: 5,
  maxPlayersFor: (options) => (hasExpansion(options, 'flowerpower') ? 6 : 5),
  expansions: [
    { key: 'flowerpower', name: 'Flower Power', description: 'Cartes bicolores, cartes face cachée à 5 points, jusqu’à 6 joueurs' },
  ],

  init: (players) => Array.from({ length: ROUNDS }, () => players.map(() => ({}))),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const summary = h('div', { class: 'tabs' });
    const refreshSummary = () => summary.replaceChildren(...players.map((p, i) => h('div', { class: 'tab' }, h('span', null, p), h('strong', null, total(data, options, i)))));

    const tabs = playerTabs(data.map((_, r) => `Manche ${r + 1}`), {
      label: (r) => `Manche ${r + 1}`,
      renderPanel: (r) => scoreGrid({
        players,
        rows: rows(options, r).map((row) => ({
          ...row,
          get: (i) => data[r][i][row.key] ?? 0,
          set: (i, v) => { data[r][i][row.key] = v; ctx.save(); refreshSummary(); },
        })),
        total: (i) => roundScore(data[r][i], options, r),
      }),
    });

    refreshSummary();
    root.append(h('h2', { class: 'section-title' }, 'Total de la partie'), summary, tabs.el,
      h('p', { class: 'muted small' }, 'Une zone compte au moins 2 cartes de même couleur reliées orthogonalement. La carte multicolore compte pour toutes les couleurs.'));
  },

  timeline: ({ data, options }) => ({ points: cumulate(data.map((round, r) => round.map((sheet) => roundScore(sheet, options, r)))) }),

  results({ data, options, players }) {
    const scores = players.map((_, i) => total(data, options, i));
    return {
      scores,
      winners: winnersBy(scores),
      details: players.map((_, i) => data.map((round, r) => `M${r + 1} ${roundScore(round[i], options, r)}`).join(' · ')),
    };
  },
};
