import { CONTAINER, CAP } from '../config/config.js';

// =====================================================================
// stacking.js
// Calcula una posición local (dentro del grupo del recipiente) para la
// tapita número `index` (0-based) que cae en un recipiente, distribuida
// en espiral dorada por capa para que no queden todas apiladas en el
// mismo punto exacto ni se superpongan de forma evidente.
// =====================================================================
const GOLDEN_ANGLE = 2.399963; // ~137.5° en radianes

// Cuántas tapitas caben razonablemente por capa dentro del radio útil.
// Se usa una huella algo menor al diámetro real: en un montón real las
// tapitas se tocan y se superponen parcialmente entre sí, no quedan
// perfectamente separadas como en la cinta.
const CAP_FOOTPRINT = Math.PI * (CAP.radius * 0.72) ** 2;
const LAYER_AREA = Math.PI * CONTAINER.innerRadius ** 2;
const LAYER_CAPACITY = Math.max(1, Math.floor(LAYER_AREA / CAP_FOOTPRINT));

export function computeStackOffset(index) {
  const layer = Math.floor(index / LAYER_CAPACITY);
  const withinLayer = index % LAYER_CAPACITY;
  const angle = index * GOLDEN_ANGLE;
  const r = CONTAINER.innerRadius * 0.82 * Math.sqrt((withinLayer + 0.5) / LAYER_CAPACITY);

  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
    y: CONTAINER.baseY + layer * CONTAINER.layerHeight,
    rotY: angle
  };
}
