import { promises as fs } from "fs";
import path from "path";

export type TipoTerreno = "arena" | "grava" | "roca" | "mixto";

export type Moto = {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  tipo: "naked" | "adventure" | "cruiser" | "sport" | "touring" | "enduro";
  altura_asiento_mm: number;
  peso_kg: number;
  deposito_litros: number;
  consumo_carretera_l100km: number;
  consumo_offroad_l100km: number;
  autonomia_carretera_km: number;
  autonomia_offroad_km: number;
  potencia_cv: number;
  par_nm: number;
  carga_util_kg: number;
  asiento_pasajero_serie: boolean;
  carenado: "ninguno" | "parcial" | "total";
  disponibilidad_piezas_global: 1 | 2 | 3 | 4 | 5;
  compatible_bidon_auxiliar: boolean;
  litros_bidon_max: number;
  terrenos_recomendados: string[];
  carnet_requerido: string;
  descripcion_corta_es: string;
  descripcion_corta_en: string;
};

export type OffroadRequest = {
  region: string;
  tipo_terreno: TipoTerreno;
  dias_viaje: number;
  altura_piloto_cm: number;
  peso_piloto_kg: number;
  tiene_bidon_auxiliar: boolean;
};

export type OffroadRecommendation = {
  moto: Moto;
  score: number;
  autonomia_real_offroad_km: number;
  consumo_offroad_ajustado_l100km: number;
  km_objetivo_aprox: number;
  necesita_bidon_auxiliar: boolean;
  bidon_recomendado: boolean;
  explicacion_es: string;
};

