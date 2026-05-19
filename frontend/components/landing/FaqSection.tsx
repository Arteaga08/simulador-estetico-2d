const faqs = [
  {
    q: "¿Necesito conocimientos técnicos para usar SimEstético?",
    a: "No. La interfaz está diseñada para cirujanos, no para diseñadores. Si sabes usar un slider, puedes usar SimEstético desde el primer día.",
  },
  {
    q: "¿Los datos de mis pacientes son privados?",
    a: "Sí. Toda la información está cifrada end-to-end y almacenada en servidores europeos con cumplimiento HIPAA y GDPR. Nadie accede a tus expedientes.",
  },
  {
    q: "¿El link de before/after lo puede ver cualquier persona?",
    a: "Solo quien tenga el link exacto. No está indexado en Google, expira a las 48 horas y no requiere que el paciente cree una cuenta.",
  },
  {
    q: "¿Funciona con cualquier fotografía?",
    a: "Funciona mejor con fotografías estándar de frente o tres cuartos en buena iluminación. No requiere equipos especiales ni fondos específicos.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí. Sin permanencia, sin cargos ocultos. Si cancelas, tus datos se exportan en PDF antes de eliminarlos.",
  },
  {
    q: "¿Ofrecen período de prueba?",
    a: "14 días gratis sin tarjeta de crédito en los planes Starter y Pro. Enterprise tiene demo personalizada con el equipo.",
  },
]

export default function FaqSection() {
  return (
    <section className="bg-bg-surface py-24">
      <div className="container-landing">
        <div className="mb-12">
          <p className="text-label text-blue mb-4">Preguntas frecuentes</p>
          <h2 className="text-h2 text-text-primary max-w-[440px]">
            Lo que los cirujanos preguntan antes de empezar.
          </h2>
        </div>

        {/* Asymmetric 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-h4 text-text-primary mb-2.5">{faq.q}</h3>
              <p className="text-body-md text-text-muted">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
