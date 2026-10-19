// Feuille de score générique : le joueur choisit le nom, le mode de saisie, les catégories et la règle de victoire.
import { h } from '../dom.js';
import { banner, cumulate, numInput, PLAYER_COLORS, scoreGrid, sum, winnersBy } from '../components.js';

const MAX_CATEGORIES = 30;

// Catégories saisies une par ligne (ou séparées par des virgules).
const categories = (options) => String(options.categories ?? '')
  .split(/[\n,;]/)
  .map((c) => c.trim())
  .filter(Boolean)
  .slice(0, MAX_CATEGORIES);

const lowerWins = (options) => options.winner === 'low';

function totals(data, options, count) {
  if (options.mode === 'categories') {
    return Array.from({ length: count }, (_, i) => sum(categories(options).map((_, k) => data.sheets[i][k])));
  }
  return Array.from({ length: count }, (_, i) => sum(data.rounds.map((r) => r[i])));
}

// Fin de partie : score cible atteint (par n'importe quel joueur) ou nombre de manches prévu joué.
function endReason(data, options, count) {
  const target = Number(options.target) || 0;
  if (target > 0 && totals(data, options, count).some((t) => t >= target)) return `Un joueur a atteint ${target} points : fin de partie.`;
  const limit = Number(options.rounds) || 0;
  if (options.mode !== 'categories' && limit > 0 && data.rounds.length >= limit) return `Dernière manche (${limit}/${limit}) : terminez la partie une fois les scores saisis.`;
  return null;
}

export default {
  id: 'custom',
  name: 'Feuille libre',
  icon: '📝',
  color: '#64748b',
  tagline: 'Feuille de score paramétrable',
  minPlayers: 1,
  maxPlayers: 12,
  templates: true,
  titleFor: (options) => options?.title?.trim() || null,
  options: [
    { key: 'title', type: 'text', label: 'Nom du jeu', default: '', placeholder: 'Ex. : Tarot, Yams, Uno…', maxLength: 40 },
    { key: 'mode', type: 'choice', label: 'Saisie', default: 'rounds', choices: [
      { value: 'rounds', label: 'Par manches' },
      { value: 'categories', label: 'Par catégories' },
    ] },
    { key: 'categories', type: 'textarea', label: 'Catégories', default: '', placeholder: 'Une catégorie par ligne', hint: 'Une ligne par catégorie (ou séparées par des virgules).', visible: (o) => o.mode === 'categories' },
    { key: 'rounds', type: 'number', label: 'Nombre de manches', default: 0, hint: '0 = sans limite', visible: (o) => o.mode !== 'categories' },
    { key: 'winner', type: 'choice', label: 'Vainqueur', default: 'high', choices: [
      { value: 'high', label: 'Score le plus haut' },
      { value: 'low', label: 'Score le plus bas' },
    ] },
    { key: 'target', type: 'number', label: 'Score de fin de partie', default: 0, hint: '0 = aucun ; la partie s’arrête quand un joueur atteint ce score' },
  ],

  init: (players, options) => (options.mode === 'categories'
    ? { sheets: players.map(() => ({})) }
    : { rounds: [players.map(() => 0)] }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const endBanner = h('div');
    const checkEnd = () => {
      const reason = endReason(data, options, players.length);
      endBanner.replaceChildren(reason
        ? banner(reason, h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer'))
        : '');
    };
    const rules = [
      lowerWins(options) ? 'Le score le plus bas gagne.' : 'Le score le plus haut gagne.',
      Number(options.target) > 0 && `Fin à ${options.target} points.`,
      options.mode !== 'categories' && Number(options.rounds) > 0 && `${options.rounds} manches.`,
    ].filter(Boolean).join(' ');

    if (options.mode === 'categories') {
      const cats = categories(options);
      root.append(endBanner, h('p', { class: 'muted small' }, rules),
        cats.length
          ? scoreGrid({
            players,
            rows: cats.map((label, k) => ({
              label,
              get: (i) => data.sheets[i][k] ?? 0,
              set: (i, v) => { data.sheets[i][k] = v; ctx.save(); checkEnd(); },
            })),
            total: (i) => totals(data, options, players.length)[i],
          })
          : h('p', { class: 'empty' }, 'Aucune catégorie définie pour cette feuille.'));
      checkEnd();
      return;
    }

    // Saisie par manches
    const wrap = h('div', { class: 'grid-wrap' });
    const limit = Number(options.rounds) || 0;
    const addBtn = h('button', { type: 'button', class: 'btn primary', onclick: () => {
      data.rounds.push(players.map(() => 0));
      ctx.save();
      draw();
      wrap.querySelector('tbody tr:last-child input')?.focus();
    } }, '+ Manche');
    const actions = h('div', { class: 'button-row' },
      h('button', { type: 'button', class: 'btn', onclick: () => {
        if (data.rounds.length > 1 && !confirm('Supprimer la dernière manche ?')) return;
        if (data.rounds.length > 1) data.rounds.pop(); else data.rounds[0] = players.map(() => 0);
        ctx.save();
        draw();
      } }, 'Retirer une manche'),
      addBtn);

    function draw() {
      const totalCells = players.map(() => h('td', { class: 'total' }));
      const refresh = () => {
        totals(data, options, players.length).forEach((t, i) => { totalCells[i].textContent = t; });
        checkEnd();
      };
      addBtn.disabled = limit > 0 && data.rounds.length >= limit;
      wrap.replaceChildren(h('table', { class: 'grid' },
        h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { scope: 'col', style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
        h('tbody', null, data.rounds.map((round, r) => h('tr', null,
          h('th', { scope: 'row' }, limit > 0 ? `Manche ${r + 1}/${limit}` : `Manche ${r + 1}`),
          players.map((p, i) => h('td', null, numInput(round[i], (v) => { round[i] = v; ctx.save(); refresh(); }, { label: `Manche ${r + 1} ${p}` })))))),
        h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, 'Total'), totalCells))));
      refresh();
    }

    draw();
    root.append(endBanner, h('p', { class: 'muted small' }, rules), wrap, actions);
  },

  timeline: ({ data, options }) => (options.mode === 'categories' ? null : { points: cumulate(data.rounds) }),

  results({ data, options, players }) {
    const scores = totals(data, options, players.length);
    const cats = categories(options);
    return {
      scores,
      winners: winnersBy(scores, lowerWins(options)),
      lowerWins: lowerWins(options),
      details: options.mode === 'categories'
        ? players.map((_, i) => cats.map((c, k) => `${c} ${data.sheets[i][k] ?? 0}`).join(' · '))
        : players.map(() => `${data.rounds.length} manche${data.rounds.length > 1 ? 's' : ''}`),
    };
  },
};
