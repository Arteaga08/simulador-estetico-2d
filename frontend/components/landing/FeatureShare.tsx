"use client";

import { ShareNetwork, Clock, Link, Palette } from "@phosphor-icons/react";

export default function FeatureShare() {
  return (
    <section className="bg-[#0A0F1C] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col">
            <p className="text-[11px] font-bold tracking-[0.2em] text-green-400 uppercase mb-6">
              03 — COMPARTIR RESULTADOS
            </p>
            <h3 className="text-4xl font-bold text-white mb-6">
              Que el paciente decida en casa.
            </h3>
            <p className="text-slate-400 text-[17px] mb-8">
              Envía un enlace temporal. Acorta el ciclo de decisión con
              seguridad y elegancia.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              {[
                { i: Clock, t: "48 Horas" },
                { i: Link, t: "Sin registro" },
                { i: Palette, t: "Marca" },
              ].map((x) => (
                <div key={x.t}>
                  <div className="mb-2 text-green-400">
                    <x.i size={20} weight="duotone" />
                  </div>
                  <p className="text-white font-bold text-xs">{x.t}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#111827] rounded-[32px] p-8 border border-white/5">
            <div className="h-64 bg-white/5 rounded-2xl border border-white/10 flex overflow-hidden shadow-sm">
              <div className="flex-1 border-r border-white/10 flex items-center justify-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
                Antes
              </div>
              <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-green-400 uppercase tracking-widest">
                Después
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
