import * as THREE from 'three';

// =====================================================================
// Bin
// Recipiente de destino. Recibe un color (hex) para pintar una franja
// identificadora y lleva su propio contador de tapitas recibidas, útil
// para el HUD y para futuras métricas (marketplace / analytics).
//
// Las tapitas NO se guardan físicamente: apilarlas para siempre iba a
// terminar asomando por encima del borde del recipiente en cualquier
// sesión larga con alimentación automática. Cada tapita cae centrada
// (con una pequeña variación al azar, ver CapSystem._beginFalling) y al
// tocar el fondo se descuenta de la escena — lo que queda es el conteo
// y un pulso de luz en la franja del recipiente, como confirmación.
// =====================================================================
export class Bin {
  constructor(hexColor, label) {
    this.label = label;
    this.count = 0;
    this.group = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.3, roughness: 0.6 });
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.4, 0.9, 24, 1, true);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = 0.45;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    const baseGeo = new THREE.CylinderGeometry(0.4, 0.42, 0.06, 24);
    const base = new THREE.Mesh(baseGeo, wallMat);
    base.position.y = 0.03;
    this.group.add(base);

    const BASE_GLOW = 0.25;
    this._baseGlow = BASE_GLOW;
    this._glow = BASE_GLOW;
    const stripeGeo = new THREE.CylinderGeometry(0.565, 0.565, 0.14, 24, 1, true);
    this.stripeMat = new THREE.MeshStandardMaterial({
      color: hexColor, emissive: hexColor, emissiveIntensity: BASE_GLOW, side: THREE.DoubleSide
    });
    const stripe = new THREE.Mesh(stripeGeo, this.stripeMat);
    stripe.position.y = 0.75;
    this.group.add(stripe);
  }

  /** Pulso breve de luz en la franja: confirma que acaba de entrar una tapita. */
  flash() {
    this._glow = 1.15;
  }

  update(dt) {
    this._glow = Math.max(this._baseGlow, this._glow - dt * 1.8);
    this.stripeMat.emissiveIntensity = this._glow;
  }

  /**
   * Recibe una tapita que acaba de caer: suma al contador, dispara el
   * pulso de luz y la saca de la escena. La geometría/material de la
   * tapita son compartidos entre todas (ver entities/Cap.js), así que
   * cap.dispose() no libera nada global — solo desengancha la malla.
   */
  receive(cap) {
    this.count++;
    this.flash();
    if (cap.mesh.parent) cap.mesh.parent.remove(cap.mesh);
    cap.dispose();
  }

  /** Vacía el recipiente (usado por "Reiniciar"): solo resetea contador y brillo. */
  reset() {
    this.count = 0;
    this._glow = this._baseGlow;
    this.stripeMat.emissiveIntensity = this._baseGlow;
  }
}
