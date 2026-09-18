import { SceneManager } from './core/SceneManager.js';
import { Machine } from './machine/Machine.js';
import { CapSystem } from './systems/CapSystem.js';
import { CAP_TYPES, SPEED } from './config/config.js';

// =====================================================================
// main.js
// Bootstrap de la aplicación. No contiene lógica de dominio: conecta
// las tres capas (escena, máquina física, sistema de tapitas) y el HUD
// (contadores por recipiente, color detectado, cola de entrada manual).
// El loop de render vive en SceneManager (renderer.setAnimationLoop,
// que internamente usa requestAnimationFrame); acá solo se registran
// los callbacks que deben correr en cada frame.
// =====================================================================

const canvas = document.getElementById('scene-canvas');
const sceneManager = new SceneManager(canvas);
const machine = new Machine(sceneManager.scene);
const capSystem = new CapSystem(sceneManager.scene, machine.sortingZone, machine.bins);

// --- Color detectado por el sensor -> HUD ---
const detectedEl = document.getElementById('detected-color');
let detectedResetTimer = null;
capSystem.onColorDetected = (typeKey, label) => {
  const def = CAP_TYPES[typeKey];
  detectedEl.textContent = `COLOR DETECTADO: ${label.toUpperCase()}`;
  detectedEl.style.color = `#${def.hex.toString(16).padStart(6, '0')}`;
  detectedEl.classList.add('pulse');
  clearTimeout(detectedResetTimer);
  detectedResetTimer = setTimeout(() => detectedEl.classList.remove('pulse'), 350);
};

// --- Iniciar/Pausar (un solo botón, con versión chica siempre visible) / Reiniciar ---
// El render loop (SceneManager) corre siempre, para que la cámara orbital
// funcione incluso en pausa; lo que se congela es la simulación en sí
// (cintas, tapitas, sensor, barras).
let paused = false;

sceneManager.onUpdate((dt) => {
  if (!paused) {
    machine.update(dt);
    capSystem.update(dt);
  }
  updateHUD();
});

sceneManager.start();

const playPauseBtn = document.getElementById('playpause-btn');
const playPauseMiniBtn = document.getElementById('playpause-mini');
const resetBtn = document.getElementById('reset-btn');

function setPaused(value) {
  paused = value;
  const label = paused ? '▶ Iniciar' : '⏸ Pausar';
  playPauseBtn.textContent = label;
  playPauseBtn.classList.toggle('is-active', !paused);
  playPauseMiniBtn.classList.toggle('is-playing', !paused);
  playPauseMiniBtn.setAttribute('aria-label', paused ? 'Iniciar' : 'Pausar');
}
setPaused(false);

function togglePaused() {
  setPaused(!paused);
}
playPauseBtn.addEventListener('click', togglePaused);
playPauseMiniBtn.addEventListener('click', togglePaused);

resetBtn.addEventListener('click', () => {
  capSystem.resetAll();
  machine.resetBins();
  detectedEl.textContent = 'COLOR DETECTADO: —';
  detectedEl.style.color = '';
  setPaused(false);
});

// --- HUD: contadores por recipiente ---
const hudCounts = {
  left: document.getElementById('count-left'),
  center: document.getElementById('count-center'),
  right: document.getElementById('count-right')
};
const countTotalEl = document.getElementById('count-total');

const laneLabel = {};
const laneHex = {};
for (const def of Object.values(CAP_TYPES)) {
  laneLabel[def.lane] = def.label;
  laneHex[def.lane] = def.hex;
}
document.getElementById('label-left').textContent = laneLabel.left ?? 'Izquierda';
document.getElementById('label-center').textContent = laneLabel.center ?? 'Centro';
document.getElementById('label-right').textContent = laneLabel.right ?? 'Derecha';

const hexToCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
document.getElementById('dot-left').style.background = hexToCss(laneHex.left ?? 0x888888);
document.getElementById('dot-center').style.background = hexToCss(laneHex.center ?? 0x888888);
document.getElementById('dot-right').style.background = hexToCss(laneHex.right ?? 0x888888);

const queueLengthEl = document.getElementById('queue-length');
const queueMaxEl = document.getElementById('queue-max');
const addColorBtns = document.querySelectorAll('[data-add-color]');

