import { NotePencil } from "@phosphor-icons/react/dist/ssr"

export default function FeatureAnnotations() {
  return (
    <section className="bg-bg-surface py-28">
      <div className="container-landing grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-16 items-center">
        {/* Left: annotations mock */}
        <div
          className="rounded-[20px] overflow-hidden shadow-md"
          style={{ background: "#F4F8FF", border: "1px solid #E0E7FF" }}
        >
          <div
            className="relative h-[300px] flex items-center justify-center"
            style={{ background: "#EEF2FF" }}
          >
            <svg viewBox="0 0 200 240" className="h-[180px]" fill="none" stroke="#667EEA" strokeWidth="1.5">
              <ellipse cx="100" cy="100" rx="62" ry="80" strokeOpacity="0.4" />
              <path d="M70 85 Q80 78 90 85" strokeOpacity="0.7" />
              <path d="M110 85 Q120 78 130 85" strokeOpacity="0.7" />
              <ellipse cx="100" cy="115" rx="8" ry="5" strokeOpacity="0.4" />
              <path d="M80 140 Q100 155 120 140" strokeOpacity="0.6" />
            </svg>

            {/* Annotation pins */}
            <div className="absolute top-8 right-8">
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-blue flex items-center justify-center shadow">
                  <span className="text-white text-[9px] font-bold">1</span>
                </div>
                <div className="absolute top-0 left-7 w-[140px] bg-white rounded-[8px] shadow-md px-3 py-2">
                  <p className="text-[11px] font-semibold text-text-primary">Proyección dorsal</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Reducción moderada del puente</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-16 left-8">
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-indigo flex items-center justify-center shadow">
                  <span className="text-white text-[9px] font-bold">2</span>
                </div>
                <div className="absolute top-0 left-7 w-[130px] bg-white rounded-[8px] shadow-md px-3 py-2">
                  <p className="text-[11px] font-semibold text-text-primary">Mentoplastia</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Avance +3mm eje horizontal</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center gap-2">
            <NotePencil size={14} weight="fill" className="text-indigo" />
            <span className="text-[12px] text-text-muted">2 anotaciones · Dr. García</span>
          </div>
        </div>

        {/* Right: copy */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)" }}
            >
              <NotePencil size={14} color="white" weight="bold" />
            </div>
            <p className="text-label text-blue">02 — Anotaciones clínicas</p>
          </div>

          <h2 className="text-h2 text-text-primary mb-5">
            El expediente con el razonamiento del cirujano, no solo las imágenes.
          </h2>

          <p className="text-body-lg text-text-secondary mb-8 max-w-[460px]">
            Pines numerados sobre el canvas, notas por zona, y todo guardado
            en el expediente del paciente. La próxima consulta empieza donde
            dejaste la última.
          </p>

          <ul className="space-y-4">
            {[
              "Pines clicables sobre zonas del rostro con texto libre",
              "Historial de sesiones con anotaciones previas",
              "Exportación a PDF con imágenes y notas incluidas",
              "Visible para el paciente al abrir el link de share",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-blue font-bold text-[16px] leading-none">→</span>
                <span className="text-body-md text-text-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
