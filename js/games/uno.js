// Uno : à chaque manche, le gagnant marque les points des cartes restées dans la main des autres
// (ou, en décompte alternatif, chacun marque ses propres points et le plus bas gagne).
import { h } from '../dom.js';
import { banner, numInput, PLAYER_COLORS, stepper, winnersBy } from '../components.js';

const NUMBERS = { key: 'numbers', label: 'Somme des cartes chiffres' };
const EDITIONS = {
  classic: {
    target: 500,
    cards: () => [
      NUMBERS,
      { key: 'actions', label: '+2, Inversion, Passe', value: 20 },
      { key: 'wilds', label: 'Jokers (Joker, +4, Mélanger, Personnalisable)', value: 50 },
    ],
  },
  flip: {
    target: 500,
    cards: (side) => (side === 'dark'
      ? [
        NUMBERS,
        { key: 'draw5', label: '+5', value: 20 },
        { key: 'actions', label: 'Inversion, Flip', value: 20 },
        { key: 'skipAll', label: 'Passer tous un tour', value: 30 },
        { key: 'wild', label: 'Joker', value: 40 },
        { key: 'wildColor', label: 'Joker pioche couleur', value: 60 },
      ]
      : [
        NUMBERS,
        { key: 'draw1', label: '+1', value: 10 },
        { key: 'actions', label: 'Inversion, Passer, Flip', value: 20 },
        { key: 'wild', label: 'Joker', value: 40 },
        { key: 'wild2', label: 'Joker +2', value: 50 },
      ]),
  },
  nomercy: {
    target: 1000,
    eliminationBonus: 250,
    cards: () => [
      NUMBERS,
      { key: 'actions', label: 'Actions de couleur (Passer, Inverser, +2, +4, Poser tout, Passer tout le monde)', value: 20 },
      { key: 'wilds', label: 'Jokers action (+6, +10, Inversion +4, Roulette des couleurs)', value: 50 },
    ],
  },
};

const edition = (options) => EDITIONS[options.edition] ?? EDITIONS.classic;
const target = (options) => Number(options.target) || edition(options).target;
const ownScoring = (options) => options.scoring === 'own';
const handPoints = (hand, cards) => cards.reduce((acc, c) => acc + (c.value ? c.value * (hand[c.key] ?? 0) : hand[c.key] ?? 0), 0);
const newDraft = (players) => ({ winner: null, side: 'light', hands: players.map(() => ({})), eliminated: [] });

function roundPoints(d, options, count) {
  const cards = edition(options).cards(d.side);
  const points = Array(count).fill(0);
  if (d.winner === null) return points;
  if (ownScoring(options)) {
    for (let i = 0; i < count; i++) if (i !== d.winner) points[i] = handPoints(d.hands[i], cards);
    return points;
  }
  // La main d'un joueur éliminé (No Mercy) ne compte pas ; le gagnant reçoit le bonus d'élimination.
  for (let i = 0; i < count; i++) {
    if (i !== d.winner && !d.eliminated.includes(i)) points[d.winner] += handPoints(d.hands[i], cards);
  }
  points[d.winner] += (edition(options).eliminationBonus ?? 0) * d.eliminated.length;
  return points;
}

const totals = (data, n) => Array.from({ length: n }, (_, i) => data.rounds.reduce((acc, r) => acc + r.points[i], 0));

