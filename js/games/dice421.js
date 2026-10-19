// 421 : charge (on prend des jetons au pot) puis décharge (on se les renvoie) ;
// le dernier joueur qui a encore des jetons perd la partie.
import { h } from '../dom.js';
import { banner, PLAYER_COLORS } from '../components.js';

const NENETTE_TOKENS = 2; // la nénette (2-2-1) donne toujours 2 jetons à celui qui la fait

function combinations(options) {
  return [
    { key: '421', label: '4-2-1', value: Number(options.value421) || 10 },
    { key: '111', label: '1-1-1', value: 7 },
    ...[6, 5, 4, 3, 2].map((x) => ({ key: `11${x}`, label: `1-1-${x} ou ${x}-${x}-${x}`, value: x })),
    { key: 'suite', label: 'Suite', value: 2 },
    { key: 'other', label: 'Autre', value: 1 },
  ];
}

// Rejoue les coups d'une partie pour obtenir son état : on ne stocke que les coups, ce qui rend l'annulation triviale.
function replay(partie, count, options) {
  let pot = Number(options.tokens) || 21;
  const tokens = Array(count).fill(0);
  let phase = 'charge';
  for (const m of partie.moves) {
    if (phase === 'charge') {
      const n = Math.min(m.amount, pot);
      pot -= n;
      tokens[m.loser] += n;
      if (pot === 0) phase = 'decharge';
    } else {
      const n = Math.min(m.amount, tokens[m.winner]);
      tokens[m.winner] -= n;
      tokens[m.loser] += n;
    }
  }
  // En décharge, un joueur sans jeton est libéré ; quand il n'en reste qu'un avec des jetons, il a perdu.
  const inGame = tokens.flatMap((t, i) => (phase === 'charge' || t > 0 ? [i] : []));
  const loser = phase === 'decharge' && inGame.length === 1 ? inGame[0] : null;
  return { pot, tokens, phase, inGame, loser };
}

const losses = (data, count) => Array.from({ length: count }, (_, i) => data.parties.filter((p) => p.loser === i).length);
const newDraft = () => ({ combo: null, winner: null, loser: null, nenette: false });

