import * as THREE from 'three';

// =====================================================================
// floorTexture.js
// El piso era un plano liso con solo el GridHelper encima. Esto genera
// (una sola vez, con <canvas>) una textura tipo chapa/piso industrial
// muy sutil — puntos y una leve viñeta — para dar algo de textura real
// sin competir visualmente con la máquina ni con el grid existente.
// =====================================================================
export function createFloorTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#14171c';
  ctx.fillRect(0, 0, size, size);

  // Puntos en trama regular (relieve tipo chapa antideslizante), muy tenues.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  const step = 16;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const offset = (y / step) % 2 === 0 ? 0 : step / 2;
      ctx.beginPath();
      ctx.arc(x + offset, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24); // piso de 60x60: una trama chica repetida muchas veces
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
