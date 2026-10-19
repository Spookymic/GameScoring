import { h, uid } from './dom.js';
import { store } from './store.js';
import { GAMES, getGame } from './games/index.js';
import { VERSION } from './version.js';

const app = document.getElementById('app');
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const routes = { '': home, new: setup, play, result, history, stats };
let cleanup = null;

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

const expansionNames = (game, options) => (game.expansions ?? [])
  .filter((x) => options?.expansions?.includes(x.key))
  .map((x) => x.name);

const playersLabel =(min, max) => (min === max ? `${min} joueurs` : `${min} à ${max} joueurs`);

// ---------------------------------------------------------------- accueil

function home() {
  const cur = store.current;
  const curGame = cur && getGame(cur.gameId);
  return screen('GameScoring', {},
    curGame && h('a', { class: 'resume card', href: '#/play', style: `--accent:${curGame.color}` },
      h('span', { class: 'resume-icon' }, curGame.icon),
      h('span', { class: 'grow' }, h('strong', null, 'Reprendre la partie'), h('span', { class: 'muted small block' }, `${curGame.name} · ${cur.players.join(', ')}`)),
      h('span', { class: 'chev' }, '›')),
    h('h2', { class: 'section-title' }, 'Nouvelle partie'),
    h('div', { class: 'game-grid' }, GAMES.map((g) => h('a', { class: 'game-card', href: `#/new/${g.id}`, style: `--accent:${g.color}` },
      h('span', { class: 'game-icon' }, g.icon),
      h('span', { class: 'game-name' }, g.name),
      h('span', { class: 'muted small' }, g.tagline)))),
    h('nav', { class: 'link-list' },
      h('a', { class: 'card link-card', href: '#/history' }, h('span', { class: 'grow' }, '📜 Historique'), h('span', { class: 'muted small' }, `${store.history.length} partie${store.history.length > 1 ? 's' : ''}`), h('span', { class: 'chev' }, '›')),
      h('a', { class: 'card link-card', href: '#/stats' }, h('span', { class: 'grow' }, '🏆 Statistiques'), h('span', { class: 'chev' }, '›'))),
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
    }, n)));
    list.replaceChildren(...selected.map((n, i) => h('li', null,
      h('span', { class: 'grow' }, n),
      i > 0 && h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Monter ${n}`, onclick: () => { [selected[i - 1], selected[i]] = [selected[i], selected[i - 1]]; refresh(); } }, '↑'),
      h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Retirer ${n}`, onclick: () => { selected.splice(i, 1); refresh(); } }, '✕'))));
    startBtn.disabled = selected.length < game.minPlayers || selected.length > maxPlayers();
    count.textContent = `${selected.length} sélectionné${selected.length > 1 ? 's' : ''} · ${playersLabel(game.minPlayers, maxPlayers())}`;
  }

  function optionField(o) {
    if (o.type === 'checkbox') {
      return h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: options[o.key], onchange: (e) => { options[o.key] = e.target.checked; } }),
        h('span', null, o.label));
    }
    return h('fieldset', { class: 'option' }, h('legend', null, o.label),
      h('div', { class: 'segmented' }, o.choices.filter(available).map((c) => h('label', null,
        h('input', { type: 'radio', name: o.key, value: c.value, checked: options[o.key] === c.value, onchange: () => { options[o.key] = c.value; } }),
        h('span', null, c.label)))));
  }

  // Une option (ou un choix) marquée `requires` n'apparaît que si l'extension correspondante est cochée.
  const available = (item) => !item.requires || options.expansions?.includes(item.requires);
  const optionsBox = h('section', { class: 'stack' });
  function drawOptions() {
    const visible = (game.options ?? []).filter(available);
    for (const o of game.options ?? []) {
      const invalid = !available(o) || (o.choices && !o.choices.some((c) => c.value === options[o.key] && available(c)));
      if (invalid) options[o.key] = o.default;
    }
    optionsBox.replaceChildren(...(visible.length ? [h('h2', { class: 'section-title' }, 'Options'), ...visible.map(optionField)] : []));
  }

  drawOptions();
  refresh();
  return screen(`${game.icon} ${game.name}`, { back: '#/' },
    h('section', { class: 'stack' },
      h('h2', { class: 'section-title' }, 'Joueurs'),
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
    optionsBox,
    h('div', { class: 'sticky-bottom' }, startBtn));
}

// ---------------------------------------------------------------- partie

