// =====================================================================
// laneCurve.js
// Perfil de curvatura ÚNICO, compartido entre:
//   - machine/Machine.js  (dibuja la cinta curva de unión)
//   - systems/CapSystem.js (mueve la tapita realmente por esa curva)
// Así la tapita siempre viaja exactamente sobre la cinta que se ve
// dibujada, nunca "al lado" o "por el aire".
//
// t: 0..1 = avance a lo largo del tramo de unión (0 = recién sale de
//    la cinta principal, 1 = ya se unió del todo a su cinta de color).
// targetZ: desplazamiento lateral final (carril de destino).
//
// Se usa un "smoothstep" (3t² - 2t³): arranca y termina con pendiente
// CERO. Eso es lo que hace que el empalme con la cinta recta de cada
// lado quede tangente — sin ángulos filosos ni huecos — y que en el
// medio se note un giro parejo, tipo semicírculo.
// =====================================================================
export function laneCurveOffset(t, targetZ) {
  const c = Math.min(1, Math.max(0, t));
  const eased = c * c * (3 - 2 * c);
  return targetZ * eased;
}
