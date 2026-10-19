import { h, uid } from './dom.js';
import { store } from './store.js';
import { CATEGORIES, categoryOf, GAMES, getGame } from './games/index.js';
import { VERSION } from './version.js';
import { applyPlayerColors, AVATARS, COLOR_SLOTS, colorsFor, label } from './players.js';
import { headToHead, playerStats, ranking } from './stats.js';
import { scoreChart } from './chart.js';
import { openTools } from './tools.js';

const app = document.getElementById('app');
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const routes = { '': home, new: setup, play, result, history, stats, players };
let cleanup = null;
const homeFilter = { query: '', category: 'all' }; // filtres de l'accueil, gardés pendant la session

function route() {
  cleanup?.();
  cleanup = null;
  const [path = '', ...params] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  app.replaceChildren((routes[path] ?? home)(...params));
  window.scrollTo(0, 0);
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function redirect(hash) {
  queueMicrotask(() => go(hash));
  return h('div');
}

// ---------------------------------------------------------------- utilitaires

function header(title, { back, actions } = {}) {
  return h('header', { class: 'topbar' },
    back ? h('a', { class: 'icon-btn', href: back, 'aria-label': 'Retour' }, '‹') : h('span', { class: 'logo', 'aria-hidden': 'true' }, '🎲'),
    h('h1', null, title),
    actions);
}

function screen(title, opts, ...content) {
  return h('div', { class: 'screen' }, header(title, opts), h('main', { class: 'content' }, content));
}

function startGame(game, players, options) {
  if (store.current && !confirm('Une partie est déjà en cours. La remplacer ?')) return;
  store.rememberPlayers(players);
  store.saveCurrent({ id: uid(), gameId: game.id, startedAt: Date.now(), players, options, data: game.init(players, options) });
  go('#/play');
}

const gameTitle = (game, options) => game.titleFor?.(options) || game.name;

const expansionNames = (game, options) => (game.expansions ?? [])
  .filter((x) => options?.expansions?.includes(x.key))
  .map((x) => x.name);

const playersLabel = (min, max) => (min === max ? `${min} joueurs` : `${min} à ${max} joueurs`);
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// Partage natif (Android) ; à défaut, copie dans le presse-papiers.
async function shareText(title, text) {
  try {
    if (navigator.share) return await navigator.share({ title, text });
    await navigator.clipboard.writeText(text);
    alert('Résultat copié : collez-le dans votre messagerie.');
  } catch (err) {
    if (err?.name !== 'AbortError') alert('Partage impossible sur cet appareil.');
  }
}

// Courbe de l'évolution des scores d'une partie (jeux en manches uniquement).
function evolution(game, { players, options, data }) {
  const t = game.timeline?.({ players, options, data });
  if (!t) return null;
  return scoreChart({ names: players, colors: colorsFor(players), points: t.points, unit: t.unit ?? 'pts', roundLabel: t.roundLabel ?? 'Manche' });
}

// ---------------------------------------------------------------- accueil

function home() {
  const cur = store.current;
  const curGame = cur && getGame(cur.gameId);
  const grid = h('div', { class: 'game-grid' });
  const filters = h('div', { class: 'chips' });

  // Jeux récents : les 4 derniers jeux différents de l'historique.
  const recent = [...new Set(store.history.map((e) => e.gameId))].map(getGame).filter(Boolean).slice(0, 4);

  const card = (g) => h('div', { class: 'game-card-wrap' },
    h('a', { class: 'game-card', href: `#/new/${g.id}`, style: `--accent:${g.color}` },
      h('span', { class: 'game-icon' }, g.icon),
      h('span', { class: 'game-name' }, g.name),
      h('span', { class: 'muted small' }, g.tagline)),
    h('button', {
      type: 'button',
      class: `fav${store.isFavorite(g.id) ? ' on' : ''}`,
      'aria-label': store.isFavorite(g.id) ? `Retirer ${g.name} des favoris` : `Ajouter ${g.name} aux favoris`,
      'aria-pressed': String(store.isFavorite(g.id)),
      onclick: () => { store.toggleFavorite(g.id); draw(); },
    }, store.isFavorite(g.id) ? '★' : '☆'));

  function draw() {
    const q = homeFilter.query.trim().toLowerCase();
    const list = GAMES.filter((g) => {
      if (homeFilter.category === 'fav' && !store.isFavorite(g.id)) return false;
      if (!['all', 'fav'].includes(homeFilter.category) && categoryOf(g) !== homeFilter.category) return false;
      return !q || `${g.name} ${g.tagline}`.toLowerCase().includes(q);
    });
    // Favoris en premier, puis l'ordre habituel.
    list.sort((a, b) => store.isFavorite(b.id) - store.isFavorite(a.id));
    grid.replaceChildren(...(list.length ? list.map(card) : [h('p', { class: 'empty' }, 'Aucun jeu ne correspond.')]));
    filters.replaceChildren(...[['all', 'Tous'], ['fav', '★ Favoris'], ...CATEGORIES.map((c) => [c.key, c.label])].map(([key, text]) => h('button', {
      type: 'button',
      class: `chip${homeFilter.category === key ? ' on' : ''}`,
      onclick: () => { homeFilter.category = key; draw(); },
    }, text)));
  }
  draw();

  return screen('GameScoring', {},
    curGame && h('a', { class: 'resume card', href: '#/play', style: `--accent:${curGame.color}` },
      h('span', { class: 'resume-icon' }, curGame.icon),
      h('span', { class: 'grow' },
        h('strong', null, cur.editing ? 'Reprendre la modification' : 'Reprendre la partie'),
        h('span', { class: 'muted small block' }, `${gameTitle(curGame, cur.options)} · ${cur.players.join(', ')}`)),
      h('span', { class: 'chev' }, '›')),
    recent.length > 0 && h('section', { class: 'stack' },
      h('h2', { class: 'section-title' }, 'Joués récemment'),
      h('div', { class: 'recent-row' }, recent.map((g) => h('a', { class: 'recent', href: `#/new/${g.id}`, style: `--accent:${g.color}` },
        h('span', { class: 'game-icon' }, g.icon), h('span', { class: 'small' }, g.name))))),
    h('h2', { class: 'section-title' }, 'Nouvelle partie'),
    h('input', {
      type: 'search',
      class: 'text',
      placeholder: '🔍 Rechercher un jeu',
      value: homeFilter.query,
      'aria-label': 'Rechercher un jeu',
      oninput: (e) => { homeFilter.query = e.target.value; draw(); },
    }),
    filters,
    grid,
    h('nav', { class: 'link-list' },
      h('a', { class: 'card link-card', href: '#/history' }, h('span', { class: 'grow' }, '📜 Historique'), h('span', { class: 'muted small' }, plural(store.history.length, 'partie')), h('span', { class: 'chev' }, '›')),
      h('a', { class: 'card link-card', href: '#/stats' }, h('span', { class: 'grow' }, '🏆 Statistiques'), h('span', { class: 'chev' }, '›')),
      h('a', { class: 'card link-card', href: '#/players' }, h('span', { class: 'grow' }, '👥 Joueurs'), h('span', { class: 'muted small' }, plural(store.allPlayers().length, 'joueur')), h('span', { class: 'chev' }, '›'))),
    h('p', { class: 'app-version' }, `GameScoring v${VERSION}`));
}

// ---------------------------------------------------------------- préparation

function setup(gameId) {
  const game = getGame(gameId);
  if (!game) return redirect('#/');

  // Pré-sélection : joueurs de la dernière partie de ce jeu.
  const last = store.history.find((e) => e.gameId === game.id);
  const selected = last ? last.players.slice(0, game.maxPlayersFor?.(last.options) ?? game.maxPlayers) : [];
  const options = Object.fromEntries((game.options ?? []).map((o) => [o.key, last?.options?.[o.key] ?? o.default]));
  if (game.expansions?.length) {
    options.expansions = (last?.options?.expansions ?? []).filter((k) => game.expansions.some((x) => x.key === k));
  }

  const maxPlayers = () => game.maxPlayersFor?.(options) ?? game.maxPlayers;
  const chips = h('div', { class: 'chips' });
  const list = h('ol', { class: 'selected-players' });
  const count = h('p', { class: 'muted small' });
  const startBtn = h('button', { type: 'button', class: 'btn primary block', onclick: () => startGame(game, [...selected], { ...options }) }, 'Commencer');
  const input = h('input', { type: 'text', class: 'text', placeholder: 'Nouveau joueur', maxLength: 20, enterKeyHint: 'done', autocapitalize: 'words' });

  function add(name) {
    name = name.trim();
    if (!name || selected.length >= maxPlayers() || selected.some((n) => n.toLowerCase() === name.toLowerCase())) return;
    selected.push(name);
  }

  function refresh() {
    chips.replaceChildren(...store.knownPlayers.map((n) => h('button', {
      type: 'button',
      class: `chip${selected.includes(n) ? ' on' : ''}`,
      'aria-pressed': String(selected.includes(n)),
      onclick: () => {
        const i = selected.indexOf(n);
        if (i >= 0) selected.splice(i, 1); else add(n);
        refresh();
      },
    }, label(n))));
    const colors = colorsFor(selected);
    list.replaceChildren(...selected.map((n, i) => h('li', { style: `--accent:${colors[i]}` },
      h('span', { class: 'grow' }, label(n)),
      i > 0 && h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Monter ${n}`, onclick: () => { [selected[i - 1], selected[i]] = [selected[i], selected[i - 1]]; refresh(); } }, '↑'),
      h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Retirer ${n}`, onclick: () => { selected.splice(i, 1); refresh(); } }, '✕'))));
    startBtn.disabled = selected.length < game.minPlayers || selected.length > maxPlayers();
    count.textContent = `${selected.length} sélectionné${selected.length > 1 ? 's' : ''} · ${playersLabel(game.minPlayers, maxPlayers())}`;
  }

  function optionField(o) {
    if (o.type === 'checkbox') {
      return h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: options[o.key], onchange: (e) => { options[o.key] = e.target.checked; drawOptions(); } }),
        h('span', null, o.label));
    }
    if (o.type === 'text' || o.type === 'number' || o.type === 'textarea') {
      const field = h(o.type === 'textarea' ? 'textarea' : 'input', {
        class: 'text',
        type: o.type === 'number' ? 'number' : o.type === 'text' ? 'text' : null,
        value: options[o.key] ?? '',
        placeholder: o.placeholder,
        maxLength: o.maxLength,
        rows: o.type === 'textarea' ? 4 : null,
        oninput: (e) => { options[o.key] = o.type === 'number' ? Number(e.target.value) || 0 : e.target.value; },
      });
      return h('label', { class: 'option stack' }, h('span', null, o.label), field, o.hint && h('small', { class: 'muted' }, o.hint));
    }
    return h('fieldset', { class: 'option' }, h('legend', null, o.label),
      h('div', { class: 'segmented' }, o.choices.filter(available).map((c) => h('label', null,
        h('input', { type: 'radio', name: o.key, value: c.value, checked: options[o.key] === c.value, onchange: () => { options[o.key] = c.value; drawOptions(); } }),
        h('span', null, c.label)))));
  }

  // Une option (ou un choix) marquée `requires` n'apparaît que si l'extension correspondante est cochée ;
  // `visible(options)` permet aussi de la faire dépendre d'une autre option.
  const available = (item) => (!item.requires || options.expansions?.includes(item.requires)) && item.visible?.(options) !== false;

  // Feuilles déjà utilisées (jeux personnalisables) : un toucher recharge leurs réglages.
  const templates = game.templates
    ? [...new Map(store.history.filter((e) => e.gameId === game.id).map((e) => [gameTitle(game, e.options), e.options])).entries()]
    : [];
  const templatesBox = templates.length > 0 && h('section', { class: 'stack' },
    h('h2', { class: 'section-title' }, 'Feuilles déjà utilisées'),
    h('div', { class: 'chips' }, templates.map(([title, saved]) => h('button', {
      type: 'button',
      class: 'chip',
      onclick: () => { Object.assign(options, structuredClone(saved)); drawOptions(); },
    }, title))));
  const optionsBox = h('section', { class: 'stack' });
  function drawOptions() {
    const visible = (game.options ?? []).filter(available);
    for (const o of game.options ?? []) {
      // Seules les options liées à une extension décochée reviennent à leur valeur par défaut ;
      // une option simplement masquée garde sa saisie.
      const requiresOk = (item) => !item.requires || options.expansions?.includes(item.requires);
      const invalid = !requiresOk(o) || (o.choices && !o.choices.some((c) => c.value === options[o.key] && requiresOk(c)));
      if (invalid) options[o.key] = o.default;
    }
    optionsBox.replaceChildren(...(visible.length ? [h('h2', { class: 'section-title' }, 'Options'), ...visible.map(optionField)] : []));
  }

  drawOptions();
  refresh();
  return screen(`${game.icon} ${game.name}`, { back: '#/' },
    h('section', { class: 'stack' },
      h('h2', { class: 'section-title' }, 'Joueurs', h('a', { class: 'title-link', href: '#/players' }, 'Gérer')),
      store.knownPlayers.length > 0 && chips,
      h('form', { class: 'add-player', onsubmit: (e) => { e.preventDefault(); add(input.value); input.value = ''; refresh(); input.focus(); } },
        input, h('button', { type: 'submit', class: 'btn' }, 'Ajouter')),
      list,
      count),
    game.expansions?.length > 0 && h('section', { class: 'stack' }, h('h2', { class: 'section-title' }, 'Extensions'),
      game.expansions.map((x) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: options.expansions.includes(x.key), onchange: (e) => {
          options.expansions = e.target.checked ? [...options.expansions, x.key] : options.expansions.filter((k) => k !== x.key);
          drawOptions();
          refresh();
        } }),
        h('span', null, x.name, x.description && h('small', { class: 'muted block' }, x.description))))),
    templatesBox,
    optionsBox,
    h('div', { class: 'sticky-bottom' }, startBtn));
}

