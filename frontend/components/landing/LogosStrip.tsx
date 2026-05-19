const clinicas = [
  "Clínica Estética Madrid",
  "Palladio Facial",
  "Centro Médico Quirón",
  "Instituto de Cirugía Plástica",
  "Clínica Dorsia",
  "Grupo HC Marbella",
]

export default function LogosStrip() {
  return (
    <div className="bg-blue-dark py-10">
      <div className="container-landing">
        <p className="text-label text-white/35 text-center mb-8">
          Usado por cirujanos en clínicas de referencia
        </p>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
          {clinicas.map((nombre) => (
            <span
              key={nombre}
              className="text-[13px] font-semibold text-white/40 tracking-wide"
            >
              {nombre}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
