import * as THREE from 'three';
import { TUNNEL, BELT, COLORS_SCENE } from '../config/config.js';

// =====================================================================
// MiniTunnel
// Canal de separación: paredes que convergen desde una boca ancha hasta
// el ancho exacto de la cinta, forzando a las tapitas a alinearse en
// una sola fila antes de llegar al sensor / zona de clasificación.
// Es puramente estructural en esta etapa (guía visual); la lógica de
// "una tapita a la vez" la impone el sistema de spawn (systems/CapSystem).
// =====================================================================
export class MiniTunnel {
  constructor() {
    this.group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({
      color: COLORS_SCENE.frame, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide
    });

    const len = TUNNEL.endX - TUNNEL.startX;
    const yBase = BELT.y;

    for (const side of [1, -1]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, side * TUNNEL.entryHalfWidth);
      shape.lineTo(len, side * TUNNEL.exitHalfWidth);
      shape.lineTo(len, side * TUNNEL.exitHalfWidth + side * 0.05);
      shape.lineTo(0, side * TUNNEL.entryHalfWidth + side * 0.05);
      shape.lineTo(0, side * TUNNEL.entryHalfWidth);

      const geo = new THREE.ExtrudeGeometry(shape, { depth: TUNNEL.wallHeight, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2); // lo acostamos: extrusión pasa a ser la altura (Y)
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(TUNNEL.startX, yBase, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
    }

    // Poste guía central de entrada (referencia visual del embudo)
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, TUNNEL.wallHeight, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.frameDark, metalness: 0.6 });
    for (const side of [1, -1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(TUNNEL.startX, yBase + TUNNEL.wallHeight / 2, side * TUNNEL.entryHalfWidth);
      post.castShadow = true;
      this.group.add(post);
    }
  }
}
