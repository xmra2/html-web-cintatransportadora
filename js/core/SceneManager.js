import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS_SCENE } from '../config/config.js';

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
    this.scene.fog = new THREE.Fog(COLORS_SCENE.background, 18, 34);
  }

  _initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 11;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2,
      0.1, 100
    );
    // Vista isométrica clásica, desde arriba, mirando hacia el origen.
    this.camera.position.set(10, 11, 10);
    this.camera.lookAt(0, 0.5, 0);
  }

  _initLights() {
    const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x11141a, 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.15);
    sun.position.set(8, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
    fill.position.set(-8, 6, -6);
    this.scene.add(fill);
  }

  _initGround() {
    const geo = new THREE.PlaneGeometry(60, 60);
    const mat = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1 });
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
    this.controls.target.set(-1, 0.5, 0);
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 11;
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
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
