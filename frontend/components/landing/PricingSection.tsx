import Button from "@/components/ui/Button"

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/mes",
    desc: "Para cirujanos independientes que quieren empezar.",
    features: [
      "1 cirujano",
      "Hasta 50 pacientes activos",
      "Simulación en tiempo real",
      "Links de share (48h)",
      "Soporte por email",
    ],
    cta: "Empezar gratis 14 días",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$199",
    period: "/mes",
    desc: "Para clínicas con varios especialistas.",
    features: [
      "Hasta 5 cirujanos",
      "Pacientes ilimitados",
      "Banco de casos compartido",
      "Exportación PDF con anotaciones",
      "Soporte prioritario",
    ],
    cta: "Empezar gratis 14 días",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "A medida",
    period: "",
    desc: "Para grupos hospitalarios y redes de clínicas.",
    features: [
      "Cirujanos ilimitados",
      "SSO e integración con HIS",
      "SLA garantizado",
      "Onboarding dedicado",
      "Contrato anual",
    ],
    cta: "Contactar ventas →",
    highlight: false,
  },
]

export default function PricingSection() {
  return (
    <section className="py-28" id="precios" style={{ background: "#0A1628" }}>
      <div className="container-landing">
        <div className="mb-14">
          <p className="text-label text-blue mb-4">Precios</p>
          <h2 className="text-h2 text-white max-w-[440px]">
            Sin sorpresas. Sin funciones ocultas.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-[16px] p-7 flex flex-col"
              style={
                plan.highlight
                  ? {
                      background: "#4FACFE",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }
              }
            >
              <div className="mb-6">
                <p
                  className={`text-label mb-3 ${plan.highlight ? "text-white/70" : "text-white/40"}`}
                >
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-3">
                  <span
                    className={`text-[40px] font-black leading-none tracking-tight ${plan.highlight ? "text-white" : "text-white"}`}
                    style={{ fontFamily: "var(--font-geist), sans-serif" }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-[14px] mb-1 ${plan.highlight ? "text-white/70" : "text-white/40"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-body-sm ${plan.highlight ? "text-white/80" : "text-white/50"}`}>
                  {plan.desc}
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className={`text-[14px] font-bold ${plan.highlight ? "text-white" : "text-blue"}`}>
                      ✓
                    </span>
                    <span className={`text-body-sm ${plan.highlight ? "text-white/90" : "text-white/60"}`}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? "white" : "outline"}
                size="md"
                className={`w-full justify-center ${!plan.highlight ? "border-white/20 text-white hover:bg-white/10" : ""}`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
