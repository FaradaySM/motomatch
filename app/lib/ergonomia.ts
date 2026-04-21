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

export type PuntosErgonomicos = {
  altura_manillar_mm: number;
  altura_estriberas_mm: number;
  distancia_horizontal_manillar_mm: number;
  posicion_relativa_manillar: PosicionRelativaManillar;
  posicion_relativa_estriberas: PosicionRelativaEstriberas;
};

export type AlcanceSuelo = "completo" | "punta_pie" | "no_alcanza";

export type PosturaPiloto = {
  angulo_rodilla_grados: number;
  angulo_cadera_grados: number;
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

function footpegDeltaFromSeatMm(tipo: TipoMoto): number {
  // Delta = altura_estriberas - altura_asiento (negativo: estriberas más bajas).
  switch (tipo) {
    case "sport":
      return -170;
    case "naked":
      return -200;
    case "touring":
      return -210;
    case "adventure":
      return -230;
    case "enduro":
      return -240;
    case "cruiser":
      return -260;
  }
}

function horizontalBarDistanceMm(tipo: TipoMoto): number {
  // Distancia horizontal desde el asiento al manillar (aprox).
  switch (tipo) {
    case "cruiser":
      return 320;
    case "naked":
      return 420;
    case "adventure":
      return 450;
    case "touring":
      return 480;
    case "enduro":
      return 440;
    case "sport":
      return 540;
  }
}

function handlebarBaseRiseMm(tipo: TipoMoto): number {
  // Ajuste base de altura del manillar respecto a altura del asiento.
  switch (tipo) {
    case "sport":
      return -30;
    case "naked":
      return 40;
    case "touring":
      return 80;
    case "adventure":
      return 90;
    case "enduro":
      return 120;
    case "cruiser":
      return 70;
  }
}

function footpegHorizontalOffsetMm(tipo: TipoMoto, wheelbase_mm: number): number {
  // Positivo = estriberas adelantadas respecto a la vertical del asiento.
  // Valores aproximados, limitados por wheelbase.
  const wb = Math.max(1200, wheelbase_mm);
  switch (tipo) {
    case "cruiser":
      return clamp(wb * 0.18, 180, 320);
    case "touring":
      return clamp(wb * 0.06, 60, 140);
    case "adventure":
      return clamp(wb * 0.05, 50, 120);
    case "naked":
      return clamp(wb * 0.05, 50, 120);
    case "enduro":
      return clamp(wb * 0.04, 40, 110);
    case "sport":
      // retrasadas
      return -clamp(wb * 0.05, 60, 140);
  }
}

function relativeBarPosition(diffMm: number): PosicionRelativaManillar {
  if (diffMm <= 10) return "bajo";
  if (diffMm <= 90) return "medio";
  return "alto";
}

function relativePegPosition(tipo: TipoMoto): PosicionRelativaEstriberas {
  switch (tipo) {
    case "cruiser":
      return "adelantadas";
    case "sport":
      return "retrasadas";
    default:
      return "centrales";
  }
}

export function calcularPuntosErgonomicos(moto: MotoErgonomiaInput): PuntosErgonomicos {
  validateMoto(moto);

  // Interpretación: angulo_direccion_grados es el rake respecto a la vertical (lo habitual).
  // Usamos el trail para obtener un pequeño componente vertical asociado a la inclinación.
  const rakeRad = toRad(clamp(moto.angulo_direccion_grados, 15, 40));
  const trail = clamp(moto.trail_mm, 70, 150);

  const trailVerticalComponent = trail * Math.cos(rakeRad); // mm

  const baseRise = handlebarBaseRiseMm(moto.tipo);
  const altura_manillar_mm = Math.round(
    moto.altura_asiento_mm + baseRise + trailVerticalComponent * 0.25
  );

  const altura_estriberas_mm = Math.round(
    clamp(moto.altura_asiento_mm + footpegDeltaFromSeatMm(moto.tipo), moto.altura_suelo_mm + 60, moto.altura_asiento_mm)
  );

  const distancia_horizontal_manillar_mm = Math.round(horizontalBarDistanceMm(moto.tipo));

  const posicion_relativa_manillar = relativeBarPosition(altura_manillar_mm - moto.altura_asiento_mm);
  const posicion_relativa_estriberas = relativePegPosition(moto.tipo);

  return {
    altura_manillar_mm,
    altura_estriberas_mm,
    distancia_horizontal_manillar_mm,
    posicion_relativa_manillar,
    posicion_relativa_estriberas,
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

  // Pierna: asumimos muslo y tibia ~50/50 de la entrepierna
  const muslo = inseam_mm * 0.5;
  const tibia = inseam_mm * 0.5;

  // Coordenadas relativas (origen en la cadera/altura del asiento)
  const pegX = footpegHorizontalOffsetMm(moto.tipo, moto.wheelbase_mm);
  const pegY = p.altura_estriberas_mm - moto.altura_asiento_mm; // negativo (hacia abajo)
  const dHipPeg = Math.sqrt(pegX * pegX + pegY * pegY);

  const anguloRodilla = angleFromSegmentsDeg(muslo, tibia, dHipPeg);

  // Cadera: aproximamos como flexión entre torso (vertical) y muslo (hacia estribera).
  // 0° = totalmente extendida hacia abajo, 180° = muslo hacia arriba (muy plegado).
  const thighAngleFromVertical = (Math.atan2(Math.abs(pegX), Math.abs(pegY) + 1e-6) * 180) / Math.PI;
  const anguloCadera = clamp(90 + thighAngleFromVertical, 60, 160);

  // Brazo: asumimos hombro por encima del asiento (torso) y algo adelantado.
  const shoulderY = moto.altura_asiento_mm + torso_mm * 0.9;
  const shoulderX = 60; // ligero adelantamiento del hombro respecto a cadera

  const barX = shoulderX + p.distancia_horizontal_manillar_mm;
  const barY = p.altura_manillar_mm;

  const dShoulderBar = Math.sqrt((barX - shoulderX) ** 2 + (barY - shoulderY) ** 2);
  const upperArm = brazo_mm * 0.5;
  const foreArm = brazo_mm * 0.5;
  const anguloCodo = angleFromSegmentsDeg(upperArm, foreArm, dShoulderBar);

  const alcance_suelo = reachToGround(moto.altura_asiento_mm, inseam_mm);

  const advertencias: string[] = [];

  // Validaciones geométricas básicas (si la distancia supera longitudes, quedan "estirados")
  if (dHipPeg > muslo + tibia + 20) {
    advertencias.push("La distancia asiento-estriberas parece demasiado larga para tu pierna (postura estirada).");
  }
  if (dShoulderBar > upperArm + foreArm + 20) {
    advertencias.push("El alcance al manillar parece largo para tu brazo (puede cargar muñecas/hombros).");
  }

  // Rangos típicos (aprox) de comodidad:
  // rodilla: 85–130; codo: 90–140; cadera: 85–125
  const rodillaPenalty =
    anguloRodilla < 80 ? 3 : anguloRodilla > 135 ? 2 : anguloRodilla < 90 ? 1 : 0;
  const codoPenalty =
    anguloCodo < 85 ? 3 : anguloCodo > 150 ? 2 : anguloCodo < 95 ? 1 : 0;
  const caderaPenalty =
    anguloCadera < 80 ? 2 : anguloCadera > 135 ? 2 : anguloCadera < 90 ? 1 : 0;

  if (anguloRodilla < 85) advertencias.push("Rodilla muy cerrada: puede fatigar en trayectos largos.");
  if (anguloRodilla > 140) advertencias.push("Rodilla muy abierta: puede reducir control en conducción off-road.");
  if (anguloCodo < 90) advertencias.push("Codo muy cerrado: postura compacta, puede cargar hombros.");
  if (anguloCodo > 150) advertencias.push("Codo muy abierto: puedes ir muy estirado hacia el manillar.");
  if (alcance_suelo === "no_alcanza") advertencias.push("No alcanzas el suelo cómodamente: ojo en maniobras y paradas.");
  if (alcance_suelo === "punta_pie") advertencias.push("Llegas de puntillas: puede requerir técnica en paradas.");

  // Penaliza un poco por peso en off-road (más demanda física).
  const weightPenalty = peso_piloto_kg > 105 ? 1 : 0;

  let comodidad = 10;
  comodidad -= rodillaPenalty + codoPenalty + caderaPenalty + weightPenalty;
  if (alcance_suelo === "no_alcanza") comodidad -= 2;
  if (moto.tipo === "sport") comodidad -= 1;
  if (moto.tipo === "cruiser" && moto.altura_asiento_mm < 700) comodidad += 0.5;
  comodidad = clamp(Math.round(comodidad), 1, 10);

  return {
    angulo_rodilla_grados: Math.round(anguloRodilla),
    angulo_cadera_grados: Math.round(anguloCadera),
    angulo_codo_grados: Math.round(anguloCodo),
    alcance_suelo,
    comodidad_score: comodidad,
    advertencias,
  };
}

