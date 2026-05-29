"use client";

import { useState } from "react";
import { X, CaretDown, CaretUp, WarningCircle, Info } from "@phosphor-icons/react";
import type { QualityReport, QualityWarning } from "@/lib/canvas/imageQuality";

interface Props {
  report: QualityReport | null;
  onDismiss: () => void;
  onOpenGuide: () => void;
}

function styleFor(severity: QualityWarning["severity"]) {
  if (severity === "warning") {
    return {
      bg: "#FEF3C7",
      border: "#FCD34D",
      color: "#92400E",
      iconColor: "#D97706",
    };
  }
  return {
    bg: "#E5E7EB",
    border: "#D1D5DB",
    color: "#374151",
    iconColor: "#6B7280",
  };
}

export function PhotoQualityBanner({ report, onDismiss, onOpenGuide }: Props) {
  const [expanded, setExpanded] = useState(true);
  if (!report || report.warnings.length === 0) return null;

  const hasWarning = report.warnings.some((w) => w.severity === "warning");

  return (
    <div
      className="absolute top-3 left-3 right-3 z-30 rounded-lg shadow-md pointer-events-auto"
      style={{
        background: hasWarning ? "#FFFBEB" : "#F9FAFB",
        border: `1px solid ${hasWarning ? "#FCD34D" : "#E5E7EB"}`,
        maxWidth: 520,
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasWarning ? (
            <WarningCircle size={16} color="#D97706" weight="fill" />
          ) : (
            <Info size={16} color="#6B7280" weight="fill" />
          )}
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: hasWarning ? "#92400E" : "#374151" }}
          >
            Calidad de foto: {report.warnings.length} aviso
            {report.warnings.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded hover:bg-black/5 text-text-muted"
          title={expanded ? "Colapsar" : "Expandir"}
        >
          {expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
        </button>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/5 text-text-muted"
          title="Descartar"
        >
          <X size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {report.warnings.map((w) => {
            const s = styleFor(w.severity);
            return (
              <div
                key={w.code}
                className="rounded-md px-2.5 py-2"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                }}
              >
                <div
                  className="text-[12px] font-semibold flex items-center gap-1.5"
                  style={{ color: s.color }}
                >
                  {w.severity === "warning" ? (
                    <WarningCircle size={12} color={s.iconColor} weight="fill" />
                  ) : (
                    <Info size={12} color={s.iconColor} weight="fill" />
                  )}
                  {w.label}
                </div>
                <p
                  className="text-[11px] leading-snug mt-1"
                  style={{ color: s.color }}
                >
                  {w.tip}
                </p>
              </div>
            );
          })}
          <button
            onClick={onOpenGuide}
            className="text-[11px] font-semibold text-indigo-700 hover:underline mt-1"
          >
            Ver protocolo completo →
          </button>
        </div>
      )}
    </div>
  );
}
