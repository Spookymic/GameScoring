// Boîte à outils de partie : lancer de dés, tirage du premier joueur, minuteur.
import { h } from './dom.js';
import { stepper } from './components.js';

const SIDES = [4, 6, 8, 10, 12, 20];
const TIMER_PRESETS = [30, 60, 120, 300];
const roll = (sides) => 1 + Math.floor(Math.random() * sides);
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

// Bip court et vibration à la fin du minuteur (quand l'appareil le permet).
function alarm() {
  try { navigator.vibrate?.([300, 120, 300, 120, 300]); } catch { /* non supporté */ }
  try {
    const audio = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, audio.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.3);
      osc.connect(gain).connect(audio.destination);
      osc.start(audio.currentTime + t);
      osc.stop(audio.currentTime + t + 0.3);
    });
  } catch { /* audio indisponible */ }
}

function diceTool(preset) {
  const state = { count: preset?.count ?? 2, sides: preset?.sides ?? 6, values: [] };
  const out = h('div', { class: 'dice-out' });
  const total = h('p', { class: 'turn-preview' });
  const sidesBox = h('div', { class: 'chips' });

  const face = (v, k) => {
    const color = preset?.colors?.[k];
    const text = preset?.labels?.[v] ?? v;
    return h('span', { class: 'die', style: color ? `background:${color};color:${color === '#ffffff' ? '#111' : '#fff'}` : null }, text);
  };
  const draw = () => {
    out.replaceChildren(...state.values.map(face));
    const numeric = preset?.numeric !== false;
    total.textContent = state.values.length && numeric ? `Total : ${state.values.reduce((a, b) => a + b, 0)}` : '';
    sidesBox.replaceChildren(...SIDES.map((n) => h('button', {
      type: 'button',
      class: `chip${state.sides === n ? ' on' : ''}`,
      disabled: Boolean(preset),
      onclick: () => { state.sides = n; state.values = []; draw(); },
    }, `d${n}`)));
  };
  draw();
  return h('section', { class: 'stack' },
    h('div', { class: 'counter-line' }, h('span', null, 'Nombre de dés'),
      stepper(state.count, (v) => { state.count = v; }, { min: 1, max: 12, label: 'Dés' })),
    !preset && sidesBox,
    preset && h('p', { class: 'muted small' }, 'Dés de ce jeu.'),
    h('button', { type: 'button', class: 'btn primary block', onclick: () => {
      state.values = Array.from({ length: state.count }, () => roll(state.sides));
      out.classList.remove('rolled');
      void out.offsetWidth; // relance l'animation
      out.classList.add('rolled');
      draw();
    } }, '🎲 Lancer'),
    out,
    total);
}

function firstPlayerTool(players) {
  const out = h('p', { class: 'first-player' });
  return h('section', { class: 'stack' },
    h('button', { type: 'button', class: 'btn primary block', onclick: () => {
      // Petit défilement des noms avant le résultat.
      let k = 0;
      const steps = 12 + Math.floor(Math.random() * players.length);
      const tick = () => {
        out.textContent = players[k % players.length];
        k++;
        if (k < steps) setTimeout(tick, 40 + k * 8);
        else out.textContent = `👉 ${players[Math.floor(Math.random() * players.length)]}`;
      };
      tick();
    } }, '🎯 Tirer au sort le premier joueur'),
    out);
}

function timerTool() {
  let duration = 60;
  let left = duration;
  let timer = null;
  const display = h('p', { class: 'timer-display' }, fmt(left));
  const startBtn = h('button', { type: 'button', class: 'btn primary', onclick: () => (timer ? pause() : start()) }, 'Démarrer');
  const presets = h('div', { class: 'chips' });

  const render = () => {
    display.textContent = fmt(left);
    display.classList.toggle('done', left === 0);
    startBtn.textContent = timer ? 'Pause' : left === 0 ? 'Recommencer' : 'Démarrer';
    presets.replaceChildren(...TIMER_PRESETS.map((s) => h('button', {
      type: 'button',
      class: `chip${duration === s ? ' on' : ''}`,
      onclick: () => { pause(); duration = s; left = s; render(); },
    }, s < 60 ? `${s} s` : `${s / 60} min`)));
  };
  function start() {
    if (left === 0) left = duration;
    const end = Date.now() + left * 1000;
    timer = setInterval(() => {
      left = Math.max(0, Math.round((end - Date.now()) / 1000));
      if (left === 0) { pause(); alarm(); }
      render();
    }, 250);
    render();
  }
  function pause() {
    clearInterval(timer);
    timer = null;
    render();
  }
  render();
  const el = h('section', { class: 'stack' }, presets, display,
    h('div', { class: 'button-row' }, startBtn,
      h('button', { type: 'button', class: 'btn', onclick: () => { pause(); left = duration; render(); } }, 'Réinitialiser')));
  return { el, stop: pause };
}

// Ouvre la boîte à outils dans une fenêtre par-dessus la partie.
export function openTools({ players, game }) {
  const timer = timerTool();
  const panels = {
    dice: diceTool(game.dice),
    first: firstPlayerTool(players),
    timer: timer.el,
  };
  const body = h('div');
  const tabs = h('div', { class: 'segmented' });
  let current = 'dice';
  const select = (key) => {
    current = key;
    body.replaceChildren(panels[key]);
    tabs.replaceChildren(...[['dice', '🎲 Dés'], ['first', '🎯 1er joueur'], ['timer', '⏱️ Minuteur']].map(([k, label]) => h('label', null,
      h('input', { type: 'radio', name: 'tool', checked: current === k, onchange: () => select(k) }),
      h('span', null, label))));
  };
  select('dice');
  const dialog = h('dialog', { class: 'tools' },
    h('div', { class: 'tools-head' }, h('strong', null, '🧰 Outils'),
      h('button', { type: 'button', class: 'icon-btn small', 'aria-label': 'Fermer', onclick: () => dialog.close() }, '✕')),
    tabs, body);
  dialog.addEventListener('close', () => { timer.stop(); dialog.remove(); });
  document.body.append(dialog);
  dialog.showModal();
}
