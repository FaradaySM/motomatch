"use client";

import { useMemo, useState } from "react";

type TipoTerreno = "arena" | "grava" | "roca" | "mixto";

type Moto = {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  tipo: string;
  altura_asiento_mm: number;
  peso_kg: number;
  deposito_litros: number;
  potencia_cv: number;
  par_nm: number;
  carenado: string;
  compatible_bidon_auxiliar: boolean;
  litros_bidon_max: number;
};

type Recommendation = {
  moto: Moto;
  autonomia_real_offroad_km: number;
  consumo_offroad_ajustado_l100km: number;
  km_objetivo_aprox: number;
  necesita_bidon_auxiliar: boolean;
  bidon_recomendado: boolean;
  explicacion_es: string;
  score: number;
};

type ApiResponse = {
  escenario: {
    region: string;
    tipo_terreno: TipoTerreno;
    dias_viaje: number;
    altura_piloto_cm: number;
    peso_piloto_kg: number;
    tiene_bidon_auxiliar: boolean;
    km_objetivo_aprox: number;
  };
  recomendaciones: Recommendation[];
  error?: string;
};

function Spinner() {
  return (
    <div className="inline-flex items-center justify-center gap-3">
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#D85A30]"
        aria-hidden
      />
      <span className="text-sm text-zinc-300">Analizando…</span>
    </div>
  );
}

function TerrenoBadge({ tipo }: { tipo: TipoTerreno }) {
  const label =
    tipo === "arena"
      ? "Arena"
      : tipo === "grava"
        ? "Grava"
        : tipo === "roca"
          ? "Roca"
          : "Mixto";

  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-200">
      {label}
    </span>
  );
}

