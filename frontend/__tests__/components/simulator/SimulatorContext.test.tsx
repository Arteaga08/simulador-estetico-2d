import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SimulatorProvider, useSimulator } from '@/components/simulator/SimulatorContext'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SimulatorProvider patientId="p1" sessionId={null}>{children}</SimulatorProvider>
)

describe('SimulatorContext', () => {
  it('starts with no active procedures', () => {
    const { result } = renderHook(() => useSimulator(), { wrapper })
    expect(result.current.state.activeProcedures).toHaveLength(0)
  })

  it('addProcedure adds a procedure with default slider values', () => {
    const { result } = renderHook(() => useSimulator(), { wrapper })
    act(() => result.current.addProcedure('RINOPLASTIA'))
    expect(result.current.state.activeProcedures).toHaveLength(1)
    expect(result.current.state.activeProcedures[0].procedimiento).toBe('RINOPLASTIA')
    expect(result.current.state.activeProcedures[0].sliderValues['giba-nasal']).toBe(0)
  })

  it('addProcedure does not add the same procedure twice', () => {
    const { result } = renderHook(() => useSimulator(), { wrapper })
    act(() => result.current.addProcedure('RINOPLASTIA'))
    act(() => result.current.addProcedure('RINOPLASTIA'))
    expect(result.current.state.activeProcedures).toHaveLength(1)
  })

  it('removeProcedure removes by procedimiento name', () => {
    const { result } = renderHook(() => useSimulator(), { wrapper })
    act(() => result.current.addProcedure('RINOPLASTIA'))
    act(() => result.current.removeProcedure('RINOPLASTIA'))
    expect(result.current.state.activeProcedures).toHaveLength(0)
  })

  it('updateSlider changes slider value for the selected procedure', () => {
    const { result } = renderHook(() => useSimulator(), { wrapper })
    act(() => result.current.addProcedure('RINOPLASTIA'))
    act(() => result.current.updateSlider('giba-nasal', -20))
    expect(result.current.state.activeProcedures[0].sliderValues['giba-nasal']).toBe(-20)
  })

  it('setCanvasMode updates mode', () => {
    const { result } = renderHook(() => useSimulator(), { wrapper })
    act(() => result.current.setCanvasMode('split'))
    expect(result.current.state.canvasMode).toBe('split')
  })
})
