import Button from "@/components/ui/Button";
import Navbar from "@/components/landing/Navbar";

export default function HeroSection() {
  return (
    <header className="relative overflow-hidden min-h-screen flex flex-col">
      {/* Background: indigo-to-deep gradient for clinical depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(150deg, #5B9CF6 0%, #667EEA 40%, #3730A3 72%, #1E1B4B 100%)",
        }}
        aria-hidden="true"
      />

      {/* Radial light source — top center, like a surgical overhead light */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(255,255,255,0.13) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle dot grid — gives precision/technical texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.055,
        }}
        aria-hidden="true"
      />

      {/* Ambient orb — bottom right corner, adds color richness */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 560,
          height: 560,
          right: -120,
          bottom: -160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(79,172,254,0.18) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Content layer — flex-1 para que herede la altura del header */}
      <div className="relative flex-1 flex flex-col">
        <Navbar />

        {/* Zona centrada verticalmente — ocupa el espacio restante */}
        <div className="flex-1 flex items-center">
          {/* Hero grid — alineado con el navbar (max-w-7xl) */}
          <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-10 w-full grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-16 lg:gap-24 py-28 lg:py-20 items-center">
            {/* Left: copy */}
            <div>
              {/* H1 escalonado: línea 1 blanco, línea 2 azul-claro — solo colores sólidos */}
              <h1
                className="mb-8"
                style={{
                  fontSize: "clamp(44px, 6.5vw, 76px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                  textShadow: "0 2px 32px rgba(79,172,254,0.22)",
                  animation:
                    "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
                  animationDelay: "80ms",
                }}
              >
                <span className="text-white">Muestra el resultado</span>
                <br />
                <span style={{ color: "#BFDBFE" }}>antes de operar.</span>
              </h1>

              <p
                className="text-[18px] leading-[1.65] text-white/72 mb-10 max-w-120"
                style={{
                  animation:
                    "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
                  animationDelay: "180ms",
                }}
              >
                LuminaMD es el simulador facial que los cirujanos usan para
                mostrar cambios en tiempo real, guardar expedientes y compartir
                resultados con sus pacientes.
              </p>

              <div
                className="flex flex-col sm:flex-row gap-3"
                style={{
                  animation:
                    "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
                  animationDelay: "280ms",
                }}
              >
                <Button
                  variant="white"
                  size="xl"
                  className="font-bold active:scale-[0.97] transition-transform duration-120"
                >
                  Comenzar gratis
                </Button>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center h-12 px-6 text-[15px] font-semibold text-white border border-white/25 rounded-xl hover:bg-white/10 hover:border-white/40 active:scale-[0.97] transition-all duration-150"
                >
                  Ver cómo funciona
                </a>
              </div>

              <p
                className="mt-4 text-[12px] text-white/45"
                style={{
                  animation:
                    "hero-fade-up 650ms cubic-bezier(0.23,1,0.32,1) backwards",
                  animationDelay: "360ms",
                }}
              >
                Sin tarjeta de crédito · Cancela cuando quieras
              </p>
            </div>

            {/* Right: simulator mock — centrado en mobile, alineado en desktop */}
            <div
              className="relative max-w-sm mx-auto w-full lg:max-w-none"
              style={{
                animation:
                  "hero-fade-up 700ms cubic-bezier(0.23,1,0.32,1) backwards",
                animationDelay: "200ms",
              }}
            >
              <div
                className="rounded-4xl overflow-hidden"
                style={{
                  background: "#0A1628",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.07), 0 32px 80px rgba(10,22,40,0.6), 0 0 70px rgba(79,172,254,0.14)",
                }}
              >
                {/* Mock HUD toolbar */}
                <div
                  className="flex items-center gap-2 px-4 py-3 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <div className="w-3 h-3 rounded-full bg-green-400/70" />
                  </div>
                  <span className="ml-2 text-[11px] text-white/32 tracking-widest uppercase font-mono">
                    SimEstético · Sesión activa
                  </span>
                </div>

                {/* Mock canvas area */}
                <div className="relative bg-[#0D1F35] h-80 sm:h-96 flex items-center justify-center">
                  {/* Canvas dot grid — matches the real simulator workspace */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, rgba(79,172,254,0.5) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                      opacity: 0.07,
                    }}
                    aria-hidden="true"
                  />

                  {/* Face outline — anatomically detailed */}
                  <svg
                    viewBox="0 0 200 240"
                    className="relative h-64 sm:h-72"
                    fill="none"
                    stroke="#4FACFE"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    {/* Head oval */}
                    <ellipse
                      cx="100"
                      cy="98"
                      rx="62"
                      ry="78"
                      strokeOpacity="0.5"
                    />
                    {/* Jaw / chin */}
                    <path
                      d="M48 138 Q58 172 76 188 Q100 198 124 188 Q142 172 152 138"
                      strokeOpacity="0.32"
                      strokeWidth="1.2"
                    />
                    {/* Left brow */}
                    <path
                      d="M66 80 Q80 73 92 79"
                      strokeOpacity="0.8"
                      strokeLinecap="round"
                    />
                    {/* Right brow */}
                    <path
                      d="M108 79 Q120 73 134 80"
                      strokeOpacity="0.8"
                      strokeLinecap="round"
                    />
                    {/* Left eye outline */}
                    <path
                      d="M70 86 Q80 80 90 86 Q80 92 70 86Z"
                      strokeOpacity="0.55"
                      strokeWidth="1"
                    />
                    {/* Right eye outline */}
                    <path
                      d="M110 86 Q120 80 130 86 Q120 92 110 86Z"
                      strokeOpacity="0.55"
                      strokeWidth="1"
                    />
                    {/* Nose bridge */}
                    <path
                      d="M97 92 L94 120 Q100 126 106 120 L103 92"
                      strokeOpacity="0.38"
                      strokeWidth="1"
                      strokeLinejoin="round"
                    />
                    {/* Nose tip highlight */}
                    <path
                      d="M91 120 Q100 128 109 120"
                      strokeOpacity="0.55"
                      strokeLinecap="round"
                    />
                    {/* Lips */}
                    <path
                      d="M82 142 Q91 137 100 139 Q109 137 118 142"
                      strokeOpacity="0.65"
                      strokeLinecap="round"
                    />
                    <path
                      d="M80 142 Q100 158 120 142"
                      strokeOpacity="0.55"
                      strokeLinecap="round"
                    />
                    {/* Chin baseline reference */}
                    <line
                      x1="38"
                      y1="192"
                      x2="162"
                      y2="192"
                      strokeOpacity="0.11"
                      strokeDasharray="4 5"
                    />
                    {/* Vertical symmetry axis */}
                    <line
                      x1="100"
                      y1="24"
                      x2="100"
                      y2="192"
                      strokeOpacity="0.07"
                      strokeDasharray="3 6"
                    />
                    {/* Horizontal thirds */}
                    <line
                      x1="55"
                      y1="76"
                      x2="145"
                      y2="76"
                      strokeOpacity="0.07"
                      strokeDasharray="3 6"
                    />
                    <line
                      x1="55"
                      y1="136"
                      x2="145"
                      y2="136"
                      strokeOpacity="0.07"
                      strokeDasharray="3 6"
                    />
                  </svg>

                  {/* HUD overlay labels */}
                  <div
                    className="absolute top-4 right-4 text-[10px] space-y-1.5 font-mono"
                    style={{ color: "#93C5FD" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: "#4FACFE", opacity: 0.75 }}
                      />
                      NARIZ 60°
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: "#4FACFE", opacity: 0.75 }}
                      />
                      MENTÓN +3mm
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      style={{ opacity: 0.45 }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: "#22C55E" }}
                      />
                      60 FPS
                    </div>
                  </div>

                  {/* Slider highlight */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-[10px] text-white/38 mb-1.5 font-mono">
                      Proyección nasal
                    </div>
                    <div className="relative h-1.5 rounded-full bg-white/10">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{
                          width: "65%",
                          background:
                            "linear-gradient(90deg, #4FACFE, #667EEA)",
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white"
                        style={{
                          left: "calc(65% - 7px)",
                          boxShadow: "0 1px 6px rgba(79,172,254,0.45)",
                        }}
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
                            : "text-white/30"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <button
                    className="text-[11px] font-semibold text-white/45 hover:text-white/80 transition-colors duration-150"
                    aria-label="Compartir sesión"
                  >
                    Compartir →
                  </button>
                </div>
              </div>

              {/* Live badge */}
              <div
                className="absolute -bottom-4 -left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-white"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.13)" }}
              >
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[12px] font-semibold text-text-primary">
                  Simulación en vivo
                </span>
              </div>
            </div>
          </div>
          {/* cierra hero grid */}
        </div>
        {/* cierra flex-1 items-center */}
      </div>
      {/* cierra content layer */}
    </header>
  );
}
