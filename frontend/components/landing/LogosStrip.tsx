"use client";

const clinicas = [
  "Clínica Estética Madrid",
  "Palladio Facial",
  "Centro Médico Quirón",
  "Instituto de Cirugía Plástica",
  "Clínica Dorsia",
  "Grupo HC Marbella",
];

const track = [...clinicas, ...clinicas, ...clinicas];

export default function LogosStrip() {
  return (
    <div className="bg-blue-dark py-14 relative overflow-hidden border-y border-white/5">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <p className="text-[13px] font-bold tracking-[0.18em] uppercase text-white/45 text-center mb-10">
        Usado por cirujanos en clínicas de referencia
      </p>

      <div
        className="relative w-full overflow-hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div
          className="flex w-max"
          style={{ animation: "marquee 50s linear infinite" }}
        >
          {track.map((nombre, idx) => (
            <div key={`${nombre}-${idx}`} className="flex items-center">
              <span className="px-8 md:px-10 text-[15px] md:text-[17px] font-display font-semibold tracking-tight text-white/40 whitespace-nowrap cursor-default">
                {nombre}
              </span>
              <span
                className="text-white/15 text-[10px] select-none"
                aria-hidden="true"
              >
                ·
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
