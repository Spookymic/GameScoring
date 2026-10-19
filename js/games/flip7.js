// Flip 7 (et Flip 7 Vengeance) : calculateur de manche par joueur, partie en 200 points.
import { h } from '../dom.js';
import { banner, PLAYER_COLORS, playerTabs, winnersBy } from '../components.js';

const TARGET = 200;
const FLIP7_BONUS = 15;
const FLIP7_CARDS = 7;
const MODIFIERS = [2, 4, 6, 8, 10];

const vengeance = (options) => options.edition === 'vengeance';
const brutal = (options) => vengeance(options) && Boolean(options.brutal);
const numbersFor = (options) => Array.from({ length: vengeance(options) ? 14 : 13 }, (_, k) => k);
// Vengeance : le 13 porte-bonheur permet d'avoir deux 13.
const maxCopies = (n, options) => (vengeance(options) && n === 13 ? 2 : 1);

const emptyHand = () => ({ numbers: {}, mods: {}, double: false, bust: false, bonusTo: null });
const cardCount = (hand) => Object.values(hand.numbers).reduce((a, b) => a + b, 0);
const isFlip7 = (hand) => !hand.bust && cardCount(hand) >= FLIP7_CARDS;

// Score d'une main, sans le −15 éventuellement reçu d'un adversaire (mode sans pitié).
function handScore(hand, options) {
  if (hand.bust) return 0;
  const flip7 = isFlip7(hand);
  let numbers = Object.entries(hand.numbers).reduce((acc, [n, c]) => acc + Number(n) * c, 0);
  const mods = MODIFIERS.filter((m) => hand.mods[m]).reduce((a, b) => a + b, 0);
  const bonus = flip7 && (hand.bonusTo === null || hand.bonusTo === 'self') ? FLIP7_BONUS : 0;
  if (!vengeance(options)) {
    // x2 ne double que les cartes nombres ; les bonus +X et le Flip 7 s'ajoutent ensuite.
    return (hand.double ? numbers * 2 : numbers) + mods + bonus;
  }
  // Vengeance : le Zéro annule la manche, sauf Flip 7.
  if ((hand.numbers[0] ?? 0) > 0 && !flip7) return 0;
  if (hand.double) numbers = Math.floor(numbers / 2); // ÷2, arrondi à l'inférieur, sur les nombres seulement
  let score = numbers - mods;
  if (!brutal(options)) score = Math.max(0, score);
  return score + bonus;
}

function roundScores(hands, options) {
  const scores = hands.map((hand) => handScore(hand, options));
  if (brutal(options)) {
    hands.forEach((hand) => {
      if (isFlip7(hand) && Number.isInteger(hand.bonusTo)) scores[hand.bonusTo] -= FLIP7_BONUS;
    });
  }
  return scores;
}

const totals = (data, n) => Array.from({ length: n }, (_, i) => data.rounds.reduce((acc, r) => acc + r[i], 0));

