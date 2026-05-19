const testimonials = [
  {
    quote:
      "SimEstético cambió mis consultas. Antes pasaba 20 minutos explicando con palabras lo que ahora muestro en 2 minutos. Los pacientes llegan a la segunda consulta con la decisión tomada.",
    name: "Dr. Alejandro García",
    role: "Cirujano maxilofacial · Madrid",
    initials: "AG",
  },
  {
    quote:
      "El banco de casos compartido entre los cinco cirujanos de nuestra clínica ha unificado nuestro criterio estético. Es la herramienta que nos faltaba para mantener consistencia.",
    name: "Dra. Marina Soto",
    role: "Directora médica · Clínica Estética Barcelona",
    initials: "MS",
  },
  {
    quote:
      "Mis pacientes abren el link de before/after en casa, se lo muestran a su familia, y regresan más seguros. La tasa de conversión de primera consulta subió un 30% desde que lo uso.",
    name: "Dr. Javier Moreno",
    role: "Rinoplastia y cirugía facial · Sevilla",
    initials: "JM",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="bg-bg-hero-light py-28" id="testimonios">
      <div className="container-landing">
        <div className="mb-14">
          <p className="text-label text-blue mb-4">Testimonios</p>
          <h2 className="text-h2 text-text-primary max-w-[440px]">
            Lo que dicen los cirujanos que ya lo usan.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-[16px] p-7 bg-bg-surface flex flex-col gap-6"
              style={{ border: "1px solid #E9D5FF", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            >
              <p className="text-body-md text-text-secondary leading-[1.75] flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold"
                  style={{ background: "linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)" }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">{t.name}</p>
                  <p className="text-[12px] text-text-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
