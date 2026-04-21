import motos from "@/data/motos.json";
import CalibradorClient from "./ui";

type Moto = {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  tipo: string;
};

export default function CalibradorPage() {
  const list = motos as Moto[];

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
              Calibrador (interno)
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Herramienta interna para calibrar puntos ergonómicos y medir el ángulo de dirección
              a partir de una imagen. Todo se guarda en porcentaje (X/Y) para que funcione a
              cualquier tamaño.
            </p>
          </div>

          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
            No pública
          </span>
        </header>

        <main className="mt-10">
          <CalibradorClient motos={list} />
        </main>
      </div>
    </div>
  );
}