// ---------------------------------------------------------------- partie

function play() {
  const cur = store.current;
  const game = cur && getGame(cur.gameId);
  if (!game) return redirect('#/');
  applyPlayerColors(cur.players);

  const ctx = {
    players: cur.players,
    options: cur.options,
    data: cur.data,
    save: () => store.saveCurrent(cur),
    finish,
  };

  function finish() {
    if (!confirm(cur.editing ? 'Enregistrer les modifications de la partie ?' : 'Terminer la partie et enregistrer le résultat ?')) return;
    const r = game.results(cur);
    const entry = {
      id: cur.id,
      gameId: cur.gameId,
      startedAt: cur.startedAt,
      endedAt: cur.endedAt ?? Date.now(),
      editedAt: cur.editing ? Date.now() : undefined,
      players: cur.players,
      options: cur.options,
      scores: r.scores,
      winners: r.winners,
      lowerWins: Boolean(r.lowerWins),
      unit: r.unit ?? 'pts',
      details: r.details,
      data: cur.data, // conservé pour pouvoir corriger la partie ou afficher son évolution
    };
    store.addHistory(entry);
    store.clearCurrent();
    go(`#/result/${entry.id}`);
  }

  function abandon() {
    const message = cur.editing
      ? 'Annuler la modification ? La partie enregistrée reste inchangée.'
      : 'Abandonner la partie ? Elle ne sera pas enregistrée.';
    if (!confirm(message)) return;
    store.clearCurrent();
    go(cur.editing ? `#/result/${cur.id}` : '#/');
  }

  // Garde l'écran allumé pendant la partie.
  let lock = null;
  const acquire = async () => {
    try { lock = await navigator.wakeLock?.request('screen'); } catch { /* non supporté */ }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
  acquire();
  document.addEventListener('visibilitychange', onVisible);
  cleanup = () => {
    document.removeEventListener('visibilitychange', onVisible);
    lock?.release().catch(() => {});
  };

  // Le jeu dessine dans sa propre zone : certains modules la redessinent entièrement à chaque saisie.
  const gameRoot = h('div', { class: 'game-root' });
  const body = h('main', { class: `content play play-${game.id}` }, gameRoot);
  game.render(gameRoot, ctx);

  // Évolution des scores, recalculée à chaque ouverture.
  if (game.timeline) {
    const chartBox = h('div');
    body.append(h('details', { class: 'card evolution', ontoggle: (e) => {
      if (e.target.open) chartBox.replaceChildren(evolution(game, cur) ?? '');
    } }, h('summary', null, '📈 Évolution des scores'), chartBox));
  }

  return h('div', { class: 'screen' },
    header(`${cur.editing ? '✏️ ' : ''}${gameTitle(game, cur.options)}`, { back: '#/', actions: [
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Outils : dés, premier joueur, minuteur', onclick: () => openTools({ players: cur.players, game }) }, '🧰'),
      h('button', { type: 'button', class: 'btn small primary', onclick: finish }, cur.editing ? 'Enregistrer' : 'Terminer'),
    ] }),
    cur.editing && h('p', { class: 'banner edit-banner' }, 'Modification d’une partie terminée. « Enregistrer » remplace le résultat, « Annuler » le garde tel quel.'),
    body,
    h('footer', { class: 'play-footer' }, h('button', { type: 'button', class: 'btn ghost', onclick: abandon }, cur.editing ? 'Annuler la modification' : 'Abandonner la partie')));
}

// ---------------------------------------------------------------- résultat

function result(id) {
  const entry = store.history.find((e) => e.id === id);
  const game = entry && getGame(entry.gameId);
  if (!game) return redirect('#/history');
  applyPlayerColors(entry.players);
  const title = gameTitle(game, entry.options);
  const rows = ranking(entry);

  const shareResult = () => shareText(`${game.icon} ${title}`, [
    `${game.icon} ${title} — ${dateFmt.format(entry.endedAt)}`,
    ...rows.map((r) => `${r.winner ? '👑' : `${r.rank}.`} ${r.name} : ${r.score} ${entry.unit}`),
    '',
    'Compté avec GameScoring',
  ].join('\n'));

  const edit = () => {
    if (store.current && !confirm('Une partie est déjà en cours. La remplacer par la modification de celle-ci ?')) return;
    store.saveCurrent({
      id: entry.id,
      gameId: entry.gameId,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      players: [...entry.players],
      options: structuredClone(entry.options),
      data: structuredClone(entry.data),
      editing: true,
    });
    go('#/play');
  };

  const chart = entry.data && evolution(game, entry);
  return screen(`${game.icon} ${title}`, { back: '#/history' },
    h('p', { class: 'muted center' }, dateFmt.format(entry.endedAt),
      entry.editedAt && h('span', { class: 'block small' }, `✏️ modifiée le ${dateFmt.format(entry.editedAt)}`),
      expansionNames(game, entry.options).map((name) => h('span', { class: 'block small' }, `🧩 ${name}`))),
    h('ol', { class: 'ranking' }, rows.map((r) => h('li', { class: r.winner ? 'winner' : '', style: `--accent:${colorsFor(entry.players)[r.i]}` },
      h('span', { class: 'rank' }, r.winner ? '👑' : r.rank),
      h('span', { class: 'grow' }, h('strong', null, label(r.name)), r.detail && h('span', { class: 'muted small block' }, r.detail)),
      h('span', { class: 'score' }, r.score, h('small', null, ` ${entry.unit}`))))),
    chart && h('section', { class: 'card stack' }, h('h2', { class: 'section-title' }, '📈 Évolution des scores'), chart),
    h('div', { class: 'button-row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => startGame(game, [...entry.players], { ...entry.options }) }, '🔁 Revanche'),
      h('button', { type: 'button', class: 'btn', onclick: shareResult }, '📤 Partager')),
    h('div', { class: 'button-row' },
      entry.data
        ? h('button', { type: 'button', class: 'btn', onclick: edit }, '✏️ Modifier')
        : h('p', { class: 'muted small' }, 'Partie enregistrée avant la version 1.6 : elle ne peut pas être modifiée.'),
      h('a', { class: 'btn', href: '#/' }, 'Accueil')),
    h('button', { type: 'button', class: 'btn ghost danger block', onclick: () => {
      if (!confirm('Supprimer cette partie de l’historique ?')) return;
      store.removeHistory(entry.id);
      go('#/history');
    } }, 'Supprimer cette partie'));
}

// ---------------------------------------------------------------- historique

function history() {
  const entries = store.history;
  return screen('Historique', { back: '#/' },
    entries.length === 0
      ? h('p', { class: 'empty' }, 'Aucune partie terminée pour l’instant.')
      : h('div', { class: 'link-list' }, entries.map((e) => {
        const game = getGame(e.gameId);
        if (!game) return null;
        return h('a', { class: 'card link-card', href: `#/result/${e.id}`, style: `--accent:${game.color}` },
          h('span', { class: 'resume-icon' }, game.icon),
          h('span', { class: 'grow' },
            h('strong', null, gameTitle(game, e.options)),
            h('span', { class: 'muted small block' }, `${dateFmt.format(e.endedAt)} · 👑 ${e.winners.map((i) => label(e.players[i])).join(', ')}`)),
          h('span', { class: 'chev' }, '›'));
      })));
}

// ---------------------------------------------------------------- joueurs

function players() {
  const names = store.allPlayers();
  const list = h('div', { class: 'link-list' });
  let open = null;

  const gamesOf = (name) => store.history.filter((e) => e.players.includes(name)).length;

  function editor(name) {
    const profile = store.profile(name);
    const input = h('input', { type: 'text', class: 'text', value: name, maxLength: 20, 'aria-label': 'Nom du joueur' });
    return h('div', { class: 'stack player-editor' },
      h('form', { class: 'add-player', onsubmit: (e) => {
        e.preventDefault();
        const to = input.value.trim();
        if (!to || to === name) return;
        const merging = store.allPlayers().includes(to);
        if (merging && !confirm(`« ${to} » existe déjà. Fusionner « ${name} » avec « ${to} » ? Leurs parties et statistiques seront regroupées.`)) return;
        const r = store.renamePlayer(name, to);
        if (!r.ok) { alert(r.reason); return; }
        open = to;
        route();
      } }, input, h('button', { type: 'submit', class: 'btn' }, 'Renommer')),
      h('span', { class: 'small muted' }, 'Avatar'),
      h('div', { class: 'avatar-grid' },
        h('button', { type: 'button', class: `avatar${!profile.avatar ? ' on' : ''}`, onclick: () => { store.setProfile(name, { avatar: undefined }); draw(); } }, '∅'),
        AVATARS.map((a) => h('button', { type: 'button', class: `avatar${profile.avatar === a ? ' on' : ''}`, onclick: () => { store.setProfile(name, { avatar: a }); draw(); } }, a))),
      h('span', { class: 'small muted' }, 'Couleur (gardée d’une partie à l’autre si elle est libre)'),
      h('div', { class: 'swatch-row' },
        h('button', { type: 'button', class: `swatch-btn auto${!Number.isInteger(profile.color) ? ' on' : ''}`, 'aria-label': 'Couleur automatique', onclick: () => { store.setProfile(name, { color: undefined }); draw(); } }, 'Auto'),
        COLOR_SLOTS.map((c, k) => h('button', {
          type: 'button',
          class: `swatch-btn${profile.color === k ? ' on' : ''}`,
          style: `background:${c}`,
          'aria-label': `Couleur ${k + 1}`,
          onclick: () => { store.setProfile(name, { color: k }); draw(); },
        }))),
      h('button', { type: 'button', class: 'btn ghost danger', onclick: () => {
        const n = gamesOf(name);
        const message = n
          ? `Retirer « ${name} » de la liste rapide ? Ses ${n} partie(s) restent dans l’historique.`
          : `Supprimer « ${name} » ?`;
        if (!confirm(message)) return;
        store.forgetPlayer(name);
        open = null;
        route();
      } }, gamesOf(name) ? 'Retirer de la liste rapide' : 'Supprimer ce joueur'));
  }

  function draw() {
    list.replaceChildren(...store.allPlayers().map((name) => {
      const color = store.profile(name).color;
      return h('section', { class: 'card stack' },
        h('button', { type: 'button', class: 'player-row', 'aria-expanded': String(open === name), onclick: () => { open = open === name ? null : name; draw(); } },
          h('span', { class: 'swatch big', style: `background:${Number.isInteger(color) ? COLOR_SLOTS[color] : 'var(--surface-2)'}` }),
          h('span', { class: 'grow' }, h('strong', null, label(name)), h('span', { class: 'muted small block' }, plural(gamesOf(name), 'partie'))),
          h('span', { class: 'chev' }, open === name ? '⌄' : '›')),
        open === name && editor(name));
    }));
  }
  draw();

  return screen('Joueurs', { back: '#/' },
    names.length === 0
      ? h('p', { class: 'empty' }, 'Les joueurs apparaîtront ici après leur première partie.')
      : h('p', { class: 'muted small' }, 'Touchez un joueur pour le renommer (ou le fusionner avec un autre), lui donner un avatar et une couleur.'),
    list);
}

// ---------------------------------------------------------------- statistiques

function statTable(rows, { showBest = true } = {}) {
  return h('table', { class: 'stats' },
    h('thead', null, h('tr', null,
      h('th', null, 'Joueur'), h('th', null, 'Parties'), h('th', null, 'Victoires'),
      h('th', { title: 'Meilleure série de victoires' }, 'Série'), h('th', { title: 'Rang moyen' }, 'Rang'),
      showBest && h('th', null, 'Record'))),
    h('tbody', null, rows.map((r) => h('tr', null,
      h('td', null, label(r.name)),
      h('td', null, r.played),
      h('td', null, `${r.wins} (${Math.round(100 * r.rate)} %)`),
      h('td', null, r.bestStreak),
      h('td', null, r.avgRank.toFixed(1)),
      showBest && h('td', null, r.best)))));
}

function stats() {
  const all = store.history;

  // Vue d'ensemble
  const overall = playerStats(all);
  const gamesPlayed = new Set(all.map((e) => e.gameId)).size;
  const favoriteGame = [...all.reduce((m, e) => m.set(e.gameId, (m.get(e.gameId) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0];
  const tiles = all.length > 0 && h('div', { class: 'tiles' },
    h('div', { class: 'tile' }, h('strong', null, all.length), h('span', null, 'parties')),
    h('div', { class: 'tile' }, h('strong', null, gamesPlayed), h('span', null, 'jeux différents')),
    overall[0] && h('div', { class: 'tile' }, h('strong', null, label(overall[0].name)), h('span', null, `${plural(overall[0].wins, 'victoire')}`)),
    favoriteGame && h('div', { class: 'tile' }, h('strong', null, getGame(favoriteGame[0])?.icon ?? '🎲'), h('span', null, `${getGame(favoriteGame[0])?.name ?? ''} (${favoriteGame[1]})`)));

  // Face-à-face
  const names = overall.map((r) => r.name);
  const duel = { a: names[0], b: names[1] };
  const duelBox = h('div', { class: 'stack' });
  const select = (key) => h('select', { class: 'text', onchange: (e) => { duel[key] = e.target.value; drawDuel(); } },
    names.map((n) => h('option', { value: n, selected: duel[key] === n }, label(n))));
  function drawDuel() {
    if (duel.a === duel.b) { duelBox.replaceChildren(h('p', { class: 'muted small' }, 'Choisissez deux joueurs différents.')); return; }
    const r = headToHead(all, duel.a, duel.b);
    const total = r.a + r.b + r.draws;
    duelBox.replaceChildren(total === 0
      ? h('p', { class: 'muted small' }, 'Ces deux joueurs n’ont pas encore joué ensemble.')
      : h('div', { class: 'stack' },
        h('div', { class: 'duel-score' },
          h('span', null, h('strong', null, r.a), h('small', null, label(duel.a))),
          h('span', { class: 'muted' }, `${plural(r.draws, 'égalité')}`),
          h('span', null, h('strong', null, r.b), h('small', null, label(duel.b)))),
        h('table', { class: 'stats' },
          h('thead', null, h('tr', null, h('th', null, 'Jeu'), h('th', null, duel.a), h('th', null, '='), h('th', null, duel.b))),
          h('tbody', null, [...r.games].map(([gameId, g]) => h('tr', null,
            h('td', null, `${getGame(gameId)?.icon ?? ''} ${getGame(gameId)?.name ?? gameId}`), h('td', null, g.a), h('td', null, g.draws), h('td', null, g.b))))),
        h('p', { class: 'muted small' }, 'Sur les parties jouées ensemble : qui a fini devant l’autre.')));
  }
  if (names.length >= 2) drawDuel();

  // Détail par jeu (et par nom de feuille libre)
  const groups = GAMES.flatMap((game) => {
    const byTitle = new Map();
    for (const e of all.filter((x) => x.gameId === game.id)) {
      const title = gameTitle(game, e.options);
      byTitle.set(title, [...(byTitle.get(title) ?? []), e]);
    }
    return [...byTitle.entries()].map(([title, entries]) => ({ game, title, entries }));
  });
  const sections = groups.map(({ game, title, entries }) => h('section', { class: 'card stats-card', style: `--accent:${game.color}` },
    h('h2', null, `${game.icon} ${title}`, h('span', { class: 'muted small' }, ` · ${plural(entries.length, 'partie')}`)),
    h('div', { class: 'grid-wrap plain' }, statTable(playerStats(entries), { showBest: game.showBest !== false }))));

  // Sauvegarde et transfert
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const added = store.importData(JSON.parse(await file.text()));
      alert(`${plural(added, 'partie')} importée${added > 1 ? 's' : ''}.`);
      route();
    } catch (err) {
      alert(`Import impossible : ${err.message}`);
    }
  } });
  const backupFile = () => new File([JSON.stringify(store.exportData(), null, 2)], `gamescoring-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
  function exportData() {
    const url = URL.createObjectURL(backupFile());
    h('a', { href: url, download: backupFile().name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function sendData() {
    const file = backupFile();
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Sauvegarde GameScoring', text: 'Ouvrez GameScoring › Statistiques › Importer, puis choisissez ce fichier.' });
      } else {
        exportData();
        alert('Le partage de fichier n’est pas disponible : le fichier a été téléchargé. Envoyez-le à l’autre téléphone, puis importez-le.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') alert('Envoi impossible sur cet appareil.');
    }
  }

  return screen('Statistiques', { back: '#/' },
    all.length === 0 && h('p', { class: 'empty' }, 'Les statistiques apparaîtront après la première partie terminée.'),
    tiles,
    overall.length > 0 && h('section', { class: 'card stats-card stack' },
      h('h2', null, '🏆 Classement général', h('span', { class: 'muted small' }, ' · tous jeux confondus')),
      h('div', { class: 'grid-wrap plain' }, statTable(overall, { showBest: false })),
      h('p', { class: 'muted small' }, 'Série : meilleure suite de victoires. Rang : place moyenne à l’arrivée (1 = toujours premier).')),
    names.length >= 2 && h('section', { class: 'card stats-card stack' },
      h('h2', null, '⚔️ Face-à-face'),
      h('div', { class: 'duel-pick' }, select('a'), h('span', null, 'contre'), select('b')),
      duelBox),
    sections,
    h('section', { class: 'stack' },
      h('h2', { class: 'section-title' }, 'Sauvegarde et transfert'),
      h('p', { class: 'muted small' }, 'Les données sont stockées sur ce téléphone. « Envoyer » partage le fichier de sauvegarde (WhatsApp, e-mail, Bluetooth…) ; sur l’autre téléphone, ouvrez-le avec « Importer ». L’import ajoute les parties sans créer de doublon.'),
      h('div', { class: 'button-row' },
        h('button', { type: 'button', class: 'btn primary', onclick: sendData }, '📤 Envoyer'),
        h('button', { type: 'button', class: 'btn', onclick: exportData }, '⬇️ Exporter'),
        h('button', { type: 'button', class: 'btn', onclick: () => fileInput.click() }, '⬆️ Importer'),
        fileInput)));
}

// ---------------------------------------------------------------- démarrage
// En fin de fichier : toutes les fonctions et constantes ci-dessus sont alors initialisées.

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  // Une nouvelle version a pris le relais : on recharge pour l'afficher (la partie en cours est sauvegardée).
  // Pas de rechargement à la toute première installation.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      // Une appli installée n'est pas rechargée quand on la rouvre : on cherche une mise à jour à chaque retour.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    } catch { /* service worker indisponible (navigation privée, http…) */ }
  });
}
