import * as THREE from 'three';
import { CAP } from '../config/config.js';
import { CAP_STATES } from '../config/states.js';

let nextId = 1;

// Geometría y material se comparten entre TODAS las tapitas: la forma es
// siempre la misma (CAP.radius/CAP.height son constantes), y el color es
// el único dato que cambia — así que se cachea una geometría única y un
// material por color, en vez de fabricar 4 objetos WebGL nuevos por cada
// tapita. Con la simulación corriendo indefinidamente (alimentación
// automática, más ahora que cada tapita se crea Y se descarta al caer)
// esto evita basura constante de GPU/CPU sin ningún cambio visual.
let sharedGeometries = null;
function getSharedGeometries() {
  if (!sharedGeometries) {
    const R = CAP.radius, H = CAP.height;
    sharedGeometries = {
      body: new THREE.CylinderGeometry(R, R, H, 32),
      rim: new THREE.CylinderGeometry(R * 1.06, R * 1.06, H * 0.32, 32),
      topDetail: new THREE.CylinderGeometry(R * 0.72, R * 0.72, H * 0.12, 32)
    };
  }
  return sharedGeometries;
}

const materialCache = new Map(); // hex -> MeshPhysicalMaterial
function getSharedMaterial(hex) {
  if (!materialCache.has(hex)) {
    materialCache.set(hex, new THREE.MeshPhysicalMaterial({
      color: hex,
      roughness: 0.32,
      metalness: 0.02,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      reflectivity: 0.4
    }));
  }
  return materialCache.get(hex);
}

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
    const H = CAP.height;
    const geo = getSharedGeometries();
    const mat = getSharedMaterial(hex);

    // Cuerpo principal (disco de poca altura)
    const body = new THREE.Mesh(geo.body, mat);
    group.add(body);

    // Pequeño reborde inferior (el "faldón" característico de una tapita)
    const rim = new THREE.Mesh(geo.rim, mat);
    rim.position.y = -H / 2 + (H * 0.32) / 2 - 0.002;
    group.add(rim);

    // Marca sutil en la tapa superior (círculo levemente hundido, solo
    // detalle visual para lectura del color desde arriba)
    const topDetail = new THREE.Mesh(geo.topDetail, mat);
    topDetail.position.y = H / 2 - 0.01;
    group.add(topDetail);

    return group;
  }

  /** Vuelca la posición/rotación internas a la malla 3D. */
  syncMesh() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.set(this.rotX, this.rotY, this.rotZ);
  }

  /**
   * No hay nada que liberar por tapita: la geometría y el material son
   * compartidos globalmente (ver caché arriba) y nunca se destruyen
   * mientras la página esté abierta. Se deja el método (en vez de sacarlo
   * de golpe) porque Bin.receive() y CapSystem.resetAll() lo llaman como
   * parte del contrato normal de "esta tapita ya no existe".
   */
  dispose() {}
}
