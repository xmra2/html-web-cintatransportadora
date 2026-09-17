import * as THREE from 'three';

// =====================================================================
// Bin
// Recipiente de destino. Recibe un color (hex) para pintar una franja
// identificadora y lleva su propio contador de tapitas recibidas, útil
// para el HUD y para futuras métricas (marketplace / analytics).
// =====================================================================
export class Bin {
  constructor(hexColor, label) {
    this.label = label;
    this.count = 0;
    this.storedCaps = []; // referencias a las tapitas ya depositadas (persisten)
    this._nextSlot = 0;   // índice monotónico para reservar lugar antes de caer
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

    const stripeGeo = new THREE.CylinderGeometry(0.565, 0.565, 0.14, 24, 1, true);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: hexColor, emissive: hexColor, emissiveIntensity: 0.25, side: THREE.DoubleSide
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.75;
    this.group.add(stripe);
  }

  /** Reserva un índice de apilado (llamar al iniciar la caída, no al depositar). */
  reserveSlot() {
    return this._nextSlot++;
  }

  /**
   * Deposita físicamente una tapita ya caída: la reparenta al grupo del
   * recipiente (queda fija ahí para siempre) en la posición local dada
   * por el sistema de apilado, incrementa el conteo y la guarda.
   */
  depositCap(cap, localOffset) {
    cap.mesh.position.set(localOffset.x, localOffset.y, localOffset.z);
    cap.mesh.rotation.set(0, localOffset.rotY, 0);
    this.group.add(cap.mesh);
    this.storedCaps.push(cap);
    this.count++;
  }

  /** Vacía el recipiente: libera geometrías/materiales de cada tapita depositada y resetea contadores. */
  reset() {
    for (const cap of this.storedCaps) {
      this.group.remove(cap.mesh);
      cap.dispose();
    }
    this.storedCaps = [];
    this.count = 0;
    this._nextSlot = 0;
  }
}
