// =====================================================================
// CAP_STATES
// Estados del ciclo de vida de una tapita. Definidos como constantes
// (no strings sueltos) para evitar errores de tipeo entre módulos.
//
//   WAITING          -> en la cola de entrada, aún no ingresó al túnel
//   IN_FEED_TUNNEL   -> atravesando el mini túnel (fila única)
//   ON_MAIN_BELT     -> avanzando recto por la cinta principal
//   COLOR_DETECTED   -> instante en que el sensor la identifica (1 frame)
//   MOVING_TO_SORTER -> avanzando hacia la zona de barras (servo ya arma)
//   DIVERTING        -> dentro de la zona de barras, siendo empujada
//   ON_COLOR_BELT    -> avanzando recto por su cinta secundaria
//   LEAVING_BELT     -> saliendo del borde de la cinta (aún sin caer)
//   FALLING          -> cayendo por gravedad hacia el recipiente
//   IN_CONTAINER     -> en reposo, apilada dentro del recipiente
// =====================================================================
export const CAP_STATES = Object.freeze({
  WAITING: 'WAITING',
  IN_FEED_TUNNEL: 'IN_FEED_TUNNEL',
  ON_MAIN_BELT: 'ON_MAIN_BELT',
  COLOR_DETECTED: 'COLOR_DETECTED',
  MOVING_TO_SORTER: 'MOVING_TO_SORTER',
  DIVERTING: 'DIVERTING',
  ON_COLOR_BELT: 'ON_COLOR_BELT',
  LEAVING_BELT: 'LEAVING_BELT',
  FALLING: 'FALLING',
  IN_CONTAINER: 'IN_CONTAINER'
});
