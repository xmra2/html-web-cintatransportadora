import * as THREE from 'three';
import { COLORS_SCENE, BELT, SENSOR_X, BAR } from '../config/config.js';

// =====================================================================
// SortingZone
// - Sensor de color: cabezal suspendido sobre la cinta, con un haz/LED
//   que cambia de color según la tapita detectada (referencia visual;
//   la detección real la hace CapSystem).
// - DeflectorBar: barra separadora articulada sobre un eje que está
//   SOBRE la cinta, en el borde interno del canal, en la boca del
//   abanico (ver detalle abajo). Se abre hacia adentro.
//
// Esta clase NO decide colores ni destinos: solo expone métodos para que
// systems/CapSystem le diga "activar barra izquierda / derecha" y expone
// también el sensor para mostrar la detección.
// =====================================================================

const BAR_ACTIVE_ANGLE = THREE.MathUtils.degToRad(BAR.activeAngleDeg);
const SERVO_SPEED = THREE.MathUtils.degToRad(BAR.servoSpeedDeg);

// =====================================================================
// DeflectorBar
// Hoja (barra separadora) articulada sobre un eje VERTICAL que está
// sobre la propia cinta, en el borde interno del canal central, justo
// donde arranca el abanico: es el "punto amarillo" de las imágenes.
//
//   - El eje pasa por debajo de la cinta (el servo va bajo el tablero),
//     así que sobre la superficie NO hay ningún poste que estorbe: solo
//     la hoja. Esto es clave, porque la tapita tiene que poder rodear
//     la punta del eje para salir a su carril.
//   - En reposo la hoja apunta AGUAS ARRIBA (hacia el túnel) y queda
//     paralela a la cinta, pegada al borde: las dos barras cerradas
//     forman las paredes del canal central (caso 'centro'/verde).
//   - Al abrirse gira hacia ADENTRO: la punta libre cruza el canal
//     hasta tocar el borde opuesto, formando una rampa diagonal. La
//     tapita se apoya en esa rampa, se desliza a lo largo de la hoja,
//     rodea el eje y sale al carril de ese lado.
//   - Se abre SOLO la barra del lado de destino. La otra queda cerrada.
// =====================================================================
class DeflectorBar {
  /**
   * @param {number} sign +1 = eje del lado +Z (carril 'izquierda')
   *                      -1 = eje del lado -Z (carril 'derecha')
   */
  constructor(sign) {
    this.sign = sign;
    this.currentAngle = 0;
    this.targetAngle = 0;

    this.pivotPoint = new THREE.Vector2(BAR.pivotX, sign * BAR.pivotZ); // (x, z) en el mundo

    this.pivot = new THREE.Group();
    this.pivot.position.set(BAR.pivotX, BELT.y, sign * BAR.pivotZ);

    // --- Hoja: nace en el eje y se extiende hacia -X (aguas arriba) ---
    const bladeGeo = new THREE.BoxGeometry(BAR.length, BAR.height, BAR.thickness);
    bladeGeo.translate(-BAR.length / 2, 0, 0); // origen de la geometría EN el eje
    this.barMat = new THREE.MeshStandardMaterial({
      color: COLORS_SCENE.barIdle, metalness: 0.55, roughness: 0.35
    });
    this.bar = new THREE.Mesh(bladeGeo, this.barMat);
    this.bar.position.y = BAR.height / 2 + 0.02;
    this.bar.castShadow = true;
    this.pivot.add(this.bar);

    // Puntas redondeadas: coinciden con la cápsula de colisión que usa
    // CapSystem, así lo que se ve es exactamente contra lo que choca.
    const capGeo = new THREE.CylinderGeometry(BAR.thickness / 2, BAR.thickness / 2, BAR.height, 12);
    for (const dx of [0, -BAR.length]) {
      const endCap = new THREE.Mesh(capGeo, this.barMat);
      endCap.position.set(dx, BAR.height / 2 + 0.02, 0);
      endCap.castShadow = true;
      this.pivot.add(endCap);
    }

    // --- Eje + servo POR DEBAJO del tablero (no obstruye la cinta) ---
    const shaftMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.frameDark, metalness: 0.7, roughness: 0.3 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.30, 10), shaftMat);
    shaft.position.y = -0.14;
    this.pivot.add(shaft);

    // El cuerpo del servo NO gira con la hoja: va en un grupo aparte,
    // fijo, colgado debajo de la cinta.
    this.mount = new THREE.Group();
    this.mount.position.set(BAR.pivotX, BELT.y, sign * BAR.pivotZ);
    const servoMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.servoBody, metalness: 0.7, roughness: 0.3 });
    const servo = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.16), servoMat);
    servo.position.y = -0.34;
    servo.castShadow = true;
    this.mount.add(servo);

    this.pivot.rotation.y = 0;
  }

  setActive(active) {
    this.targetAngle = active ? BAR_ACTIVE_ANGLE : 0;
  }

  get isActive() {
    return this.targetAngle > 0.001;
  }

  /** true cuando el servo ya llegó a su posición (no está a mitad de giro). */
  get isSettled() {
    return Math.abs(this.targetAngle - this.currentAngle) < 0.02;
  }

  /** 0 = cerrada (paralela al canal), 1 = abierta del todo. */
  get progress() {
    return Math.min(1, this.currentAngle / BAR_ACTIVE_ANGLE);
  }

  /**
   * Extremos actuales de la hoja en coordenadas (x, z) del mundo.
   * a = punta libre (aguas arriba), b = eje de giro.
   * CapSystem usa esto como pared física real.
   */
  getSegment() {
    const a = this.currentAngle;
    // Dirección de la hoja desde el eje: en reposo (-1, 0); al abrir,
    // la punta se va hacia el lado contrario al eje (hacia adentro).
    const dx = -Math.cos(a);
    const dz = -this.sign * Math.sin(a);
    return {
      ax: this.pivotPoint.x + dx * BAR.length,
      az: this.pivotPoint.y + dz * BAR.length,
      bx: this.pivotPoint.x,
      bz: this.pivotPoint.y
    };
  }

  update(dt) {
    const diff = this.targetAngle - this.currentAngle;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), SERVO_SPEED * dt);
    this.currentAngle += step;
    // Geometría orientada hacia -X: rotation.y = -sign * ángulo hace que
    // la punta barra hacia el lado opuesto al eje (hacia adentro).
    this.pivot.rotation.y = -this.sign * this.currentAngle;
    this.barMat.color.set(this.isActive ? COLORS_SCENE.barActive : COLORS_SCENE.barIdle);
  }
}

