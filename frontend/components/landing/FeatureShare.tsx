"use client";

import { useEffect, useRef, useState } from "react";

export default function FeatureShare() {
  const sectionRef = useRef<HTMLElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(52);

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

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = compareRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSplit(Math.max(8, Math.min(92, x)));
  };

  return (
    <section ref={sectionRef} className="bg-bg-dark-section py-28 md:py-36">
      <div className="container-landing">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col">
            <p className="text-label text-blue mb-5 feature-item">
              03 — Compartir resultados
            </p>
            <h3 className="text-h2 text-white mb-5 feature-item">
              Que el paciente decida en casa.
            </h3>
            <p className="text-body-lg text-white/60 max-w-md feature-item">
              Envía un enlace temporal. Acorta el ciclo de decisión con
              seguridad y elegancia.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 feature-item">
              <span className="text-[13px] text-white/70">
                <strong className="text-white">48 h</strong> TTL
              </span>
              <span className="w-px h-3 bg-white/15" />
              <span className="text-[13px] text-white/70">Sin login</span>
              <span className="w-px h-3 bg-white/15" />
              <span className="text-[13px] text-white/70">
                Branding clínica
              </span>
            </div>
          </div>

          {/* Comparador interactivo */}
          <div className="feature-item">
            <div
              ref={compareRef}
              onPointerMove={handleMove}
              className="beforeafter-root relative aspect-4/3 w-full rounded-4xl overflow-hidden border border-white/10 cursor-ew-resize select-none"
              style={
                {
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
                  "--split": `${split}%`,
                } as React.CSSProperties
              }
            >
              {/* Antes — silueta base */}
              <CompareLayer tone="muted" />

              {/* Después — silueta refinada, clipeada */}
              <div className="beforeafter-after absolute inset-0">
                <CompareLayer tone="primary" />
              </div>

              {/* Etiquetas */}
              <div className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-widest text-white/40">
                Antes
              </div>
              <div className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest text-blue">
                Después
              </div>

              {/* Divisor */}
              <div
                className="beforeafter-handle absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none"
                style={{ left: `${split}%` }}
              >
                <div className="w-px h-full bg-white/40" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(79,172,254,0.6), 0 8px 32px rgba(79,172,254,0.35)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="text-blue-dark"
                  >
                    <path
                      d="M5 3L2 7l3 4M9 3l3 4-3 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] font-mono text-white/30 text-center tracking-widest uppercase">
              Mueve el cursor sobre la imagen
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareLayer({ tone }: { tone: "muted" | "primary" }) {
  const stroke = tone === "primary" ? "#4FACFE" : "rgba(255,255,255,0.25)";
  const fill =
    tone === "primary" ? "rgba(79,172,254,0.08)" : "rgba(255,255,255,0.03)";
  const bg =
    tone === "primary"
      ? "linear-gradient(180deg, rgba(79,172,254,0.08) 0%, rgba(102,126,234,0.04) 100%)"
      : "transparent";

  // Sutil deformación de punta nasal en "Después"
  const path =
    tone === "primary"
      ? "M100 28 C 58 28, 44 70, 47 116 C 49 158, 66 198, 100 218 C 134 198, 151 158, 153 116 C 156 70, 142 28, 100 28 Z"
      : "M100 32 C 60 32, 46 72, 49 116 C 51 156, 66 196, 100 214 C 134 196, 149 156, 151 116 C 154 72, 140 32, 100 32 Z";

  return (
    <div className="absolute inset-0" style={{ background: bg }}>
      <svg
        viewBox="0 0 200 250"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path d={path} fill={fill} stroke={stroke} strokeWidth="1.2" />
        <path
          d="M100 92 L100 142 M86 156 Q100 166 114 156"
          stroke={stroke}
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
