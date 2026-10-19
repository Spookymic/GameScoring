import { h } from '../dom.js';
import { banner, hasExpansion, PLAYER_COLORS, playerTabs, stepper } from '../components.js';

const TARGETS = { 2: 40, 3: 35, 4: 30 };
const COLLECTIONS = {
  shell: [0, 0, 2, 4, 6, 8, 10],
  octopus: [0, 0, 3, 6, 9, 12],
  penguin: [0, 1, 3, 5],
  sailor: [0, 0, 5],
};

const CARDS = [
  { group: 'Duos (1 pt par paire)', items: [
    { key: 'crab', label: '🦀 Crabes', max: 9 },
    { key: 'boat', label: '⛵ Bateaux', max: 9 },
    { key: 'fish', label: '🐟 Poissons', max: 9 },
    { key: 'swimmer', label: '🏊 Nageurs', max: 9 },
    { key: 'shark', label: '🦈 Requins', max: 9 },
    { key: 'jellyfish', label: '🪼 Méduses', max: 3, salt: true },
    { key: 'lobster', label: '🦞 Homards', max: 3, salt: true },
    { key: 'starfish', label: '⭐ Étoiles de mer', max: 3, salt: true },
  ] },
  { group: 'Collections', items: [
    { key: 'shell', label: '🐚 Coquillages', max: 6 },
    { key: 'octopus', label: '🐙 Poulpes', max: 5 },
    { key: 'penguin', label: '🐧 Pingouins', max: 3 },
    { key: 'sailor', label: '⚓ Marins', max: 2 },
    { key: 'seahorse', label: '🐴 Hippocampe', max: 1, salt: true },
  ] },
  { group: 'Multiplicateurs', items: [
    { key: 'lighthouse', label: '🗼 Phare (×⛵)', max: 1 },
    { key: 'shoal', label: '🐠 Banc (×🐟)', max: 1 },
    { key: 'colony', label: '🐧 Colonie (×2 🐧)', max: 1 },
    { key: 'captain', label: '🧑‍✈️ Capitaine (×3 ⚓)', max: 1 },
    { key: 'castCrabs', label: '🦀 Bande de crabes (×🦀)', max: 1, salt: true },
  ] },
  { group: 'Sirènes et couleurs', items: [
    { key: 'mermaid', label: '🧜 Sirènes', max: 4 },
    { key: 'mermaidPoints', label: 'Points des sirènes', max: 40, hint: '1re sirène : couleur la plus nombreuse, 2e : la suivante…' },
    { key: 'bonus', label: '🎨 Bonus couleur', max: 20, hint: 'Cartes de sa couleur la plus nombreuse (Dernière chance)' },
  ] },
];

// Événements de l'extension Extra Pepper (un par manche).
const EVENTS = [
  { key: '', label: 'Aucun événement' },
  { key: 'hermit', label: 'Bernard-l’ermite : paire de crabes = 1 carte de chaque défausse' },
  { key: 'sunfish', label: 'Poisson-lune : paire de poissons = 2 cartes de la pioche' },
  { key: 'rodeo', label: 'Rodéo aquatique : nouvelles paires nageurs / requins' },
  { key: 'shells', label: 'Danse des coquillages : 2 pts par coquillage' },
  { key: 'kraken', label: 'Kraken : 1 pt par poulpe' },
  { key: 'tornado', label: 'Tornade : les sirènes valent 0' },
  { key: 'mermaids', label: 'Danse des sirènes : 3 sirènes gagnent' },
  { key: 'chest', label: 'Coffre au trésor : 10 pts pour finir la manche' },
  { key: 'diodon', label: 'Poisson-globe : pas de STOP, seulement Dernière chance' },
  { key: 'angelfish', label: 'Poisson-ange : défausses de même couleur' },
  { key: 'dolphins', label: 'Dauphins : défausser une collection fait piocher' },
  { key: 'reef', label: 'Récif de corail : coquillage face cachée = immunité' },
];

const MODES = [
  { key: 'stop', label: 'STOP' },
  { key: 'last', label: 'Dernière chance' },
  { key: 'empty', label: 'Pioche vide' },
];

function collectionValue(key, count, event) {
  if (key === 'shell' && event === 'shells') return 2 * count;
  if (key === 'octopus' && event === 'kraken') return count;
  const table = COLLECTIONS[key];
  return table[Math.min(count, table.length - 1)];
}

