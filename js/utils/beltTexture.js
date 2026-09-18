import * as THREE from 'three';

// =====================================================================
// beltTexture.js
// Antes la cinta era un color sólido sin ningún patrón: a velocidad baja,
// sin mirar el rodillo del motor, costaba notar que se estaba moviendo.
// Esto genera UNA vez (con <canvas>) una textura de rayas diagonales
// sutiles y la cachea; cada ConveyorBelt pide su propio clon (comparte
// la imagen, pero cada cinta necesita su propio "repeat" según el largo
// y su propio "offset" para animarse a su propia velocidad).
// =====================================================================
let baseTexture = null;

function buildBaseTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 5;
  for (let x = -size; x < size * 2; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Clon independiente de la textura base, listo para asignarle su propio repeat/offset. */
export function createBeltTexture() {
  if (!baseTexture) baseTexture = buildBaseTexture();
  const clone = baseTexture.clone();
  clone.needsUpdate = true; // cada clon necesita su propia subida a GPU
  return clone;
}
