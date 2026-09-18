import * as THREE from 'three';
import { COLORS_SCENE, BELT, CAP, SPEED } from '../config/config.js';
import { Motor } from './Motor.js';
import { createBeltTexture } from '../utils/beltTexture.js';

// =====================================================================
// ConveyorBelt
// Cinta angosta con estructura metálica (patas) y un motor en un extremo.
// Genérica: se usa tanto para la cinta principal como para las tres
// cintas secundarias, solo cambia longitud / posición / orientación.
// =====================================================================
export class ConveyorBelt {
  /**
   * @param {number} length  largo de la cinta
   * @param {number} legHeight altura de las patas hasta la superficie
   * @param {number} motorAtEnd si true, el motor va al extremo +x local; si false, al extremo -x
   * @param {boolean} showMotor si false, no se arma el conjunto motor+carcasa (para las
   *        cintas de color, donde ese "rodillo con carcasa" antes de cada recipiente
   *        estorbaba la vista — solo debe existir un motor visible: el de la cinta principal)
   */
  constructor({ length, legHeight = BELT.y, motorAtEnd = true, showMotor = true, color = COLORS_SCENE.belt }) {
    this.length = length;
    this.group = new THREE.Group();

    // --- superficie de la cinta ---
    // Textura de rayas diagonales sutiles, animada en update(): sin esto
    // la cinta era un color sólido y a velocidad baja no se notaba que
    // se estuviera moviendo si no se miraba el rodillo del motor.
    this.beltTexture = createBeltTexture();
    this.beltTexture.repeat.set(Math.max(1, Math.round(length / 0.45)), 1);
    const beltGeo = new THREE.BoxGeometry(length, BELT.thickness, BELT.width);
    const beltMat = new THREE.MeshStandardMaterial({ color, map: this.beltTexture, roughness: 0.85, metalness: 0.05 });
    const beltMesh = new THREE.Mesh(beltGeo, beltMat);
    beltMesh.position.y = legHeight;
    beltMesh.castShadow = true;
    beltMesh.receiveShadow = true;
    this.group.add(beltMesh);

    // Bordes elevados sutiles a cada lado (canalizan visualmente, sin ser rampas)
    const edgeGeo = new THREE.BoxGeometry(length, 0.06, 0.05);
    const edgeMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.beltEdge, metalness: 0.6, roughness: 0.4 });
    for (const side of [1, -1]) {
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.set(0, legHeight + BELT.thickness / 2 + 0.03, side * (BELT.width / 2));
      edge.castShadow = true;
      this.group.add(edge);
    }

    // --- estructura metálica (patas) ---
    const legGeo = new THREE.BoxGeometry(0.1, legHeight, 0.1);
    const legMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.frame, metalness: 0.7, roughness: 0.4 });
    const legOffsets = [
      [-length / 2 + 0.2, BELT.width / 2 - 0.05],
      [-length / 2 + 0.2, -BELT.width / 2 + 0.05],
      [length / 2 - 0.2, BELT.width / 2 - 0.05],
      [length / 2 - 0.2, -BELT.width / 2 + 0.05]
    ];
    for (const [x, z] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, legHeight / 2, z);
      leg.castShadow = true;
      this.group.add(leg);
    }

    // --- motor en un extremo (opcional) ---
    if (showMotor) {
      this.motor = new Motor({ radius: BELT.width / 2 - 0.05, length: BELT.width * 0.9 });
      this.motor.group.rotation.y = Math.PI / 2;
      const mx = motorAtEnd ? length / 2 + 0.1 : -length / 2 - 0.1;
      this.motor.group.position.set(mx, legHeight, 0);
      this.group.add(this.motor.group);
    } else {
      this.motor = null;
    }
  }

  update(dt) {
    if (this.motor) this.motor.update(dt);
    // Offset negativo = las rayas "avanzan" en el sentido +X, mismo
    // sentido en el que se mueven las tapitas. Escala arbitraria (0.6)
    // elegida a ojo para que el patrón se vea acompañando la velocidad
    // real sin quedar ni demasiado lento ni vertiginoso.
    this.beltTexture.offset.x -= CAP.speed * SPEED.multiplier * dt * 0.6;
  }
}
