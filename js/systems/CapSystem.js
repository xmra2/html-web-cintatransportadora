import {
  CAP, CAP_TYPES, LANES, BELT, TUNNEL, SENSOR_X, DEFLECT,
  LEAVE_DISTANCE, FALL, FEED_GATE_GAP, BAR_COLLISION_RADIUS, BAR_GATE_X
} from '../config/config.js';
import { CAP_STATES as S } from '../config/states.js';
import { Cap } from '../entities/Cap.js';
import { computeStackOffset } from '../utils/stacking.js';
import { laneCurveOffset } from '../utils/laneCurve.js';
import { capsuleBoundaryZ } from '../utils/barCollision.js';

const MAX_QUEUE = 5;          // tope de tapitas esperando en la cola visual
const WAITING_SLOT_GAP = 0.75; // separación entre tapitas en la cola de espera

// =====================================================================
// CapSystem
// Gobierna el ciclo de vida completo de cada tapita a través de los
// estados definidos en config/states.js:
//
//   WAITING -> IN_FEED_TUNNEL -> ON_MAIN_BELT -> COLOR_DETECTED ->
//   MOVING_TO_SORTER -> DIVERTING -> ON_COLOR_BELT -> LEAVING_BELT ->
//   FALLING -> IN_CONTAINER
//
// Responsabilidades:
//  - Cola de entrada: nuevas tapitas (manuales o automáticas) entran
//    como WAITING y solo pasan a IN_FEED_TUNNEL cuando el "portón" de
//    alimentación lo permite (garantiza fila única real, no cosmética).
//  - Sensor: al cruzar SENSOR_X dispara el flash visual y notifica el
//    color detectado (para el HUD) exactamente una vez por tapita.
//  - Desvío físico: el desplazamiento lateral de una tapita en la zona
//    de barras está acoplado al ángulo REAL del servo (SortingZone),
//    no a un temporizador independiente — si la barra no giró, la
//    tapita no se desvía.
//  - Caída y almacenamiento: al salir de su cinta secundaria, la tapita
//    cae por gravedad simple, rota, y se deposita físicamente (y de
//    forma permanente) dentro de su recipiente.
// =====================================================================
export class CapSystem {
  constructor(scene, sortingZone, bins) {
    this.scene = scene;
    this.sortingZone = sortingZone;
    this.bins = bins; // { left: Bin, center: Bin, right: Bin }
    this.caps = [];   // todas las tapitas activas (incluye las WAITING)
    this.typeKeys = Object.keys(CAP_TYPES);

    this.autoSpawnEnabled = true;
    this.spawnCooldown = 0.6;
    this.lastReleasedCap = null;

    // Callback opcional para el HUD: (typeKey, label) => void
    this.onColorDetected = null;
  }

  // --- API pública (usada por el HUD / main.js) ---------------------

  /** Encola manualmente una tapita del color indicado ('red'|'green'|'blue'). */
  enqueue(typeKey) {
    if (!CAP_TYPES[typeKey]) return;
    if (this._waitingCount() >= MAX_QUEUE) return; // cola llena, se ignora
    const cap = new Cap(typeKey, CAP_TYPES[typeKey]);
    cap.state = S.WAITING;
    cap.y = BELT.y + CAP.height / 2 + 0.02;
    this.scene.add(cap.mesh);
    this.caps.push(cap);
  }

  setAutoSpawn(enabled) {
    this.autoSpawnEnabled = enabled;
  }

  getQueueLength() {
    return this._waitingCount();
  }

  /**
   * Elimina toda tapita activa (en cola, cinta, túnel, cayendo, etc.):
   * la saca de su padre en la escena y libera su geometría/material.
   * No toca los recipientes (eso lo hace Machine.resetBins()).
   * Usado por el botón "Reiniciar".
   */
  resetAll() {
    for (const cap of this.caps) {
      if (cap.mesh.parent) cap.mesh.parent.remove(cap.mesh);
      cap.dispose();
    }
    this.caps = [];
    this.lastReleasedCap = null;
    this.spawnCooldown = 0.6;
  }

  // --- internos -------------------------------------------------------

  _waitingCount() {
    let n = 0;
    for (const c of this.caps) if (c.state === S.WAITING) n++;
    return n;
  }

  _randomType() {
    return this.typeKeys[Math.floor(Math.random() * this.typeKeys.length)];
  }

