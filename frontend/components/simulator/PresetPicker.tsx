import type { Procedimiento } from './types'

interface PresetPickerProps {
  procedimiento: Procedimiento
  activePresetId: string | null
}

export function PresetPicker(_props: PresetPickerProps) {
  return <div data-testid="preset-picker" />
}
