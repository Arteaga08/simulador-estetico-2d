import { describe, it, expect } from 'vitest'
import {
  PROCEDURE_LABELS,
  SLIDERS_BY_PROCEDURE,
  TECHNIQUES_BY_PROCEDURE,
  getSliderDefs,
  getAvailableTechniques,
} from '@/lib/procedures'
import type { Procedimiento } from '@/components/simulator/types'

describe('procedures config', () => {
  it('has a label for every procedure', () => {
    const procs: Procedimiento[] = [
      'RINOPLASTIA', 'LIFTING_CEJAS', 'AUMENTO_MENTON', 'AUMENTO_LABIOS',
      'LIFTING_CUELLO', 'BLEFAROPLASTIA', 'SUAVIZADO_PIEL', 'FEMINIZACION_FACIAL',
    ]
    procs.forEach(p => {
      expect(PROCEDURE_LABELS[p]).toBeTruthy()
    })
  })

  it('RINOPLASTIA has 3 sliders', () => {
    const sliders = getSliderDefs('RINOPLASTIA')
    expect(sliders).toHaveLength(3)
  })

  it('RINOPLASTIA sliders include giba-nasal with blockedNegativeInRinomodelacion', () => {
    const sliders = getSliderDefs('RINOPLASTIA')
    const giba = sliders.find(s => s.id === 'giba-nasal')
    expect(giba).toBeDefined()
    expect(giba!.blockedNegativeInRinomodelacion).toBe(true)
  })

  it('RINOPLASTIA has QUIRURGICO and RINOMODELACION techniques', () => {
    const tecnicas = getAvailableTechniques('RINOPLASTIA')
    expect(tecnicas).toContain('QUIRURGICO')
    expect(tecnicas).toContain('RINOMODELACION')
  })

  it('getSliderDefs returns sliders for every procedure', () => {
    const procs: Procedimiento[] = [
      'RINOPLASTIA', 'LIFTING_CEJAS', 'AUMENTO_MENTON', 'AUMENTO_LABIOS',
      'LIFTING_CUELLO', 'BLEFAROPLASTIA', 'SUAVIZADO_PIEL', 'FEMINIZACION_FACIAL',
    ]
    procs.forEach(p => {
      expect(getSliderDefs(p).length).toBeGreaterThan(0)
    })
  })
})