  /**
   * true si ya hay otra tapita ocupando la zona de las barras (yendo
   * hacia el clasificador o siendo desviada). Garantiza que en todo
   * momento como mucho una sola barra pueda estar activa.
   */
  _sorterZoneBusy(excludeCap) {
    return this.caps.some(c =>
      c !== excludeCap && (c.state === S.MOVING_TO_SORTER || c.state === S.DIVERTING)
    );
  }

  _gateOpen() {
    if (!this.lastReleasedCap) return true;
    if (this.lastReleasedCap.state === S.IN_CONTAINER) return true;
    // Debe haber salido del túnel (no solo del arranque de la cinta) y
    // llevar además un margen de separación, para garantizar fila única
    // real dentro del túnel y evitar que dos tapitas queden pegadas.
    return (this.lastReleasedCap.x - TUNNEL.endX) >= FEED_GATE_GAP;
  }

  update(dt) {
    this._updateAutoSpawn(dt);
    this._updateWaitingQueue();
    this._releaseFromGateIfPossible();

    let leftNeeded = false;
    let rightNeeded = false;

    for (const cap of this.caps) {
      if (cap.state === S.WAITING || cap.state === S.IN_CONTAINER) continue;

      this._advance(cap, dt);

      if (cap.state === S.MOVING_TO_SORTER || cap.state === S.DIVERTING) {
        if (cap.lane === 'left') leftNeeded = true;
        if (cap.lane === 'right') rightNeeded = true;
      }

      if (cap.state !== S.IN_CONTAINER) cap.syncMesh();
    }

    this.sortingZone.setLeftBarActive(leftNeeded);
    this.sortingZone.setRightBarActive(rightNeeded);

    // limpiar del arreglo activo las que ya quedaron depositadas
    this.caps = this.caps.filter(c => c.state !== S.IN_CONTAINER);
  }

