const steps = [
  {
    n: "01",
    title: "Sube la foto del paciente",
    desc: "Fotografía estándar de frente. SimEstético la calibra automáticamente para la simulación.",
  },
  {
    n: "02",
    title: "Ajusta los sliders en tiempo real",
    desc: "Nariz, mentón, pómulos, frente — el cambio se ve al instante sobre la foto del paciente.",
  },
  {
    n: "03",
    title: "Añade anotaciones clínicas",
    desc: "Pines sobre el rostro con notas de procedimiento. Queda guardado en el expediente.",
  },
  {
    n: "04",
    title: "Comparte el resultado",
    desc: "Link before/after para el paciente. Válido 48 horas. Sin apps, sin login.",
  },
]

export default function HowItWorksSection() {
  return (
    <section className="bg-bg-surface py-28" id="como-funciona">
      <div className="container-landing">
        <div className="mb-14">
          <p className="text-label text-blue mb-4">Cómo funciona</p>
          <h2 className="text-h2 text-text-primary max-w-125">
            De la consulta al resultado en cuatro pasos.
          </h2>
        </div>

        {/* Steps with connecting line */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Connecting line (desktop only) */}
          <div
            className="hidden lg:block absolute top-5.5 left-[10%] right-[10%] h-px"
            style={{ background: "linear-gradient(90deg, #4FACFE, #667EEA)" }}
          />

          {steps.map((step) => (
            <div key={step.n} className="relative flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-brand z-10"
                  style={{ background: "linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)" }}
                >
                  <span
                    className="text-[13px] font-bold text-white"
                    style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    {step.n}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-h4 text-text-primary mb-2">{step.title}</h3>
                <p className="text-body-md text-text-muted">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
