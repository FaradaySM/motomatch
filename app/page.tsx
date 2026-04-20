export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[32rem] w-[32rem] rounded-full bg-[#D85A30]/20 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#D85A30]/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 sm:px-10 sm:pb-20 sm:pt-14">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <p className="text-sm font-medium tracking-wide text-zinc-400">
            <span className="text-[#D85A30]">ES</span>
            <span className="mx-2 text-zinc-600">/</span>
            <span>EN</span>
            <span className="ml-3 hidden text-zinc-500 sm:inline">
              Bilingual rider matching
            </span>
          </p>
          <nav className="flex gap-6 text-sm text-zinc-400">
            <span className="cursor-default transition hover:text-zinc-200">
              Cómo funciona
            </span>
            <span className="cursor-default transition hover:text-zinc-200">
              How it works
            </span>
          </nav>
        </header>

        <main className="flex flex-1 flex-col">
          <section className="flex flex-1 flex-col justify-center py-16 sm:py-24 lg:py-28">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#D85A30]">
              MotoMatch
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              MotoMatch
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-medium leading-relaxed text-zinc-200 sm:text-2xl">
              Encuentra la moto que encaja con tu vida
            </p>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Find the motorcycle that fits your lifestyle and real-world riding
              scenarios — in Spanish or English.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#escenarios"
                className="inline-flex items-center justify-center rounded-full bg-[#D85A30] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#D85A30]/25 transition hover:bg-[#c24f2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D85A30]"
              >
                Empezar ahora
              </a>
              <span className="text-sm text-zinc-500">Start now</span>
            </div>
          </section>

          <section
            id="escenarios"
            className="border-t border-white/10 pt-16 sm:pt-20"
            aria-labelledby="escenarios-heading"
          >
            <div className="mb-10 max-w-2xl">
              <h2
                id="escenarios-heading"
                className="text-2xl font-semibold text-white sm:text-3xl"
              >
                Escenarios que importan
              </h2>
              <p className="mt-2 text-zinc-400">
                The scenarios that shape your ideal bike — we weight them so
                recommendations feel personal, not generic.
              </p>
            </div>

            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <li className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-[#D85A30]/40 hover:bg-white/[0.05]">
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#D85A30]/15 text-[#D85A30]"
                  aria-hidden
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Viaje Off-Road
                </h3>
                <p className="mt-1 text-sm font-medium text-[#D85A30]">
                  Off-road travel
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  Trayectos mixtos, pistas y terreno exigente. Priorizamos
                  suspensión, protección y confianza donde el asfalto termina.
                </p>
              </li>

              <li className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-[#D85A30]/40 hover:bg-white/[0.05]">
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#D85A30]/15 text-[#D85A30]"
                  aria-hidden
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Protección Climática
                </h3>
                <p className="mt-1 text-sm font-medium text-[#D85A30]">
                  Weather protection
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  Lluvia, frío y viento. Evaluamos carenado, ergonomía en
                  autopista y comodidad para kilometraje diario o touring.
                </p>
              </li>

              <li className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-[#D85A30]/40 hover:bg-white/[0.05] sm:col-span-2 lg:col-span-1">
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#D85A30]/15 text-[#D85A30]"
                  aria-hidden
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M16.5 7.5h1.125m-1.125 0V18"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Ergonomía Avanzada
                </h3>
                <p className="mt-1 text-sm font-medium text-[#D85A30]">
                  Advanced ergonomics
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  Altura, alcance y postura. Alineamos geometría de manillar y
                  asiento con tu cuerpo y tus rutas habituales.
                </p>
              </li>
            </ul>
          </section>
        </main>

        <footer className="mt-20 border-t border-white/10 pt-8 text-center text-sm text-zinc-500 sm:text-left">
          <p>MotoMatch — matching riders to the right bike.</p>
        </footer>
      </div>
    </div>
  );
}
