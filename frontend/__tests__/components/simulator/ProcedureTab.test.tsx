import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProcedureTab } from '@/components/simulator/ProcedureTab'
import { SimulatorProvider } from '@/components/simulator/SimulatorContext'
import type { ReactNode } from 'react'
import type { ActiveProcedure } from '@/components/simulator/types'

const activeProcedure: ActiveProcedure = {
  procedimiento: 'RINOPLASTIA',
  tecnica: 'QUIRURGICO',
  sliderValues: { 'giba-nasal': -20, 'proyeccion-punta': 18, 'rotacion-punta': 5 },
  intensity: 70,
  presetId: null,
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <SimulatorProvider patientId="p1" sessionId={null}>{children}</SimulatorProvider>
)

describe('ProcedureTab', () => {
  it('renders all sliders for RINOPLASTIA', () => {
    render(
      <ProcedureTab procedure={activeProcedure} isSelected />,
      { wrapper }
    )
    expect(screen.getByText('Giba nasal')).toBeInTheDocument()
    expect(screen.getByText('Proyección de punta')).toBeInTheDocument()
    expect(screen.getByText('Rotación de punta')).toBeInTheDocument()
  })

  it('renders the technique badge', () => {
    render(<ProcedureTab procedure={activeProcedure} isSelected />, { wrapper })
    expect(screen.getByText('Quirúrgico')).toBeInTheDocument()
  })

  it('renders intensity slider', () => {
    render(<ProcedureTab procedure={activeProcedure} isSelected />, { wrapper })
    expect(screen.getByText('Intensidad global')).toBeInTheDocument()
  })
})
