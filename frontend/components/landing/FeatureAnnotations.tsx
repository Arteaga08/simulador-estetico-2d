"use client";

import {
  NotePencil,
  Target,
  ClockClockwise,
  FilePdf,
} from "@phosphor-icons/react";

export default function FeatureAnnotations() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 bg-slate-50 rounded-[32px] p-12 border border-slate-100">
            <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
              <div className="flex gap-3 items-center">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                  1
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Proyección dorsal
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col order-1 lg:order-2">
            <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-600 uppercase mb-6">
              02 — ANOTACIONES CLÍNICAS
            </p>
            <h3 className="text-4xl font-bold text-slate-900 mb-6">
              El razonamiento clínico, documentado.
            </h3>
            <p className="text-slate-500 text-[17px] mb-8">
              Añade pines numerados y notas sobre zonas específicas. Todo queda
              guardado en el expediente para la próxima consulta.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
              {[
                { i: Target, t: "Pines" },
                { i: ClockClockwise, t: "Historial" },
                { i: FilePdf, t: "PDFs" },
              ].map((x) => (
                <div key={x.t}>
                  <div className="mb-2 text-indigo-500">
                    <x.i size={20} weight="duotone" />
                  </div>
                  <p className="text-slate-900 font-bold text-xs">{x.t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
