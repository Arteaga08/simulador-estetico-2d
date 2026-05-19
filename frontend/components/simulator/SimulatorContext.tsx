'use client'

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import type {
  SimulatorState, ActiveProcedure, Procedimiento, TecnicaSesion,
  CanvasMode, AnnotationPin, DrawingStroke,
} from './types'
import {
  getDefaultSliderValues, getAvailableTechniques,
} from '@/lib/procedures'

type Action =
  | { type: 'ADD_PROCEDURE'; proc: Procedimiento }
  | { type: 'REMOVE_PROCEDURE'; proc: Procedimiento }
  | { type: 'SELECT_PROCEDURE'; index: number }
  | { type: 'UPDATE_SLIDER'; sliderId: string; value: number }
  | { type: 'UPDATE_TECHNIQUE'; tecnica: TecnicaSesion }
  | { type: 'UPDATE_INTENSITY'; value: number }
  | { type: 'SET_CANVAS_MODE'; mode: CanvasMode }
  | { type: 'SET_IMAGE'; url: string }
  | { type: 'SET_HUD'; visible: boolean }
  | { type: 'SET_ACTIVE_TOOL'; tool: SimulatorState['activeTool'] }
  | { type: 'ADD_PIN'; pin: AnnotationPin }
  | { type: 'UPDATE_PIN_LABEL'; id: string; label: string }
  | { type: 'REMOVE_PIN'; id: string }
  | { type: 'ADD_STROKE'; stroke: DrawingStroke }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_SAVING'; isSaving: boolean }

function makeInitialActive(proc: Procedimiento): ActiveProcedure {
  const techniques = getAvailableTechniques(proc)
  return {
    procedimiento: proc,
    tecnica: techniques[0],
    sliderValues: getDefaultSliderValues(proc),
    intensity: 70,
    presetId: null,
  }
}

function reducer(state: SimulatorState, action: Action): SimulatorState {
  switch (action.type) {
    case 'ADD_PROCEDURE': {
      if (state.activeProcedures.find(p => p.procedimiento === action.proc)) return state
      const next = [...state.activeProcedures, makeInitialActive(action.proc)]
      return { ...state, activeProcedures: next, selectedProcedureIndex: next.length - 1 }
    }
    case 'REMOVE_PROCEDURE': {
      const next = state.activeProcedures.filter(p => p.procedimiento !== action.proc)
      return {
        ...state,
        activeProcedures: next,
        selectedProcedureIndex: Math.max(0, Math.min(state.selectedProcedureIndex, next.length - 1)),
      }
    }
    case 'SELECT_PROCEDURE':
      return { ...state, selectedProcedureIndex: action.index }
    case 'UPDATE_SLIDER': {
      const procs = state.activeProcedures.map((p, i) =>
        i === state.selectedProcedureIndex
          ? { ...p, sliderValues: { ...p.sliderValues, [action.sliderId]: action.value } }
          : p
      )
      return { ...state, activeProcedures: procs }
    }
    case 'UPDATE_TECHNIQUE': {
      const procs = state.activeProcedures.map((p, i) =>
        i === state.selectedProcedureIndex ? { ...p, tecnica: action.tecnica } : p
      )
      return { ...state, activeProcedures: procs }
    }
    case 'UPDATE_INTENSITY': {
      const procs = state.activeProcedures.map((p, i) =>
        i === state.selectedProcedureIndex ? { ...p, intensity: action.value } : p
      )
      return { ...state, activeProcedures: procs }
    }
    case 'SET_CANVAS_MODE':
      return { ...state, canvasMode: action.mode }
    case 'SET_IMAGE':
      return { ...state, imageUrl: action.url }
    case 'SET_HUD':
      return { ...state, hudVisible: action.visible }
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.tool }
    case 'ADD_PIN':
      return { ...state, pins: [...state.pins, action.pin] }
    case 'UPDATE_PIN_LABEL':
      return { ...state, pins: state.pins.map(p => p.id === action.id ? { ...p, label: action.label } : p) }
    case 'REMOVE_PIN':
      return { ...state, pins: state.pins.filter(p => p.id !== action.id) }
    case 'ADD_STROKE':
      return { ...state, strokes: [...state.strokes, action.stroke] }
    case 'SET_NOTES':
      return { ...state, notes: action.notes }
    case 'SET_SAVING':
      return { ...state, isSaving: action.isSaving }
    default:
      return state
  }
}

