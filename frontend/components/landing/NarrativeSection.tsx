export default function NarrativeSection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        {/* Etiqueta superior estilo editorial */}
        <p className="text-[12px] font-bold tracking-[0.2em] text-blue uppercase mb-8">
          El estándar LuminaMD
        </p>

        {/* Declaración principal (Statement) */}
        <p className="text-[32px] md:text-[44px] lg:text-[52px] leading-tight font-medium text-slate-900 font-display tracking-tight">
          El paciente que no puede visualizar el resultado{" "}
          <span className="text-blue font-semibold">duda</span>.
          <br className="hidden md:block" />
          El cirujano que no puede mostrarlo{" "}
          <span className="text-blue font-semibold">pierde la consulta</span>.
          <span className="block mt-6 text-slate-400">
            LuminaMD cambia esa dinámica.
          </span>
        </p>

        {/* Grid de pilares técnicos */}
        <div className="mt-20 md:mt-28 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-slate-200 pt-16">
          <div className="relative">
            <div className="absolute -top-16 left-0 w-8 h-0.5 bg-blue" />
            <h3 className="text-[14px] font-bold tracking-wider text-slate-900 uppercase mb-4">
              Precisión Vectorial
            </h3>
            <p className="text-[16px] leading-[1.7] text-slate-600">
              Motor de deformación fluida a{" "}
              <strong className="text-slate-900 font-semibold">60 FPS</strong>.
              Precisión cefalométrica local sin latencia de red ni depender de
              software genérico de edición.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -top-16 left-0 w-8 h-0.5 bg-blue" />
            <h3 className="text-[14px] font-bold tracking-wider text-slate-900 uppercase mb-4">
              Zero-Trust Clínico
            </h3>
            <p className="text-[16px] leading-[1.7] text-slate-600">
              Expedientes fotográficos{" "}
              <strong className="text-slate-900 font-semibold">
                cifrados y privados
              </strong>{" "}
              por defecto. Procesamiento sin metadatos que garantiza el
              cumplimiento de normativas médicas internacionales.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -top-16 left-0 w-8 h-0.5 bg-blue" />
            <h3 className="text-[14px] font-bold tracking-wider text-slate-900 uppercase mb-4">
              Acelerador de Cierre
            </h3>
            <p className="text-[16px] leading-[1.7] text-slate-600">
              Exportación de{" "}
              <strong className="text-slate-900 font-semibold">
                enlaces temporales (48 hrs)
              </strong>
              . Permite al paciente visualizar su proyección en su propio móvil,
              impulsando la decisión de cirugía.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
