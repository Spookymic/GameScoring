import { h } from './dom.js';

export const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

export const hasExpansion = (options, key) => Boolean(options?.expansions?.includes(key));

export const sum =(values) => values.reduce((a, b) => a + (Number(b) || 0), 0);

// Indices des joueurs ayant le meilleur score.
export function winnersBy(scores, lowerWins = false) {
  const best = lowerWins ? Math.min(...scores) : Math.max(...scores);
  return scores.flatMap((s, i) => (s === best ? [i] : []));
}

// Bouton − valeur + ; onChange(nouvelleValeur) appelé à chaque modification.
export function stepper(value, onChange, { min = -Infinity, max = Infinity, step = 1, label } = {}) {
  let current = value;
  const out = h('output', { class: 'stepper-value' }, current);
  const set = (next) => {
    next = Math.min(max, Math.max(min, next));
    if (next === current) return;
    current = next;
    out.textContent = current;
    sync();
    onChange(current);
  };
  const minus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': `${label ?? ''} moins`, onclick: () => set(current - step) }, '−');
  const plus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': `${label ?? ''} plus`, onclick: () => set(current + step) }, '+');
  const sync = () => {
    minus.disabled = current <= min;
    plus.disabled = current >= max;
  };
  sync();
  return h('div', { class: 'stepper' }, minus, out, plus);
}

// Champ numérique ; une valeur vide vaut 0.
export function numInput(value, onChange, { label } = {}) {
  const input = h('input', { type: 'number', class: 'num', value: value ? value : '', placeholder: '0', 'aria-label': label });
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => {
    const n = input.value === '' ? 0 : Number(input.value);
    onChange(Number.isFinite(n) ? n : 0);
  });
  return input;
}

// Onglets par joueur. label(i) peut renvoyer un nœud ou un tableau de nœuds.
export function playerTabs(players, { label = (i) => players[i], renderPanel }) {
  let current = 0;
  const panel = h('div', { class: 'tab-panel' });
  const buttons = players.map((_, i) => h('button', { type: 'button', class: 'tab', role: 'tab', onclick: () => select(i) }));
  const refresh = () => buttons.forEach((b, i) => {
    b.replaceChildren(...[label(i)].flat());
    b.classList.toggle('active', i === current);
    b.setAttribute('aria-selected', String(i === current));
  });
  const rerender = () => panel.replaceChildren(renderPanel(current));
  function select(i) {
    current = i;
    refresh();
    rerender();
  }
  select(0);
  return { el: h('div', { class: 'tabs-wrap' }, h('div', { class: 'tabs', role: 'tablist' }, buttons), panel), refresh, rerender };
}

// Tableau de saisie catégories × joueurs, avec ligne de total recalculée en direct.
export function scoreGrid({ players, rows, total }) {
  const totals = players.map(() => h('td', { class: 'total' }));
  const refresh = () => totals.forEach((td, i) => { td.textContent = total(i); });
  const table = h('table', { class: 'grid' },
    h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { scope: 'col', style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
    h('tbody', null, rows.map((row) => h('tr', null,
      h('th', { scope: 'row' },
        h('span', { class: 'row-label' }, row.icon && h('span', { class: 'row-icon' }, row.icon), row.label),
        row.hint && h('small', null, row.hint)),
      players.map((p, i) => h('td', null, numInput(row.get(i), (v) => { row.set(i, v); refresh(); }, { label: `${row.label} ${p}` })))))),
    h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, 'Total'), totals)));
  refresh();
  return h('div', { class: 'grid-wrap' }, table);
}

export function banner(content, action) {
  return h('div', { class: 'banner' }, h('span', null, content), action);
}