export default {
  id: 'dice421',
  name: '421',
  icon: '🎲',
  color: '#b91c1c',
  tagline: 'Charge, décharge et jetons',
  minPlayers: 2,
  maxPlayers: 10,
  showBest: false,
  options: [
    { key: 'tokens', type: 'number', label: 'Jetons dans le pot', default: 21, hint: '21 en général, parfois 11' },
    { key: 'value421', type: 'number', label: 'Valeur du 4-2-1', default: 10, hint: '10 en général, 8 dans certaines règles' },
    { key: 'nenette', type: 'checkbox', label: 'Nénette (2-2-1) : toujours 2 jetons pour celui qui la fait', default: true },
  ],

  init: () => ({ parties: [{ moves: [], loser: null }], draft: newDraft() }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const n = players.length;
    const combos = combinations(options);
    draw();

    function draw() {
      const partie = data.parties.at(-1);
      const state = replay(partie, n, options);
      const d = data.draft;
      const combo = combos.find((c) => c.key === d.combo);
      const amount = d.nenette && options.nenette !== false ? NENETTE_TOKENS : combo?.value;
      const scores = losses(data, n);
      const canPlay = state.loser === null;

      const valid = canPlay && amount && d.loser !== null && (state.phase === 'charge' || (d.winner !== null && d.winner !== d.loser));
      const preview = !valid ? 'Choisissez la combinaison et les joueurs.'
        : state.phase === 'charge'
          ? `${players[d.loser]} prend ${Math.min(amount, state.pot)} jeton(s) au pot.`
          : `${players[d.winner]} donne ${Math.min(amount, state.tokens[d.winner])} jeton(s) à ${players[d.loser]}.`;

      const chooser = (key, label, candidates) => h('div', { class: 'stack' },
        h('span', { class: 'small muted' }, label),
        h('div', { class: 'chips' }, candidates.map((i) => h('button', {
          type: 'button',
          class: `chip${d[key] === i ? ' on' : ''}`,
          onclick: () => { d[key] = d[key] === i ? null : i; ctx.save(); draw(); },
        }, players[i]))));

      root.replaceChildren(...[
        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: 'tab' }, h('span', null, p), h('strong', null, scores[i]),
          h('small', { class: 'muted' }, 'défaite(s)')))),

        state.loser !== null && banner(`💀 ${players[state.loser]} perd la partie ${data.parties.length} !`,
          h('div', { class: 'button-row' },
            h('button', { type: 'button', class: 'btn small', onclick: () => {
              partie.loser = state.loser;
              data.parties.push({ moves: [], loser: null });
              data.draft = newDraft();
              ctx.save();
              draw();
            } }, 'Nouvelle partie'),
            h('button', { type: 'button', class: 'btn small primary', onclick: () => { partie.loser = state.loser; ctx.save(); ctx.finish(); } }, 'Terminer'))),

        h('section', { class: 'card stack' },
          h('h2', { class: 'turn-title', style: '--accent:var(--primary)' },
            `Partie ${data.parties.length} · ${state.phase === 'charge' ? `Charge — pot : ${state.pot} jeton(s)` : 'Décharge'}`),
          h('div', { class: 'jetons' }, players.map((p, i) => h('div', {
            class: `jeton${state.phase === 'decharge' && state.tokens[i] === 0 ? ' free' : ''}`,
            style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}`,
          }, h('span', null, p), h('strong', null, state.tokens[i]),
          h('small', null, state.phase === 'decharge' && state.tokens[i] === 0 ? 'libéré' : 'jetons'))))),

        canPlay && h('section', { class: 'card stack' },
          h('h3', { class: 'section-title' }, 'Meilleure combinaison du tour'),
          h('div', { class: 'combo-grid' }, combos.map((c) => h('button', {
            type: 'button',
            class: `combo${d.combo === c.key ? ' on' : ''}`,
            onclick: () => { d.combo = c.key; ctx.save(); draw(); },
          }, h('span', null, c.label), h('strong', null, `${c.value} jeton${c.value > 1 ? 's' : ''}`)))),
          state.phase === 'decharge' && chooser('winner', 'Meilleur lancer (donne ses jetons)', state.inGame),
          chooser('loser', state.phase === 'charge' ? 'Plus mauvais lancer (prend au pot)' : 'Plus mauvais lancer (reçoit les jetons)', state.inGame),
          options.nenette !== false && h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: d.nenette, onchange: (e) => { d.nenette = e.target.checked; ctx.save(); draw(); } }),
            h('span', null, `Le plus mauvais lancer est une nénette (2-2-1) : ${NENETTE_TOKENS} jetons`)),
          h('p', { class: 'turn-preview' }, preview),
          h('button', { type: 'button', class: 'btn primary block', disabled: !valid, onclick: () => {
            partie.moves.push({ winner: d.winner, loser: d.loser, amount, combo: d.nenette ? 'nenette' : d.combo });
            data.draft = newDraft();
            ctx.save();
            draw();
          } }, 'Valider le tour')),

        partie.moves.length > 0 && h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          partie.moves.pop();
          partie.loser = null;
          ctx.save();
          draw();
        } }, '↶ Annuler le dernier tour'),
        h('p', { class: 'muted small' }, 'Classement des combinaisons : 4-2-1, 1-1-1, 1-1-6, 6-6-6, 1-1-5, 5-5-5… 1-1-2, 2-2-2, suites, puis le reste. La nénette (2-2-1) est la plus faible.'),
      ].filter(Boolean));
    }
  },

  results({ data, players }) {
    const scores = losses(data, players.length);
    const best = Math.min(...scores);
    return {
      scores,
      winners: scores.flatMap((s, i) => (s === best ? [i] : [])),
      lowerWins: true,
      unit: 'défaite(s)',
      details: players.map(() => `${data.parties.filter((p) => p.loser !== null).length} partie(s) jouée(s)`),
    };
  },
};