interface SimulatorContextValue {
  state: SimulatorState
  addProcedure: (proc: Procedimiento) => void
  removeProcedure: (proc: Procedimiento) => void
  selectProcedure: (index: number) => void
  updateSlider: (sliderId: string, value: number) => void
  updateTechnique: (tecnica: TecnicaSesion) => void
  updateIntensity: (value: number) => void
  setCanvasMode: (mode: CanvasMode) => void
  setImage: (url: string) => void
  setHudVisible: (visible: boolean) => void
  setActiveTool: (tool: SimulatorState['activeTool']) => void
  addPin: (pin: AnnotationPin) => void
  updatePinLabel: (id: string, label: string) => void
  removePin: (id: string) => void
  addStroke: (stroke: DrawingStroke) => void
  setNotes: (notes: string) => void
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null)

export function SimulatorProvider({
  children,
  patientId,
  sessionId,
}: {
  children: ReactNode
  patientId: string | null
  sessionId: string | null
}) {
  const [state, dispatch] = useReducer(reducer, {
    sessionId,
    patientId,
    imageUrl: null,
    activeProcedures: [],
    selectedProcedureIndex: 0,
    canvasMode: 'simulation',
    hudVisible: false,
    pins: [],
    strokes: [],
    activeTool: 'none',
    notes: '',
    isSaving: false,
  })

  const addProcedure    = useCallback((proc: Procedimiento) => dispatch({ type: 'ADD_PROCEDURE', proc }), [])
  const removeProcedure = useCallback((proc: Procedimiento) => dispatch({ type: 'REMOVE_PROCEDURE', proc }), [])
  const selectProcedure = useCallback((index: number) => dispatch({ type: 'SELECT_PROCEDURE', index }), [])
  const updateSlider    = useCallback((sliderId: string, value: number) => dispatch({ type: 'UPDATE_SLIDER', sliderId, value }), [])
  const updateTechnique = useCallback((tecnica: TecnicaSesion) => dispatch({ type: 'UPDATE_TECHNIQUE', tecnica }), [])
  const updateIntensity = useCallback((value: number) => dispatch({ type: 'UPDATE_INTENSITY', value }), [])
  const setCanvasMode   = useCallback((mode: CanvasMode) => dispatch({ type: 'SET_CANVAS_MODE', mode }), [])
  const setImage        = useCallback((url: string) => dispatch({ type: 'SET_IMAGE', url }), [])
  const setHudVisible   = useCallback((visible: boolean) => dispatch({ type: 'SET_HUD', visible }), [])
  const setActiveTool   = useCallback((tool: SimulatorState['activeTool']) => dispatch({ type: 'SET_ACTIVE_TOOL', tool }), [])
  const addPin          = useCallback((pin: AnnotationPin) => dispatch({ type: 'ADD_PIN', pin }), [])
  const updatePinLabel  = useCallback((id: string, label: string) => dispatch({ type: 'UPDATE_PIN_LABEL', id, label }), [])
  const removePin       = useCallback((id: string) => dispatch({ type: 'REMOVE_PIN', id }), [])
  const addStroke       = useCallback((stroke: DrawingStroke) => dispatch({ type: 'ADD_STROKE', stroke }), [])
  const setNotes        = useCallback((notes: string) => dispatch({ type: 'SET_NOTES', notes }), [])

  return (
    <SimulatorContext.Provider value={{
      state, addProcedure, removeProcedure, selectProcedure,
      updateSlider, updateTechnique, updateIntensity, setCanvasMode,
      setImage, setHudVisible, setActiveTool, addPin, updatePinLabel,
      removePin, addStroke, setNotes,
    }}>
      {children}
    </SimulatorContext.Provider>
  )
}

export function useSimulator(): SimulatorContextValue {
  const ctx = useContext(SimulatorContext)
  if (!ctx) throw new Error('useSimulator must be used inside SimulatorProvider')
  return ctx
}
