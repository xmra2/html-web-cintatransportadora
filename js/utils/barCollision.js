// =====================================================================
// barCollision.js
// La barra separadora se trata como una CÁPSULA en el plano (x, z):
// un segmento (punta libre -> eje de giro) con un radio. La tapita es
// un círculo de radio CAP.radius. Mientras la tapita esté en la zona,
// su Z se resuelve contra esa cápsula, así que es geométricamente
// IMPOSIBLE que quede adentro de la barra (era el bug de la captura:
// la tapita seguía la curva por su cuenta y la hoja le pasaba por
// encima / por adentro).
//
// capsuleBoundaryZ(seg, x, R, side) devuelve, para una X dada, el borde
// de la zona prohibida sobre el lado pedido:
//   side = +1 -> el mayor z que todavía toca la cápsula (la tapita debe
//                quedar en z >= ese valor)
//   side = -1 -> el menor z (la tapita debe quedar en z <= ese valor)
// Devuelve null si la barra no ocupa esa X (no hay contacto posible).
// =====================================================================
export function capsuleBoundaryZ(seg, x, R, side) {
  const { ax, az, bx, bz } = seg;
  let best = null;

  const better = (z) => {
    if (best === null || side * (z - best) > 0) best = z;
  };

  // Tapas redondeadas de los dos extremos del segmento
  for (const [ex, ez] of [[ax, az], [bx, bz]]) {
    const d2 = R * R - (x - ex) * (x - ex);
    if (d2 > 0) better(ez + side * Math.sqrt(d2));
  }

  // Tramo recto (solo donde la X cae dentro del segmento)
  const lo = Math.min(ax, bx);
  const hi = Math.max(ax, bx);
  if (x >= lo && x <= hi && Math.abs(bx - ax) > 1e-6) {
    const m = (bz - az) / (bx - ax);
    better(az + m * (x - ax) + side * R * Math.sqrt(1 + m * m));
  }

  return best;
}
