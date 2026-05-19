export default function NarrativeSection() {
  return (
    <section className="bg-bg-surface py-28">
      <div className="container-landing max-w-[800px]">
        <p className="text-label text-blue mb-5">Por qué SimEstético</p>
        <p
          className="text-[26px] leading-[1.55] font-medium text-text-primary"
        >
          El paciente que no puede visualizar el resultado{" "}
          <span className="text-blue font-semibold">duda</span>. El cirujano
          que no puede mostrarlo{" "}
          <span className="text-blue font-semibold">pierde la consulta</span>.
          SimEstético cambia esa conversación.
        </p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-border pt-10">
          <div>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Deformación fluida a{" "}
              <strong className="text-text-primary">60 fps</strong> — sin
              pixelización, sin lag, sin Photoshop.
            </p>
          </div>
          <div>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Expedientes médicos{" "}
              <strong className="text-text-primary">cifrados y privados</strong>{" "}
              por defecto. Cumplimiento HIPAA incluido.
            </p>
          </div>
          <div>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Link de{" "}
              <strong className="text-text-primary">before/after compartible</strong>{" "}
              que el paciente puede abrir en su móvil en 48 horas.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
