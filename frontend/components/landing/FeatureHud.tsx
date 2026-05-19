import { SlidersHorizontal } from "@phosphor-icons/react/dist/ssr"

export default function FeatureHud() {
  return (
    <section className="bg-bg-surface-alt py-28" id="características">
      <div className="container-landing grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-16 items-center">
        {/* Left: copy */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)" }}
            >
              <SlidersHorizontal size={14} color="white" weight="bold" />
            </div>
            <p className="text-label text-blue">01 — Control en tiempo real</p>
          </div>

          <h2 className="text-h2 text-text-primary mb-5">
            HUD de simulación que el cirujano controla en consulta.
          </h2>

          <p className="text-body-lg text-text-secondary mb-8 max-w-[460px]">
            Sliders por zona facial, valores numéricos en pantalla, y
            deformación fluida a 60 fps. Todo lo que el paciente ve,
            en tiempo real, sobre su propia fotografía.
          </p>

          <ul className="space-y-4">
            {[
              "Sliders independientes por zona (nariz, mentón, pómulos, frente)",
              "HUD con valores numéricos y ángulos de proyección",
              "Deshacer/rehacer infinito — sin miedo a equivocarse",
              "Funciona con la fotografía del paciente, no con un modelo genérico",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-blue font-bold text-[16px] leading-none">→</span>
                <span className="text-body-md text-text-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: HUD mock */}
        <div
          className="rounded-[20px] overflow-hidden shadow-brand"
          style={{ background: "#0A1628" }}
        >
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <span
              className="text-[11px] text-white/35 tracking-widest uppercase"
              style={{ fontFamily: "var(--font-geist-mono), monospace" }}
            >
              HUD · Vista activa
            </span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                60 fps
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {[
              { label: "Proyección nasal", value: "62°", pct: 68 },
              { label: "Mentón horizontal", value: "+3.2mm", pct: 52 },
              { label: "Arco cigomático", value: "84%", pct: 84 },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between mb-2">
                  <span
                    className="text-[11px] text-white/50"
                    style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="text-[11px] text-blue font-semibold"
                    style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    {s.value}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-white/10">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: `${s.pct}%`,
                      background: "linear-gradient(90deg, #4FACFE, #667EEA)",
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow"
                    style={{ left: `calc(${s.pct}% - 6px)` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