export default {
  id: 'uno',
  name: 'Uno',
  icon: '🟥',
  color: '#dc2626',
  tagline: 'Points des cartes restées en main',
  minPlayers: 2,
  maxPlayers: 10,
  options: [
    { key: 'edition', type: 'choice', label: 'Édition', default: 'classic', choices: [
      { value: 'classic', label: 'Classique' },
      { value: 'flip', label: 'Uno Flip' },
      { value: 'nomercy', label: 'No Mercy' },
    ] },
    { key: 'scoring', type: 'choice', label: 'Décompte', default: 'winner', choices: [
      { value: 'winner', label: 'Le gagnant marque' },
      { value: 'own', label: 'Chacun ses points (le plus bas gagne)' },
    ] },
    { key: 'target', type: 'number', label: 'Score de fin de partie', default: 0, hint: '0 = valeur officielle : 500 (1000 en No Mercy)' },
  ],

  init: (players) => ({ rounds: [], draft: newDraft(players) }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const n = players.length;
    draw();

    function draw() {
      const d = data.draft;
      const scores = totals(data, n);
      const goal = target(options);
      const reached = data.rounds.length > 0 && scores.some((s) => s >= goal);
      const winners = winnersBy(scores, ownScoring(options));
      const cards = edition(options).cards(d.side);
      const elimination = Boolean(edition(options).eliminationBonus) && !ownScoring(options);
      const preview = h('p', { class: 'turn-preview' });
      const refresh = () => {
        const pts = roundPoints(d, options, n);
        preview.replaceChildren(...[].concat(d.winner === null
          ? 'Choisissez qui a posé sa dernière carte.'
          : ownScoring(options)
            ? players.map((p, i) => (i === d.winner ? null : `${p} +${pts[i]}`)).filter(Boolean).join(' · ')
            : [`${players[d.winner]} marque `, h('strong', null, pts[d.winner])]));
        ctx.save();
      };

      const handCard = (i) => {
        const hand = d.hands[i];
        const out = d.eliminated.includes(i);
        const pts = h('strong', null, handPoints(hand, cards));
        const update = () => { pts.textContent = handPoints(hand, cards); refresh(); };
        return h('section', { class: 'card stack', style: `border-left:5px solid ${PLAYER_COLORS[i % PLAYER_COLORS.length]}` },
          h('div', { class: 'district-head' }, h('span', null, `Main de ${players[i]}`), out ? h('span', { class: 'tag' }, 'Éliminé') : pts),
          elimination && h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: out, onchange: (e) => {
              d.eliminated = e.target.checked ? [...d.eliminated, i] : d.eliminated.filter((k) => k !== i);
              ctx.save();
              draw();
            } }),
            h('span', null, `Éliminé ce tour (règle de la pitié) : +${edition(options).eliminationBonus} au gagnant`)),
          !out && cards.map((c) => h('div', { class: 'counter-line' },
            h('span', { class: 'counter-label' }, c.label, c.value && h('small', null, `${c.value} pts chacune`)),
            c.value
              ? stepper(hand[c.key] ?? 0, (v) => { hand[c.key] = v; update(); }, { min: 0, max: 50, label: c.label })
              : h('div', { style: 'width:110px' }, numInput(hand[c.key], (v) => { hand[c.key] = v; update(); }, { label: c.label })))));
      };

      root.replaceChildren(...[
        reached && banner(`${winners.map((i) => players[i]).join(', ')} gagne${winners.length > 1 ? 'nt' : ''} : un joueur a atteint ${goal} points.`,
          h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer')),
        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: 'tab' }, h('span', null, p), h('strong', null, scores[i])))),
        h('p', { class: 'muted small center' }, `Objectif : ${goal} points${ownScoring(options) ? ' (le plus bas gagne)' : ''} · Manche ${data.rounds.length + 1}`),
        h('section', { class: 'card stack' },
          h('span', { class: 'small muted' }, 'Qui a posé sa dernière carte ?'),
          h('div', { class: 'chips' }, players.map((p, i) => h('button', {
            type: 'button',
            class: `chip${d.winner === i ? ' on' : ''}`,
            onclick: () => { d.winner = i; d.eliminated = d.eliminated.filter((k) => k !== i); ctx.save(); draw(); },
          }, p))),
          options.edition === 'flip' && h('div', { class: 'segmented' }, [['light', 'Côté clair'], ['dark', 'Côté sombre']].map(([value, label]) => h('label', null,
            h('input', { type: 'radio', name: 'uno-side', checked: d.side === value, onchange: () => { d.side = value; ctx.save(); draw(); } }),
            h('span', null, label)))),
          options.edition === 'flip' && h('p', { class: 'muted small' }, 'On compte le côté qui était en jeu à la fin de la manche.')),
        d.winner !== null && players.map((_, i) => i !== d.winner && handCard(i)),
        preview,
        h('button', { type: 'button', class: 'btn primary block', disabled: d.winner === null, onclick: () => {
          if (!confirm('Valider la manche ?')) return;
          data.rounds.push({ winner: d.winner, points: roundPoints(d, options, n) });
          data.draft = newDraft(players);
          data.draft.side = d.side;
          ctx.save();
          draw();
        } }, 'Valider la manche'),
        data.rounds.length > 0 && h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
          h('tbody', null, data.rounds.map((r, k) => h('tr', null,
            h('th', { scope: 'row' }, `M${k + 1}`, h('small', null, `gagnée par ${players[r.winner]}`)),
            r.points.map((s) => h('td', { class: 'total' }, s || ''))))),
          h('tfoot', null, h('tr', null, h('th', null, 'Total'), scores.map((t) => h('td', { class: 'total' }, t)))))),
        data.rounds.length > 0 && h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          if (!confirm('Annuler la dernière manche ?')) return;
          data.rounds.pop();
          ctx.save();
          draw();
        } }, '↶ Annuler la dernière manche'),
      ].flat().filter(Boolean));
      refresh();
    }
  },

  results({ data, players, options }) {
    const scores = totals(data, players.length);
    return {
      scores,
      winners: winnersBy(scores, ownScoring(options)),
      lowerWins: ownScoring(options),
      details: players.map((_, i) => `${data.rounds.filter((r) => r.winner === i).length} manche(s) gagnée(s)`),
    };
  },
};
