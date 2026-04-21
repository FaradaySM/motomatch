"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

type Moto = {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  tipo: string;
};

type PuntoKey = "manillar" | "asiento" | "estriberas";

type Punto = {
  key: PuntoKey;
  xPct: number; // 0..100
  yPct: number; // 0..100
};

type CalibradorMode = "ergonomia" | "angulo_direccion";

type PuntoSimple = {
  xPct: number; // 0..100
  yPct: number; // 0..100
};

const ORDER: PuntoKey[] = ["manillar", "asiento", "estriberas"];
const COLOR: Record<PuntoKey, string> = {
  manillar: "#D85A30",
  asiento: "#3B82F6",
  estriberas: "#22C55E",
};

const YELLOW = "#FACC15";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function angleDegFromLineRelativeToHorizontal(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const raw = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI); // 0..180
  return Math.min(raw, 180 - raw); // 0..90
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CalibradorClient({ motos }: { motos: Moto[] }) {
  const sorted = useMemo(() => {
    return [...motos].sort((a, b) =>
      `${a.marca} ${a.modelo} ${a.año}`.localeCompare(`${b.marca} ${b.modelo} ${b.año}`)
    );
  }, [motos]);

  const [motoId, setMotoId] = useState<number>(() => sorted[0]?.id ?? 1);
  const moto = useMemo(() => sorted.find((m) => m.id === motoId) ?? sorted[0], [sorted, motoId]);

  const [imageFile, setImageFile] = useState("prueba.jpg");
  const [imageOk, setImageOk] = useState(true);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<CalibradorMode>("ergonomia");
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [forkPoints, setForkPoints] = useState<PuntoSimple[]>([]);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });

  const nextKey = mode === "ergonomia" ? (ORDER[puntos.length] ?? null) : null;
  const nextFork = mode === "angulo_direccion" ? (forkPoints.length < 2 ? forkPoints.length + 1 : null) : null;

  function reset() {
    if (mode === "ergonomia") setPuntos([]);
    else setForkPoints([]);
  }

  function resetAll() {
    setPuntos([]);
    setForkPoints([]);
  }

  function resizeCanvasToImage() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rect = img.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    setCanvasSize({ w, h });

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    if (mode === "ergonomia") {
      for (let i = 0; i < puntos.length; i++) {
        const p = puntos[i];
        const x = (p.xPct / 100) * w;
        const y = (p.yPct / 100) * h;

        const r = 6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = COLOR[p.key];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.stroke();

        const label = `${i + 1}. ${p.key}`;
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
        ctx.textBaseline = "middle";
        const padX = 8;
        const textW = ctx.measureText(label).width;
        const boxW = textW + padX * 2;
        const boxH = 22;
        const bx = clamp(x + 10, 8, w - boxW - 8);
        const by = clamp(y - 14, 8, h - boxH - 8);

        ctx.fillStyle = "rgba(10,10,11,0.7)";
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(244,244,245,0.95)";
        ctx.fillText(label, bx + padX, by + boxH / 2);
      }

      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "rgba(244,244,245,0.8)";
      ctx.fillText(
        nextKey ? `Click para marcar: ${nextKey}` : "Listo: 3 puntos marcados",
        12,
        18
      );
      return;
    }

    // Modo ángulo de dirección
    const p1 = forkPoints[0];
    const p2 = forkPoints[1];

    if (p1) {
      const x1 = (p1.xPct / 100) * w;
      // Línea vertical de referencia (punteada)
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(244,244,245,0.35)";
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, h);
      ctx.stroke();
      ctx.restore();
    }

    if (p1 && p2) {
      const x1 = (p1.xPct / 100) * w;
      const y1 = (p1.yPct / 100) * h;
      const x2 = (p2.xPct / 100) * w;
      const y2 = (p2.yPct / 100) * h;

      ctx.lineWidth = 3;
      ctx.strokeStyle = YELLOW;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const drawForkPoint = (idx: number, label: string) => {
      const p = forkPoints[idx];
      if (!p) return;
      const x = (p.xPct / 100) * w;
      const y = (p.yPct / 100) * h;
      const r = 6;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = YELLOW;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.stroke();

      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textBaseline = "middle";
      const padX = 8;
      const textW = ctx.measureText(label).width;
      const boxW = textW + padX * 2;
      const boxH = 22;
      const bx = clamp(x + 10, 8, w - boxW - 8);
      const by = clamp(y - 14, 8, h - boxH - 8);

      ctx.fillStyle = "rgba(10,10,11,0.7)";
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(244,244,245,0.95)";
      ctx.fillText(label, bx + padX, by + boxH / 2);
    };

    drawForkPoint(0, "1. horquilla (sup)");
    drawForkPoint(1, "2. horquilla (inf)");

    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "rgba(244,244,245,0.8)";
    ctx.fillText(
      nextFork ? `Click para marcar punto ${nextFork} (horquilla)` : "Listo: 2 puntos marcados",
      12,
      18
    );
  }

  function onCanvasClick(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;

    if (mode === "ergonomia") {
      if (!nextKey) return;
      setPuntos((prev) => [
        ...prev,
        { key: nextKey, xPct: Number(xPct.toFixed(2)), yPct: Number(yPct.toFixed(2)) },
      ]);
      return;
    }

    // Modo ángulo de dirección: 2 puntos (superior e inferior)
    setForkPoints((prev) => {
      if (prev.length >= 2) return prev;
      return [...prev, { xPct: Number(xPct.toFixed(2)), yPct: Number(yPct.toFixed(2)) }];
    });
  }

  useEffect(() => {
    // Redibuja al cambiar puntos.
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos, forkPoints, mode]);

  useEffect(() => {
    // Redimensiona/dibuja al cargar imagen o cambiar tamaño.
    resizeCanvasToImage();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile, imageOk]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const ro = new ResizeObserver(() => {
      resizeCanvasToImage();
      draw();
    });
    ro.observe(img);
    window.addEventListener("resize", resizeCanvasToImage);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resizeCanvasToImage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puntosByKey = useMemo(() => {
    const map = new Map<PuntoKey, Punto>();
    for (const p of puntos) map.set(p.key, p);
    return map;
  }, [puntos]);

  const angulosDireccion = useMemo(() => {
    if (forkPoints.length !== 2) return null;
    const w = canvasSize.w || 1;
    const h = canvasSize.h || 1;
    const p1 = forkPoints[0];
    const p2 = forkPoints[1];
    const x1 = (p1.xPct / 100) * w;
    const y1 = (p1.yPct / 100) * h;
    const x2 = (p2.xPct / 100) * w;
    const y2 = (p2.yPct / 100) * h;

    // Ángulo respecto a horizontal: vertical pura -> 90°, típico de horquilla -> 60-75°
    const anguloHorizontal = angleDegFromLineRelativeToHorizontal({ x: x1, y: y1 }, { x: x2, y: y2 }); // 0..90
    // Caster (ángulo respecto a vertical): vertical pura -> 0°, típico -> 23-30°
    const caster = 90 - anguloHorizontal;

    return {
      angulo_horizontal_grados: Number(anguloHorizontal.toFixed(2)),
      caster_grados: Number(caster.toFixed(2)),
    };
  }, [forkPoints, canvasSize]);

  function save() {
    if (!moto) return;
    if (!imageFile.trim()) return;

    let payload: unknown;
    let suffix = "ergonomia";
    if (mode === "ergonomia") {
      if (puntos.length !== 3) return;
      payload = {
        moto_id: moto.id,
        moto: `${moto.marca} ${moto.modelo} ${moto.año}`,
        imagen: imageFile.trim(),
        puntos: ORDER.map((k) => puntosByKey.get(k)).filter(Boolean),
        unidades: "porcentaje",
        modo: "ergonomia",
      };
      suffix = "ergonomia";
    } else {
      if (forkPoints.length !== 2 || angulosDireccion === null) return;
      payload = {
        moto_id: moto.id,
        // Estándar industria: caster = respecto a la vertical (vertical pura = 0°)
        angulo_direccion_grados: angulosDireccion.caster_grados,
        angulo_respecto_horizontal_grados: angulosDireccion.angulo_horizontal_grados,
        modo: "angulo_direccion",
      };
      suffix = "angulo_direccion";
    }

    const safeName = `${moto.marca}-${moto.modelo}-${moto.año}`.replace(/[^a-z0-9_-]+/gi, "_");
    downloadJson(`calibracion_${suffix}_${moto.id}_${safeName}.json`, payload);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <section className="lg:col-span-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("ergonomia");
                    resetAll();
                  }}
                  className={[
                    "flex h-10 items-center justify-center rounded-2xl text-sm font-semibold transition",
                    mode === "ergonomia"
                      ? "bg-[#D85A30] text-white shadow-lg shadow-[#D85A30]/20"
                      : "bg-transparent text-zinc-300 hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  Modo Ergonomía
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("angulo_direccion");
                    resetAll();
                  }}
                  className={[
                    "flex h-10 items-center justify-center rounded-2xl text-sm font-semibold transition",
                    mode === "angulo_direccion"
                      ? "bg-[#D85A30] text-white shadow-lg shadow-[#D85A30]/20"
                      : "bg-transparent text-zinc-300 hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  Modo Ángulo de Dirección
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Moto a calibrar</label>
              <select
                value={motoId}
                onChange={(e) => {
                  setMotoId(Number(e.target.value));
                  resetAll();
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
              >
                {sorted.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.marca} {m.modelo} ({m.año})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-zinc-500">
                Tip: si cambias de moto, se resetean los puntos.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Archivo de imagen</label>
              <input
                value={imageFile}
                onChange={(e) => {
                  setImageFile(e.target.value);
                  setImageOk(true);
                  resetAll();
                }}
                placeholder="Ej: prueba.jpg"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Se carga desde <span className="font-semibold text-zinc-300">/motos/</span>. Ej:
                <span className="font-mono text-zinc-300"> /motos/prueba.jpg</span>
              </p>
            </div>

            {mode === "ergonomia" ? (
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-sm font-semibold text-white">Orden de marcado</p>
                <div className="mt-2 space-y-1 text-sm text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: COLOR.manillar }}
                      />
                      1) Manillar
                    </span>
                    <span className="text-xs text-zinc-500">
                      {puntosByKey.get("manillar") ? "OK" : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: COLOR.asiento }}
                      />
                      2) Asiento
                    </span>
                    <span className="text-xs text-zinc-500">
                      {puntosByKey.get("asiento") ? "OK" : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: COLOR.estriberas }}
                      />
                      3) Estriberas
                    </span>
                    <span className="text-xs text-zinc-500">
                      {puntosByKey.get("estriberas") ? "OK" : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-sm font-semibold text-white">Medición de ángulo de dirección</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Marca 2 puntos sobre la horquilla delantera (superior e inferior). Se dibuja una
                  línea amarilla y una referencia vertical punteada.
                </p>
                <div className="mt-3 space-y-1 text-sm text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: YELLOW }} />
                      1) Horquilla (punto superior)
                    </span>
                    <span className="text-xs text-zinc-500">{forkPoints[0] ? "OK" : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: YELLOW }} />
                      2) Horquilla (punto inferior)
                    </span>
                    <span className="text-xs text-zinc-500">{forkPoints[1] ? "OK" : "—"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={save}
                disabled={
                  !imageFile.trim() ||
                  (mode === "ergonomia"
                    ? puntos.length !== 3
                    : forkPoints.length !== 2 || angulosDireccion === null)
                }
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#D85A30] px-6 text-sm font-semibold text-white shadow-lg shadow-[#D85A30]/25 transition-colors duration-200 hover:bg-[#c24f2a] active:bg-[#b84826] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar calibración
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06]"
              >
                Resetear
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="lg:col-span-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Imagen y canvas</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Haz click sobre la imagen para marcar puntos. Coordenadas en porcentaje.
              </p>
            </div>
            <div className="text-right text-sm text-zinc-400">
              {mode === "ergonomia" ? (
                <>
                  <p>
                    Siguiente punto:{" "}
                    <span className="font-semibold text-zinc-200">{nextKey ?? "—"}</span>
                  </p>
                  <p className="text-xs text-zinc-500">{puntos.length}/3 marcados</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Ángulo de dirección (caster)
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-[#FACC15]">
                    {angulosDireccion === null ? "—" : `${angulosDireccion.caster_grados.toFixed(2)}°`}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Ángulo respecto a horizontal
                  </p>
                  <p className="mt-1 text-xl font-semibold text-zinc-200">
                    {angulosDireccion === null
                      ? "—"
                      : `${angulosDireccion.angulo_horizontal_grados.toFixed(2)}°`}
                  </p>
                  <p className="text-xs text-zinc-500">{forkPoints.length}/2 puntos</p>
                </>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <img
                ref={imgRef}
                src={`/motos/${imageFile.trim()}`}
                alt={imageFile.trim() ? `Moto: ${imageFile.trim()}` : "Imagen de moto"}
                className="block h-auto w-full select-none"
                onLoad={() => {
                  setImageOk(true);
                  resizeCanvasToImage();
                  draw();
                }}
                onError={() => setImageOk(false)}
                draggable={false}
              />

              <canvas
                ref={canvasRef}
                onClick={onCanvasClick}
                className="absolute inset-0 cursor-crosshair"
                aria-label="Canvas de calibración"
              />

              {!imageOk ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center">
                  <div className="max-w-md rounded-2xl border border-white/10 bg-[#0a0a0b] p-5">
                    <p className="text-sm font-semibold text-white">
                      No se pudo cargar la imagen
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Verifica que exista en{" "}
                      <span className="font-mono text-zinc-200">public/motos/</span> y que el
                      nombre sea correcto.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {mode === "ergonomia" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {ORDER.map((k) => {
                  const p = puntosByKey.get(k);
                  return (
                    <div key={k} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: COLOR[k] }}
                        />
                        <p className="text-sm font-semibold text-white">{k}</p>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">
                        X:{" "}
                        <span className="font-mono text-zinc-100">
                          {p ? `${p.xPct.toFixed(2)}%` : "—"}
                        </span>
                      </p>
                      <p className="text-sm text-zinc-300">
                        Y:{" "}
                        <span className="font-mono text-zinc-100">
                          {p ? `${p.yPct.toFixed(2)}%` : "—"}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[0, 1].map((idx) => {
                  const p = forkPoints[idx];
                  const title = idx === 0 ? "horquilla_superior" : "horquilla_inferior";
                  return (
                    <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: YELLOW }} />
                        <p className="text-sm font-semibold text-white">{title}</p>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">
                        X:{" "}
                        <span className="font-mono text-zinc-100">
                          {p ? `${p.xPct.toFixed(2)}%` : "—"}
                        </span>
                      </p>
                      <p className="text-sm text-zinc-300">
                        Y:{" "}
                        <span className="font-mono text-zinc-100">
                          {p ? `${p.yPct.toFixed(2)}%` : "—"}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