function updateHUD() {
  const l = machine.bins.left.count;
  const c = machine.bins.center.count;
  const r = machine.bins.right.count;
  hudCounts.left.textContent = l;
  hudCounts.center.textContent = c;
  hudCounts.right.textContent = r;
  countTotalEl.textContent = l + c + r;

  const { count, max } = capSystem.getQueueCapacity();
  queueLengthEl.textContent = count;
  queueMaxEl.textContent = max;
  // Los botones manuales solo se deshabilitan en el tope TOTAL (8): a
  // diferencia de la automática, con ellos siempre se puede llegar
  // hasta ahí, esté o no prendido el modo automático.
  const full = count >= max;
  addColorBtns.forEach(btn => btn.disabled = full);
  sequenceBtn.disabled = full;
}

// --- Cola de entrada manual: botones "+ Roja / + Verde / + Azul" ---
addColorBtns.forEach(btn => {
  btn.addEventListener('click', () => capSystem.enqueue(btn.dataset.addColor));
});

// --- Secuencia rápida, ej: "rojo,verde,azul,rojo" ---
const sequenceInput = document.getElementById('sequence-input');
const sequenceBtn = document.getElementById('sequence-add');
const COLOR_ALIASES = { rojo: 'red', roja: 'red', red: 'red', r: 'red',
  verde: 'green', green: 'green', v: 'green',
  azul: 'blue', blue: 'blue', a: 'blue' };

sequenceBtn.addEventListener('click', () => {
  const tokens = sequenceInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  for (const t of tokens) {
    const key = COLOR_ALIASES[t];
    if (key) capSystem.enqueue(key);
  }
  sequenceInput.value = '';
});

// --- Alimentación automática on/off ---
const autoToggle = document.getElementById('auto-toggle');
autoToggle.addEventListener('change', () => capSystem.setAutoSpawn(autoToggle.checked));

// --- Panel principal: colapsar/expandir (hamburguesa, para celular) ---
// En desktop el panel siempre está abierto. En pantallas chicas arranca
// cerrado (solo título + botón) y el botón lo expande/contrae.
const hudPanel = document.getElementById('hud-panel');
const hudToggleBtn = document.getElementById('hud-toggle');
const hudBody = document.getElementById('hud-body');
const MOBILE_BREAKPOINT = 480;

function setHudCollapsed(collapsed) {
  hudPanel.classList.toggle('is-collapsed', collapsed);
  hudToggleBtn.setAttribute('aria-expanded', String(!collapsed));
}

// isMobile se recalcula en cada resize; solo forzamos el estado del
// panel cuando el ancho CRUZA el punto de quiebre (pasa de chica a
// grande o de grande a chica), no en cada pixel de resize. Así, en
// pantalla grande el panel siempre queda desplegado — antes, si se
// achicaba la ventana y se volvía a agrandar, se quedaba colapsado
// para siempre porque el estado inicial solo se fijaba una vez al
// cargar la página.
let isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
setHudCollapsed(isMobile);

window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (nowMobile === isMobile) return; // sigue del mismo lado del quiebre: no tocar nada
  isMobile = nowMobile;
  setHudCollapsed(isMobile);
});

hudToggleBtn.addEventListener('click', () => {
  setHudCollapsed(!hudPanel.classList.contains('is-collapsed'));
});
// --- Secciones plegables genéricas (Velocidad, Cola de entrada) -------
function setupCollapsible(headerId, bodyId, { startOpen = true } = {}) {
  const header = document.getElementById(headerId);
  const body = document.getElementById(bodyId);
  let open = startOpen;
  const apply = () => {
    header.classList.toggle('is-closed', !open);
    body.classList.toggle('is-closed', !open);
    header.setAttribute('aria-expanded', String(open));
  };
  apply();
  header.addEventListener('click', () => {
    open = !open;
    apply();
  });
}
setupCollapsible('speed-toggle', 'speed-body');
setupCollapsible('feed-toggle', 'feed-body');

// --- Control de velocidad -------------------------------------------
const speedSlider = document.getElementById('speed-slider');
const speedValueEl = document.getElementById('speed-value');
speedSlider.min = SPEED.min;
speedSlider.max = SPEED.max;
speedSlider.value = SPEED.multiplier;
speedValueEl.textContent = `${SPEED.multiplier.toFixed(1)}×`;

speedSlider.addEventListener('input', () => {
  SPEED.multiplier = parseFloat(speedSlider.value);
  speedValueEl.textContent = `${SPEED.multiplier.toFixed(1)}×`;
});
