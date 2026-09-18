// =====================================================================
// CONFIG.js
// Única fuente de verdad para dimensiones, posiciones y colores.
// Para agregar un nuevo color/destino en el futuro: agregar una entrada
// a CAP_TYPES y (si no es 'center') definir su carril en LANES.
// =====================================================================

export const BELT = {
  width: 0.9,          // ancho útil de la cinta (angosta a propósito)
  thickness: 0.12,
  mainStartX: -7.6,
  mainEndX: 0.0,        // termina en el pivote de la zona de clasificación
  secondaryStartX: 2.6, // más lejos que antes: da lugar a una curva de unión amplia, no un corte brusco
  secondaryEndX: 6.3,
  y: 0.9                // altura de la superficie de la cinta sobre el suelo
};

export const TUNNEL = {
  startX: -6.3,
  endX: -3.4,
  entryHalfWidth: 1.15, // boca ancha (recibe tapitas mezcladas)
  exitHalfWidth: BELT.width / 2 + 0.03, // se estrecha al ancho de la cinta
  wallHeight: 0.5
};

export const SENSOR_X = -1.7;

export const DEFLECT = {
  startX: BELT.mainEndX,        // arranca justo donde termina la cinta principal
  endX: BELT.secondaryStartX    // termina justo donde arranca la cinta de color: todo ese tramo es la curva de unión
};

export const CAP = {
  radius: 0.33,    // diámetro 0.66, ligeramente menor que el ancho de cinta
  height: 0.28,
  speed: 1.55,          // unidades/seg "nominales" sobre toda la línea (velocidad base, 1.0x)
  minSpawnGap: 1.45     // separación mínima entre tapitas (fila única)
};

// Control de velocidad en tiempo real (panel "Velocidad" del HUD). Es un
// objeto MUTABLE (no una constante numérica) para que Motor.js y
// CapSystem.js siempre lean el valor actual sin tener que pasarlo a mano
// por todos lados: la UI solo hace `SPEED.multiplier = valor`.
export const SPEED = {
  multiplier: 1,   // 1 = velocidad nominal (CAP.speed). El slider lo mueve entre ~0.4 y 2.5
  min: 0.4,
  max: 2.5
};

export const BIN_X = 6.9;

// Carriles laterales tras la zona de clasificación (offset en Z)
export const LANE_OFFSET = 1.5;

// Definición de tipos de tapita. "lane" determina hacia qué barra/costado
// se dirige: 'left' | 'center' | 'right'. Nuevos colores solo necesitan
// entrar aquí (y decidir a qué carril mandarlos, o crear uno nuevo).
export const CAP_TYPES = {
  red:   { label: 'Roja',  hex: 0xd93025, lane: 'right'  },
  green: { label: 'Verde', hex: 0x1e8e3e, lane: 'center' },
  blue:  { label: 'Azul',  hex: 0x1a73e8, lane: 'left'   }
};

// Geometría de carril -> offset en Z. 'center' siempre es 0.
export const LANES = {
  left:   { z:  LANE_OFFSET },
  center: { z:  0 },
  right:  { z: -LANE_OFFSET }
};

export const COLORS_SCENE = {
  background: 0x0e1116,
  frame: 0x3a4048,
  frameDark: 0x22262b,
  belt: 0x1c1f24,
  beltEdge: 0x4a5058,
  sensorGlow: 0xffb020,
  servoBody: 0x2b2f36,
  barActive: 0xff8c1a,
  barIdle: 0x6b7280
};

// ---------------------------------------------------------------------
// Física de la barra desviadora (servomotor). Se comparte entre
// machine/SortingZone.js (mueve la barra) y systems/CapSystem.js
// (acopla el desvío lateral de la tapita al ángulo real de la barra).
// ---------------------------------------------------------------------
export const BAR = {
  // --- Punto de giro (el "punto amarillo" de las imágenes) ----------
  // El eje ya NO está al costado de la cinta: está sobre la superficie,
  // justo en la boca del abanico, en el borde interno de cada carril.
  // Cada barra cuelga de ese eje hacia AGUAS ARRIBA (hacia el túnel), y
  // al abrirse su punta libre barre hacia ADENTRO cruzando el canal.
  pivotX: 1.48,        // sobre el eje de avance: en el arranque del abanico
  pivotZ: BELT.width / 2, // ±0.45: borde del canal central (eje espejado)

  length: 1.341,       // largo de la hoja (desde el eje hacia aguas arriba)
  thickness: 0.10,     // espesor de la hoja (la mitad se usa como radio de colisión)
  height: 0.18,        // alto de la hoja sobre la cinta (tapa el cuerpo de la tapita)

  activeAngleDeg: 34,  // apertura completa (como estaba antes de acortarla).
                       // El cruce en "X" que se veía NO era esto: eran los
                       // bordes/guardas grises de los carriles (ver
                       // Machine.js, _buildBridgeBelts) cruzándose contra
                       // el borde del carril central. Con eso ya resuelto,
                       // la barra puede volver a abrirse del todo; la punta
                       // llega hasta 0.15 del borde opuesto (nunca lo toca).
  servoSpeedDeg: 220   // velocidad angular del servomotor (grados/seg)
};

// Radio de colisión de la hoja: la tapita nunca puede acercarse a menos
// de (CAP.radius + BAR.thickness/2) del segmento de la barra. Es lo que
// hace IMPOSIBLE que la tapita atraviese la barra.
export const BAR_COLLISION_RADIUS = CAP.radius + BAR.thickness / 2;

// Distancia que la tapita recorre "en el aire" al salir de la cinta
// secundaria antes de empezar a caer (fase LEAVING_BELT).
export const LEAVE_DISTANCE = 0.4;

// Física simple de caída (fase FALLING).
export const FALL = {
  gravity: 14,        // aceleración de caída (unidades/seg^2), no realista
                       // a escala real pero da una caída visible y rápida
  tumbleSpeed: 7       // velocidad de rotación al caer (rad/seg)
};

// Punto de caída dentro del recipiente (fase IN_CONTAINER, ver CapSystem).
export const CONTAINER = {
  innerRadius: 0.47,  // radio útil interior del recipiente (limita la variación al azar de la caída)
  baseY: 0.08         // altura del piso interior del recipiente
};

// Separación mínima que debe existir entre la tapita anterior y el
// inicio del mini túnel para que el sistema de alimentación libere la
// siguiente de la cola (garantiza fila única real, no solo visual).
export const FEED_GATE_GAP = CAP.minSpawnGap;

// Línea de retención: la tapita no entra a la zona de las barras
// mientras alguna hoja esté a mitad de giro. Queda justo aguas arriba
// del arco que barre la punta de la barra cerrada.
export const BAR_GATE_X = BAR.pivotX - BAR.length - CAP.radius - 0.08;
