"use client";

import {
  SlidersHorizontal,
  Lightning,
  ShieldCheck,
  Cloud,
} from "@phosphor-icons/react";

export default function FeatureHud() {
  return (
    <section className="bg-[#0A0F1C] py-24 md:py-32" id="caracteristicas">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Título de la narrativa unificada */}
        <div className="text-center mb-32 max-w-4xl mx-auto">
          <h2
            className="font-sans font-extrabold text-white leading-[1.1] tracking-tight"
            style={{ fontSize: "clamp(48px, 6vw, 72px)" }}
          >
            Termina la consulta,
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue to-[#00F2FE]">
              empieza el flujo.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-blue uppercase mb-6">
              01 — CONTROL EN TIEMPO REAL
            </p>
            <h3 className="text-4xl font-bold text-white mb-6">
              HUD de simulación en tus manos.
            </h3>
            <p className="text-[17px] text-slate-400 leading-relaxed mb-8">
              Sliders por zona facial y valores numéricos en pantalla. Todo lo
              que el paciente ve se procesa al instante sobre su propia
              fotografía.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              {[
                { i: Lightning, t: "Captura" },
                { i: ShieldCheck, t: "Cifrado" },
                { i: Cloud, t: "Nube" },
              ].map((x) => (
                <div key={x.t}>
                  <div className="mb-2 text-blue">
                    <x.i size={20} weight="duotone" />
                  </div>
                  <p className="text-white font-bold text-xs">{x.t}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#111827] rounded-[32px] p-8 shadow-2xl border border-white/5">
            <div className="flex justify-between mb-8">
              <span className="text-[10px] text-white/40 font-mono">
                HUD · VISTA ACTIVA
              </span>
              <span className="text-[10px] text-green-400 font-mono">
                60 FPS
              </span>
            </div>
            <div className="space-y-6">
              {[
                { l: "Proyección", p: 68 },
                { l: "Mentón", p: 52 },
                { l: "Cigomático", p: 84 },
              ].map((s) => (
                <div key={s.l}>
                  <div className="flex justify-between text-xs text-white/60 mb-2 font-mono">
                    <span>{s.l}</span>
                    <span>{s.p}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${s.p}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
