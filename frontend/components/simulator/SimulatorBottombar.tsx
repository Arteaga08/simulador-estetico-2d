'use client'

import { useSimulator } from './SimulatorContext'

interface SimulatorBottombarProps {
  onExportPDF: () => void
  onShare: () => void
  onSave?: () => Promise<void>
}

export function SimulatorBottombar({ onExportPDF, onShare, onSave }: SimulatorBottombarProps) {
  const { state } = useSimulator()

  return (
    <footer
      className="h-13 bg-white border-t flex items-center px-3.5 gap-1.5 border-border"
    >
      <button className="btn-secondary text-[0.72rem]">⟳ Reset total</button>
      <button className="btn-ghost text-[0.72rem]">📐 Medir ángulos</button>

      <div className="flex-1" />

      <button onClick={onExportPDF} className="btn-secondary text-[0.72rem]">
        📤 Exportar PDF
      </button>
      <button onClick={onShare} className="btn-secondary text-[0.72rem]">
        🔗 Compartir (48h)
      </button>
      <button
        onClick={onSave}
        disabled={state.isSaving}
        className="btn-primary text-[0.72rem] disabled:opacity-60"
      >
        {state.isSaving ? 'Guardando...' : '💾 Guardar sesión'}
      </button>
    </footer>
  )
}
