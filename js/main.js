import { SceneManager } from './core/SceneManager.js';
import { Machine } from './machine/Machine.js';
import { CapSystem } from './systems/CapSystem.js';
import { CAP_TYPES } from './config/config.js';

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

// --- Iniciar / Pausar / Reiniciar ---
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

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

function setPaused(value) {
  paused = value;
  pauseBtn.classList.toggle('is-active', paused);
  startBtn.classList.toggle('is-active', !paused);
}
setPaused(false);

startBtn.addEventListener('click', () => setPaused(false));
pauseBtn.addEventListener('click', () => setPaused(true));
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

const laneLabel = {};
for (const def of Object.values(CAP_TYPES)) laneLabel[def.lane] = def.label;
document.getElementById('label-left').textContent = laneLabel.left ?? 'Izquierda';
document.getElementById('label-center').textContent = laneLabel.center ?? 'Centro';
document.getElementById('label-right').textContent = laneLabel.right ?? 'Derecha';

const queueLengthEl = document.getElementById('queue-length');

function updateHUD() {
  hudCounts.left.textContent = machine.bins.left.count;
  hudCounts.center.textContent = machine.bins.center.count;
  hudCounts.right.textContent = machine.bins.right.count;
  queueLengthEl.textContent = capSystem.getQueueLength();
}

// --- Cola de entrada manual: botones "+ Roja / + Verde / + Azul" ---
document.querySelectorAll('[data-add-color]').forEach(btn => {
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
