import { h } from '../dom.js';
import { banner, cumulate, hasExpansion, numInput, PLAYER_COLORS, winnersBy } from '../components.js';

const END_SCORE = 100;

// Le joueur qui a terminé la manche voit son score doublé s'il n'a pas strictement le plus petit score
// (uniquement si son score est positif).
function roundScores(raw, finisher) {
  const others = raw.filter((_, i) => i !== finisher);
  const strictlyLowest = others.every((s) => raw[finisher] < s);
  return raw.map((s, i) => (i === finisher && s > 0 && !strictlyLowest ? 2 * s : s));
}

const totals = (data, n) => Array.from({ length: n }, (_, i) => data.rounds.reduce((acc, r) => acc + r.scores[i], 0));
const newDraft = (players) => ({ raw: players.map(() => 0), finisher: 0 });

export default {
  id: 'skyjo',
  name: 'Skyjo',
  icon: '🃏',
  color: '#0891b2',
  tagline: 'Le plus petit score gagne',
  minPlayers: 2,
  maxPlayers: 8,
  expansions: [
    { key: 'action', name: 'Skyjo Action', description: 'Étoiles (colonne −10, ligne −15), cartes action restantes +10' },
    { key: 'extension', name: 'Skyjo – Extension', description: 'Cartes 13 et −4, étoile restante +20' },
  ],

  init: (players) => ({ rounds: [], draft: newDraft(players) }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const n = players.length;
    draw();

    function draw() {
      const d = data.draft;
      const scores = totals(data, n);
      const ended = data.rounds.length > 0 && scores.some((s) => s >= END_SCORE);
      const preview = h('tr');
      const refresh = () => {
        const s = roundScores(d.raw, d.finisher);
        preview.replaceChildren(h('th', { scope: 'row' }, 'Manche'), ...s.map((v, i) => h('td', { class: `total${v !== d.raw[i] ? ' doubled' : ''}` }, v)));
        ctx.save();
      };
      const reminders = [
        'Une colonne de 3 cartes identiques est défaussée et ne compte pas.',
        hasExpansion(options, 'action') && 'Skyjo Action : 4 cartes identiques en ligne sont défaussées, colonne d’étoiles −10, ligne d’étoiles −15, carte action restante +10.',
        hasExpansion(options, 'extension') && 'Extension : chaque étoile encore dans la grille vaut +20.',
      ].filter(Boolean);

      root.replaceChildren(...[
        ended && banner(`Un joueur a atteint ${END_SCORE} points : fin de partie.`,
          h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer')),
        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: 'tab' }, h('span', null, p), h('strong', null, scores[i])))),
        h('section', { class: 'card stack' },
          h('h2', { class: 'turn-title', style: '--accent:var(--primary)' }, `Manche ${data.rounds.length + 1}`),
          reminders.map((r) => h('p', { class: 'muted small' }, r)),
          h('span', { class: 'small muted' }, 'Qui a retourné toutes ses cartes en premier ?'),
          h('div', { class: 'chips' }, players.map((p, i) => h('button', {
            type: 'button',
            class: `chip${d.finisher === i ? ' on' : ''}`,
            onclick: () => { d.finisher = i; ctx.save(); draw(); },
          }, p))),
          h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
            h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
            h('tbody', null, h('tr', null, h('th', { scope: 'row' }, 'Cartes'),
              players.map((p, i) => h('td', null, numInput(d.raw[i], (v) => { d.raw[i] = v; refresh(); }, { label: `Score de ${p}` }))))),
            h('tfoot', null, preview))),
          h('p', { class: 'muted small' }, 'Si celui qui a fini la manche n’a pas strictement le plus petit score, son score positif est doublé.'),
          h('button', { type: 'button', class: 'btn primary block', onclick: () => {
            if (!confirm('Valider la manche ?')) return;
            data.rounds.push({ raw: [...d.raw], finisher: d.finisher, scores: roundScores(d.raw, d.finisher) });
            data.draft = newDraft(players);
            data.draft.finisher = d.finisher;
            ctx.save();
            draw();
          } }, 'Valider la manche')),
        data.rounds.length > 0 && h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
          h('tbody', null, data.rounds.map((r, k) => h('tr', null,
            h('th', { scope: 'row' }, `M${k + 1}`, h('small', null, `fin : ${players[r.finisher]}`)),
            r.scores.map((s, i) => h('td', { class: `total${s !== r.raw[i] ? ' doubled' : ''}` }, s))))),
          h('tfoot', null, h('tr', null, h('th', null, 'Total'), scores.map((t) => h('td', { class: 'total' }, t)))))),
        data.rounds.length > 0 && h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          if (!confirm('Annuler la dernière manche ?')) return;
          data.rounds.pop();
          ctx.save();
          draw();
        } }, '↶ Annuler la dernière manche'),
      ].filter(Boolean));
      refresh();
    }
  },

  timeline: ({ data }) => ({ points: cumulate(data.rounds.map((r) => r.scores)) }),

  results({ data, players }) {
    const scores = totals(data, players.length);
    return { scores, winners: winnersBy(scores, true), lowerWins: true };
  },
};
