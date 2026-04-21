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

const ORDER: PuntoKey[] = ["manillar", "asiento", "estriberas"];
const COLOR: Record<PuntoKey, string> = {
  manillar: "#D85A30",
  asiento: "#3B82F6",
  estriberas: "#22C55E",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

  const [puntos, setPuntos] = useState<Punto[]>([]);

  const nextKey = ORDER[puntos.length] ?? null;

  function reset() {
    setPuntos([]);
  }

  function resizeCanvasToImage() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rect = img.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

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

    if (nextKey) {
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "rgba(244,244,245,0.8)";
      ctx.fillText(`Click para marcar: ${nextKey}`, 12, 18);
    } else {
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "rgba(244,244,245,0.8)";
      ctx.fillText("Listo: 3 puntos marcados", 12, 18);
    }
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (!nextKey) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;

    setPuntos((prev) => [...prev, { key: nextKey, xPct: Number(xPct.toFixed(2)), yPct: Number(yPct.toFixed(2)) }]);
  }

  useEffect(() => {
    // Redibuja al cambiar puntos.
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos]);

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

  function save() {
    if (!moto) return;
    if (puntos.length !== 3) return;
    const payload = {
      moto_id: moto.id,
      moto: `${moto.marca} ${moto.modelo} ${moto.año}`,
      imagen: imageFile.trim(),
      puntos: ORDER.map((k) => puntosByKey.get(k)).filter(Boolean),
      unidades: "porcentaje",
    };
    const safeName = `${moto.marca}-${moto.modelo}-${moto.año}`.replace(/[^a-z0-9_-]+/gi, "_");
    downloadJson(`calibracion_${moto.id}_${safeName}.json`, payload);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <section className="lg:col-span-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-white">Moto a calibrar</label>
              <select
                value={motoId}
                onChange={(e) => {
                  setMotoId(Number(e.target.value));
                  reset();
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
                  reset();
                }}
                placeholder="Ej: prueba.jpg"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D85A30]/60 focus:ring-2 focus:ring-[#D85A30]/20"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Se carga desde <span className="font-semibold text-zinc-300">/motos/</span>. Ej:
                <span className="font-mono text-zinc-300"> /motos/prueba.jpg</span>
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-sm font-semibold text-white">Orden de marcado</p>
              <div className="mt-2 space-y-1 text-sm text-zinc-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.manillar }} />
                    1) Manillar
                  </span>
                  <span className="text-xs text-zinc-500">{puntosByKey.get("manillar") ? "OK" : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.asiento }} />
                    2) Asiento
                  </span>
                  <span className="text-xs text-zinc-500">{puntosByKey.get("asiento") ? "OK" : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.estriberas }} />
                    3) Estriberas
                  </span>
                  <span className="text-xs text-zinc-500">{puntosByKey.get("estriberas") ? "OK" : "—"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={save}
                disabled={!imageFile.trim() || puntos.length !== 3}
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
              <p>
                Siguiente punto:{" "}
                <span className="font-semibold text-zinc-200">{nextKey ?? "—"}</span>
              </p>
              <p className="text-xs text-zinc-500">
                {puntos.length}/3 marcados
              </p>
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

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {ORDER.map((k) => {
                const p = puntosByKey.get(k);
                return (
                  <div key={k} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR[k] }} />
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
          </div>
        </div>
      </section>
    </div>
  );
}

