import * as THREE from 'three';
import { COLORS_SCENE, CAP, SPEED } from '../config/config.js';

// =====================================================================
// Motor
// Representa el motorreductor que impulsa una cinta (rodillo + carcasa).
// Se anima rotando el rodillo; independiente de la lógica de tapitas.
// =====================================================================
export class Motor {
  constructor({ radius = 0.16, length = 0.9 } = {}) {
    this.group = new THREE.Group();
    this.radius = radius;

    const rollerGeo = new THREE.CylinderGeometry(radius, radius, length, 20);
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.8, roughness: 0.35 });
    this.roller = new THREE.Mesh(rollerGeo, rollerMat);
    this.roller.rotation.z = Math.PI / 2;
    this.roller.castShadow = true;
    this.group.add(this.roller);

    const bodyGeo = new THREE.CylinderGeometry(radius * 1.3, radius * 1.3, 0.5, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.servoBody, metalness: 0.5, roughness: 0.5 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.rotation.z = Math.PI / 2;
    this.body.position.x = length / 2 + 0.28;
    this.body.castShadow = true;
    this.group.add(this.body);

    // velocidad angular real: v_lineal = ω * radio  =>  ω = v_lineal / radio
    this.speed = CAP.speed / radius;
  }

  update(dt) {
    this.roller.rotation.x += this.speed * SPEED.multiplier * dt;
  }
}
