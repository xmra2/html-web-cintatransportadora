import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BELT, LANES, LANE_OFFSET, BIN_X, CAP_TYPES, COLORS_SCENE } from '../config/config.js';
import { ConveyorBelt } from './ConveyorBelt.js';
import { MiniTunnel } from './MiniTunnel.js';
import { SortingZone } from './SortingZone.js';
import { Bin } from './Bin.js';
import { laneCurveOffset } from '../utils/laneCurve.js';

// =====================================================================
// Machine
// Punto único de ensamblaje: crea cinta principal, mini túnel, zona de
// clasificación, las tres cintas secundarias y los tres recipientes, y
// los ubica en el mundo. Expone lo necesario para que CapSystem opere
// (sortingZone, bins) sin que este último tenga que saber de geometría.
// =====================================================================
export class Machine {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.updatables = [];

    this._buildMainConveyor();
    this._buildMiniTunnel();
    this._buildSortingZone();
    this._buildDeckFiller();
    this._buildBridgeBelts();
    this._buildSecondaryConveyorsAndBins();

    scene.add(this.group);
  }

  /**
   * Tablero continuo debajo de la zona de clasificación y de las tres
   * cintas de color. Sin esto quedaba un "agujero" de piso visible: un
   * hueco entre la cinta principal y las secundarias (donde están las
   * barras) y huecos entre cada cinta secundaria, ya que están separadas
   * (LANE_OFFSET) más de lo que miden de ancho (BELT.width).
   */
  _buildDeckFiller() {
    const startX = BELT.mainEndX;
    const endX = BELT.secondaryEndX;
    const halfWidth = LANE_OFFSET + BELT.width / 2;

    const deckGeo = new THREE.BoxGeometry(endX - startX, 0.05, halfWidth * 2);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.4, roughness: 0.7 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    // Un poco por debajo de la superficie de las cintas, para que éstas
    // se vean apoyadas encima y no haya z-fighting con las barras.
    deck.position.set(startX + (endX - startX) / 2, BELT.y - 0.09, 0);
    deck.receiveShadow = true;
    this.group.add(deck);
  }

  /**
   * Cintas de unión FÍSICAS entre la cinta principal y cada cinta de
   * color. Antes esto era un tramo recto en diagonal: el ángulo con el
   * que se empalmaba contra la cinta principal y contra la cinta de
   * color quedaba filoso (una "V"), así que en esas dos costuras se
   * seguía viendo un salto/hueco. Ahora es una curva real en "S" — la
   * misma que usa CapSystem para mover la tapita (laneCurveOffset) — que
   * arranca y termina totalmente derecha (pendiente cero en las puntas),
   * por eso empalma sin ángulos ni huecos, y en el medio se nota
   * claramente el giro. Está armada con muchos segmentos rectos cortos
   * y superpuestos, así no hace falta ninguna geometría de curvas rara
   * que pueda retorcerse.
   */
  _buildBridgeBelts() {
    const startX = BELT.mainEndX;
    const endX = BELT.secondaryStartX;
    const SEGMENTS = 28;
    this.bridgeBelts = {};

    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.85, metalness: 0.05 });
    const legMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.frame, metalness: 0.7, roughness: 0.4 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.beltEdge, metalness: 0.6, roughness: 0.4 });

    const UP = new THREE.Vector3(0, 1, 0);

    for (const lane of Object.keys(LANES)) {
      const targetZ = LANES[lane].z;
      const group = new THREE.Group();
      const skipSide = lane === 'left' ? -1 : lane === 'right' ? 1 : null;

      const pts = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const t = i / SEGMENTS;
        pts.push({ x: startX + (endX - startX) * t, z: laneCurveOffset(t, targetZ) });
      }

      // En vez de crear un Mesh por segmento (28 tramos x cinta + bordes
      // + patas, por carril, son un montón de objetos 3D estáticos que
      // nunca cambian), se arma cada trocito de geometría ya "horneado"
      // con su posición/rotación aplicada a los vértices, y se fusiona
      // todo en UNA sola malla por material al final. Misma forma exacta,
      // muchísimas menos llamadas de dibujo (de ~300 mallas totales acá
      // a 9: cinta + bordes + patas, por cada uno de los 3 carriles).
      const beltGeos = [];
      const edgeGeos = [];
      const legGeos = [];

      for (let i = 0; i < SEGMENTS; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const segLength = Math.hypot(dx, dz) * 1.03; // leve solape: sin costuras entre segmentos
        const angle = Math.atan2(-dz, dx);
        const midX = (a.x + b.x) / 2, midZ = (a.z + b.z) / 2;
        const rot = new THREE.Quaternion().setFromAxisAngle(UP, angle);

        const beltGeo = new THREE.BoxGeometry(segLength, BELT.thickness, BELT.width);
        beltGeo.applyMatrix4(new THREE.Matrix4().compose(
          new THREE.Vector3(midX, BELT.y, midZ), rot, new THREE.Vector3(1, 1, 1)
        ));
        beltGeos.push(beltGeo);

        const perpX = Math.sin(angle) * (BELT.width / 2);
        const perpZ = Math.cos(angle) * (BELT.width / 2);
        for (const side of [1, -1]) {
          if (side === skipSide) continue;
          const edgeGeo = new THREE.BoxGeometry(segLength, 0.06, 0.05);
          edgeGeo.applyMatrix4(new THREE.Matrix4().compose(
            new THREE.Vector3(midX + perpX * side, BELT.y + BELT.thickness / 2 + 0.03, midZ + perpZ * side),
            rot, new THREE.Vector3(1, 1, 1)
          ));
          edgeGeos.push(edgeGeo);
        }

        if (i % 7 === 3) {
          for (const side of [1, -1]) {
            const offX = Math.sin(angle) * (BELT.width / 2 - 0.05) * side;
            const offZ = Math.cos(angle) * (BELT.width / 2 - 0.05) * side;
            const legGeo = new THREE.BoxGeometry(0.09, BELT.y, 0.09);
            legGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(midX + offX, BELT.y / 2, midZ + offZ));
            legGeos.push(legGeo);
          }
        }
      }

      const beltMesh = new THREE.Mesh(mergeGeometries(beltGeos), beltMat);
      beltMesh.castShadow = true;
      beltMesh.receiveShadow = true;
      group.add(beltMesh);

      const edgeMesh = new THREE.Mesh(mergeGeometries(edgeGeos), edgeMat);
      edgeMesh.castShadow = true;
      group.add(edgeMesh);

      const legMesh = new THREE.Mesh(mergeGeometries(legGeos), legMat);
      legMesh.castShadow = true;
      group.add(legMesh);

      this.group.add(group);
      this.bridgeBelts[lane] = group;
    }
  }

  _buildMainConveyor() {
    const length = BELT.mainEndX - BELT.mainStartX;
    this.mainBelt = new ConveyorBelt({ length, motorAtEnd: false, color: 0x1c1f24 });
    this.mainBelt.group.position.set(BELT.mainStartX + length / 2, 0, 0);
    this.group.add(this.mainBelt.group);
    this.updatables.push(this.mainBelt);
  }

  _buildMiniTunnel() {
    this.miniTunnel = new MiniTunnel();
    this.group.add(this.miniTunnel.group);
  }

  _buildSortingZone() {
    this.sortingZone = new SortingZone();
    this.group.add(this.sortingZone.group);
    this.updatables.push(this.sortingZone);
  }

  _buildSecondaryConveyorsAndBins() {
    const length = BELT.secondaryEndX - BELT.secondaryStartX;
    this.secondaryBelts = {};
    this.bins = {};

    // lane -> qué tipo de tapita (para tomar el color del recipiente)
    const laneColor = {};
    for (const [key, def] of Object.entries(CAP_TYPES)) laneColor[def.lane] = def;

    for (const lane of Object.keys(LANES)) {
      const z = LANES[lane].z;

      const belt = new ConveyorBelt({ length, motorAtEnd: true, showMotor: false, color: 0x1c1f24 });
      belt.group.position.set(BELT.secondaryStartX + length / 2, 0, z);
      this.group.add(belt.group);
      this.updatables.push(belt);
      this.secondaryBelts[lane] = belt;

      const def = laneColor[lane] ?? { hex: 0x888888, label: lane };
      const bin = new Bin(def.hex, def.label);
      bin.group.position.set(BIN_X + 0.5, 0, z);
      this.group.add(bin.group);
      this.bins[lane] = bin;
      this.updatables.push(bin);
    }
  }

  update(dt) {
    for (const u of this.updatables) u.update(dt);
  }

  /** Vacía los tres recipientes (usado por "Reiniciar"). */
  resetBins() {
    for (const lane of Object.keys(this.bins)) this.bins[lane].reset();
  }
}
