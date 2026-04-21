export type TipoMoto = "naked" | "adventure" | "cruiser" | "sport" | "touring" | "enduro";

export type MotoErgonomiaInput = {
  altura_asiento_mm: number;
  angulo_direccion_grados: number;
  trail_mm: number;
  wheelbase_mm: number;
  altura_suelo_mm: number;
  tipo: TipoMoto;
};

export type PosicionRelativaManillar = "bajo" | "medio" | "alto";
export type PosicionRelativaEstriberas = "adelantadas" | "centrales" | "retrasadas";

export type ClasificacionPostura =
  | "muy_erguido"
  | "erguido"
  | "neutro"
  | "deportivo"
  | "muy_deportivo";

export type PuntosErgonomicos = {
  altura_manillar_mm: number;
  distancia_horizontal_asiento_manillar_mm: number;
  diferencia_altura_asiento_manillar_mm: number;
  angulo_brazos_grados: number;
  posicion_relativa_manillar: PosicionRelativaManillar;
  clasificacion_postura: ClasificacionPostura;
};

export type AlcanceSuelo = "completo" | "punta_pie" | "no_alcanza";

export type PosturaPiloto = {
  angulo_codo_grados: number;
  alcance_suelo: AlcanceSuelo;
  comodidad_score: number; // 1..10
  advertencias: string[];
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function safeAcos(x: number): number {
  return Math.acos(clamp(x, -1, 1));
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateMoto(moto: MotoErgonomiaInput) {
  const fields: Array<keyof MotoErgonomiaInput> = [
    "altura_asiento_mm",
    "angulo_direccion_grados",
    "trail_mm",
    "wheelbase_mm",
    "altura_suelo_mm",
  ];
  for (const f of fields) {
    if (!isFiniteNumber(moto[f]) || moto[f] <= 0) {
      throw new Error(`Campo inválido en moto: ${String(f)}`);
    }
  }
}

function seatCenterRatio(tipo: TipoMoto): number {
  switch (tipo) {
    case "naked":
      return 0.6;
    case "adventure":
      return 0.62;
    case "cruiser":
      return 0.55;
    case "sport":
      return 0.58;
    case "touring":
      return 0.65;
    case "enduro":
      // Similar a adventure pero algo más centrada.
      return 0.6;
  }
}

function relativeBarPosition(diffMm: number): PosicionRelativaManillar {
  if (diffMm <= 10) return "bajo";
  if (diffMm <= 90) return "medio";
  return "alto";
}

function classifyPosture(args: {
  distanciaHorizontalMm: number;
  diffAlturaMm: number;
}): ClasificacionPostura {
  const { distanciaHorizontalMm, diffAlturaMm } = args; // diffAltura = manillar - asiento

  // Heurística:
  // - Más alto y cerca => erguido
  // - Similar altura => neutro
  // - Más bajo y lejos => deportivo
  if (diffAlturaMm >= 140 && distanciaHorizontalMm <= 360) return "muy_erguido";
  if (diffAlturaMm >= 60 && distanciaHorizontalMm <= 440) return "erguido";
  if (Math.abs(diffAlturaMm) <= 60) return "neutro";
  if (diffAlturaMm <= -140 && distanciaHorizontalMm >= 500) return "muy_deportivo";
  return "deportivo";
}

export function calcularPuntosErgonomicos(moto: MotoErgonomiaInput): PuntosErgonomicos {
  validateMoto(moto);

  // Sistema de coordenadas 2D (perfil):
  // - x: hacia delante (desde el eje trasero)
  // - y: hacia arriba (desde el suelo)
  //
  // Suponemos que angulo_direccion_grados es el "caster" respecto a la vertical:
  // - 0° = horquilla totalmente vertical
  // - típicamente 23°–30°
  const casterRad = toRad(clamp(moto.angulo_direccion_grados, 0, 45));
  const trail = clamp(moto.trail_mm, 70, 160);
  const wheelbase = clamp(moto.wheelbase_mm, 1200, 2000);

  // Punto de contacto de la rueda delantera (aprox) desde eje trasero.
  const xContactoDelantero = wheelbase;
  const ySuelo = 0;

  // Trail: el contacto suele quedar "detrás" (hacia atrás) del punto donde el eje de dirección
  // intersecta el suelo. Por tanto, el eje intersecta el suelo por delante del contacto.
  const xInterseccionEjeDireccion = xContactoDelantero + trail;

  // Proyección hacia arriba a lo largo del eje de dirección.
  // Vector unitario "hacia arriba" sobre el eje (inclinado hacia atrás):
  const ux = -Math.sin(casterRad);
  const uy = Math.cos(casterRad);

  const forkExpuestaMm = 350;
  const xManillar = xInterseccionEjeDireccion + ux * forkExpuestaMm;
  const yManillar = ySuelo + uy * forkExpuestaMm;

  // Centro del asiento típico según proporción del wheelbase desde el eje trasero.
  const xAsiento = wheelbase * seatCenterRatio(moto.tipo);
  const yAsiento = moto.altura_asiento_mm;

  const distanciaHorizontal = Math.round(xManillar - xAsiento);
  const diffAltura = Math.round(yManillar - yAsiento);

  const posicion_relativa_manillar = relativeBarPosition(diffAltura);

  // Ángulo de brazos: vector hombro->manillar respecto a horizontal (aprox).
  // Hombro estimado encima del asiento y ligeramente adelantado.
  // Nota: aquí no usamos altura del piloto; es una estimación de "setup" de la moto.
  const shoulderX = xAsiento + 80;
  const shoulderY = yAsiento + 520; // ~torso promedio (aprox) para una referencia consistente
  const anguloBrazos = (Math.atan2(yManillar - shoulderY, xManillar - shoulderX) * 180) / Math.PI;

  const clasificacion_postura = classifyPosture({
    distanciaHorizontalMm: Math.abs(distanciaHorizontal),
    diffAlturaMm: diffAltura,
  });

  return {
    altura_manillar_mm: Math.round(yManillar),
    distancia_horizontal_asiento_manillar_mm: distanciaHorizontal,
    diferencia_altura_asiento_manillar_mm: diffAltura,
    angulo_brazos_grados: Number(anguloBrazos.toFixed(2)),
    posicion_relativa_manillar,
    clasificacion_postura,
  };
}

function angleFromSegmentsDeg(a: number, b: number, d: number): number {
  // Ángulo en el punto entre los segmentos a y b, con lado opuesto d.
  // cos(theta) = (a^2 + b^2 - d^2) / (2ab)
  if (a <= 0 || b <= 0) return 0;
  const cos = (a * a + b * b - d * d) / (2 * a * b);
  return (safeAcos(cos) * 180) / Math.PI;
}

function reachToGround(altura_asiento_mm: number, inseam_mm: number): AlcanceSuelo {
  // Simplificación: si la entrepierna supera la altura del asiento con margen, llega plano.
  if (inseam_mm >= altura_asiento_mm + 60) return "completo";
  if (inseam_mm >= altura_asiento_mm - 10) return "punta_pie";
  return "no_alcanza";
}

export function calcularPosturaPiloto(
  moto: MotoErgonomiaInput,
  altura_piloto_cm: number,
  peso_piloto_kg: number
): PosturaPiloto {
  validateMoto(moto);
  if (!isFiniteNumber(altura_piloto_cm) || altura_piloto_cm < 120 || altura_piloto_cm > 230) {
    throw new Error("altura_piloto_cm inválida");
  }
  if (!isFiniteNumber(peso_piloto_kg) || peso_piloto_kg < 30 || peso_piloto_kg > 250) {
    throw new Error("peso_piloto_kg inválido");
  }

  const p = calcularPuntosErgonomicos(moto);

  // Proporciones corporales (mm)
  const altura_mm = altura_piloto_cm * 10;
  const inseam_mm = 0.47 * altura_mm;
  const brazo_mm = 0.33 * altura_mm;
  const torso_mm = 0.3 * altura_mm;

  // Brazo: estimamos hombro encima del asiento y ligeramente adelantado.
  const shoulderY = moto.altura_asiento_mm + torso_mm * 0.9;
  const shoulderX = 80;

  const barX = shoulderX + p.distancia_horizontal_asiento_manillar_mm;
  const barY = moto.altura_asiento_mm + p.diferencia_altura_asiento_manillar_mm;

  const dShoulderBar = Math.sqrt((barX - shoulderX) ** 2 + (barY - shoulderY) ** 2);
  const upperArm = brazo_mm * 0.5;
  const foreArm = brazo_mm * 0.5;
  const anguloCodo = angleFromSegmentsDeg(upperArm, foreArm, dShoulderBar);

  const alcance_suelo = reachToGround(moto.altura_asiento_mm, inseam_mm);

  const advertencias: string[] = [];

  // Validaciones geométricas básicas (si la distancia supera longitudes, quedan "estirados")
  if (dShoulderBar > upperArm + foreArm + 20) {
    advertencias.push("El alcance al manillar parece largo para tu brazo (puede cargar muñecas/hombros).");
  }

  // Rangos típicos (aprox) de comodidad:
  // codo: 90–140
  const codoPenalty =
    anguloCodo < 85 ? 3 : anguloCodo > 150 ? 2 : anguloCodo < 95 ? 1 : 0;

  if (anguloCodo < 90) advertencias.push("Codo muy cerrado: postura compacta, puede cargar hombros.");
  if (anguloCodo > 150) advertencias.push("Codo muy abierto: puedes ir muy estirado hacia el manillar.");
  if (alcance_suelo === "no_alcanza") advertencias.push("No alcanzas el suelo cómodamente: ojo en maniobras y paradas.");
  if (alcance_suelo === "punta_pie") advertencias.push("Llegas de puntillas: puede requerir técnica en paradas.");

  // Penaliza un poco por peso en off-road (más demanda física).
  const weightPenalty = peso_piloto_kg > 105 ? 1 : 0;

  let comodidad = 10;
  comodidad -= codoPenalty + weightPenalty;
  if (alcance_suelo === "no_alcanza") comodidad -= 2;
  if (moto.tipo === "sport") comodidad -= 1;
  if (moto.tipo === "cruiser" && moto.altura_asiento_mm < 700) comodidad += 0.5;
  comodidad = clamp(Math.round(comodidad), 1, 10);

  return {
    angulo_codo_grados: Math.round(anguloCodo),
    alcance_suelo,
    comodidad_score: comodidad,
    advertencias,
  };
}

