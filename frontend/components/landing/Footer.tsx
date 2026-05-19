const columns = [
  {
    heading: "Producto",
    links: ["Características", "Precios", "Changelog", "Roadmap"],
  },
  {
    heading: "Legal",
    links: ["Privacidad", "Términos de uso", "Cookies", "HIPAA"],
  },
  {
    heading: "Contacto",
    links: ["Soporte", "Ventas enterprise", "Twitter / X", "LinkedIn"],
  },
]

export default function Footer() {
  return (
    <footer className="bg-blue-dark py-16">
      <div className="container-landing">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-12">
          {/* Brand column */}
          <div>
            <p
              className="text-[17px] font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-geist), sans-serif" }}
            >
              SimEstético
            </p>
            <p className="text-body-sm text-white/45 max-w-60 leading-[1.7]">
              Simulador facial 2D en tiempo real para cirujanos y clínicas de estética.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-label text-white/30 mb-5">{col.heading}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-body-sm text-white/50 hover:text-white/80 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/30">
            © 2026 SimEstético. Todos los derechos reservados.
          </p>
          <p className="text-[12px] text-white/20">
            Hecho para cirujanos, no para diseñadores.
          </p>
        </div>
      </div>
    </footer>
  )
}