export default function OffroadScenarioPage() {
  const [region, setRegion] = useState("Andes");
  const [tipoTerreno, setTipoTerreno] = useState<TipoTerreno>("roca");
  const [diasViaje, setDiasViaje] = useState(4);
  const [alturaPiloto, setAlturaPiloto] = useState(175);
  const [pesoPiloto, setPesoPiloto] = useState(80);
  const [tieneBidon, setTieneBidon] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const diasHelp = useMemo(() => {
    if (diasViaje <= 3) return "Escapada corta, menos presión de autonomía.";
    if (diasViaje <= 10) return "Ruta media: autonomía y control importan mucho.";
    return "Expedición larga: plan de gasolina y piezas es clave.";
  }, [diasViaje]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);
    setLoading(true);

    try {
      const res = await fetch("/api/escenario/offroad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          tipo_terreno: tipoTerreno,
          dias_viaje: diasViaje,
          altura_piloto_cm: alturaPiloto,
          peso_piloto_kg: pesoPiloto,
          tiene_bidon_auxiliar: tieneBidon,
        }),
      });

      const json = (await res.json()) as ApiResponse;
      if (!res.ok) {
        setError(json?.error ?? "No se pudo analizar el escenario.");
        return;
      }
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[32rem] w-[32rem] rounded-full bg-[#D85A30]/20 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#D85A30]/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-10 sm:px-10 sm:pb-20 sm:pt-14">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D85A30]">
              MotoMatch
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Escenario: viaje off-road
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Introduce tu ruta y tu perfil. Calculamos autonomía real por terreno y te
              damos 3 motos que encajan con este escenario.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <TerrenoBadge tipo={tipoTerreno} />
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-300">{diasViaje} día(s)</span>
          </div>
        </header>

        <main className="mt-10 grid gap-8 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20"
            >
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-white">
                    Región o país del viaje
                  </label>
                  <input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Ej: Andes, Marruecos, Patagonia…"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-white">Tipo de terreno</label>
                  <select
                    value={tipoTerreno}
                    onChange={(e) => setTipoTerreno(e.target.value as TipoTerreno)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                  >
                    <option value="arena">Arena</option>
                    <option value="grava">Grava</option>
                    <option value="roca">Roca</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-white">Días de viaje</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={diasViaje}
                      onChange={(e) => setDiasViaje(Number(e.target.value))}
                      className="w-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                    />
                    <p className="text-xs leading-relaxed text-zinc-500">{diasHelp}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-end justify-between">
                    <label className="text-sm font-semibold text-white">Altura del piloto</label>
                    <span className="text-sm font-semibold text-[#D85A30]">
                      {alturaPiloto} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={210}
                    value={alturaPiloto}
                    onChange={(e) => setAlturaPiloto(Number(e.target.value))}
                    className="mt-3 w-full accent-[#D85A30]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-zinc-600">
                    <span>150</span>
                    <span>210</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-end justify-between">
                    <label className="text-sm font-semibold text-white">Peso del piloto</label>
                    <span className="text-sm font-semibold text-[#D85A30]">
                      {pesoPiloto} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={130}
                    value={pesoPiloto}
                    onChange={(e) => setPesoPiloto(Number(e.target.value))}
                    className="mt-3 w-full accent-[#D85A30]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-zinc-600">
                    <span>50</span>
                    <span>130</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">¿Tienes bidón auxiliar?</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Lo usamos para estimar autonomía con litros extra (si la moto lo admite).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "text-sm font-semibold transition",
                        !tieneBidon ? "text-white" : "text-zinc-500",
                      ].join(" ")}
                    >
                      No
                    </span>
                    <button
                      type="button"
                      onClick={() => setTieneBidon((v) => !v)}
                      className={[
                        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition",
                        tieneBidon
                          ? "border-[#D85A30]/40 bg-[#D85A30]/25"
                          : "border-white/10 bg-white/[0.06]",
                      ].join(" ")}
                      aria-pressed={tieneBidon}
                      aria-label="Toggle bidón auxiliar"
                    >
                      <span
                        className={[
                          "inline-block h-6 w-6 transform rounded-full bg-white transition",
                          tieneBidon ? "translate-x-7 bg-[#D85A30]" : "translate-x-1 bg-white",
                        ].join(" ")}
                      />
                    </button>
                    <span
                      className={[
                        "text-sm font-semibold transition",
                        tieneBidon ? "text-[#D85A30]" : "text-zinc-500",
                      ].join(" ")}
                    >
                      Sí
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center rounded-full bg-[#D85A30] px-6 text-base font-semibold text-white shadow-lg shadow-[#D85A30]/25 transition-colors duration-200 hover:bg-[#c24f2a] active:bg-[#b84826] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Spinner /> : "Analizar mi ruta"}
                </button>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}
            </form>
          </section>

          <section className="lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Recomendaciones</h2>
                {data?.escenario ? (
                  <p className="text-sm text-zinc-400">
                    Objetivo aprox:{" "}
                    <span className="font-semibold text-zinc-200">
                      {data.escenario.km_objetivo_aprox} km
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Completa el formulario y ejecuta el análisis.
                  </p>
                )}
              </div>

              <div className="mt-6 grid gap-5">
                {data?.recomendaciones?.length ? (
                  data.recomendaciones.map((r) => (
                    <article
                      key={r.moto.id}
                      className="group rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-[#D85A30]/35"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {r.moto.marca} {r.moto.modelo}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-400">
                            {r.moto.tipo} • {r.moto.año} • {r.moto.peso_kg} kg • asiento{" "}
                            {r.moto.altura_asiento_mm} mm
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Autonomía real (off-road)
                          </p>
                          <p className="text-2xl font-semibold text-[#D85A30]">
                            {r.autonomia_real_offroad_km} km
                          </p>
                          <p className="text-xs text-zinc-500">
                            ~{r.consumo_offroad_ajustado_l100km} L/100km
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {r.necesita_bidon_auxiliar ? (
                          <span className="rounded-full border border-[#D85A30]/40 bg-[#D85A30]/15 px-3 py-1 text-xs font-semibold text-[#ffb89f]">
                            Puede necesitar bidón / gasolina planificada
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                            Rango suficiente para el objetivo
                          </span>
                        )}
                        {r.bidon_recomendado ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-zinc-200">
                            Bidón recomendado
                          </span>
                        ) : null}
                      </div>

                      <pre className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                        {r.explicacion_es}
                      </pre>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                    <p className="text-sm leading-relaxed text-zinc-400">
                      Aquí aparecerán 3 motos recomendadas con su autonomía calculada para el
                      terreno y una explicación contextual.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

