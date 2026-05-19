'use client'

import { useSimulator } from './SimulatorContext'
import { useSaveSession } from '@/lib/canvas/useSaveSession'

interface SimulatorBottombarProps {
  onExportPDF: () => void
  onShare: () => void
}

export function SimulatorBottombar({ onExportPDF, onShare }: SimulatorBottombarProps) {
  const { state } = useSimulator()
  const { save, isSaving } = useSaveSession()

  return (
    <footer
      className="bg-white border-t flex items-center px-3.5 gap-1.5"
      style={{ height: '52px', borderColor: '#E9D5FF' }}
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
        onClick={save}
        disabled={isSaving}
        className="btn-primary text-[0.72rem] disabled:opacity-60"
      >
        {isSaving ? 'Guardando...' : '💾 Guardar sesión'}
      </button>
    </footer>
  )
}
