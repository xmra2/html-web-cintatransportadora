import * as THREE from 'three';
import { CAP } from '../config/config.js';
import { CAP_STATES } from '../config/states.js';

let nextId = 1;

// =====================================================================
// Cap (tapita)
// Entidad con apariencia de tapita plástica real (disco + reborde, con
// material tipo plástico brillante) y estado de recorrido explícito
// (ver config/states.js). No conoce cintas, sensores ni barras:
// systems/CapSystem.js decide su posición y rotación en cada frame según
// su fase; esta clase solo guarda esos valores y los vuelca a la malla.
// =====================================================================
export class Cap {
  constructor(typeKey, typeDef) {
    this.id = nextId++;
    this.typeKey = typeKey;
    this.lane = typeDef.lane;      // 'left' | 'center' | 'right'
    this.state = CAP_STATES.WAITING;

    // posición/orientación en el mundo (systems/CapSystem las controla)
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.rotX = 0; // solo se usa durante la caída (tumbling), la inclina hacia adelante
    this.rotY = Math.random() * Math.PI * 2; // giro variado sobre su propio eje (vertical): no la saca de estar acostada
    this.rotZ = 0; // se mantiene en 0 mientras viaja: acostada boca arriba/abajo, nunca de costado
    this.fallVelocityY = 0;

    this.mesh = this._buildMesh(typeDef.hex);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  _buildMesh(hex) {
    const group = new THREE.Group();
    const R = CAP.radius;
    const H = CAP.height;

    // Material plástico: algo de "clearcoat" para dar el reflejo típico
    // de una tapita de botella sin llegar a verse metálico.
    const plasticMat = new THREE.MeshPhysicalMaterial({
      color: hex,
      roughness: 0.32,
      metalness: 0.02,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      reflectivity: 0.4
    });

    // Cuerpo principal (disco de poca altura)
    const bodyGeo = new THREE.CylinderGeometry(R, R, H, 32);
    const body = new THREE.Mesh(bodyGeo, plasticMat);
    group.add(body);

    // Pequeño reborde inferior (el "faldón" característico de una tapita)
    const rimGeo = new THREE.CylinderGeometry(R * 1.06, R * 1.06, H * 0.32, 32);
    const rim = new THREE.Mesh(rimGeo, plasticMat);
    rim.position.y = -H / 2 + (H * 0.32) / 2 - 0.002;
    group.add(rim);

    // Marca sutil en la tapa superior (círculo levemente hundido, solo
    // detalle visual para lectura del color desde arriba)
    const topDetailGeo = new THREE.CylinderGeometry(R * 0.72, R * 0.72, H * 0.12, 32);
    const topDetail = new THREE.Mesh(topDetailGeo, plasticMat);
    topDetail.position.y = H / 2 - 0.01;
    group.add(topDetail);

    return group;
  }

  /** Vuelca la posición/rotación internas a la malla 3D. */
  syncMesh() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.set(this.rotX, this.rotY, this.rotZ);
  }

  dispose() {
    this.mesh.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
