import { recommendOffroad, type OffroadRequest, type TipoTerreno } from "@/lib/offroad/recommender";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseBody(body: unknown): { ok: true; data: OffroadRequest } | { ok: false; error: string } {
  const obj = (body ?? {}) as Record<string, unknown>;
  const region = obj.region;
  const tipo_terreno = obj.tipo_terreno;
  const dias_viaje = obj.dias_viaje;
  const altura_piloto_cm = obj.altura_piloto_cm;
  const peso_piloto_kg = obj.peso_piloto_kg;
  const tiene_bidon_auxiliar = obj.tiene_bidon_auxiliar;

  if (typeof region !== "string" || region.trim().length < 2) {
    return { ok: false, error: "region debe ser un string (>=2 caracteres)." };
  }
  if (tipo_terreno !== "arena" && tipo_terreno !== "grava" && tipo_terreno !== "roca" && tipo_terreno !== "mixto") {
    return { ok: false, error: "tipo_terreno debe ser: arena/grava/roca/mixto." };
  }
  if (!isFiniteNumber(dias_viaje) || dias_viaje < 1 || dias_viaje > 30) {
    return { ok: false, error: "dias_viaje debe ser un número entre 1 y 30." };
  }
  if (!isFiniteNumber(altura_piloto_cm) || altura_piloto_cm < 150 || altura_piloto_cm > 210) {
    return { ok: false, error: "altura_piloto_cm debe estar entre 150 y 210." };
  }
  if (!isFiniteNumber(peso_piloto_kg) || peso_piloto_kg < 50 || peso_piloto_kg > 130) {
    return { ok: false, error: "peso_piloto_kg debe estar entre 50 y 130." };
  }
  if (typeof tiene_bidon_auxiliar !== "boolean") {
    return { ok: false, error: "tiene_bidon_auxiliar debe ser boolean." };
  }

  return {
    ok: true,
    data: {
      region: region.trim(),
      tipo_terreno: tipo_terreno as TipoTerreno,
      dias_viaje,
      altura_piloto_cm,
      peso_piloto_kg,
      tiene_bidon_auxiliar,
    },
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const result = await recommendOffroad(parsed.data);
  if (result.recomendaciones.length === 0) {
    return Response.json({ error: "No se pudieron cargar motos desde data/motos.json." }, { status: 500 });
  }
  return Response.json(result);
}

