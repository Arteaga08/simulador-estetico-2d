"use client";

import { useState } from "react";
import { X, Question } from "@phosphor-icons/react";
import type { FaceView } from "@/utils/viewClassifier";

interface Props {
  open: boolean;
  fileName: string | null;
  onCancel: () => void;
  onConfirm: (view: FaceView) => void;
  onOpenGuide: () => void;
}

type ViewChoice = "perfil-derecho" | "perfil-izquierdo" | "frontal";

// We collapse left/right profiles into a single 'perfil' for the simulator
// (the slider logic only needs to know it's a profile, not which side).
function toFaceView(choice: ViewChoice): FaceView {
  return choice === "frontal" ? "frontal" : "perfil";
}

const CHOICES: Array<{
  id: ViewChoice;
  label: string;
  sub: string;
}> = [
  {
    id: "perfil-derecho",
    label: "Perfil derecho",
    sub: "Lado derecho del paciente hacia cámara",
  },
  {
    id: "perfil-izquierdo",
    label: "Perfil izquierdo",
    sub: "Lado izquierdo del paciente hacia cámara",
  },
  {
    id: "frontal",
    label: "Frontal",
    sub: "Vista de frente, plano Frankfort horizontal",
  },
];

export function PhotoUploadModal({
  open,
  fileName,
  onCancel,
  onConfirm,
  onOpenGuide,
}: Props) {
  const [choice, setChoice] = useState<ViewChoice | null>(null);
  if (!open) return null;

  const handleConfirm = () => {
    if (!choice) return;
    onConfirm(toFaceView(choice));
    setChoice(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15, 23, 42, 0.55)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              ¿Qué vista es esta foto?
            </h2>
            {fileName && (
              <p
                className="text-xs text-text-muted mt-0.5 truncate"
                title={fileName}
              >
                {fileName}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted"
            title="Cancelar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-2">
          {CHOICES.map((c) => {
            const active = choice === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChoice(c.id)}
                className="w-full text-left px-4 py-3 rounded-lg border transition-colors"
                style={{
                  background: active ? "#EEF2FF" : "white",
                  borderColor: active ? "#6366F1" : "#E5E7EB",
                }}
              >
                <div
                  className="text-sm font-semibold"
                  style={{ color: active ? "#4338CA" : "#111827" }}
                >
                  {c.label}
                </div>
                <div className="text-xs text-text-muted mt-0.5">{c.sub}</div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
          >
            <Question size={14} />
            ¿Cómo tomar una buena foto?
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md text-sm font-medium text-text-muted hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!choice}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white"
              style={{
                background: choice ? "#4F46E5" : "#C7D2FE",
                cursor: choice ? "pointer" : "not-allowed",
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
