// 6 qui prend ! : on additionne les têtes de bœuf ramassées à chaque manche ; le plus petit total gagne.
import { h } from '../dom.js';
import { banner, numInput, PLAYER_COLORS, winnersBy } from '../components.js';

const MAX_CARD = 104;
const SURPRISE_ROUNDS = 2; // 6 qui surprend ! : exactement 2 manches

// Têtes de bœuf : 55 = 7, doubles (11…99) = 5, dizaines = 3, terminées par 5 = 2, sinon 1.
export function heads(card) {
  if (card === 55) return 7;
  if (card % 11 === 0 && card <= 99) return 5;
  if (card % 10 === 0) return 3;
  if (card % 5 === 0) return 2;
  return 1;
}

// Numéros séparés par des espaces, points ou virgules.
function parseCards(text) {
  const cards = [];
  const invalid = [];
  for (const token of String(text ?? '').split(/[^0-9]+/).filter(Boolean)) {
    const n = Number(token);
    if (n >= 1 && n <= MAX_CARD && !cards.includes(n)) cards.push(n); else invalid.push(token);
  }
  return { cards, invalid };
}

const surprise = (options) => options.edition === 'surprend';
const byCards = (options) => options.input !== 'heads';
const draftHeads = (entry, options) => (byCards(options)
  ? parseCards(entry.cards).cards.reduce((acc, c) => acc + heads(c), 0)
  : Number(entry.heads) || 0);

const totals = (data, n) => Array.from({ length: n }, (_, i) => data.rounds.reduce((acc, r) => acc + r[i], 0));

function ended(data, options, n) {
  if (surprise(options)) return data.rounds.length >= SURPRISE_ROUNDS;
  const target = Number(options.target) || 66;
  return data.rounds.length > 0 && totals(data, n).some((t) => (options.endRule === 'gt' ? t > target : t >= target));
}

export default {
  id: 'sixquiprend',
  name: '6 qui prend !',
  icon: '🐮',
  color: '#7c2d12',
  tagline: 'Le moins de têtes de bœuf gagne',
  minPlayers: 2,
  maxPlayers: 10,
  options: [
    { key: 'edition', type: 'choice', label: 'Édition', default: 'base', choices: [
      { value: 'base', label: '6 qui prend !' },
      { value: 'surprend', label: '6 qui surprend ! (2 manches)' },
    ] },
    { key: 'input', type: 'choice', label: 'Saisie', default: 'cards', choices: [
      { value: 'cards', label: 'Numéros des cartes' },
      { value: 'heads', label: 'Têtes de bœuf' },
    ] },
    { key: 'target', type: 'number', label: 'Fin de partie', default: 66, hint: 'Têtes de bœuf, vérifié à la fin de chaque manche', visible: (o) => o.edition !== 'surprend' },
    { key: 'endRule', type: 'choice', label: 'La partie s’arrête…', default: 'gte', visible: (o) => o.edition !== 'surprend', choices: [
      { value: 'gte', label: 'à 66 ou plus' },
      { value: 'gt', label: 'au-delà de 66' },
    ] },
  ],

  init: (players) => ({ rounds: [], draft: players.map(() => ({ cards: '', heads: 0 })) }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const n = players.length;
    draw();

    function draw() {
      const scores = totals(data, n);
      const done = ended(data, options, n);
      const winners = winnersBy(scores, true);
      const roundCells = players.map(() => h('td', { class: 'total' }));
      const refreshRound = () => {
        data.draft.forEach((entry, i) => { roundCells[i].textContent = `+${draftHeads(entry, options)}`; });
        ctx.save();
      };

      const entryRow = (i) => {
        const entry = data.draft[i];
        const info = h('small', { class: 'muted' });
        const showInfo = () => {
          const { cards, invalid } = parseCards(entry.cards);
          info.textContent = `${cards.length} carte(s) · ${draftHeads(entry, options)} tête(s)${invalid.length ? ` · ignoré : ${invalid.join(', ')}` : ''}`;
        };
        const field = byCards(options)
          ? h('input', {
            type: 'text',
            class: 'text',
            inputMode: 'decimal',
            placeholder: 'Ex. : 55 12 10',
            value: entry.cards,
            'aria-label': `Cartes ramassées par ${players[i]}`,
            oninput: (e) => { entry.cards = e.target.value; showInfo(); refreshRound(); },
          })
          : numInput(entry.heads, (v) => { entry.heads = v; refreshRound(); }, { label: `Têtes de bœuf de ${players[i]}` });
        if (byCards(options)) showInfo();
        return h('div', { class: 'stack card', style: `border-left:5px solid ${PLAYER_COLORS[i % PLAYER_COLORS.length]}` },
          h('span', null, h('strong', null, players[i]), byCards(options) ? ' — cartes ramassées' : ' — têtes de bœuf'),
          field,
          byCards(options) && info);
      };

      root.replaceChildren(...[
        done && banner(`🏆 ${winners.map((i) => players[i]).join(', ')} gagne${winners.length > 1 ? 'nt' : ''} avec ${scores[winners[0]]} tête(s) de bœuf.`,
          h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer')),
        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: 'tab' }, h('span', null, p), h('strong', null, scores[i])))),
        h('p', { class: 'muted small center' }, surprise(options)
          ? `6 qui surprend ! : manche ${Math.min(data.rounds.length + 1, SURPRISE_ROUNDS)}/${SURPRISE_ROUNDS}`
          : `Fin à ${Number(options.target) || 66} têtes${options.endRule === 'gt' ? ' (au-delà)' : ''} · Manche ${data.rounds.length + 1}`),
        !done && h('h3', { class: 'section-title' }, `Manche ${data.rounds.length + 1}`),
        !done && players.map((_, i) => entryRow(i)),
        !done && byCards(options) && h('p', { class: 'muted small' }, '55 = 7 têtes ; 11, 22… 99 = 5 ; 10, 20… = 3 ; 5, 15… = 2 ; les autres = 1.'),
        h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
          h('tbody', null,
            data.rounds.map((r, k) => h('tr', null, h('th', { scope: 'row' }, `M${k + 1}`), r.map((s) => h('td', { class: 'total' }, s)))),
            !done && h('tr', null, h('th', { scope: 'row' }, 'En cours'), roundCells)),
          h('tfoot', null, h('tr', null, h('th', null, 'Total'), scores.map((t) => h('td', { class: 'total' }, t)))))),
        !done && h('button', { type: 'button', class: 'btn primary block', onclick: () => {
          if (!confirm('Valider la manche ?')) return;
          data.rounds.push(data.draft.map((entry) => draftHeads(entry, options)));
          data.draft = players.map(() => ({ cards: '', heads: 0 }));
          ctx.save();
          draw();
        } }, 'Valider la manche'),
        data.rounds.length > 0 && h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          if (!confirm('Annuler la dernière manche ?')) return;
          data.rounds.pop();
          ctx.save();
          draw();
        } }, '↶ Annuler la dernière manche'),
      ].flat().filter(Boolean));
      refreshRound();
    }
  },

  results({ data, players }) {
    const scores = totals(data, players.length);
    return {
      scores,
      winners: winnersBy(scores, true),
      lowerWins: true,
      unit: 'têtes',
      details: players.map(() => `${data.rounds.length} manche(s)`),
    };
  },
};
