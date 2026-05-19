import Button from "@/components/ui/Button"

export default function CtaSection() {
  return (
    <section
      className="py-28"
      style={{ background: "#4FACFE" }}
    >
      <div className="container-landing text-center">
        <h2
          className="text-h1 text-white mb-5"
          style={{ fontFamily: "var(--font-geist), sans-serif" }}
        >
          Empieza a mostrar resultados desde hoy.
        </h2>
        <p className="text-[17px] text-white/75 leading-[1.65] mb-10 max-w-[480px] mx-auto">
          14 días gratis, sin tarjeta. Configura tu primera sesión
          en menos de 10 minutos.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="white" size="xl" className="font-bold">
            Comenzar gratis →
          </Button>
          <a
            href="#"
            className="inline-flex items-center justify-center h-12 px-6 text-[15px] font-semibold text-white border border-white/30 rounded-[12px] hover:bg-white/10 transition-colors"
          >
            Ver demo en vivo
          </a>
        </div>

        <p className="mt-6 text-[12px] text-white/50">
          Sin permanencia · Cancela cuando quieras · Soporte en español
        </p>
      </div>
    </section>
  )
}