export default {
  id: 'flip7',
  name: 'Flip 7',
  icon: '7️⃣',
  color: '#e11d48',
  tagline: 'Stop ou encore, jusqu’à 200',
  minPlayers: 3,
  maxPlayers: 12,
  options: [
    { key: 'edition', type: 'choice', label: 'Édition', default: 'base', choices: [
      { value: 'base', label: 'Flip 7' },
      { value: 'vengeance', label: 'Flip 7 Vengeance' },
    ] },
    { key: 'brutal', type: 'checkbox', label: 'Mode sans pitié (scores négatifs, Flip 7 : +15 ou −15 à un adversaire)', default: false, visible: (o) => o.edition === 'vengeance' },
  ],

  init: (players) => ({ rounds: [], hands: players.map(emptyHand) }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const n = players.length;
    const header = h('div', { class: 'stack' });
    const footer = h('div', { class: 'stack' });
    const tabs = playerTabs(players, {
      label: (i) => [h('span', null, players[i]), h('strong', null, handScore(data.hands[i], options))],
      renderPanel,
    });

    function changed() {
      ctx.save();
      tabs.refresh();
      tabs.rerender();
      drawFooter();
    }

    function chip(label, on, onclick, extra = '') {
      return h('button', { type: 'button', class: `chip${on ? ' on' : ''}${extra}`, onclick }, label);
    }

    function renderPanel(i) {
      const hand = data.hands[i];
      const veng = vengeance(options);
      return h('div', { class: 'stack' },
        h('h3', { class: 'section-title' }, `Cartes nombres (${cardCount(hand)}/${FLIP7_CARDS})`),
        h('div', { class: 'chips' }, numbersFor(options).map((num) => {
          const count = hand.numbers[num] ?? 0;
          return chip(count > 1 ? `${num} ×${count}` : String(num), count > 0, () => {
            hand.numbers[num] = (count + 1) % (maxCopies(num, options) + 1);
            if (!hand.numbers[num]) delete hand.numbers[num];
            changed();
          });
        })),
        h('h3', { class: 'section-title' }, veng ? 'Cartes malus' : 'Cartes bonus'),
        h('div', { class: 'chips' },
          MODIFIERS.map((m) => chip(`${veng ? '−' : '+'}${m}`, hand.mods[m], () => { hand.mods[m] = !hand.mods[m]; changed(); })),
          chip(veng ? '÷2' : 'x2', hand.double, () => { hand.double = !hand.double; changed(); })),
        h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: hand.bust, onchange: (e) => { hand.bust = e.target.checked; changed(); } }),
          h('span', null, '💥 A sauté (deux fois le même nombre) : 0 point')),
        isFlip7(hand) && h('p', { class: 'banner' }, `🎉 Flip 7 ! +${FLIP7_BONUS} points`),
        isFlip7(hand) && brutal(options) && h('div', { class: 'stack' },
          h('span', { class: 'small muted' }, 'Bonus du Flip 7 :'),
          h('div', { class: 'chips' },
            chip('+15 pour moi', hand.bonusTo === null || hand.bonusTo === 'self', () => { hand.bonusTo = 'self'; changed(); }),
            players.map((p, j) => j !== i && chip(`−15 à ${p}`, hand.bonusTo === j, () => { hand.bonusTo = j; changed(); })))),
        veng && h('p', { class: 'muted small' }, 'Le Zéro annule la manche sauf Flip 7. Le 7 porte-malheur ne garde que lui : ne cochez que les cartes restantes.'),
        h('p', { class: 'turn-preview' }, 'Manche : ', h('strong', null, handScore(hand, options))));
    }

    function drawHeader() {
      const scores = totals(data, n);
      const reached = data.rounds.length > 0 && scores.some((s) => s >= TARGET);
      const leaders = winnersBy(scores);
      header.replaceChildren(...[
        reached && (leaders.length > 1
          ? banner(`Égalité à ${scores[leaders[0]]} : tout le monde joue une nouvelle manche.`)
          : banner(`🏆 ${players[leaders[0]]} gagne avec ${scores[leaders[0]]} points !`,
            h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer'))),
        h('h3', { class: 'section-title' }, `Scores de la partie · objectif ${TARGET}`),
        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: 'tab' }, h('span', null, p), h('strong', null, scores[i])))),
        h('h3', { class: 'section-title' }, `Manche ${data.rounds.length + 1} : cartes de chaque joueur`),
      ].filter(Boolean));
    }

    function drawFooter() {
      const preview = roundScores(data.hands, options);
      footer.replaceChildren(...[
        h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
          h('tbody', null,
            h('tr', null, h('th', { scope: 'row' }, 'Cette manche'), preview.map((s) => h('td', { class: 'total' }, s))),
            data.rounds.map((r, k) => h('tr', null, h('th', { scope: 'row' }, `M${k + 1}`), r.map((s) => h('td', { class: 'total' }, s))))),
          h('tfoot', null, h('tr', null, h('th', null, 'Total'), totals(data, n).map((t) => h('td', { class: 'total' }, t)))))),
        h('button', { type: 'button', class: 'btn primary block', onclick: () => {
          if (!confirm('Valider la manche ?')) return;
          data.rounds.push(roundScores(data.hands, options));
          data.hands = players.map(emptyHand);
          ctx.save();
          drawAll();
        } }, 'Valider la manche'),
        data.rounds.length > 0 && h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          if (!confirm('Annuler la dernière manche ?')) return;
          data.rounds.pop();
          ctx.save();
          drawAll();
        } }, '↶ Annuler la dernière manche'),
      ].filter(Boolean));
    }

    function drawAll() {
      drawHeader();
      tabs.refresh();
      tabs.rerender();
      drawFooter();
    }

    drawAll();
    root.append(header, tabs.el, footer);
  },

  results({ data, players }) {
    const scores = totals(data, players.length);
    return { scores, winners: winnersBy(scores), details: players.map(() => `${data.rounds.length} manche(s)`) };
  },
};
