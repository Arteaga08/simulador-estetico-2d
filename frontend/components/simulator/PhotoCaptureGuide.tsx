"use client";

import { X } from "@phosphor-icons/react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface GuideItem {
  title: string;
  do: string;
  avoid: string;
}

const ITEMS: GuideItem[] = [
  {
    title: "Fondo",
    do: "Muro liso, color sólido (gris claro, azul o blanco).",
    avoid: "Cuadros, muebles, ventanas, exteriores.",
  },
  {
    title: "Iluminación",
    do: "Luz frontal suave y uniforme sobre todo el rostro.",
    avoid: "Flash directo, contraluz, luz cenital, sombras duras.",
  },
  {
    title: "Distancia",
    do: "~1.5 m entre cámara y paciente.",
    avoid: "Selfies o gran angular (distorsiona las proporciones nasales).",
  },
  {
    title: "Encuadre",
    do: "Cabeza completa y cuello visibles, centrados en el cuadro.",
    avoid: "Cortar frente o mentón; rostro ocupando menos de un cuarto.",
  },
  {
    title: "Pose",
    do: "Plano de Frankfort horizontal (línea ojos-trago paralela al piso). Mirada al frente.",
    avoid: "Cabeza inclinada hacia arriba o abajo; rotación ligera entre frontal y perfil.",
  },
  {
    title: "Expresión",
    do: "Neutra, boca cerrada, sin tensión facial.",
    avoid: "Sonrisa, ojos cerrados, gestos.",
  },
  {
    title: "Pelo y accesorios",
    do: "Pelo recogido despejando frente y orejas. Sin maquillaje pesado.",
    avoid: "Gafas, aretes prominentes, flequillo sobre el rostro.",
  },
  {
    title: "Vistas requeridas",
    do: "Frontal estricto + perfil derecho estricto + perfil izquierdo estricto.",
    avoid: "Vistas oblicuas (¾) o basal — todavía no están soportadas.",
  },
];

export function PhotoCaptureGuide({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15, 23, 42, 0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Cómo tomar una buena foto
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Protocolo fotográfico estándar para rinoplastia. Cuanto más se
              cumpla, más precisos serán la detección y los sliders.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="border border-border rounded-lg p-4"
            >
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                {item.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
                    Sí
                  </div>
                  <p className="text-sm text-text-primary leading-snug">
                    {item.do}
                  </p>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-rose-700 mb-1">
                    Evitar
                  </div>
                  <p className="text-sm text-text-primary leading-snug">
                    {item.avoid}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border sticky bottom-0 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
