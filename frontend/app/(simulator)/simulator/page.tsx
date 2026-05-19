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
      <div
        className="h-screen overflow-hidden grid"
        style={{
          gridTemplateRows: '44px 1fr 52px',
          gridTemplateColumns: '220px 1fr',
        }}
      >
        <SimulatorTopbar patientName="Paciente" sessionNumber={1} />
        <ProcedureSidebar />
        <div className="flex overflow-hidden col-start-2">
          <CanvasWorkspace />
          <SlidersPanel />
        </div>
        <SimulatorBottombar
          onExportPDF={() => {}}
          onShare={() => {}}
        />
      </div>
    </SimulatorProvider>
  )
}
