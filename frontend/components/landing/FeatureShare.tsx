import { ShareNetwork } from "@phosphor-icons/react/dist/ssr"

export default function FeatureShare() {
  return (
    <section className="bg-bg-surface-alt py-28">
      <div className="container-landing grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-16 items-center">
        {/* Left: copy */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)" }}
            >
              <ShareNetwork size={14} color="white" weight="bold" />
            </div>
            <p className="text-label text-blue">03 — Compartir resultados</p>
          </div>

          <h2 className="text-h2 text-text-primary mb-5">
            El paciente ve el resultado en su teléfono, no en tu pantalla.
          </h2>

          <p className="text-body-lg text-text-secondary mb-8 max-w-[460px]">
            Un link único, válido por 48 horas. El paciente lo abre desde casa,
            lo revisa con calma y regresa a la siguiente consulta con la decisión tomada.
          </p>

          <ul className="space-y-4">
            {[
              "Genera el link en un clic al final de la sesión",
              "Before/after con drag slider y anotaciones del cirujano",
              "Expira automáticamente a las 48 horas por seguridad",
              "Sin login para el paciente — solo el link",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-blue font-bold text-[16px] leading-none">→</span>
                <span className="text-body-md text-text-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: share link mock */}
        <div
          className="rounded-[20px] overflow-hidden shadow-md"
          style={{ border: "1px solid #E9D5FF", background: "#FFFFFF" }}
        >
          <div className="p-5 border-b border-border">
            <p className="text-[12px] text-text-muted mb-2">Link para el paciente</p>
            <div className="flex items-center gap-2 bg-bg-page rounded-[10px] px-3 py-2">
              <span
                className="text-[12px] text-text-muted flex-1 truncate"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                simestetico.com/share/a7f3c2...
              </span>
              <span className="text-[11px] font-semibold text-blue cursor-pointer">Copiar</span>
            </div>
          </div>

          <div className="relative bg-[#F4F8FF] h-[220px] flex">
            {/* Before half */}
            <div className="flex-1 flex flex-col items-center justify-center border-r border-border/50">
              <svg viewBox="0 0 100 120" className="h-[100px]" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                <ellipse cx="50" cy="50" rx="32" ry="42" strokeOpacity="0.5" />
                <path d="M35 43 Q41 39 47 43" strokeOpacity="0.7" />
                <path d="M55 43 Q61 39 67 43" strokeOpacity="0.7" />
                <path d="M40 70 Q50 78 60 70" strokeOpacity="0.6" />
              </svg>
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Antes</span>
            </div>

            {/* After half */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <svg viewBox="0 0 100 120" className="h-[100px]" fill="none" stroke="#667EEA" strokeWidth="1.5">
                <ellipse cx="50" cy="50" rx="32" ry="42" strokeOpacity="0.6" />
                <path d="M35 43 Q41 39 47 43" strokeOpacity="0.9" />
                <path d="M55 43 Q61 39 67 43" strokeOpacity="0.9" />
                <path d="M40 72 Q50 82 60 72" strokeOpacity="0.8" />
                <ellipse cx="50" cy="57" rx="5" ry="3" strokeOpacity="0.4" />
              </svg>
              <span className="text-[10px] font-semibold text-blue uppercase tracking-wider">Después</span>
            </div>

            {/* Drag divider */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
              <div className="w-0.5 h-full bg-white/80 absolute" />
              <div className="relative z-10 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center">
                <span className="text-[10px] text-text-muted">⟺</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span className="text-[11px] text-text-muted">Expira en 47h 12m</span>
            </div>
            <span className="text-[11px] font-semibold text-text-muted">Dr. García · SimEstético</span>
          </div>
        </div>
      </div>
    </section>
  )
}
