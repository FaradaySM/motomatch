"use client";

import { useMemo, useState } from "react";
import {
  calcularPosturaPiloto,
  calcularPuntosErgonomicos,
  type MotoErgonomiaInput,
  type PosturaPiloto,
  type PuntosErgonomicos,
  type TipoMoto,
} from "@/app/lib/ergonomia";

type FormState = {
  marca: string;
  modelo: string;
  año: number;
  tipo: TipoMoto;

  altura_asiento_mm: number;
  wheelbase_mm: number;
  trail_mm: number;
  angulo_direccion_grados: number;
  altura_suelo_mm: number;
  peso_kg: number;
  deposito_litros: number;
  potencia_cv: number;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-white">{label}</label>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function clampNumberInput(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export default function AdminPage() {
  const [form, setForm] = useState<FormState>({
    marca: "",
    modelo: "",
    año: new Date().getFullYear(),
    tipo: "adventure",
    altura_asiento_mm: 850,
    wheelbase_mm: 1500,
    trail_mm: 110,
    angulo_direccion_grados: 26,
    altura_suelo_mm: 240,
    peso_kg: 210,
    deposito_litros: 18,
    potencia_cv: 80,
  });

  const [ergonomia, setErgonomia] = useState<PuntosErgonomicos | null>(null);
  const [postura, setPostura] = useState<PosturaPiloto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [alturaPiloto, setAlturaPiloto] = useState(175);
  const [pesoPiloto, setPesoPiloto] = useState(80);

  const motoErgoInput: MotoErgonomiaInput = useMemo(
    () => ({
      altura_asiento_mm: form.altura_asiento_mm,
      angulo_direccion_grados: form.angulo_direccion_grados,
      trail_mm: form.trail_mm,
      wheelbase_mm: form.wheelbase_mm,
      altura_suelo_mm: form.altura_suelo_mm,
      tipo: form.tipo,
    }),
    [form]
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onCalcularErgonomia() {
    setError(null);
    try {
      const out = calcularPuntosErgonomicos(motoErgoInput);
      setErgonomia(out);
    } catch (e: unknown) {
      setErgonomia(null);
      setError(e instanceof Error ? e.message : "Error calculando ergonomía.");
    }
  }

  function onVerPostura() {
    setError(null);
    try {
      const out = calcularPosturaPiloto(motoErgoInput, alturaPiloto, pesoPiloto);
      setPostura(out);
    } catch (e: unknown) {
      setPostura(null);
      setError(e instanceof Error ? e.message : "Error calculando postura.");
    }
  }

  const jsonMotoPreview = useMemo(() => {
    // Estructura mínima para agregar al dataset (no persiste en disco).
    return {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      año: form.año,
      tipo: form.tipo,
      altura_asiento_mm: form.altura_asiento_mm,
      wheelbase_mm: form.wheelbase_mm,
      trail_mm: form.trail_mm,
      angulo_direccion_grados: form.angulo_direccion_grados,
      altura_suelo_mm: form.altura_suelo_mm,
      peso_kg: form.peso_kg,
      deposito_litros: form.deposito_litros,
      potencia_cv: form.potencia_cv,
      ergonomia_calculada: ergonomia,
      postura_preview: postura
        ? {
            altura_piloto_cm: alturaPiloto,
            peso_piloto_kg: pesoPiloto,
            ...postura,
          }
        : null,
    };
  }, [alturaPiloto, ergonomia, form, pesoPiloto, postura]);

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
              Admin (interno)
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Panel interno para preparar nuevas motos y validar ergonomía/postura con el motor
              geométrico.
            </p>
          </div>

          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
            No pública
          </span>
        </header>

        <main className="mt-10 grid gap-8">
          <Card title="SECCIÓN 1 — Identificación">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Marca">
                <input
                  value={form.marca}
                  onChange={(e) => set("marca", e.target.value)}
                  placeholder="Ej: Honda"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="Modelo">
                <input
                  value={form.modelo}
                  onChange={(e) => set("modelo", e.target.value)}
                  placeholder="Ej: Africa Twin"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="Año">
                <input
                  type="number"
                  value={form.año}
                  onChange={(e) => set("año", clampNumberInput(Number(e.target.value), 1980, 2035))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="Tipo">
                <select
                  value={form.tipo}
                  onChange={(e) => set("tipo", e.target.value as TipoMoto)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                >
                  <option value="naked">naked</option>
                  <option value="adventure">adventure</option>
                  <option value="cruiser">cruiser</option>
                  <option value="sport">sport</option>
                  <option value="touring">touring</option>
                  <option value="enduro">enduro</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card title="SECCIÓN 2 — Datos públicos de ficha técnica">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="altura_asiento_mm">
                <input
                  type="number"
                  value={form.altura_asiento_mm}
                  onChange={(e) =>
                    set("altura_asiento_mm", clampNumberInput(Number(e.target.value), 600, 1100))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="wheelbase_mm">
                <input
                  type="number"
                  value={form.wheelbase_mm}
                  onChange={(e) => set("wheelbase_mm", clampNumberInput(Number(e.target.value), 1200, 1800))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="trail_mm">
                <input
                  type="number"
                  value={form.trail_mm}
                  onChange={(e) => set("trail_mm", clampNumberInput(Number(e.target.value), 70, 160))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>

              <Field label="angulo_direccion_grados" hint='Obtenible desde el calibrador'>
                <input
                  type="number"
                  value={form.angulo_direccion_grados}
                  onChange={(e) =>
                    set("angulo_direccion_grados", clampNumberInput(Number(e.target.value), 10, 45))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="altura_suelo_mm">
                <input
                  type="number"
                  value={form.altura_suelo_mm}
                  onChange={(e) => set("altura_suelo_mm", clampNumberInput(Number(e.target.value), 90, 350))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="peso_kg">
                <input
                  type="number"
                  value={form.peso_kg}
                  onChange={(e) => set("peso_kg", clampNumberInput(Number(e.target.value), 90, 420))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="deposito_litros">
                <input
                  type="number"
                  value={form.deposito_litros}
                  onChange={(e) => set("deposito_litros", clampNumberInput(Number(e.target.value), 5, 35))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
              <Field label="potencia_cv">
                <input
                  type="number"
                  value={form.potencia_cv}
                  onChange={(e) => set("potencia_cv", clampNumberInput(Number(e.target.value), 10, 250))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
                />
              </Field>
            </div>
          </Card>

          <Card
            title="SECCIÓN 3 — Datos calculados automáticamente"
            right={
              <button
                type="button"
                onClick={onCalcularErgonomia}
                className="flex h-11 items-center justify-center rounded-full bg-[#D85A30] px-5 text-sm font-semibold text-white shadow-lg shadow-[#D85A30]/25 transition-colors duration-200 hover:bg-[#c24f2a] active:bg-[#b84826]"
              >
                Calcular ergonomía
              </button>
            }
          >
            {ergonomia ? (
              <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    altura_manillar_mm
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {ergonomia.altura_manillar_mm}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    distancia_horizontal_asiento_manillar_mm
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {ergonomia.distancia_horizontal_asiento_manillar_mm}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    diferencia_altura_asiento_manillar_mm
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {ergonomia.diferencia_altura_asiento_manillar_mm}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    angulo_brazos_grados
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#D85A30]">
                    {ergonomia.angulo_brazos_grados}°
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    posicion_relativa_manillar
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#D85A30]">
                    {ergonomia.posicion_relativa_manillar}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    clasificacion_postura
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#D85A30]">
                    {ergonomia.clasificacion_postura}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-zinc-400">
                  Pulsa <span className="font-semibold text-zinc-200">Calcular ergonomía</span>{" "}
                  para ver resultados.
                </p>
              </div>
            )}
          </Card>

          <Card
            title="SECCIÓN 4 — Preview de postura"
            right={
              <button
                type="button"
                onClick={onVerPostura}
                className="flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06]"
              >
                Ver postura
              </button>
            }
          >
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 lg:col-span-1">
                <div>
                  <div className="flex items-end justify-between">
                    <p className="text-sm font-semibold text-white">altura_piloto_cm</p>
                    <span className="text-sm font-semibold text-[#D85A30]">{alturaPiloto} cm</span>
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

                <div className="mt-6">
                  <div className="flex items-end justify-between">
                    <p className="text-sm font-semibold text-white">peso_piloto_kg</p>
                    <span className="text-sm font-semibold text-[#D85A30]">{pesoPiloto} kg</span>
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
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 lg:col-span-2">
                {postura ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          angulo_codo
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-white">
                          {postura.angulo_codo_grados}°
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          comodidad
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[#D85A30]">
                          {postura.comodidad_score}/10
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-zinc-200">
                        alcance_suelo: {postura.alcance_suelo}
                      </span>
                      {postura.advertencias.map((w) => (
                        <span
                          key={w}
                          className="rounded-full border border-[#D85A30]/40 bg-[#D85A30]/15 px-3 py-1 text-xs font-semibold text-[#ffb89f]"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-400">
                    Ajusta sliders y pulsa{" "}
                    <span className="font-semibold text-zinc-200">Ver postura</span>.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card title="Vista previa (JSON)">
            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-5 text-xs leading-relaxed text-zinc-200">
              {JSON.stringify(jsonMotoPreview, null, 2)}
            </pre>
          </Card>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

