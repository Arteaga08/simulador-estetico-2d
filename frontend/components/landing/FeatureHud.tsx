"use client";

import { useEffect, useRef } from "react";

const SLIDERS = [
  { label: "Proyección", value: 68 },
  { label: "Mentón", value: 52 },
  { label: "Cigomático", value: 84 },
] as const;

export default function FeatureHud() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("feature-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "-80px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="caracteristicas"
      className="bg-bg-dark-section py-28 md:py-36"
    >
      <div className="container-landing">
        {/* Unificador narrativo */}
        <div className="text-center mb-28 max-w-3xl mx-auto feature-item">
          <h2 className="text-display text-white">
            Termina la consulta,
            <br />
            <span style={{ color: "#BFDBFE" }}>empieza el flujo.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col">
            <p className="text-label text-blue mb-5 feature-item">
              01 — Control en tiempo real
            </p>
            <h3 className="text-h2 text-white mb-5 feature-item">
              HUD en tus manos.
            </h3>
            <p className="text-body-lg text-white/60 max-w-md feature-item">
              Sliders por zona facial. Procesamiento al instante sobre la foto
              del paciente.
            </p>

            <div className="mt-10 flex items-center gap-5 text-[11px] font-mono text-white/45 tracking-wide feature-item">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
                60 FPS
              </span>
              <span className="w-px h-3 bg-white/15" />
              <span>LATENCIA 8 ms</span>
              <span className="w-px h-3 bg-white/15" />
              <span>144 PARÁM.</span>
            </div>
          </div>

          {/* Mockup HUD */}
          <div
            className="rounded-4xl p-8 border border-white/10 feature-item"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
            }}
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">
                HUD · vista activa
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="space-y-7">
              {SLIDERS.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-[12px] text-white/70 mb-2 font-mono">
                    <span>{s.label}</span>
                    <span className="tabular-nums">{s.value}%</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="slider-fill h-full rounded-full bg-blue"
                      style={
                        {
                          "--p": s.value / 100,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/35 uppercase tracking-widest">
              <span>Ángulo nasolabial</span>
              <span className="text-blue/80 tabular-nums">102.4°</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