export class SortingZone {
  constructor() {
    this.group = new THREE.Group();

    // --- Sensor de color: cabezal en pórtico sobre la cinta ---
    this.sensorGroup = new THREE.Group();
    this.sensorGroup.position.set(SENSOR_X, 0, 0);

    const archMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.frame, metalness: 0.7, roughness: 0.35 });
    const legGeo = new THREE.BoxGeometry(0.08, 1.1, 0.08);
    for (const side of [1, -1]) {
      const leg = new THREE.Mesh(legGeo, archMat);
      leg.position.set(0, BELT.y + 0.55, side * (BELT.width / 2 + 0.1));
      leg.castShadow = true;
      this.sensorGroup.add(leg);
    }
    const beamGeo = new THREE.BoxGeometry(0.08, 0.08, BELT.width + 0.3);
    const beam = new THREE.Mesh(beamGeo, archMat);
    beam.position.set(0, BELT.y + 1.05, 0);
    this.sensorGroup.add(beam);

    const headGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const headMat = new THREE.MeshStandardMaterial({ color: COLORS_SCENE.servoBody, metalness: 0.6, roughness: 0.3 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, BELT.y + 0.75, 0);
    head.castShadow = true;
    this.sensorGroup.add(head);

    this.sensorLightMat = new THREE.MeshStandardMaterial({
      color: COLORS_SCENE.sensorGlow, emissive: COLORS_SCENE.sensorGlow, emissiveIntensity: 0.2
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), this.sensorLightMat);
    led.position.set(0, BELT.y + 0.63, 0);
    this.sensorGroup.add(led);

    this.sensorPointLight = new THREE.PointLight(COLORS_SCENE.sensorGlow, 0, 1.5);
    this.sensorPointLight.position.copy(led.position);
    this.sensorGroup.add(this.sensorPointLight);

    this.group.add(this.sensorGroup);

    // --- Barras separadoras --------------------------------------
    // Los ejes van sobre la cinta, en el borde interno de cada carril,
    // en la boca del abanico (BAR.pivotX / ±BAR.pivotZ). Las hojas
    // cuelgan hacia aguas arriba y se abren hacia adentro.
    this.leftBar = new DeflectorBar(1);   // eje en +Z -> abre para el carril 'left'
    this.rightBar = new DeflectorBar(-1); // eje en -Z -> abre para el carril 'right'
    this.group.add(this.leftBar.pivot, this.leftBar.mount);
    this.group.add(this.rightBar.pivot, this.rightBar.mount);
  }

  /** Enciende brevemente el LED del sensor con el color detectado. */
  flashSensor(hexColor) {
    this.sensorLightMat.color.set(hexColor);
    this.sensorLightMat.emissive.set(hexColor);
    this.sensorLightMat.emissiveIntensity = 1.4;
    this.sensorPointLight.color.set(hexColor);
    this.sensorPointLight.intensity = 1.2;
  }

  setLeftBarActive(active) { this.leftBar.setActive(active); }
  setRightBarActive(active) { this.rightBar.setActive(active); }

  /** Progreso 0..1 del giro real del servo para el carril dado ('left'|'right'). */
  getPushProgress(lane) {
    if (lane === 'left') return this.leftBar.progress;
    if (lane === 'right') return this.rightBar.progress;
    return 0;
  }

  _barFor(lane) {
    if (lane === 'left') return this.leftBar;
    if (lane === 'right') return this.rightBar;
    return null;
  }

  /**
   * true si TODAS las barras llegaron a su posición (ninguna a mitad de
   * giro). CapSystem lo usa como enclavamiento: no deja entrar una
   * tapita a la zona mientras una hoja todavía se está moviendo, para
   * que nunca la barra barra "a través" de la tapita.
   */
  barsSettled() {
    return this.leftBar.isSettled && this.rightBar.isSettled;
  }

  /** Segmento (x,z) actual de la hoja de un carril, como pared física. */
  getBarSegment(lane) {
    const bar = this._barFor(lane);
    return bar ? bar.getSegment() : null;
  }

  update(dt) {
    this.leftBar.update(dt);
    this.rightBar.update(dt);
    // decaimiento del brillo del sensor
    this.sensorLightMat.emissiveIntensity = Math.max(0.2, this.sensorLightMat.emissiveIntensity - dt * 1.5);
    this.sensorPointLight.intensity = Math.max(0, this.sensorPointLight.intensity - dt * 2.5);
  }
}
