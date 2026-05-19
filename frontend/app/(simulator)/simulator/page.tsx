'use client'

import { SimulatorProvider } from '@/components/simulator/SimulatorContext'
import { SimulatorTopbar } from '@/components/simulator/SimulatorTopbar'
import { ProcedureSidebar } from '@/components/simulator/ProcedureSidebar'
import { CanvasWorkspace } from '@/components/simulator/CanvasWorkspace'
import { SlidersPanel } from '@/components/simulator/SlidersPanel'
import { SimulatorBottombar } from '@/components/simulator/SimulatorBottombar'

export default function SimulatorPage() {
  return (
    <SimulatorProvider patientId={null} sessionId={null}>
      <div className="h-screen overflow-hidden flex">
        {/* Sidebar spans full height — continuous dark column */}
        <ProcedureSidebar />

        {/* Content column: topbar + workspace + bottombar */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <SimulatorTopbar patientName="Paciente" sessionNumber={1} />
          <div className="flex flex-1 overflow-hidden">
            <CanvasWorkspace />
            <SlidersPanel />
          </div>
          <SimulatorBottombar onExportPDF={() => {}} onShare={() => {}} />
        </div>
      </div>
    </SimulatorProvider>
  )
}
