import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS_SCENE } from '../config/config.js';
import { createFloorTexture } from '../utils/floorTexture.js';

// =====================================================================
// SceneManager
// Responsable únicamente de: escena, cámara, luces, renderer y el loop.
// No conoce nada de tapitas, cintas ni sensores (separación de capas).
// =====================================================================
export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.updateCallbacks = [];
    // Ancho del frustum ortográfico: única fuente de verdad, usada tanto
    // al armar la cámara como al recalcularla en cada resize. El sistema
    // completo (cinta principal a -7.6 hasta los recipientes a ~7.9) es
    // bastante más ancho que cuando esto se fijó en 11 — con eso, los
    // recipientes de la derecha quedaban pegados al borde o cortados por
    // default. 15 da margen para ver todo el recorrido sin tener que
    // hacer zoom manual.
    this.frustumSize = 15;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initGround();
    this._initControls();

    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS_SCENE.background);
    this.scene.fog = new THREE.Fog(COLORS_SCENE.background, 18, 40);
  }

  _initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -this.frustumSize * aspect / 2, this.frustumSize * aspect / 2,
      this.frustumSize / 2, -this.frustumSize / 2,
      0.1, 100
    );
    // Vista isométrica clásica, desde arriba, mirando hacia el punto que
    // controls.target también usa (ver _initControls) — mismo centro.
    this.camera.position.set(10, 11, 10);
    this.camera.lookAt(1, 0.5, 0);
  }

  _initLights() {
    const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x11141a, 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.15);
    sun.position.set(8, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // El sistema completo (cinta principal -> recipientes) mide bastante
    // más de ancho que la caja de sombra original (±12): con eso, la
    // punta de la cinta principal y/o los recipientes quedaban sin
    // sombra o con el corte visible. ±17 cubre todo el recorrido con
    // margen.
    sun.shadow.camera.left = -17;
    sun.shadow.camera.right = 17;
    sun.shadow.camera.top = 17;
    sun.shadow.camera.bottom = -17;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
    fill.position.set(-8, 6, -6);
    this.scene.add(fill);
  }

  _initGround() {
    const geo = new THREE.PlaneGeometry(60, 60);
    const mat = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1, map: createFloorTexture() });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(60, 60, 0x2a2f36, 0x1a1e23);
    grid.position.y = 0.001;
    this.scene.add(grid);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minZoom = 0.6;
    this.controls.maxZoom = 2.4;
    this.controls.maxPolarAngle = Math.PI * 0.49; // no dejar ir bajo el piso
    // Recentrado: antes apuntaba a x=-1 (centro de cuando el sistema
    // terminaba en los recipientes a x≈4.9); ahora el recorrido llega
    // hasta x≈7.9, así que el centro real quedó más hacia la derecha.
    this.controls.target.set(1, 0.5, 0);
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -this.frustumSize * aspect / 2;
    this.camera.right = this.frustumSize * aspect / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Registra una función (dt) => void que se ejecuta cada frame. */
  onUpdate(fn) {
    this.updateCallbacks.push(fn);
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.controls.update();
      for (const fn of this.updateCallbacks) fn(dt);
      this.renderer.render(this.scene, this.camera);
    });
  }
}