export type OffroadResponse = {
  escenario: OffroadRequest & { km_objetivo_aprox: number };
  recomendaciones: OffroadRecommendation[];
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function terrainFactor(tipo: TipoTerreno): number {
  switch (tipo) {
    case "arena":
      return 1.25;
    case "grava":
      return 1.1;
    case "roca":
      return 1.3;
    case "mixto":
      return 1.15;
  }
}

function kmPorDia(tipo: TipoTerreno): number {
  switch (tipo) {
    case "arena":
      return 120;
    case "grava":
      return 160;
    case "roca":
      return 110;
    case "mixto":
      return 140;
  }
}

function normalizeRegion(region: string): string {
  return region.trim().toLowerCase();
}

function terrainTokens(tipo: TipoTerreno): string[] {
  switch (tipo) {
    case "arena":
      return ["arena", "desierto", "pista"];
    case "grava":
      return ["pista", "grava", "asfalto"];
    case "roca":
      return ["montaña", "roca", "pista"];
    case "mixto":
      return ["pista", "asfalto", "montaña"];
  }
}

function offroadBaseScore(moto: Moto): number {
  switch (moto.tipo) {
    case "enduro":
      return 35;
    case "adventure":
      return 30;
    case "touring":
      return 10;
    case "naked":
      return 5;
    case "cruiser":
      return 0;
    case "sport":
      return 0;
  }
}

function computeAdjustedOffroadConsumption(moto: Moto, tipo_terreno: TipoTerreno, peso_piloto_kg: number): number {
  const terrain = terrainFactor(tipo_terreno);
  const riderPenalty = 1 + clamp((peso_piloto_kg - 75) / 220, 0, 0.6);
  return moto.consumo_offroad_l100km * terrain * riderPenalty;
}

function autonomiaKm(litros: number, consumo_l100km: number): number {
  if (consumo_l100km <= 0) return 0;
  return Math.floor((litros / consumo_l100km) * 100);
}

function litrosExtraDisponibles(moto: Moto, tiene_bidon_auxiliar: boolean): number {
  if (!tiene_bidon_auxiliar) return 0;
  if (!moto.compatible_bidon_auxiliar) return 0;
  return Math.max(0, moto.litros_bidon_max);
}

function seatFitScore(moto: Moto, altura_piloto_cm: number): { score: number; etiqueta: "ok" | "alta" | "baja" } {
  const hMm = altura_piloto_cm * 10;
  const low = hMm * 0.45;
  const high = hMm * 0.58;

  if (moto.altura_asiento_mm < low) {
    const delta = low - moto.altura_asiento_mm;
    return { score: -clamp(delta / 20, 0, 8), etiqueta: "baja" };
  }
  if (moto.altura_asiento_mm > high) {
    const delta = moto.altura_asiento_mm - high;
    return { score: -clamp(delta / 20, 0, 12), etiqueta: "alta" };
  }
  return { score: 6, etiqueta: "ok" };
}

function terrainMatchScore(moto: Moto, tipo_terreno: TipoTerreno): number {
  const rec = new Set(moto.terrenos_recomendados.map((t) => t.toLowerCase()));
  const tokens = terrainTokens(tipo_terreno);
  const hits = tokens.reduce((acc, tok) => acc + (rec.has(tok) ? 1 : 0), 0);
  if (tipo_terreno === "mixto") return hits >= 2 ? 16 : hits === 1 ? 10 : 2;
  return hits >= 1 ? 18 : 3;
}

function weightScore(moto: Moto): number {
  const score = 12 - (moto.peso_kg - 140) / 5;
  return clamp(score, -20, 12);
}

function partsScore(moto: Moto, region: string): number {
  const r = normalizeRegion(region);
  const base = moto.disponibilidad_piezas_global * 2;
  const remoteHint =
    r.includes("patagonia") ||
    r.includes("sahara") ||
    r.includes("atlas") ||
    r.includes("andes") ||
    r.includes("amazon") ||
    r.includes("desierto");

  if (!remoteHint) return base;
  return moto.disponibilidad_piezas_global >= 4 ? base + 2 : base - 4;
}

function buildExplanation(args: {
  moto: Moto;
  req: OffroadRequest;
  consumoAjustado: number;
  autonomiaSinBidon: number;
  autonomiaConBidon: number;
  kmObjetivo: number;
  necesitaBidon: boolean;
  seatFit: "ok" | "alta" | "baja";
}): string {
  const { moto, req, consumoAjustado, autonomiaSinBidon, autonomiaConBidon, kmObjetivo, necesitaBidon, seatFit } = args;

  const terreno = req.tipo_terreno;
  const seatTxt =
    seatFit === "ok"
      ? "altura de asiento razonable para tu estatura"
      : seatFit === "alta"
        ? "asiento alto: mejor si tienes experiencia y buena técnica a baja velocidad"
        : "asiento bajo: fácil de controlar en maniobras lentas, pero menos recorrido/altura típica de off-road duro";

  const bidonTxt = req.tiene_bidon_auxiliar
    ? `Con bidón auxiliar, la autonomía estimada sube hasta ~${autonomiaConBidon} km.`
    : moto.compatible_bidon_auxiliar
      ? `Sin bidón auxiliar, estimamos ~${autonomiaSinBidon} km; esta moto admite bidón si necesitas extender alcance.`
      : `Sin bidón auxiliar, estimamos ~${autonomiaSinBidon} km; no es una plataforma típica para bidón auxiliar.`;

  const needTxt =
    kmObjetivo <= autonomiaSinBidon
      ? `Para ${req.dias_viaje} día(s) en ${terreno}, el rango estimado cubre el objetivo (~${kmObjetivo} km) sin repostajes extra exigentes.`
      : necesitaBidon
        ? `El objetivo (~${kmObjetivo} km) supera el rango sin extra; aquí el bidón auxiliar / planificación de gasolina es clave.`
        : `El objetivo (~${kmObjetivo} km) está cerca del límite; conviene planificar puntos de repostaje.`;

  const consumoTxt = `Consumo off-road ajustado para ${terreno} y tu peso: ~${consumoAjustado.toFixed(1)} L/100km.`;

  return [
    `${moto.marca} ${moto.modelo} (${moto.tipo}) encaja bien con un viaje off-road en ${req.region}.`,
    `- Control y ergonomía: ${seatTxt}.`,
    `- Terreno: mejor margen fuera de asfalto que motos enfocadas a carretera.`,
    `- Autonomía: ${consumoTxt} ${bidonTxt}`,
    `- Escenario: ${needTxt}`,
  ].join("\n");
}

async function readMotosFromDisk(): Promise<Moto[]> {
  const filePath = path.join(process.cwd(), "data", "motos.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as Moto[];
}

export async function recommendOffroad(req: OffroadRequest): Promise<OffroadResponse> {
  const motos = await readMotosFromDisk();
  if (motos.length === 0) {
    return {
      escenario: { ...req, km_objetivo_aprox: 0 },
      recomendaciones: [],
    };
  }

  const kmObjetivo = Math.round(req.dias_viaje * kmPorDia(req.tipo_terreno));

  const ranked = motos
    .map((moto) => {
      const consumoAjustado = computeAdjustedOffroadConsumption(moto, req.tipo_terreno, req.peso_piloto_kg);
      const autonomiaSinBidon = autonomiaKm(moto.deposito_litros, consumoAjustado);
      const extra = litrosExtraDisponibles(moto, req.tiene_bidon_auxiliar);
      const autonomiaConBidon = autonomiaKm(moto.deposito_litros + extra, consumoAjustado);

      const seat = seatFitScore(moto, req.altura_piloto_cm);
      const terrain = terrainMatchScore(moto, req.tipo_terreno);

      const needsBidon = kmObjetivo > autonomiaSinBidon && moto.compatible_bidon_auxiliar;
      const stillShort = req.tiene_bidon_auxiliar ? kmObjetivo > autonomiaConBidon : kmObjetivo > autonomiaSinBidon;

      const base = offroadBaseScore(moto);
      const wScore = weightScore(moto);
      const pScore = partsScore(moto, req.region);

      const score =
        base +
        terrain +
        seat.score +
        wScore +
        pScore +
        (req.tiene_bidon_auxiliar ? (kmObjetivo <= autonomiaConBidon ? 14 : -10) : kmObjetivo <= autonomiaSinBidon ? 14 : -6) +
        (stillShort ? -18 : 0);

      const autonomiaReal = req.tiene_bidon_auxiliar ? autonomiaConBidon : autonomiaSinBidon;

      return {
        moto,
        score,
        consumoAjustado,
        autonomiaSinBidon,
        autonomiaConBidon,
        autonomiaReal,
        seatFit: seat.etiqueta,
        needsBidon,
        kmObjetivo,
      };
    })
    .sort((a, b) => b.score - a.score);

  const top3: OffroadRecommendation[] = ranked.slice(0, 3).map((r) => ({
    moto: r.moto,
    score: Math.round(r.score),
    autonomia_real_offroad_km: r.autonomiaReal,
    consumo_offroad_ajustado_l100km: Number(r.consumoAjustado.toFixed(2)),
    km_objetivo_aprox: kmObjetivo,
    necesita_bidon_auxiliar: kmObjetivo > r.autonomiaSinBidon,
    bidon_recomendado: r.needsBidon,
    explicacion_es: buildExplanation({
      moto: r.moto,
      req,
      consumoAjustado: r.consumoAjustado,
      autonomiaSinBidon: r.autonomiaSinBidon,
      autonomiaConBidon: r.autonomiaConBidon,
      kmObjetivo,
      necesitaBidon: kmObjetivo > r.autonomiaSinBidon,
      seatFit: r.seatFit,
    }),
  }));

  return {
    escenario: { ...req, km_objetivo_aprox: kmObjetivo },
    recomendaciones: top3,
  };
}