  _updateAutoSpawn(dt) {
    if (!this.autoSpawnEnabled) return;
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0 && this._waitingCount() < MAX_QUEUE) {
      this.enqueue(this._randomType());
      this.spawnCooldown = (FEED_GATE_GAP / CAP.speed) * (0.8 + Math.random() * 0.6);
    }
  }

  _updateWaitingQueue() {
    let idx = 0;
    for (const cap of this.caps) {
      if (cap.state !== S.WAITING) continue;
      cap.x = BELT.mainStartX - 0.9 - idx * WAITING_SLOT_GAP;
      cap.z = 0;
      cap.syncMesh();
      idx++;
    }
  }

  _releaseFromGateIfPossible() {
    if (!this._gateOpen()) return;
    const next = this.caps.find(c => c.state === S.WAITING);
    if (!next) return;
    next.state = S.IN_FEED_TUNNEL;
    next.x = BELT.mainStartX;
    next.z = 0;
    this.lastReleasedCap = next;
  }

  _advance(cap, dt) {
    switch (cap.state) {
      case S.IN_FEED_TUNNEL:
        cap.x += CAP.speed * dt;
        cap.z = 0;
        if (cap.x >= TUNNEL.endX) cap.state = S.ON_MAIN_BELT;
        break;

      case S.ON_MAIN_BELT:
        cap.x += CAP.speed * dt;
        cap.z = 0;
        // No dejamos pasar una segunda tapita a la zona de las barras
        // mientras la anterior todavía se está desviando: si no, ambas
        // barras podrían quedar activas a la vez (una por cada tapita)
        // y se estorban entre sí. Se la retiene justo en el sensor.
        if (cap.x >= SENSOR_X) {
          if (this._sorterZoneBusy(cap)) {
            cap.x = SENSOR_X;
          } else {
            this._onSensorHit(cap);
          }
        }
        break;

      case S.MOVING_TO_SORTER:
        cap.x += CAP.speed * dt;
        cap.z = 0;
        // Enclavamiento: si alguna hoja todavía está girando, la tapita
        // espera JUSTO ANTES del arco que barre la barra. Así la hoja
        // nunca se mueve "a través" de la tapita (si el servo llegara
        // tarde, antes la barra la atravesaba; ahora la frena).
        if (cap.x >= BAR_GATE_X && !this.sortingZone.barsSettled()) {
          cap.x = BAR_GATE_X;
        }
        if (cap.x >= DEFLECT.startX) cap.state = S.DIVERTING;
        break;

      case S.DIVERTING:
        this._advanceDiverting(cap, dt);
        break;

      case S.ON_COLOR_BELT:
        cap.x += CAP.speed * dt;
        if (cap.x >= BELT.secondaryEndX) cap.state = S.LEAVING_BELT;
        break;

      case S.LEAVING_BELT:
        cap.x += CAP.speed * dt;
        if (cap.x >= BELT.secondaryEndX + LEAVE_DISTANCE) this._beginFalling(cap);
        break;

      case S.FALLING:
        this._advanceFalling(cap, dt);
        break;
    }
  }

  /** Instante de detección: enciende el sensor y notifica al HUD. */
  _onSensorHit(cap) {
    cap.state = S.COLOR_DETECTED;
    const def = CAP_TYPES[cap.typeKey];
    this.sortingZone.flashSensor(def.hex);
    if (this.onColorDetected) this.onColorDetected(cap.typeKey, def.label);
    // la detección es instantánea: en el mismo frame pasa a dirigirse al clasificador
    cap.state = S.MOVING_TO_SORTER;
    cap.x += CAP.speed * 0.001; // evita quedar exactamente en el umbral
  }

  /**
   * Dentro de la zona de unión: la tapita sigue la MISMA curva en "S"
   * que la cinta física dibujada en Machine._buildBridgeBelts (misma
   * función laneCurveOffset), así nunca queda desalineada de la cinta
   * que se ve. Sigue dependiendo del ángulo REAL del servo: si la barra
   * todavía no empezó a girar, la tapita no arranca a curvar.
   */
  _advanceDiverting(cap, dt) {
    cap.x += CAP.speed * dt;
    const targetZ = LANES[cap.lane].z;

    if (cap.lane === 'center') {
      // Las dos hojas cerradas son las paredes del canal central: la
      // tapita pasa derecho entre ambas.
      cap.z = 0;
    } else {
      const side = targetZ > 0 ? 1 : -1;

      // (a) Guía de la cinta: la curva del carril que está dibujada.
      const t = (cap.x - DEFLECT.startX) / (DEFLECT.endX - DEFLECT.startX);
      const zCurve = laneCurveOffset(t, targetZ);

      // (b) Contacto real con la hoja: la tapita se apoya en la barra y
      //     se desliza por ella, rodeando el eje. Nunca la penetra.
      const seg = this.sortingZone.getBarSegment(cap.lane);
      const zWall = seg ? capsuleBoundaryZ(seg, cap.x, BAR_COLLISION_RADIUS, side) : null;

      // (c) El desvío no retrocede: una vez que la barra la empujó, la
      //     tapita sigue saliendo hacia su carril (sin volver al centro).
      let z = cap.z;
      if (side > 0) {
        z = Math.max(z, zCurve);
        if (zWall !== null) z = Math.max(z, zWall);
        z = Math.min(z, targetZ);
      } else {
        z = Math.min(z, zCurve);
        if (zWall !== null) z = Math.min(z, zWall);
        z = Math.max(z, targetZ);
      }
      cap.z = z;
    }

    if (cap.x >= DEFLECT.endX) {
      cap.z = targetZ; // al salir de la zona, el carril queda fijo sí o sí
      cap.state = S.ON_COLOR_BELT;
    }
  }

  _beginFalling(cap) {
    cap.state = S.FALLING;
    cap.fallVelocityY = 0;
    const bin = this.bins[cap.lane];
    cap._stackIndex = bin.reserveSlot();
    const localOffset = computeStackOffset(cap._stackIndex);
    cap._stackOffsetLocal = localOffset; // coordenadas locales al grupo del recipiente
    cap._fallFrom = { x: cap.x, y: cap.y, z: cap.z };
    cap._fallTarget = {
      x: bin.group.position.x + localOffset.x,
      y: bin.group.position.y + localOffset.y,
      z: bin.group.position.z + localOffset.z
    };
  }

  _advanceFalling(cap, dt) {
    cap.fallVelocityY -= FALL.gravity * dt;
    cap.y += cap.fallVelocityY * dt;
    cap.rotX += FALL.tumbleSpeed * dt;

    const { x: fx, y: fy, z: fz } = cap._fallFrom;
    const target = cap._fallTarget;
    const totalDrop = Math.max(0.001, fy - target.y);
    const progress = Math.min(1, Math.max(0, (fy - cap.y) / totalDrop));
    cap.x = fx + (target.x - fx) * progress;
    cap.z = fz + (target.z - fz) * progress;

    if (cap.y <= target.y) {
      const bin = this.bins[cap.lane];
      bin.depositCap(cap, cap._stackOffsetLocal);
      cap.state = S.IN_CONTAINER;
    }
  }
}
