import { recommendOffroad, type OffroadRequest, type TipoTerreno } from "@/lib/offroad/recommender";
import Anthropic from "@anthropic-ai/sdk";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function basicNarrativeEs(args: {
  escenario: {
    region: string;
    tipo_terreno: TipoTerreno;
    dias_viaje: number;
    altura_piloto_cm: number;
    peso_piloto_kg: number;
    tiene_bidon_auxiliar: boolean;
    km_objetivo_aprox: number;
  };
  moto: {
    marca: string;
    modelo: string;
    año: number;
    tipo: string;
    peso_kg: number;
    altura_asiento_mm: number;
    deposito_litros: number;
    potencia_cv: number;
    par_nm: number;
    carenado: string;
    compatible_bidon_auxiliar: boolean;
    litros_bidon_max: number;
  };
  autonomia_real_offroad_km: number;
  consumo_offroad_ajustado_l100km: number;
  necesita_bidon_auxiliar: boolean;
  bidon_recomendado: boolean;
}): string {
  const { escenario, moto } = args;

  const terrenoLabel =
    escenario.tipo_terreno === "arena"
      ? "arena"
      : escenario.tipo_terreno === "grava"
        ? "grava"
        : escenario.tipo_terreno === "roca"
          ? "roca"
          : "terreno mixto";

  const bidonText = escenario.tiene_bidon_auxiliar
    ? "Como indicas que llevas bidón auxiliar, tienes margen adicional si la moto lo admite."
    : moto.compatible_bidon_auxiliar
      ? "Si te preocupa el alcance, esta moto admite bidón auxiliar para extender el rango."
      : "Esta moto no está pensada para montar bidón auxiliar fácilmente, así que conviene planificar gasolina.";

  const needText = args.necesita_bidon_auxiliar
    ? `Para este viaje (~${escenario.km_objetivo_aprox} km en total), el rango puede quedarse justo sin extra; conviene llevar bidón o asegurar puntos de repostaje.`
    : `Para este viaje (~${escenario.km_objetivo_aprox} km en total), el rango estimado debería cubrir el plan con menos estrés.`;

  const specialText =
    moto.tipo === "enduro"
      ? "Su enfoque enduro ayuda cuando el terreno se complica y necesitas precisión a baja velocidad."
      : moto.tipo === "adventure"
        ? "Como adventure, equilibra control fuera del asfalto con capacidad de carga para varios días."
        : "Aunque no es una off-road pura, puede funcionar si priorizas tramos concretos y conduces con margen.";

  return [
    `${moto.marca} ${moto.modelo} (${moto.año}) es una candidata sólida para un viaje off-road por ${escenario.region} en ${terrenoLabel} durante ${escenario.dias_viaje} día(s).`,
    `Con tu perfil (${escenario.altura_piloto_cm} cm, ${escenario.peso_piloto_kg} kg), una altura de asiento de ${moto.altura_asiento_mm} mm y ${moto.peso_kg} kg influyen en el control a baja velocidad y en maniobras en terreno suelto.`,
    `Autonomía real estimada en este terreno: ~${args.autonomia_real_offroad_km} km (consumo ajustado ~${args.consumo_offroad_ajustado_l100km} L/100km) con depósito de ${moto.deposito_litros} L.`,
    needText,
    bidonText,
    `${specialText} Además, su motor (${moto.potencia_cv} cv / ${moto.par_nm} Nm) te da margen para subidas, arena o carga, y el carenado ${moto.carenado} condiciona la fatiga en enlaces.`,
  ].join(" ");
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Falta configurar ANTHROPIC_API_KEY en el servidor." }, { status: 500 });
  }

  // Paso 2: filtrado local (motos.json + heurística de autonomía/terreno)
  const result = await recommendOffroad(parsed.data);
  if (!result.recomendaciones.length) {
    return Response.json({ error: "No se pudieron cargar motos desde data/motos.json." }, { status: 500 });
  }

  const top3 = result.recomendaciones.slice(0, 3);

  // Paso 3: construir prompt con escenario + 3 motos filtradas + cálculo de autonomía
  const promptPayload = {
    escenario: {
      region: result.escenario.region,
      tipo_terreno: result.escenario.tipo_terreno,
      dias_viaje: result.escenario.dias_viaje,
      altura_piloto_cm: result.escenario.altura_piloto_cm,
      peso_piloto_kg: result.escenario.peso_piloto_kg,
      tiene_bidon_auxiliar: result.escenario.tiene_bidon_auxiliar,
      km_objetivo_aprox: result.escenario.km_objetivo_aprox,
    },
    motos: top3.map((r) => ({
      id: r.moto.id,
      marca: r.moto.marca,
      modelo: r.moto.modelo,
      año: r.moto.año,
      tipo: r.moto.tipo,
      altura_asiento_mm: r.moto.altura_asiento_mm,
      peso_kg: r.moto.peso_kg,
      deposito_litros: r.moto.deposito_litros,
      potencia_cv: r.moto.potencia_cv,
      par_nm: r.moto.par_nm,
      carenado: r.moto.carenado,
      compatible_bidon_auxiliar: r.moto.compatible_bidon_auxiliar,
      litros_bidon_max: r.moto.litros_bidon_max,
      consumo_offroad_ajustado_l100km: r.consumo_offroad_ajustado_l100km,
      autonomia_real_offroad_km: r.autonomia_real_offroad_km,
      necesita_bidon_auxiliar: r.necesita_bidon_auxiliar,
      bidon_recomendado: r.bidon_recomendado,
    })),
  };

  const system = [
    "Eres un asesor experto en motos y viajes off-road.",
    "Responde SIEMPRE en español y con tono claro, práctico y específico al escenario.",
    "No inventes especificaciones que no estén en el JSON provisto.",
    "Debes mencionar la autonomía real calculada y si necesita bidón auxiliar.",
    "Devuelve SOLO JSON válido, sin markdown ni texto extra.",
  ].join(" ");

  const user = [
    "Genera un análisis narrativo por cada moto para este escenario de vida y viaje off-road.",
    "Requisitos estrictos de salida:",
    '- Devuelve un array JSON llamado "analisis" con 3 elementos.',
    '- Cada elemento: { "id": number, "analisis_es": string }',
    "- El analisis_es debe ser 4-7 frases, mencionando: terreno, región, días, autonomía_real_offroad_km, si necesita bidón auxiliar, y qué hace a esa moto especial para ESTE viaje.",
    "",
    "Datos (JSON):",
    JSON.stringify(promptPayload),
  ].join("\n");

  // Paso 4: pedir a Claude el análisis narrativo
  console.log(`Llamando a Claude con ${top3.length} motos`);
  const client = new Anthropic({ apiKey });
  let claudeText = "";
  let claudeFailed = false;
  try {
    const completion = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: user }],
    });

    claudeText = completion.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Error llamando a Claude (Anthropic):", { message, stack, err });
    claudeFailed = true;
  }

  type ClaudeOut = { analisis: Array<{ id: number; analisis_es: string }> };

  let parsedClaude: ClaudeOut | null = null;
  try {
    parsedClaude = JSON.parse(claudeText) as ClaudeOut;
  } catch {
    parsedClaude = null;
  }

  const byId = new Map<number, string>();
  if (parsedClaude?.analisis?.length) {
    for (const item of parsedClaude.analisis) {
      if (typeof item?.id === "number" && typeof item?.analisis_es === "string" && item.analisis_es.trim()) {
        byId.set(item.id, item.analisis_es.trim());
      }
    }
  }

  // Paso 5: devolver 3 motos con análisis narrativo de Claude (fallback a explicación local si algo falla)
  return Response.json({
    escenario: result.escenario,
    recomendaciones: top3.map((r) => ({
      ...r,
      explicacion_es:
        byId.get(r.moto.id) ??
        (claudeFailed
          ? basicNarrativeEs({
              escenario: result.escenario,
              moto: r.moto,
              autonomia_real_offroad_km: r.autonomia_real_offroad_km,
              consumo_offroad_ajustado_l100km: r.consumo_offroad_ajustado_l100km,
              necesita_bidon_auxiliar: r.necesita_bidon_auxiliar,
              bidon_recomendado: r.bidon_recomendado,
            })
          : r.explicacion_es),
      fuente_explicacion: byId.has(r.moto.id) ? "claude" : claudeFailed ? "local_fallback" : "local",
    })),
  });
}

