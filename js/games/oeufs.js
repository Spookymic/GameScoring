// Les œufs sont faits : calculateur de tour (œufs au plat, œuf dur, poulets, œufs pourris).
import { h } from '../dom.js';
import { banner, cumulate, PLAYER_COLORS, stepper, winnersBy } from '../components.js';

const END_SCORE = 100; // la fin est déclenchée dès qu'un joueur dépasse 99
const CHICKEN_TRACK = [1, 2, 3, 4, 5, 4, 3, 2, 1];
const FRIED_POINTS = 5; // par combinaison 1 poêle + 1 œuf cassé
const HARD_POINTS = 3; // par dé de la combinaison marmite + œufs entiers
const CHICKEN_POINTS = 5; // par poulet, si le nombre correspond exactement à la cible
const DICE = 9;

const emptyDraft = () => ({ fried: 0, friedSpoiled: 0, hard: 0, hardSpoiled: false, chickens: 0 });

function turnScore(draft, target) {
  const fried = (draft.fried - draft.friedSpoiled) * FRIED_POINTS;
  const hard = draft.hard > 0 && !draft.hardSpoiled ? draft.hard * HARD_POINTS : 0;
  const chickens = target !== undefined && draft.chickens === target ? draft.chickens * CHICKEN_POINTS : 0;
  return { fried, hard, chickens, total: fried + hard + chickens };
}

const chickenStep = (data) => data.turns.filter((t) => t.chickens).length;

function totals(data, count) {
  const scores = Array(count).fill(0);
  for (const t of data.turns) scores[t.player] += t.points;
  return scores;
}