export function cardPoints(hand, salt, event) {
  const n = (k) => hand[k] ?? 0;
  // Un homard s'associe à un crabe : c'est toujours plus rentable qu'une paire de crabes.
  const lobsterPairs = salt ? Math.min(n('lobster'), n('crab')) : 0;
  const pairs = lobsterPairs
    + Math.floor((n('crab') - lobsterPairs) / 2)
    + Math.floor(n('boat') / 2)
    + Math.floor(n('fish') / 2)
    + Math.min(n('swimmer'), n('shark') + (salt ? n('jellyfish') : 0));
  const duos = pairs + (salt ? 2 * Math.min(n('starfish'), pairs) : 0);

  let collections = Object.keys(COLLECTIONS).reduce((acc, k) => acc + collectionValue(k, n(k), event), 0);
  if (salt && n('seahorse')) {
    // L'hippocampe remplace une carte manquante d'une collection déjà entamée, sans dépasser son maximum.
    const gains = Object.keys(COLLECTIONS)
      .filter((k) => n(k) >= 1 && (n(k) < COLLECTIONS[k].length - 1 || (k === 'shell' && event === 'shells') || (k === 'octopus' && event === 'kraken')))
      .map((k) => collectionValue(k, n(k) + 1, event) - collectionValue(k, n(k), event));
    collections += Math.max(0, ...gains);
  }

  const multipliers = n('lighthouse') * n('boat') + n('shoal') * n('fish') + n('colony') * 2 * n('penguin')
    + n('captain') * 3 * n('sailor') + (salt ? n('castCrabs') * n('crab') : 0);
  const mermaids = event === 'tornado' ? 0 : n('mermaidPoints');
  return { duos, collections, multipliers, mermaids, total: duos + collections + multipliers + mermaids };
}

function roundScores(round, salt) {
  const pts = round.hands.map((hand) => cardPoints(hand, salt, round.event).total);
  const bonus = round.hands.map((hand) => hand.bonus ?? 0);
  if (round.mode === 'empty') return pts.map(() => 0);
  if (round.mode === 'stop') return pts;
  const c = round.caller;
  // Pari gagné si personne n'a strictement plus de points que l'annonceur.
  const won = pts.every((p, i) => i === c || p <= pts[c]);
  return pts.map((p, i) => {
    if (i === c) return won ? p + bonus[i] : bonus[i];
    return won ? bonus[i] : p;
  });
}

const totals = (data, n) => Array.from({ length: n }, (_, i) => data.rounds.reduce((acc, r) => acc + r.scores[i], 0));
const newDraft = (players) => ({ mode: 'stop', caller: 0, event: '', hands: players.map(() => ({})) });