function play() {
  const cur = store.current;
  const game = cur && getGame(cur.gameId);
  if (!game) return redirect('#/');

  const ctx = {
    players: cur.players,
    options: cur.options,
    data: cur.data,
    save: () => store.saveCurrent(cur),
    finish,
  };

  function finish() {
    if (!confirm('Terminer la partie et enregistrer le résultat ?')) return;
    const r = game.results(cur);
    const entry = {
      id: cur.id,
      gameId: cur.gameId,
      startedAt: cur.startedAt,
      endedAt: Date.now(),
      players: cur.players,
      options: cur.options,
      scores: r.scores,
      winners: r.winners,
      lowerWins: Boolean(r.lowerWins),
      unit: r.unit ?? 'pts',
      details: r.details,
    };
    store.addHistory(entry);
    store.clearCurrent();
    go(`#/result/${entry.id}`);
  }

  function abandon() {
    if (!confirm('Abandonner la partie ? Elle ne sera pas enregistrée.')) return;
    store.clearCurrent();
    go('#/');
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

  const body = h('main', { class: `content play play-${game.id}` });
  game.render(body, ctx);
  return h('div', { class: 'screen' },
    header(game.name, { back: '#/', actions: h('button', { type: 'button', class: 'btn small primary', onclick: finish }, 'Terminer') }),
    body,
    h('footer', { class: 'play-footer' }, h('button', { type: 'button', class: 'btn ghost', onclick: abandon }, 'Abandonner la partie')));
}

// ---------------------------------------------------------------- résultat

function ranking(entry) {
  const rows = entry.players.map((name, i) => ({
    name,
    score: entry.scores[i],
    winner: entry.winners.includes(i),
    detail: entry.details?.[i],
  }));
  rows.sort((a, b) => (b.winner - a.winner) || (entry.lowerWins ? a.score - b.score : b.score - a.score));
  rows.forEach((r, k) => {
    const prev = rows[k - 1];
    r.rank = prev && prev.score === r.score && prev.winner === r.winner ? prev.rank : k + 1;
  });
  return rows;
}

function result(id) {
  const entry = store.history.find((e) => e.id === id);
  const game = entry && getGame(entry.gameId);
  if (!game) return redirect('#/history');

  return screen(`${game.icon} ${game.name}`, { back: '#/history' },
    h('p', { class: 'muted center' }, dateFmt.format(entry.endedAt),
      expansionNames(game, entry.options).map((name) => h('span', { class: 'block small' }, `🧩 ${name}`))),
    h('ol', { class: 'ranking' }, ranking(entry).map((r) => h('li', { class: r.winner ? 'winner' : '' },
      h('span', { class: 'rank' }, r.winner ? '👑' : r.rank),
      h('span', { class: 'grow' }, h('strong', null, r.name), r.detail && h('span', { class: 'muted small block' }, r.detail)),
      h('span', { class: 'score' }, r.score, h('small', null, ` ${entry.unit}`))))),
    h('div', { class: 'button-row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => startGame(game, [...entry.players], { ...entry.options }) }, '🔁 Revanche'),
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
            h('strong', null, game.name),
            h('span', { class: 'muted small block' }, `${dateFmt.format(e.endedAt)} · 👑 ${e.winners.map((i) => e.players[i]).join(', ')}`)),
          h('span', { class: 'chev' }, '›'));
      })));
}

// ---------------------------------------------------------------- statistiques

function stats() {
  const sections = GAMES.map((game) => {
    const entries = store.history.filter((e) => e.gameId === game.id);
    if (!entries.length) return null;
    const byPlayer = new Map();
    for (const e of entries) {
      e.players.forEach((name, i) => {
        const s = byPlayer.get(name) ?? { name, played: 0, wins: 0, best: null };
        s.played += 1;
        if (e.winners.includes(i)) s.wins += 1;
        const score = e.scores[i];
        if (s.best === null || (e.lowerWins ? score < s.best : score > s.best)) s.best = score;
        byPlayer.set(name, s);
      });
    }
    const rows = [...byPlayer.values()].sort((a, b) => b.wins - a.wins || b.wins / b.played - a.wins / a.played);
    const showBest = game.showBest !== false;
    return h('section', { class: 'card stats-card', style: `--accent:${game.color}` },
      h('h2', null, `${game.icon} ${game.name}`, h('span', { class: 'muted small' }, ` · ${entries.length} partie${entries.length > 1 ? 's' : ''}`)),
      h('table', { class: 'stats' },
        h('thead', null, h('tr', null, h('th', null, 'Joueur'), h('th', null, 'Parties'), h('th', null, 'Victoires'), showBest && h('th', null, 'Record'))),
        h('tbody', null, rows.map((r) => h('tr', null,
          h('td', null, r.name),
          h('td', null, r.played),
          h('td', null, `${r.wins} (${Math.round((100 * r.wins) / r.played)} %)`),
          showBest && h('td', null, r.best))))));
  }).filter(Boolean);

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const added = store.importData(JSON.parse(await file.text()));
      alert(`${added} partie${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''}.`);
      route();
    } catch (err) {
      alert(`Import impossible : ${err.message}`);
    }
  } });

  function exportData() {
    const blob = new Blob([JSON.stringify(store.exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    h('a', { href: url, download: `gamescoring-${new Date().toISOString().slice(0, 10)}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return screen('Statistiques', { back: '#/' },
    sections.length ? sections : h('p', { class: 'empty' }, 'Les statistiques apparaîtront après la première partie terminée.'),
    h('section', { class: 'stack' },
      h('h2', { class: 'section-title' }, 'Sauvegarde'),
      h('p', { class: 'muted small' }, 'Les données sont stockées sur ce téléphone. Exportez-les pour les conserver ou les transférer.'),
      h('div', { class: 'button-row' },
        h('button', { type: 'button', class: 'btn', onclick: exportData }, '⬇️ Exporter'),
        h('button', { type: 'button', class: 'btn', onclick: () => fileInput.click() }, '⬆️ Importer'),
        fileInput)));
}