export default {
  id: 'oeufs',
  name: 'Les œufs sont faits',
  icon: '🥚',
  color: '#e0a526',
  tagline: 'Premier à dépasser 99 points',
  minPlayers: 2,
  maxPlayers: 5,
  dice: { count: 9, sides: 6, numeric: false, labels: { 1: '🥚', 2: '🐣', 3: '🤢', 4: '🍲', 5: '🍳', 6: '🐔' } },

  init: () => ({ turns: [], draft: emptyDraft() }),

  render(root, ctx) {
    const { players, data } = ctx;
    const n = players.length;
    draw();

    function draw() {
      const scores = totals(data, n);
      const current = data.turns.length % n;
      const step = chickenStep(data);
      const target = CHICKEN_TRACK[step];
      const triggered = scores.some((s) => s >= END_SCORE);
      const ended = triggered && current === 0;
      const d = data.draft;

      const preview = h('div', { class: 'turn-preview' });
      const validate = h('button', { type: 'button', class: 'btn primary block', onclick: () => {
        const s = turnScore(d, target);
        data.turns.push({ player: current, points: s.total, chickens: s.chickens > 0 });
        data.draft = emptyDraft();
        ctx.save();
        draw();
      } });
      const refresh = () => {
        const s = turnScore(d, target);
        preview.replaceChildren(`🍳 ${s.fried} + 🍲 ${s.hard} + 🐔 ${s.chickens} = `, h('strong', null, s.total));
        validate.textContent = `Valider le tour (+${s.total})`;
        ctx.save();
      };
      const set = (key, redraw) => (v) => {
        d[key] = v;
        if (key === 'fried') d.friedSpoiled = Math.min(d.friedSpoiled, v);
        if (key === 'hard' && v === 0) d.hardSpoiled = false;
        if (redraw) draw(); else refresh();
      };
      const line = (icon, label, hint, control) => h('div', { class: 'counter-line' },
        h('span', { class: 'counter-label' }, `${icon} ${label}`, h('small', null, hint)), control);

      // Feuille de score : total cumulé de chaque joueur après chacun de ses tours.
      const cumulative = players.map(() => []);
      const running = Array(n).fill(0);
      for (const t of data.turns) {
        running[t.player] += t.points;
        cumulative[t.player].push(running[t.player]);
      }
      const rounds = Math.max(0, ...cumulative.map((c) => c.length));

      const leaders = winnersBy(scores);
      root.replaceChildren(...[
        ended && banner(leaders.length > 1
          ? `Égalité entre ${leaders.map((i) => players[i]).join(' et ')} : ils jouent un tour de plus.`
          : `🏆 ${players[leaders[0]]} gagne avec ${scores[leaders[0]]} points !`,
        h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer')),
        triggered && !ended && banner('Un joueur a dépassé 99 points : on termine le tour de table.'),

        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: `tab${i === current ? ' active' : ''}` },
          h('span', null, p), h('strong', null, scores[i])))),

        h('div', { class: 'egg-track', 'aria-label': 'Piste des poulets' },
          h('span', { class: 'muted small' }, '🐔'),
          CHICKEN_TRACK.map((v, k) => h('span', { class: `egg-cell${k < step ? ' done' : ''}${k === step ? ' next' : ''}` }, v))),

        h('section', { class: 'card stack', style: `--accent:${PLAYER_COLORS[current % PLAYER_COLORS.length]}` },
          h('h2', { class: 'turn-title' }, `Tour de ${players[current]}`),
          line('🍳', 'Œufs au plat', 'poêle + œuf cassé · 5 pts chacun',
            stepper(d.fried, set('fried', true), { min: 0, max: Math.floor(DICE / 2), label: 'Œufs au plat' })),
          line('🍲', 'Œuf dur', 'dés marmite + œufs entiers · 3 pts/dé',
            stepper(d.hard, set('hard', true), { min: 0, max: DICE, label: 'Œuf dur' })),
          line('🐔', 'Poulets', target !== undefined ? `exactement ${target} pour marquer` : 'piste terminée',
            stepper(d.chickens, set('chickens'), { min: 0, max: DICE, label: 'Poulets' })),
          h('h3', { class: 'section-title' }, '🤢 Œufs pourris relancés par le voisin'),
          line('🍳', 'Œufs au plat gâchés', '1 œuf pourri par combinaison',
            stepper(d.friedSpoiled, set('friedSpoiled'), { min: 0, max: d.fried, label: 'Œufs au plat gâchés' })),
          h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: d.hardSpoiled, disabled: d.hard === 0, onchange: (e) => set('hardSpoiled')(e.target.checked) }),
            h('span', null, 'Œuf dur gâché')),
          h('p', { class: 'muted small' }, 'Les poulets obtenus avec les œufs pourris comptent dans le nombre de poulets.'),
          preview,
          validate,
          data.turns.length > 0 && h('button', { type: 'button', class: 'btn ghost', onclick: () => {
            const last = data.turns.at(-1);
            if (!confirm(`Annuler le dernier tour de ${players[last.player]} (${last.points} pts) ?`)) return;
            data.turns.pop();
            data.draft = emptyDraft();
            ctx.save();
            draw();
          } }, '↶ Annuler le dernier tour')),

        rounds > 0 && h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { scope: 'col', style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
          h('tbody', null, Array.from({ length: rounds }, (_, r) => h('tr', null,
            h('th', { scope: 'row' }, `Tour ${r + 1}`),
            cumulative.map((c) => h('td', { class: 'total' }, c[r] ?? '')))))))].filter(Boolean));
      refresh();
    }
  },

  // Un « tour » du graphique = un tour de table complet.
  timeline({ data, players }) {
    const n = players.length;
    const rows = [];
    data.turns.forEach((t, k) => {
      const r = Math.floor(k / n);
      rows[r] ??= players.map(() => 0);
      rows[r][t.player] += t.points;
    });
    return { points: cumulate(rows), roundLabel: 'Tour' };
  },

  results({ data, players }) {
    const scores = totals(data, players.length);
    return {
      scores,
      winners: winnersBy(scores),
      details: players.map((_, i) => `${data.turns.filter((t) => t.player === i).length} tours`),
    };
  },
};
