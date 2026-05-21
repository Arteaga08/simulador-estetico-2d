"use client";

import { useEffect, useRef } from "react";
import {
  CrosshairIcon,
  ShieldCheckIcon,
  CompassIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

type Pillar = {
  tag: string;
  title: string;
  text: string;
  bg: string;
  tagColor: string;
  Icon: Icon;
};

// Limpiamos los datos: sin números, sin métricas, copy directo.
const PILLARS: Pillar[] = [
  {
    tag: "PRECISIÓN CLÍNICA",
    title: "Comunicación anatómica fluida",
    text: "Sustituye las descripciones abstractas por proyecciones en tiempo real. Alinea las expectativas desde el primer minuto.",
    bg: "bg-[#EEF2FF]", // Indigo claro
    tagColor: "text-[#4338CA]",
    Icon: CrosshairIcon,
  },
  {
    tag: "ÉTICA DEL DATO",
    title: "Infraestructura médica privada",
    text: "Procesamiento de imágenes sin almacenamiento de metadatos. Un entorno seguro que respeta la confidencialidad por defecto.",
    bg: "bg-[#EFF6FF]", // Azul claro
    tagColor: "text-[#1D4ED8]",
    Icon: ShieldCheckIcon,
  },
  {
    tag: "DECISIÓN INFORMADA",
    title: "Cierre de consulta asíncrono",
    text: "Extiende el impacto fuera del consultorio. Enlaces seguros y temporales para que el paciente evalúe su decisión en casa.",
    bg: "bg-[#F0FDF4]", // Verde claro
    tagColor: "text-[#15803D]",
    Icon: CompassIcon,
  },
];

export default function NarrativeSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("narrative-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="narrative-section bg-white py-24 md:py-36"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* ========================================= */}
        {/* HEADER DE SECCIÓN                         */}
        {/* ========================================= */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <p className="text-[11px] font-bold tracking-[0.25em] text-indigo-dark uppercase mb-4">
            01 — FLUJO DIGITAL
          </p>
          <h2
            className="font-sans font-extrabold text-slate-900 leading-[1.15] tracking-tight max-w-2xl mx-auto"
            style={{ fontSize: "clamp(36px, 5vw, 52px)" }}
          >
            Tecnología médica para la{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue to-[#00F2FE]">
              primera consulta.
            </span>
          </h2>
        </div>

        {/* ========================================= */}
        {/* GRID DE TARJETAS (ESTILO APPCUES)         */}
        {/* ========================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {PILLARS.map((pillar, idx) => {
            const PillarIcon = pillar.Icon;
            return (
              <article
                key={idx}
                // Usamos pt-10 para el padding superior y pb-0 para que la imagen toque el fondo
                className={`flex flex-col rounded-[32px] overflow-hidden ${pillar.bg} pt-10 px-8 sm:px-10 transition-all duration-300 shadow-sm`}
                style={{ minHeight: "560px" }}
              >
                {/* 1. Contenido Escrito */}
                <div className="flex flex-col mb-10">
                  <div
                    className={`flex items-center gap-2 mb-5 ${pillar.tagColor}`}
                  >
                    <PillarIcon size={20} weight="bold" />
                    <p className="text-[11px] font-bold tracking-[0.18em] uppercase mt-0.5">
                      {pillar.tag}
                    </p>
                  </div>

                  <h3 className="text-slate-900 text-[26px] font-bold tracking-tight mb-4 leading-[1.2]">
                    {pillar.title}
                  </h3>

                  <p className="text-[15px] leading-relaxed text-slate-600 font-medium">
                    {pillar.text}
                  </p>
                </div>

                {/* 2. Placeholder de Imagen Sobrepuesta (Flotante al fondo) */}
                {/* mt-auto empuja esto hasta abajo. px-4 asegura que se vea el fondo de la tarjeta a los lados */}
                <div className="mt-auto w-full relative px-2 sm:px-6">
                  {/* Aquí es donde colocarás tu <img> real más adelante. 
                      Por ahora es un mock de UI para que veas el efecto Appcues */}
                  <div className="w-full h-56 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.04)] border border-white/50 relative overflow-hidden flex flex-col">
                    {/* Barra de título del mock */}
                    <div className="h-10 border-b border-slate-100 flex items-center px-4 gap-1.5 bg-slate-50/50">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    </div>

                    {/* Contenido del mock */}
                    <div className="flex-1 bg-slate-50 flex items-center justify-center p-6 relative">
                      {/* Elemento decorativo sutil en el fondo del placeholder */}
                      <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle, #000 2px, transparent 2px)",
                          backgroundSize: "16px 16px",
                        }}
                      />
                      <div
                        className={`w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100 ${pillar.tagColor} z-10`}
                      >
                        <PillarIcon size={28} weight="duotone" />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
