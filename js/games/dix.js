// DIX (Lucky Duck Games, édition française de TEN).
import { scoreGrid, sum } from '../components.js';

const COLOURS = [
  { key: 'red', icon: '🟥', label: 'Rouge' },
  { key: 'blue', icon: '🟦', label: 'Bleu' },
  { key: 'green', icon: '🟩', label: 'Vert' },
  { key: 'yellow', icon: '🟨', label: 'Jaune' },
];
const TIEBREAKS = [
  { key: 'money', icon: '🪙', label: 'Monnaie restante', hint: 'Départage 1 (le plus), non compté' },
  { key: 'cards', icon: '🂠', label: 'Nombre de cartes', hint: 'Départage 2 (le moins), non compté' },
];

// Plus longue suite : 1 point par carte, une suite complète 1 à 9 vaut 10.
const colourScore = (run) => Math.min(9, run) + (run >= 9 ? 1 : 0);
const total = (sheet) => sum(COLOURS.map((c) => colourScore(sheet[c.key] ?? 0)));

export default {
  id: 'dix',
  name: 'Dix',
  icon: '🔟',
  color: '#7c3aed',
  tagline: 'Plus longue suite par couleur',
  minPlayers: 1,
  maxPlayers: 5,

  init: (players) => players.map(() => ({})),

  render(root, ctx) {
    root.append(scoreGrid({
      players: ctx.players,
      rows: [
        ...COLOURS.map((c) => ({ ...c, hint: 'Plus longue suite (1 à 9 = 10 pts)' })),
        ...TIEBREAKS,
      ].map((r) => ({
        ...r,
        get: (i) => ctx.data[i][r.key] ?? 0,
        set: (i, v) => { ctx.data[i][r.key] = v; ctx.save(); },
      })),
      total: (i) => total(ctx.data[i]),
    }));
  },

  results({ data }) {
    const scores = data.map(total);
    let tied = scores.flatMap((s, i) => (s === Math.max(...scores) ? [i] : []));
    const maxMoney = Math.max(...tied.map((i) => data[i].money ?? 0));
    tied = tied.filter((i) => (data[i].money ?? 0) === maxMoney);
    const minCards = Math.min(...tied.map((i) => data[i].cards ?? 0));
    return {
      scores,
      winners: tied.filter((i) => (data[i].cards ?? 0) === minCards),
      details: data.map((sheet) => COLOURS.map((c) => `${c.icon} ${colourScore(sheet[c.key] ?? 0)}`).join(' · ')),
    };
  },
};
