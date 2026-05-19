import Button from "@/components/ui/Button"

export default function HeroSection() {
  return (
    <header
      className="relative overflow-hidden"
      style={{ background: "#4FACFE" }}
    >
      {/* Navbar */}
      <nav className="container-landing flex items-center justify-between py-5">
        <span
          className="text-[17px] font-bold tracking-tight text-white"
          style={{ fontFamily: "var(--font-geist), sans-serif" }}
        >
          SimEstético
        </span>
        <div className="hidden md:flex items-center gap-8">
          {["Características", "Precios", "Testimonios"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[14px] font-medium text-white/80 hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
        </div>
        <Button variant="white" size="md">
          Solicitar demo →
        </Button>
      </nav>

      {/* Hero grid 60/40 */}
      <div className="container-landing grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 pt-20 pb-28 items-center">
        {/* Left: copy */}
        <div>
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-white/15 text-white text-[12px] font-semibold tracking-wide uppercase">
            Simulador clínico 2D · Tiempo real
          </div>

          <h1 className="text-display text-white mb-6" style={{ fontFamily: "var(--font-geist), sans-serif" }}>
            Muestra el resultado<br />antes de operar.
          </h1>

          <p className="text-[18px] leading-[1.65] text-white/80 mb-10 max-w-[480px]">
            SimEstético es el simulador facial que los cirujanos usan
            para mostrar cambios en tiempo real, guardar expedientes
            y compartir resultados con sus pacientes en 48 horas.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="white"
              size="xl"
              className="font-bold"
            >
              Comenzar gratis
            </Button>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center h-12 px-6 text-[15px] font-semibold text-white border border-white/30 rounded-[12px] hover:bg-white/10 transition-colors"
            >
              Ver cómo funciona
            </a>
          </div>

          <p className="mt-4 text-[12px] text-white/55">
            Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </div>

        {/* Right: simulator mock */}
        <div className="relative">
          <div
            className="rounded-[20px] overflow-hidden shadow-[0_24px_80px_rgba(10,22,40,0.35)]"
            style={{ background: "#0A1628" }}
          >
            {/* Mock HUD toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                <div className="w-3 h-3 rounded-full bg-green-400/70" />
              </div>
              <span
                className="ml-2 text-[11px] text-white/35 tracking-widest uppercase"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                SimEstético · Sesión activa
              </span>
            </div>

            {/* Mock canvas area */}
            <div className="relative bg-[#0D1F35] h-[280px] flex items-center justify-center">
              {/* Simulated face outline (SVG placeholder) */}
              <svg
                viewBox="0 0 200 240"
                className="h-[200px] opacity-80"
                fill="none"
                stroke="#4FACFE"
                strokeWidth="1.5"
              >
                <ellipse cx="100" cy="100" rx="62" ry="80" strokeOpacity="0.6" />
                <path d="M70 85 Q80 78 90 85" strokeOpacity="0.9" />
                <path d="M110 85 Q120 78 130 85" strokeOpacity="0.9" />
                <ellipse cx="100" cy="115" rx="8" ry="5" strokeOpacity="0.5" />
                <path d="M80 140 Q100 155 120 140" strokeOpacity="0.8" />
                <line x1="40" y1="180" x2="160" y2="180" stroke="#4FACFE" strokeOpacity="0.15" strokeDasharray="4 4" />
              </svg>

              {/* HUD overlay labels */}
              <div
                className="absolute top-4 right-4 text-[10px] text-blue/70 space-y-1"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                <div>NARIZ 60°</div>
                <div>MENTON +3mm</div>
                <div>FPS 60</div>
              </div>

              {/* Animated slider highlight */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-[10px] text-white/40 mb-1.5" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                  Proyección nasal
                </div>
                <div className="relative h-1.5 rounded-full bg-white/10">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: "65%",
                      background: "linear-gradient(90deg, #4FACFE, #667EEA)",
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md"
                    style={{ left: "calc(65% - 7px)" }}
                  />
                </div>
              </div>
            </div>

            {/* Mock control panel */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                {["Nariz", "Mentón", "Pómulos"].map((t) => (
                  <span
                    key={t}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                      t === "Nariz"
                        ? "bg-blue/20 text-blue"
                        : "text-white/35"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <button
                className="text-[11px] font-semibold text-white/60 hover:text-white"
                aria-label="Compartir sesión"
              >
                Compartir →
              </button>
            </div>
          </div>

          {/* Floating badge */}
          <div
            className="absolute -bottom-4 -left-4 flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[12px] font-semibold text-text-primary">
              Simulación en vivo
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
