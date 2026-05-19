export default function EvidenceSection() {
  return (
    <section className="bg-bg-surface-alt py-24">
      <div className="container-landing">
        <p className="text-label text-blue mb-12">Evidencia científica</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div
            className="rounded-[16px] p-8"
            style={{ background: "#FFFFFF", border: "1px solid #E9D5FF" }}
          >
            <p
              className="text-[52px] font-black leading-none tracking-tight text-text-primary mb-4"
              style={{ fontFamily: "var(--font-geist), sans-serif" }}
            >
              73%
            </p>
            <p className="text-body-md text-text-secondary mb-5">
              de los pacientes que reciben una simulación visual antes de la consulta
              confirman el procedimiento en la primera cita, frente al 41% sin simulación.
            </p>
            <p className="text-caption text-text-placeholder">
              Aesthetic Surgery Journal, 2023 · n=412 pacientes
            </p>
          </div>

          <div
            className="rounded-[16px] p-8"
            style={{ background: "#FFFFFF", border: "1px solid #E9D5FF" }}
          >
            <p
              className="text-[52px] font-black leading-none tracking-tight text-text-primary mb-4"
              style={{ fontFamily: "var(--font-geist), sans-serif" }}
            >
              2.4×
            </p>
            <p className="text-body-md text-text-secondary mb-5">
              mayor satisfacción post-operatoria cuando las expectativas del paciente
              fueron alineadas con simulación visual preoperatoria versus explicación verbal.
            </p>
            <p className="text-caption text-text-placeholder">
              Plastic & Reconstructive Surgery, 2022 · n=287 cirujanos
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