export default {
  id: 'seasalt',
  name: 'Sea Salt & Paper',
  icon: '⛵',
  color: '#0ea5e9',
  tagline: 'Paires, collections et sirènes',
  minPlayers: 2,
  maxPlayers: 4,
  expansions: [
    { key: 'extrasalt', name: 'Extra Salt', description: 'Méduses, homards, étoiles de mer, hippocampe, bande de crabes' },
    { key: 'extrapepper', name: 'Extra Pepper', description: 'Un événement par manche' },
  ],

  init: (players) => ({ rounds: [], draft: newDraft(players), instantWinner: null }),

  render(root, ctx) {
    const { players, data, options } = ctx;
    const salt = hasExpansion(options, 'extrasalt');
    const pepper = hasExpansion(options, 'extrapepper');
    const target = TARGETS[players.length];
    const header = h('div', { class: 'stack' });
    const endSection = h('div', { class: 'stack' });
    const history = h('div', { class: 'stack' });
    let d = data.draft;

    const handTotal = (i) => cardPoints(d.hands[i], salt, d.event).total;
    const tabs = playerTabs(players, {
      label: (i) => [h('span', null, players[i]), h('strong', null, handTotal(i))],
      renderPanel,
    });

    function changed() {
      ctx.save();
      tabs.refresh();
      drawEnd();
    }

    function renderPanel(i) {
      const hand = d.hands[i];
      const breakdown = h('p', { class: 'turn-preview' });
      const refreshBreakdown = () => {
        const s = cardPoints(hand, salt, d.event);
        breakdown.replaceChildren(`Duos ${s.duos} + Coll. ${s.collections} + Mult. ${s.multipliers} + 🧜 ${s.mermaids} = `, h('strong', null, s.total));
      };
      refreshBreakdown();
      return h('div', { class: 'stack' },
        CARDS.map((g) => h('section', { class: 'stack' },
          h('h3', { class: 'section-title' }, g.group),
          h('div', { class: 'calc-grid' }, g.items.filter((it) => salt || !it.salt).map((it) => h('div', { class: 'calc-item' },
            h('span', { class: 'counter-label' }, it.label, it.hint && h('small', null, it.hint)),
            stepper(hand[it.key] ?? 0, (v) => { hand[it.key] = v; refreshBreakdown(); changed(); }, { min: 0, max: it.max, label: it.label })))))),
        breakdown);
    }

    function drawHeader() {
      const scores = totals(data, players.length);
      const ended = data.rounds.length > 0 && scores.some((s) => s >= target);
      header.replaceChildren(...[
        ended && banner(`Un joueur a atteint ${target} points : fin de partie.`,
          h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.finish() }, 'Terminer')),
        h('div', { class: 'tabs' }, players.map((p, i) => h('div', { class: 'tab' }, h('span', null, p), h('strong', null, scores[i])))),
        h('p', { class: 'muted small center' }, `Objectif : ${target} points · Manche ${data.rounds.length + 1}`),
        pepper && h('label', { class: 'stack small' }, 'Événement de la manche',
          h('select', { class: 'text', onchange: (e) => { d.event = e.target.value; ctx.save(); tabs.refresh(); tabs.rerender(); drawEnd(); } },
            EVENTS.map((ev) => h('option', { value: ev.key, selected: ev.key === d.event }, ev.label)))),
      ].filter(Boolean));
    }

    function drawEnd() {
      const scores = roundScores({ ...d, scores: null }, salt);
      const mermaidWin = d.event === 'mermaids' ? 3 : 4;
      const instant = players.findIndex((_, i) => (d.hands[i].mermaid ?? 0) >= mermaidWin);
      endSection.replaceChildren(...[
        instant >= 0 && banner(`🧜 ${players[instant]} a ${mermaidWin} sirènes : victoire immédiate !`,
          h('button', { type: 'button', class: 'btn small primary', onclick: () => { data.instantWinner = instant; ctx.save(); ctx.finish(); } }, 'Terminer')),
        h('h3', { class: 'section-title' }, 'Fin de manche'),
        h('div', { class: 'segmented' }, MODES.map((m) => h('label', null,
          h('input', { type: 'radio', name: 'ssp-mode', checked: d.mode === m.key, onchange: () => { d.mode = m.key; ctx.save(); drawEnd(); } }),
          h('span', null, m.label)))),
        d.mode !== 'empty' && h('div', { class: 'stack' },
          h('span', { class: 'small muted' }, d.mode === 'last' ? 'Qui a annoncé « Dernière chance » ?' : 'Qui a dit « STOP » ?'),
          h('div', { class: 'chips' }, players.map((p, i) => h('button', {
            type: 'button',
            class: `chip${d.caller === i ? ' on' : ''}`,
            onclick: () => { d.caller = i; ctx.save(); drawEnd(); },
          }, p)))),
        h('p', { class: 'small muted' }, {
          stop: 'STOP : chacun marque les points de ses cartes, sans bonus couleur.',
          last: 'Dernière chance : si l’annonceur a le plus de points (égalité comprise), il marque ses cartes + son bonus couleur et les autres leur bonus couleur seulement. Sinon il ne marque que son bonus couleur et les autres marquent leurs cartes.',
          empty: 'Pioche vide : la manche s’arrête sans décompte.',
        }[d.mode]),
        h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, players.map((p, i) => h('th', { style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
          h('tbody', null, h('tr', null, scores.map((s) => h('td', { class: 'total' }, `+${s}`)))))),
        h('button', { type: 'button', class: 'btn primary block', onclick: validate }, 'Valider la manche'),
      ].filter(Boolean));
    }

    function validate() {
      if (!confirm('Valider la manche ?')) return;
      data.rounds.push({ ...d, scores: roundScores(d, salt) });
      data.draft = newDraft(players);
      d = data.draft;
      ctx.save();
      drawAll();
    }

    function drawHistory() {
      if (!data.rounds.length) return history.replaceChildren();
      const modeLabel = { stop: 'Stop', last: 'Dern. ch.', empty: 'Pioche vide' };
      history.replaceChildren(
        h('h3', { class: 'section-title' }, 'Manches jouées'),
        h('div', { class: 'grid-wrap' }, h('table', { class: 'grid' },
          h('thead', null, h('tr', null, h('th', null), players.map((p, i) => h('th', { style: `--accent:${PLAYER_COLORS[i % PLAYER_COLORS.length]}` }, p)))),
          h('tbody', null, data.rounds.map((r, k) => h('tr', null,
            h('th', { scope: 'row' }, `M${k + 1}`, h('small', null, `${modeLabel[r.mode]}${r.mode !== 'empty' ? ` · ${players[r.caller]}` : ''}`)),
            r.scores.map((s) => h('td', { class: 'total' }, s))))),
          h('tfoot', null, h('tr', null, h('th', null, 'Total'), totals(data, players.length).map((t) => h('td', { class: 'total' }, t)))))),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          if (!confirm('Annuler la dernière manche ?')) return;
          data.rounds.pop();
          ctx.save();
          drawAll();
        } }, '↶ Annuler la dernière manche'));
    }

    function drawAll() {
      drawHeader();
      tabs.refresh();
      tabs.rerender();
      drawEnd();
      drawHistory();
    }

    drawAll();
    root.append(header, h('h3', { class: 'section-title' }, 'Cartes de chaque joueur'), tabs.el, endSection, history);
  },

  results({ data, players }) {
    const scores = totals(data, players.length);
    if (data.instantWinner != null) return { scores, winners: [data.instantWinner], details: players.map((_, i) => (i === data.instantWinner ? '🧜 victoire immédiate' : '')) };
    const best = Math.max(...scores);
    const tied = scores.flatMap((s, i) => (s === best ? [i] : []));
    // Égalité : le joueur qui a terminé la dernière manche l'emporte.
    const lastCaller = data.rounds.findLast((r) => r.mode !== 'empty')?.caller;
    return { scores, winners: tied.length > 1 && tied.includes(lastCaller) ? [lastCaller] : tied };
  },
};
