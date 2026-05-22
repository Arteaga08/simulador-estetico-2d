"use client";

import { useEffect, useRef } from "react";

const PINS = [
  { n: 1, label: "Proyección dorsal", x: 49, y: 42, delay: "1" as const },
  { n: 2, label: "Punta nasal", x: 53, y: 56, delay: "2" as const },
  { n: 3, label: "Mentón", x: 50, y: 84, delay: "3" as const },
];

export default function FeatureAnnotations() {
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
    <section ref={sectionRef} className="bg-white py-28 md:py-36">
      <div className="container-landing">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Mockup: silueta facial + pines */}
          <div className="order-2 lg:order-1 feature-item">
            <div
              className="relative aspect-4/5 w-full max-w-md mx-auto rounded-4xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, #F5F3FF 0%, #EEF2FF 100%)",
              }}
            >
              {/* Silueta abstracta */}
              <svg
                viewBox="0 0 200 250"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <path
                  d="M100 30 C 60 30, 45 70, 48 115 C 50 155, 65 195, 100 215 C 135 195, 150 155, 152 115 C 155 70, 140 30, 100 30 Z"
                  fill="url(#faceGrad)"
                  stroke="#E0E7FF"
                  strokeWidth="1"
                />
                <path
                  d="M100 90 L100 140 M86 155 Q100 165 114 155"
                  stroke="#C7D2FE"
                  strokeWidth="0.8"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>

              {/* Pines */}
              {PINS.map((p) => (
                <div
                  key={p.n}
                  className="pin-enter absolute"
                  data-delay={p.delay}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-indigo/40 blur-md" />
                      <div className="relative w-6 h-6 rounded-full bg-indigo text-white flex items-center justify-center text-[10px] font-bold shadow-[0_4px_12px_rgba(102,126,234,0.4)]">
                        {p.n}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-indigo-light px-2.5 py-1 text-[11px] font-medium text-text-primary whitespace-nowrap">
                      {p.label}
                    </div>
                  </div>
                </div>
              ))}

              {/* Sello discreto */}
              <div className="absolute bottom-4 left-4 text-[9px] font-mono text-text-muted/60 uppercase tracking-widest">
                Caso · #284
              </div>
            </div>
          </div>

          <div className="flex flex-col order-1 lg:order-2">
            <p className="text-label text-indigo mb-5 feature-item">
              02 — Anotaciones clínicas
            </p>
            <h3 className="text-h2 text-text-primary mb-5 feature-item">
              El razonamiento clínico, documentado.
            </h3>
            <p className="text-body-lg text-text-muted max-w-md feature-item">
              Pines numerados y notas por zona. Quedan en el expediente para la
              próxima consulta.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 feature-item">
              <span className="text-[13px] text-text-secondary">
                Hasta <strong className="text-text-primary">12 pines</strong>{" "}
                por sesión
              </span>
              <span className="w-px h-3 bg-border" />
              <span className="text-[13px] text-text-secondary">
                Export PDF
              </span>
              <span className="w-px h-3 bg-border" />
              <span className="text-[13px] text-text-secondary">
                Sync expediente
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
