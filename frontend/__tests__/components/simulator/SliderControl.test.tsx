import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SliderControl } from '@/components/simulator/SliderControl'

const baseProps = {
  id: 'giba-nasal',
  label: 'Giba nasal',
  min: -60,
  max: 0,
  step: 1,
  value: -20,
  onChange: vi.fn(),
  disabled: false,
}

describe('SliderControl', () => {
  it('renders the label and current value', () => {
    render(<SliderControl {...baseProps} />)
    expect(screen.getByText('Giba nasal')).toBeInTheDocument()
    expect(screen.getByText('−20')).toBeInTheDocument()
  })

  it('renders an input[type=range] with correct min/max/value', () => {
    render(<SliderControl {...baseProps} />)
    const input = screen.getByRole('slider')
    expect(input).toHaveAttribute('min', '-60')
    expect(input).toHaveAttribute('max', '0')
    expect(input).toHaveAttribute('value', '-20')
  })

  it('calls onChange with numeric value when changed', async () => {
    const onChange = vi.fn()
    render(<SliderControl {...baseProps} onChange={onChange} />)
    const input = screen.getByRole('slider')
    await userEvent.type(input, '{arrowup}')
    expect(onChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<SliderControl {...baseProps} disabled={true} />)
    expect(screen.getByRole('slider')).toBeDisabled()
  })

  it('displays positive value with + prefix', () => {
    render(<SliderControl {...baseProps} value={18} min={-20} max={40} />)
    expect(screen.getByText('+18')).toBeInTheDocument()
  })

  it('displays zero without prefix', () => {
    render(<SliderControl {...baseProps} value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
