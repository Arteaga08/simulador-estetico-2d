import { useCallback, useState } from 'react'
import { useSimulator } from '@/components/simulator/SimulatorContext'
import { saveSession } from '@/lib/api/sessions'

export function useSaveSession() {
  const { state } = useSimulator()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async () => {
    if (!state.patientId) return
    const activeProcedure = state.activeProcedures[state.selectedProcedureIndex]
    if (!activeProcedure) return

    setIsSaving(true)
    setError(null)
    try {
      const token = ''
      await saveSession({
        patientId: state.patientId,
        procedimiento: activeProcedure.procedimiento,
        tecnica: activeProcedure.tecnica,
        sliderConfig: Object.fromEntries(
          state.activeProcedures.map(p => [p.procedimiento, p.sliderValues])
        ),
        notas: state.notes,
      }, token)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }, [state])

  return { save, isSaving, error }
}
