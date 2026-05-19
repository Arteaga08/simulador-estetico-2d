# Simulator UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full `/simulator` page — canvas engine with liquify, all 14 UI components, multi-procedure tabs, annotations, HUD, presets, and API integration.

**Architecture:** Layout A (sidebar 220px + canvas flex:1 + sliders panel 240px). Canvas renders via Web Worker + OffscreenCanvas using inverse warp liquify. UI state lives in a React context shared by all simulator components.

**Tech Stack:** Next.js 16.2.6 · React 19 · TypeScript 5 · Tailwind CSS 4 · Phosphor Icons · Vitest · React Testing Library · Cloudinary (signed upload via backend)

> ⚠️ Next.js 16 has breaking changes. Before writing any Next.js-specific code (routing, metadata, server components), read `node_modules/next/dist/docs/` in the `frontend/` directory.

---

## File Map

```
frontend/
├── app/
│   └── (simulator)/
│       ├── layout.tsx               NEW — simulator shell layout
│       └── page.tsx                 NEW — route entry point
│
├── components/simulator/
│   ├── types.ts                     NEW — shared simulator types
│   ├── SimulatorContext.tsx         NEW — React context + provider
│   ├── SimulatorTopbar.tsx          NEW
│   ├── ProcedureSidebar.tsx         NEW
│   ├── CanvasWorkspace.tsx          NEW — canvas area wrapper
│   ├── CanvasToolbar.tsx            NEW
│   ├── HudOverlay.tsx               NEW — SVG overlay (lines + angles)
│   ├── AnnotationLayer.tsx          NEW — pins management
│   ├── DrawingLayer.tsx             NEW — free drawing canvas
│   ├── SlidersPanel.tsx             NEW — tabs + slider content
│   ├── ProcedureTab.tsx             NEW — single procedure tab content
│   ├── SliderControl.tsx            NEW — individual slider row
│   ├── PresetPicker.tsx             NEW
│   ├── SimulatorBottombar.tsx       NEW
│   └── index.ts                     NEW — barrel
│
├── lib/
│   ├── procedures.ts                NEW — procedure → sliders config
│   └── canvas/
│       ├── types.ts                 NEW — canvas-specific types
│       ├── liquify.ts               NEW — pure liquify math (testable)
│       ├── liquify.worker.ts        NEW — Web Worker
│       ├── useCanvas.ts             NEW
│       ├── useLiquify.ts            NEW
│       ├── useAnnotations.ts        NEW
│       └── useImageUpload.ts        NEW
│
└── __tests__/
    ├── lib/
    │   ├── procedures.test.ts       NEW
    │   └── canvas/
    │       └── liquify.test.ts      NEW
    └── components/simulator/
        ├── SliderControl.test.tsx   NEW
        ├── ProcedureTab.test.tsx    NEW
        └── SimulatorContext.test.tsx NEW
```

---

## Task 1: Install and configure Vitest

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`

- [ ] **Step 1: Install testing dependencies**

```bash
cd frontend
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create vitest config**

Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Install vite react plugin**

```bash
npm install -D @vitejs/plugin-react
```

- [ ] **Step 4: Create setup file**

Create `frontend/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

In `frontend/package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 6: Verify setup works**

Create `frontend/__tests__/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `cd frontend && npm test`
Expected: `1 passed`

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/vitest.setup.ts frontend/__tests__/smoke.test.ts
git commit -m "chore: add vitest + react testing library"
```

---

## Task 2: Simulator types

**Files:**
- Create: `frontend/components/simulator/types.ts`
- Create: `frontend/lib/canvas/types.ts`

- [ ] **Step 1: Write simulator types**

Create `frontend/components/simulator/types.ts`:

```typescript
export type Procedimiento =
  | 'RINOPLASTIA'
  | 'LIFTING_CEJAS'
  | 'AUMENTO_MENTON'
  | 'AUMENTO_LABIOS'
  | 'LIFTING_CUELLO'
  | 'BLEFAROPLASTIA'
  | 'SUAVIZADO_PIEL'
  | 'FEMINIZACION_FACIAL'

export type TecnicaSesion =
  | 'QUIRURGICO'
  | 'RINOMODELACION'
  | 'ENDOSCOPICO'
  | 'IMPLANTE'
  | 'FILLER'
  | 'LIPOSUCCION'
  | 'SUPERIOR'
  | 'INFERIOR'
  | 'COMPLETO'
  | 'LASER'
  | 'MICRONEEDLING'

export interface SliderDef {
  id: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  /** When true and technique is RINOMODELACION, clamp min to 0 */
  blockedNegativeInRinomodelacion?: boolean
}

export interface ActiveProcedure {
  procedimiento: Procedimiento
  tecnica: TecnicaSesion
  sliderValues: Record<string, number>
  intensity: number          // 0–100
  presetId: string | null
}

export type CanvasMode = 'original' | 'simulation' | 'split'

export interface AnnotationPin {
  id: string
  x: number                  // 0–1 relative to canvas
  y: number
  label: string
}

export interface DrawingStroke {
  id: string
  points: Array<{ x: number; y: number }>
  color: string
  width: number
}

export interface SimulatorState {
  sessionId: string | null
  patientId: string | null
  imageUrl: string | null
  activeProcedures: ActiveProcedure[]
  selectedProcedureIndex: number
  canvasMode: CanvasMode
  hudVisible: boolean
  pins: AnnotationPin[]
  strokes: DrawingStroke[]
  activeTool: 'none' | 'pin' | 'hud' | 'angle' | 'draw'
  notes: string
  isSaving: boolean
}
```

- [ ] **Step 2: Write canvas types**

Create `frontend/lib/canvas/types.ts`:

```typescript
export interface ControlPoint {
  /** Normalized canvas coordinates [0, 1] */
  x: number
  y: number
  /** Displacement in pixels */
  dx: number
  dy: number
  /** Radius of influence in pixels */
  radius: number
}

export interface LiquifyConfig {
  width: number
  height: number
  controlPoints: ControlPoint[]
}

export type WorkerInMessage =
  | { type: 'INIT'; canvas: OffscreenCanvas; imageData: ImageData }
  | { type: 'APPLY'; config: LiquifyConfig }
  | { type: 'RESET' }

export type WorkerOutMessage =
  | { type: 'READY' }
  | { type: 'DONE' }
  | { type: 'ERROR'; message: string }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/simulator/types.ts frontend/lib/canvas/types.ts
git commit -m "feat(simulator): add shared type definitions"
```

---

## Task 3: Procedure configuration

**Files:**
- Create: `frontend/lib/procedures.ts`
- Create: `frontend/__tests__/lib/procedures.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/__tests__/lib/procedures.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npm test -- procedures
```
Expected: FAIL — `Cannot find module '@/lib/procedures'`

- [ ] **Step 3: Implement procedures config**

Create `frontend/lib/procedures.ts`:

```typescript
import type { Procedimiento, TecnicaSesion, SliderDef } from '@/components/simulator/types'

export const PROCEDURE_LABELS: Record<Procedimiento, string> = {
  RINOPLASTIA:        'Rinoplastia',
  LIFTING_CEJAS:      'Lifting de cejas',
  AUMENTO_MENTON:     'Aumento de mentón',
  AUMENTO_LABIOS:     'Aumento de labios',
  LIFTING_CUELLO:     'Lifting de cuello',
  BLEFAROPLASTIA:     'Blefaroplastia',
  SUAVIZADO_PIEL:     'Suavizado de piel',
  FEMINIZACION_FACIAL:'Feminización facial',
}

export const TECHNIQUES_BY_PROCEDURE: Record<Procedimiento, TecnicaSesion[]> = {
  RINOPLASTIA:         ['QUIRURGICO', 'RINOMODELACION', 'ENDOSCOPICO'],
  LIFTING_CEJAS:       ['QUIRURGICO', 'ENDOSCOPICO'],
  AUMENTO_MENTON:      ['QUIRURGICO', 'IMPLANTE', 'FILLER'],
  AUMENTO_LABIOS:      ['FILLER'],
  LIFTING_CUELLO:      ['QUIRURGICO', 'LIPOSUCCION'],
  BLEFAROPLASTIA:      ['SUPERIOR', 'INFERIOR', 'COMPLETO'],
  SUAVIZADO_PIEL:      ['LASER', 'MICRONEEDLING'],
  FEMINIZACION_FACIAL: ['QUIRURGICO', 'FILLER'],
}

export const SLIDERS_BY_PROCEDURE: Record<Procedimiento, SliderDef[]> = {
  RINOPLASTIA: [
    { id: 'giba-nasal',       label: 'Giba nasal',          min: -60, max: 0,  step: 1, defaultValue: 0, blockedNegativeInRinomodelacion: true },
    { id: 'proyeccion-punta', label: 'Proyección de punta', min: -20, max: 40, step: 1, defaultValue: 0 },
    { id: 'rotacion-punta',   label: 'Rotación de punta',   min: -15, max: 15, step: 1, defaultValue: 0 },
  ],
  LIFTING_CEJAS: [
    { id: 'altura-ceja-int',  label: 'Altura ceja interna', min: -10, max: 20, step: 1, defaultValue: 0 },
    { id: 'altura-ceja-ext',  label: 'Altura ceja externa', min: -10, max: 20, step: 1, defaultValue: 0 },
    { id: 'curvatura',        label: 'Curvatura',            min: -10, max: 10, step: 1, defaultValue: 0 },
  ],
  AUMENTO_MENTON: [
    { id: 'proyeccion',       label: 'Proyección',           min: -10, max: 30, step: 1, defaultValue: 0 },
    { id: 'ancho',            label: 'Ancho',                min: -10, max: 10, step: 1, defaultValue: 0 },
    { id: 'altura',           label: 'Altura vertical',      min: -10, max: 10, step: 1, defaultValue: 0 },
  ],
  AUMENTO_LABIOS: [
    { id: 'volumen-superior', label: 'Volumen superior',     min: 0,   max: 40, step: 1, defaultValue: 0 },
    { id: 'volumen-inferior', label: 'Volumen inferior',     min: 0,   max: 30, step: 1, defaultValue: 0 },
    { id: 'arco-cupido',      label: 'Arco de Cupido',       min: -10, max: 10, step: 1, defaultValue: 0 },
    { id: 'ancho',            label: 'Ancho',                min: -10, max: 20, step: 1, defaultValue: 0 },
  ],
  LIFTING_CUELLO: [
    { id: 'angulo-mentoniano',label: 'Ángulo mentoniano',    min: -20, max: 20, step: 1, defaultValue: 0 },
    { id: 'tension',          label: 'Tensión cervical',     min: 0,   max: 40, step: 1, defaultValue: 0 },
  ],
  BLEFAROPLASTIA: [
    { id: 'parpado-superior', label: 'Párpado superior',     min: -20, max: 0,  step: 1, defaultValue: 0 },
    { id: 'parpado-inferior', label: 'Párpado inferior',     min: -10, max: 0,  step: 1, defaultValue: 0 },
    { id: 'apertura',         label: 'Apertura ocular',      min: -5,  max: 10, step: 1, defaultValue: 0 },
  ],
  SUAVIZADO_PIEL: [
    { id: 'textura',          label: 'Suavizado de textura', min: 0,   max: 100, step: 5, defaultValue: 0 },
    { id: 'uniformidad',      label: 'Uniformidad tono',     min: 0,   max: 100, step: 5, defaultValue: 0 },
  ],
  FEMINIZACION_FACIAL: [
    { id: 'frente',           label: 'Redondeo de frente',   min: 0,   max: 30, step: 1, defaultValue: 0 },
    { id: 'pomulos',          label: 'Relleno pómulos',      min: 0,   max: 30, step: 1, defaultValue: 0 },
    { id: 'mandibula',        label: 'Reducción mandíbula',  min: -30, max: 0,  step: 1, defaultValue: 0 },
    { id: 'menton',           label: 'Refinamiento mentón',  min: -15, max: 10, step: 1, defaultValue: 0 },
  ],
}

export const TECHNIQUE_LABELS: Record<TecnicaSesion, string> = {
  QUIRURGICO:     'Quirúrgico',
  RINOMODELACION: 'Rinomodelación',
  ENDOSCOPICO:    'Endoscópico',
  IMPLANTE:       'Implante',
  FILLER:         'Filler',
  LIPOSUCCION:    'Liposucción',
  SUPERIOR:       'Superior',
  INFERIOR:       'Inferior',
  COMPLETO:       'Completo',
  LASER:          'Láser',
  MICRONEEDLING:  'Microneedling',
}

export function getSliderDefs(proc: Procedimiento): SliderDef[] {
  return SLIDERS_BY_PROCEDURE[proc]
}

export function getAvailableTechniques(proc: Procedimiento): TecnicaSesion[] {
  return TECHNIQUES_BY_PROCEDURE[proc]
}

export function getDefaultSliderValues(proc: Procedimiento): Record<string, number> {
  return Object.fromEntries(
    SLIDERS_BY_PROCEDURE[proc].map(s => [s.id, s.defaultValue])
  )
}

export const ALL_PROCEDURES = Object.keys(PROCEDURE_LABELS) as Procedimiento[]
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd frontend && npm test -- procedures
```
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/procedures.ts frontend/__tests__/lib/procedures.test.ts
git commit -m "feat(simulator): add procedure and slider configuration"
```

---

## Task 4: Pure liquify math

**Files:**
- Create: `frontend/lib/canvas/liquify.ts`
- Create: `frontend/__tests__/lib/canvas/liquify.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/__tests__/lib/canvas/liquify.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeDisplacement, applyLiquify } from '@/lib/canvas/liquify'

describe('computeDisplacement', () => {
  it('returns zero displacement when no control points', () => {
    const d = computeDisplacement(100, 100, [])
    expect(d).toEqual({ dx: 0, dy: 0 })
  })

  it('returns full displacement at control point center', () => {
    const d = computeDisplacement(100, 100, [{
      x: 100, y: 100, dx: 10, dy: 5, radius: 50,
    }])
    expect(d.dx).toBeCloseTo(10)
    expect(d.dy).toBeCloseTo(5)
  })

  it('returns zero displacement outside radius', () => {
    const d = computeDisplacement(0, 0, [{
      x: 200, y: 200, dx: 10, dy: 5, radius: 50,
    }])
    expect(d.dx).toBe(0)
    expect(d.dy).toBe(0)
  })

  it('blends two overlapping control points', () => {
    const d = computeDisplacement(100, 100, [
      { x: 100, y: 100, dx: 10, dy: 0, radius: 50 },
      { x: 100, y: 100, dx: 0,  dy: 10, radius: 50 },
    ])
    expect(d.dx).toBeCloseTo(10)
    expect(d.dy).toBeCloseTo(10)
  })
})

describe('applyLiquify', () => {
  it('returns an ImageData of the same dimensions', () => {
    const src = new ImageData(64, 64)
    const result = applyLiquify(src, [])
    expect(result.width).toBe(64)
    expect(result.height).toBe(64)
  })

  it('returns identical pixels when no control points', () => {
    const src = new ImageData(4, 4)
    src.data[0] = 255  // R of pixel (0,0)
    const result = applyLiquify(src, [])
    expect(result.data[0]).toBe(255)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd frontend && npm test -- liquify
```
Expected: FAIL — `Cannot find module '@/lib/canvas/liquify'`

- [ ] **Step 3: Implement liquify math**

Create `frontend/lib/canvas/liquify.ts`:

```typescript
import type { ControlPoint } from './types'

interface Displacement { dx: number; dy: number }

/**
 * Bi-quadratic weighting: w = max(0, 1 - d²/R²)²
 * Returns accumulated displacement at point (px, py) from all control points.
 */
export function computeDisplacement(
  px: number,
  py: number,
  controlPoints: ControlPoint[],
): Displacement {
  let dx = 0
  let dy = 0

  for (const cp of controlPoints) {
    const distSq = (px - cp.x) ** 2 + (py - cp.y) ** 2
    const radiusSq = cp.radius ** 2
    if (distSq >= radiusSq) continue
    const w = (1 - distSq / radiusSq) ** 2
    dx += cp.dx * w
    dy += cp.dy * w
  }

  return { dx, dy }
}

/**
 * Bilinear interpolation of src ImageData at sub-pixel coordinates (sx, sy).
 * Returns [r, g, b, a].
 */
function bilinearSample(data: Uint8ClampedArray, w: number, h: number, sx: number, sy: number): [number, number, number, number] {
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const fx = sx - x0
  const fy = sy - y0

  const idx = (x: number, y: number) => (y * w + x) * 4

  const i00 = idx(Math.max(0, x0), Math.max(0, y0))
  const i10 = idx(Math.max(0, x1), Math.max(0, y0))
  const i01 = idx(Math.max(0, x0), Math.max(0, y1))
  const i11 = idx(Math.max(0, x1), Math.max(0, y1))

  return [0, 1, 2, 3].map(c =>
    data[i00 + c] * (1 - fx) * (1 - fy) +
    data[i10 + c] * fx       * (1 - fy) +
    data[i01 + c] * (1 - fx) * fy       +
    data[i11 + c] * fx       * fy
  ) as [number, number, number, number]
}

/**
 * Applies inverse warp liquify to src ImageData.
 * For each destination pixel, computes where it maps back in the source
 * (inverse warp avoids holes).
 */
export function applyLiquify(src: ImageData, controlPoints: ControlPoint[]): ImageData {
  const { width: w, height: h, data } = src
  const dst = new ImageData(w, h)

  if (controlPoints.length === 0) {
    dst.data.set(data)
    return dst
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Inverse warp: subtract displacement to find source pixel
      const { dx, dy } = computeDisplacement(x, y, controlPoints)
      const sx = x - dx
      const sy = y - dy

      const [r, g, b, a] = bilinearSample(data, w, h, sx, sy)
      const dstIdx = (y * w + x) * 4
      dst.data[dstIdx]     = r
      dst.data[dstIdx + 1] = g
      dst.data[dstIdx + 2] = b
      dst.data[dstIdx + 3] = a
    }
  }

  return dst
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
cd frontend && npm test -- liquify
```
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/canvas/liquify.ts frontend/__tests__/lib/canvas/liquify.test.ts
git commit -m "feat(canvas): add inverse warp liquify algorithm with bilinear interpolation"
```

---

## Task 5: Liquify Web Worker

**Files:**
- Create: `frontend/lib/canvas/liquify.worker.ts`

No test here — workers need an integration test with the hook in Task 7. This file is tested implicitly through `useLiquify`.

- [ ] **Step 1: Create the worker**

Create `frontend/lib/canvas/liquify.worker.ts`:

```typescript
import { applyLiquify } from './liquify'
import type { WorkerInMessage, WorkerOutMessage } from './types'

let offscreen: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let originalImageData: ImageData | null = null

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data

  if (msg.type === 'INIT') {
    offscreen = msg.canvas
    ctx = offscreen.getContext('2d')!
    originalImageData = msg.imageData
    ctx.putImageData(originalImageData, 0, 0)
    postOut({ type: 'READY' })
    return
  }

  if (msg.type === 'RESET') {
    if (ctx && originalImageData) {
      ctx.putImageData(originalImageData, 0, 0)
    }
    postOut({ type: 'DONE' })
    return
  }

  if (msg.type === 'APPLY') {
    if (!ctx || !originalImageData) {
      postOut({ type: 'ERROR', message: 'Worker not initialized' })
      return
    }
    try {
      const result = applyLiquify(originalImageData, msg.config.controlPoints)
      ctx.putImageData(result, 0, 0)
      postOut({ type: 'DONE' })
    } catch (err) {
      postOut({ type: 'ERROR', message: String(err) })
    }
    return
  }
}

function postOut(msg: WorkerOutMessage) {
  ;(self as unknown as Worker).postMessage(msg)
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/canvas/liquify.worker.ts
git commit -m "feat(canvas): add liquify Web Worker"
```

---

## Task 6: SimulatorContext

**Files:**
- Create: `frontend/components/simulator/SimulatorContext.tsx`
- Create: `frontend/__tests__/components/simulator/SimulatorContext.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/__tests__/components/simulator/SimulatorContext.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd frontend && npm test -- SimulatorContext
```
Expected: FAIL

- [ ] **Step 3: Implement SimulatorContext**

Create `frontend/components/simulator/SimulatorContext.tsx`:

```tsx
'use client'

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import type {
  SimulatorState, ActiveProcedure, Procedimiento, TecnicaSesion,
  CanvasMode, AnnotationPin, DrawingStroke,
} from './types'
import {
  getDefaultSliderValues, getAvailableTechniques, TECHNIQUES_BY_PROCEDURE,
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
  | { type: 'SAVE_PRESET'; name: string }

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

  const addProcedure   = useCallback((proc: Procedimiento) => dispatch({ type: 'ADD_PROCEDURE', proc }), [])
  const removeProcedure= useCallback((proc: Procedimiento) => dispatch({ type: 'REMOVE_PROCEDURE', proc }), [])
  const selectProcedure= useCallback((index: number) => dispatch({ type: 'SELECT_PROCEDURE', index }), [])
  const updateSlider   = useCallback((sliderId: string, value: number) => dispatch({ type: 'UPDATE_SLIDER', sliderId, value }), [])
  const updateTechnique= useCallback((tecnica: TecnicaSesion) => dispatch({ type: 'UPDATE_TECHNIQUE', tecnica }), [])
  const updateIntensity= useCallback((value: number) => dispatch({ type: 'UPDATE_INTENSITY', value }), [])
  const setCanvasMode  = useCallback((mode: CanvasMode) => dispatch({ type: 'SET_CANVAS_MODE', mode }), [])
  const setImage       = useCallback((url: string) => dispatch({ type: 'SET_IMAGE', url }), [])
  const setHudVisible  = useCallback((visible: boolean) => dispatch({ type: 'SET_HUD', visible }), [])
  const setActiveTool  = useCallback((tool: SimulatorState['activeTool']) => dispatch({ type: 'SET_ACTIVE_TOOL', tool }), [])
  const addPin         = useCallback((pin: AnnotationPin) => dispatch({ type: 'ADD_PIN', pin }), [])
  const updatePinLabel = useCallback((id: string, label: string) => dispatch({ type: 'UPDATE_PIN_LABEL', id, label }), [])
  const removePin      = useCallback((id: string) => dispatch({ type: 'REMOVE_PIN', id }), [])
  const addStroke      = useCallback((stroke: DrawingStroke) => dispatch({ type: 'ADD_STROKE', stroke }), [])
  const setNotes       = useCallback((notes: string) => dispatch({ type: 'SET_NOTES', notes }), [])

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
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- SimulatorContext
```
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/components/simulator/SimulatorContext.tsx frontend/__tests__/components/simulator/SimulatorContext.test.tsx
git commit -m "feat(simulator): add SimulatorContext with reducer"
```

---

## Task 7: SliderControl component

**Files:**
- Create: `frontend/components/simulator/SliderControl.tsx`
- Create: `frontend/__tests__/components/simulator/SliderControl.test.tsx`

- [ ] **Step 1: Write failing test**

Create `frontend/__tests__/components/simulator/SliderControl.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd frontend && npm test -- SliderControl
```
Expected: FAIL

- [ ] **Step 3: Implement SliderControl**

Create `frontend/components/simulator/SliderControl.tsx`:

```tsx
interface SliderControlProps {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  /** Accent: 'primary' (blue/indigo) or 'intensity' (violet/indigo) */
  accent?: 'primary' | 'intensity'
}

function formatValue(v: number): string {
  if (v > 0) return `+${v}`
  if (v < 0) return `−${Math.abs(v)}`  // minus sign, not hyphen
  return '0'
}

export function SliderControl({
  id, label, min, max, step, value, onChange, disabled = false, accent = 'primary',
}: SliderControlProps) {
  const pct = ((value - min) / (max - min)) * 100

  const fillColor = accent === 'intensity'
    ? 'from-[#a78bfa] to-indigo'
    : 'from-blue to-indigo'

  const valColor = accent === 'intensity' ? 'text-[#7C3AED]' : 'text-indigo-dark'
  const thumbColor = accent === 'intensity' ? 'border-[#a78bfa]' : 'border-indigo'

  return (
    <div className="mb-3.5">
      <div className="flex justify-between items-baseline mb-1.5">
        <label htmlFor={id} className="text-[0.73rem] text-text-secondary font-medium">
          {label}
        </label>
        <span className={`text-[0.7rem] font-bold ${valColor}`} aria-live="polite">
          {formatValue(value)}
        </span>
      </div>
      <div className="relative">
        {/* Track background */}
        <div className="h-1 rounded-full bg-border relative overflow-hidden">
          {/* Fill */}
          <div
            className={`absolute top-0 left-0 h-full rounded-full bg-linear-to-r ${fillColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Native range input (invisible, on top for interaction) */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label={label}
        />
        {/* Custom thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 ${thumbColor} shadow-sm pointer-events-none`}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- SliderControl
```
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/components/simulator/SliderControl.tsx frontend/__tests__/components/simulator/SliderControl.test.tsx
git commit -m "feat(simulator): add SliderControl component"
```

---

## Task 8: ProcedureTab

**Files:**
- Create: `frontend/components/simulator/ProcedureTab.tsx`
- Create: `frontend/__tests__/components/simulator/ProcedureTab.test.tsx`

- [ ] **Step 1: Write failing test**

Create `frontend/__tests__/components/simulator/ProcedureTab.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd frontend && npm test -- ProcedureTab
```
Expected: FAIL

- [ ] **Step 3: Implement ProcedureTab**

Create `frontend/components/simulator/ProcedureTab.tsx`:

```tsx
'use client'

import { useSimulator } from './SimulatorContext'
import { SliderControl } from './SliderControl'
import { PresetPicker } from './PresetPicker'
import { PROCEDURE_LABELS, TECHNIQUE_LABELS, getSliderDefs, getAvailableTechniques } from '@/lib/procedures'
import type { ActiveProcedure, TecnicaSesion } from './types'

interface ProcedureTabProps {
  procedure: ActiveProcedure
  isSelected: boolean
}

export function ProcedureTab({ procedure, isSelected }: ProcedureTabProps) {
  const { updateSlider, updateTechnique, updateIntensity } = useSimulator()

  const sliders = getSliderDefs(procedure.procedimiento)
  const techniques = getAvailableTechniques(procedure.procedimiento)

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-2.5">
        <p className="text-[0.78rem] font-semibold text-text-primary">
          {PROCEDURE_LABELS[procedure.procedimiento]}
        </p>
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {techniques.map(t => (
            <button
              key={t}
              onClick={() => updateTechnique(t)}
              className={`text-[0.67rem] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                procedure.tecnica === t
                  ? 'bg-indigo-muted text-indigo-dark'
                  : 'bg-transparent text-[#9CA3AF] hover:bg-bg-page'
              }`}
            >
              {TECHNIQUE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Sliders */}
      <div className="px-3.5 pt-3 pb-2">
        {sliders.map(slider => {
          const isBlocked =
            slider.blockedNegativeInRinomodelacion &&
            procedure.tecnica === 'RINOMODELACION'
          return (
            <SliderControl
              key={slider.id}
              id={slider.id}
              label={slider.label}
              min={isBlocked ? 0 : slider.min}
              max={slider.max}
              step={slider.step}
              value={isBlocked ? Math.max(0, procedure.sliderValues[slider.id] ?? slider.defaultValue) : (procedure.sliderValues[slider.id] ?? slider.defaultValue)}
              onChange={v => updateSlider(slider.id, v)}
              disabled={!isSelected}
            />
          )
        })}
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Intensity */}
      <div className="px-3.5 pt-3 pb-2">
        <p className="text-[0.62rem] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2.5">
          Intensidad global
        </p>
        <SliderControl
          id={`intensity-${procedure.procedimiento}`}
          label="Efecto"
          min={0}
          max={100}
          step={5}
          value={procedure.intensity}
          onChange={updateIntensity}
          disabled={!isSelected}
          accent="intensity"
        />
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Presets */}
      <div className="px-3.5 pt-3 pb-3">
        <p className="text-[0.62rem] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2">
          Presets
        </p>
        <PresetPicker
          procedimiento={procedure.procedimiento}
          activePresetId={procedure.presetId}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npm test -- ProcedureTab
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/components/simulator/ProcedureTab.tsx frontend/__tests__/components/simulator/ProcedureTab.test.tsx
git commit -m "feat(simulator): add ProcedureTab component"
```

---

## Task 9: PresetPicker

**Files:**
- Create: `frontend/components/simulator/PresetPicker.tsx`

- [ ] **Step 1: Implement PresetPicker**

Create `frontend/components/simulator/PresetPicker.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Procedimiento } from './types'

const SYSTEM_PRESETS: Record<string, string[]> = {
  RINOPLASTIA: ['Natural', 'Definido', 'Proyectado'],
  LIFTING_CEJAS: ['Sutil', 'Expresivo'],
  AUMENTO_MENTON: ['Natural', 'Proyectado'],
  AUMENTO_LABIOS: ['Natural', 'Voluminoso'],
  LIFTING_CUELLO: ['Natural', 'Tenso'],
  BLEFAROPLASTIA: ['Sutil', 'Marcado'],
  SUAVIZADO_PIEL: ['Leve', 'Intenso'],
  FEMINIZACION_FACIAL: ['Sutil', 'Marcado'],
}

interface PresetPickerProps {
  procedimiento: Procedimiento
  activePresetId: string | null
}

export function PresetPicker({ procedimiento, activePresetId }: PresetPickerProps) {
  const [customPresets, setCustomPresets] = useState<string[]>([])
  const [naming, setNaming] = useState(false)
  const [newName, setNewName] = useState('')

  const systemPresets = SYSTEM_PRESETS[procedimiento] ?? []

  function handleSavePreset() {
    const name = newName.trim()
    if (!name) return
    setCustomPresets(prev => [...prev, name])
    setNewName('')
    setNaming(false)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {systemPresets.map(name => (
        <button
          key={name}
          className={`text-[0.68rem] font-medium px-2.5 py-1 rounded-full border transition-colors ${
            activePresetId === name
              ? 'bg-indigo-muted text-indigo-dark border-[#C7D2FE]'
              : 'bg-transparent text-[#9CA3AF] border-border hover:bg-bg-page'
          }`}
        >
          {name}
        </button>
      ))}

      {customPresets.map(name => (
        <button
          key={name}
          className="text-[0.68rem] font-medium px-2.5 py-1 rounded-full border bg-indigo-muted text-indigo-dark border-[#C7D2FE]"
        >
          {name}
        </button>
      ))}

      {naming ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSavePreset()
              if (e.key === 'Escape') setNaming(false)
            }}
            placeholder="Nombre del preset"
            className="text-[0.68rem] px-2 py-0.5 border border-[#C7D2FE] rounded-full outline-none focus:ring-2 focus:ring-indigo/20 w-28"
          />
          <button
            onClick={handleSavePreset}
            className="text-[0.68rem] text-indigo-dark font-semibold"
          >
            ✓
          </button>
        </div>
      ) : (
        <button
          onClick={() => setNaming(true)}
          className="text-[0.68rem] font-medium px-2.5 py-1 rounded-full border border-dashed border-[#FCA5A5] text-error bg-[#FFF5F5] hover:bg-error-bg transition-colors"
        >
          + Nuevo
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/simulator/PresetPicker.tsx
git commit -m "feat(simulator): add PresetPicker with custom presets"
```

---

## Task 10: SlidersPanel (tabs shell)

**Files:**
- Create: `frontend/components/simulator/SlidersPanel.tsx`

- [ ] **Step 1: Implement SlidersPanel**

Create `frontend/components/simulator/SlidersPanel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useSimulator } from './SimulatorContext'
import { ProcedureTab } from './ProcedureTab'
import { PROCEDURE_LABELS, ALL_PROCEDURES } from '@/lib/procedures'
import type { Procedimiento } from './types'

export function SlidersPanel() {
  const { state, addProcedure, removeProcedure, selectProcedure, setNotes } = useSimulator()
  const [showProcPicker, setShowProcPicker] = useState(false)

  const { activeProcedures, selectedProcedureIndex, notes } = state

  return (
    <div className="w-60 bg-white border-l border-border flex flex-col overflow-hidden shrink-0">
      {/* Tabs header */}
      <div className="flex items-center border-b border-border bg-white shrink-0 overflow-x-auto">
        {activeProcedures.map((p, i) => (
          <button
            key={p.procedimiento}
            onClick={() => selectProcedure(i)}
            className={`px-3 py-2 text-[0.67rem] font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
              i === selectedProcedureIndex
                ? 'text-indigo-dark border-indigo bg-[#F8F8FF]'
                : 'text-[#9CA3AF] border-transparent hover:text-text-muted'
            }`}
          >
            {PROCEDURE_LABELS[p.procedimiento].split(' ')[0]}
            {activeProcedures.length > 1 && (
              <span
                className="ml-1 text-[#9CA3AF] hover:text-error"
                onClick={e => { e.stopPropagation(); removeProcedure(p.procedimiento) }}
              >
                ×
              </span>
            )}
          </button>
        ))}

        {/* Add procedure button */}
        <button
          onClick={() => setShowProcPicker(v => !v)}
          className="w-7 h-full flex items-center justify-center text-[#9CA3AF] hover:text-indigo border-l border-border shrink-0 text-base"
          title="Agregar procedimiento"
        >
          +
        </button>
      </div>

      {/* Procedure picker dropdown */}
      {showProcPicker && (
        <div className="border-b border-border bg-[#FAFAFA] py-2 px-3 shrink-0">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">Agregar procedimiento</p>
          <div className="flex flex-wrap gap-1">
            {ALL_PROCEDURES.filter(
              p => !activeProcedures.find(ap => ap.procedimiento === p)
            ).map(p => (
              <button
                key={p}
                onClick={() => { addProcedure(p); setShowProcPicker(false) }}
                className="text-[0.67rem] px-2 py-1 rounded-full bg-indigo-muted text-indigo-dark hover:bg-indigo-light transition-colors font-medium"
              >
                {PROCEDURE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeProcedures.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
          <p className="text-[0.78rem] font-semibold text-text-primary mb-1">Sin procedimiento</p>
          <p className="text-[0.72rem] text-[#9CA3AF] mb-3">Selecciona un procedimiento en el panel izquierdo o usa el + de arriba.</p>
        </div>
      )}

      {/* Active procedure tab content */}
      {activeProcedures.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <ProcedureTab
            procedure={activeProcedures[selectedProcedureIndex]}
            isSelected
          />

          {/* Notes */}
          <div className="h-px bg-[#F3F4F6]" />
          <div className="px-3.5 pt-3 pb-3">
            <p className="text-[0.62rem] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2">
              Notas clínicas
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones de la sesión..."
              rows={3}
              className="w-full text-[0.72rem] text-text-secondary bg-[#FAFAFA] border border-border rounded-lg p-2.5 outline-none resize-none focus:ring-2 focus:ring-indigo/20 focus:border-indigo placeholder:text-text-placeholder"
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/simulator/SlidersPanel.tsx
git commit -m "feat(simulator): add SlidersPanel with procedure tabs"
```

---

## Task 11: ProcedureSidebar

**Files:**
- Create: `frontend/components/simulator/ProcedureSidebar.tsx`

- [ ] **Step 1: Implement ProcedureSidebar**

Create `frontend/components/simulator/ProcedureSidebar.tsx`:

```tsx
'use client'

import { useSimulator } from './SimulatorContext'
import { PROCEDURE_LABELS, TECHNIQUE_LABELS, getAvailableTechniques, ALL_PROCEDURES } from '@/lib/procedures'
import type { Procedimiento } from './types'
import { ArrowLeft, PushPin, LineSegment, Ruler, PencilSimple } from '@phosphor-icons/react'

export function ProcedureSidebar() {
  const { state, addProcedure, removeProcedure, setActiveTool } = useSimulator()
  const { activeProcedures, activeTool } = state

  const activeProcNames = activeProcedures.map(p => p.procedimiento)

  function toggleProcedure(proc: Procedimiento) {
    if (activeProcNames.includes(proc)) {
      removeProcedure(proc)
    } else {
      addProcedure(proc)
    }
  }

  const tools: Array<{ id: SimulatorState['activeTool']; label: string; icon: React.ReactNode }> = [
    { id: 'pin',   label: 'Pin de anotación',    icon: <PushPin size={16} /> },
    { id: 'hud',   label: 'Líneas de referencia', icon: <LineSegment size={16} /> },
    { id: 'angle', label: 'Medición de ángulos',  icon: <Ruler size={16} /> },
    { id: 'draw',  label: 'Dibujo libre',         icon: <PencilSimple size={16} /> },
  ]

  return (
    <aside className="w-55 bg-text-primary flex flex-col shrink-0 overflow-y-auto">

      {/* Procedures */}
      <p className="text-[0.62rem] font-bold tracking-[0.09em] uppercase text-white/30 px-3.5 pt-4 pb-1.5">
        Procedimiento
      </p>

      <nav className="px-2">
        {ALL_PROCEDURES.map(proc => {
          const isActive = activeProcNames.includes(proc)
          return (
            <button
              key={proc}
              onClick={() => toggleProcedure(proc)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.78rem] text-left transition-all mb-0.5 ${
                isActive
                  ? 'bg-[rgba(79,172,254,0.15)] text-blue font-semibold'
                  : 'text-white/45 hover:bg-white/6 hover:text-white/70'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-blue' : 'bg-current opacity-60'}`} />
              {PROCEDURE_LABELS[proc]}
            </button>
          )
        })}
      </nav>

      <div className="h-px bg-white/8 mx-3.5 my-2" />

      {/* Tools */}
      <p className="text-[0.62rem] font-bold tracking-[0.09em] uppercase text-white/30 px-3.5 pb-1.5">
        Herramientas
      </p>

      <div className="px-2">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(activeTool === tool.id ? 'none' : tool.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[0.73rem] text-left transition-all mb-0.5 ${
              activeTool === tool.id
                ? 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24]'
                : 'text-white/40 hover:bg-white/5 hover:text-white/65'
            }`}
          >
            <span className={`flex items-center justify-center w-4.5 h-4.5 rounded shrink-0 ${activeTool === tool.id ? 'bg-[rgba(251,191,36,0.15)]' : 'bg-white/8'}`}>
              {tool.icon}
            </span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto px-2 pb-3">
        <div className="h-px bg-white/8 mx-1.5 mb-2" />
        <a
          href="/patients"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.72rem] text-red-400/50 hover:bg-white/4 hover:text-red-400/70 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al expediente
        </a>
      </div>
    </aside>
  )
}
```

> Note: `SimulatorState` is imported from types to avoid the circular reference — add `import type { SimulatorState } from './types'` at the top.

- [ ] **Step 2: Fix the import**

Add to top of file:

```tsx
import type { SimulatorState } from './types'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/simulator/ProcedureSidebar.tsx
git commit -m "feat(simulator): add ProcedureSidebar"
```

---

## Task 12: SimulatorTopbar and SimulatorBottombar

**Files:**
- Create: `frontend/components/simulator/SimulatorTopbar.tsx`
- Create: `frontend/components/simulator/SimulatorBottombar.tsx`

- [ ] **Step 1: Implement SimulatorTopbar**

Create `frontend/components/simulator/SimulatorTopbar.tsx`:

```tsx
'use client'

import { useSimulator } from './SimulatorContext'

interface SimulatorTopbarProps {
  patientName: string
  sessionNumber: number
}

export function SimulatorTopbar({ patientName, sessionNumber }: SimulatorTopbarProps) {
  const { state } = useSimulator()
  const { activeProcedures, selectedProcedureIndex } = state
  const selected = activeProcedures[selectedProcedureIndex]

  return (
    <header className="h-11 bg-white border-b border-border flex items-center pr-4 shrink-0 col-span-2">
      {/* Logo zone */}
      <div className="w-55 h-full bg-text-primary flex items-center gap-2 px-4 shrink-0">
        <div className="w-5 h-5 rounded-md bg-linear-to-br from-blue to-indigo shrink-0" />
        <span className="text-[0.8rem] font-bold text-white tracking-[-0.01em]">SimEstético</span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 text-[0.75rem]">
        <a href="/patients" className="text-text-muted hover:text-text-secondary transition-colors">
          Pacientes
        </a>
        <span className="text-[#D1D5DB]">/</span>
        <span className="text-text-muted">{patientName}</span>
        <span className="text-[#D1D5DB]">/</span>
        <span className="text-text-primary font-semibold">Sesión #{sessionNumber}</span>
        {selected && (
          <span className="ml-1 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full bg-indigo-muted text-indigo-dark">
            {selected.procedimiento.replace(/_/g, ' ')} · {selected.tecnica.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1.5">
        {(['↩', '↪', '⚙'] as const).map(icon => (
          <button
            key={icon}
            className="w-7.5 h-7.5 rounded-lg border border-border bg-white flex items-center justify-center text-text-muted text-sm hover:bg-bg-page transition-colors"
          >
            {icon}
          </button>
        ))}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Implement SimulatorBottombar**

Create `frontend/components/simulator/SimulatorBottombar.tsx`:

```tsx
'use client'

import { useSimulator } from './SimulatorContext'

interface SimulatorBottombarProps {
  onSave: () => Promise<void>
  onExportPDF: () => void
  onShare: () => void
}

export function SimulatorBottombar({ onSave, onExportPDF, onShare }: SimulatorBottombarProps) {
  const { state } = useSimulator()

  return (
    <footer className="h-13 bg-white border-t border-border flex items-center px-3.5 gap-1.5">
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
        onClick={onSave}
        disabled={state.isSaving}
        className="btn-primary text-[0.72rem] disabled:opacity-60"
      >
        {state.isSaving ? 'Guardando...' : '💾 Guardar sesión'}
      </button>
    </footer>
  )
}
```

- [ ] **Step 3: Add btn- utility classes to globals.css**

In `frontend/app/globals.css`, add after the existing tokens:

```css
/* ─── Button utilities ──────────────────────────────────────────────── */
.btn-primary {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  background: var(--indigo);
  color: white;
  border: 1px solid var(--indigo);
  transition: background 0.15s, border-color 0.15s;
}
.btn-primary:hover { background: var(--indigo-dark); border-color: var(--indigo-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  background: white;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  transition: background 0.15s;
}
.btn-secondary:hover { background: #F9FAFB; }

.btn-ghost {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  background: transparent;
  color: var(--indigo);
  border: 1px solid transparent;
  transition: background 0.15s;
}
.btn-ghost:hover { background: var(--indigo-muted); }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/simulator/SimulatorTopbar.tsx frontend/components/simulator/SimulatorBottombar.tsx frontend/app/globals.css
git commit -m "feat(simulator): add topbar, bottombar, and btn utilities"
```

---

## Task 13: CanvasToolbar, HudOverlay, AnnotationLayer, DrawingLayer

**Files:**
- Create: `frontend/components/simulator/CanvasToolbar.tsx`
- Create: `frontend/components/simulator/HudOverlay.tsx`
- Create: `frontend/components/simulator/AnnotationLayer.tsx`
- Create: `frontend/components/simulator/DrawingLayer.tsx`

- [ ] **Step 1: Implement CanvasToolbar**

Create `frontend/components/simulator/CanvasToolbar.tsx`:

```tsx
'use client'

import { useSimulator } from './SimulatorContext'
import type { CanvasMode } from './types'

interface CanvasToolbarProps {
  onUploadPhoto: () => void
}

const MODES: Array<{ id: CanvasMode; label: string }> = [
  { id: 'original',   label: 'Original' },
  { id: 'simulation', label: 'Simulación' },
  { id: 'split',      label: 'Split' },
]

export function CanvasToolbar({ onUploadPhoto }: CanvasToolbarProps) {
  const { state, setCanvasMode, setHudVisible } = useSimulator()

  return (
    <div className="h-10 bg-white border-b border-border flex items-center px-3 gap-1.5 shrink-0">
      {(['🔍 Zoom', '✋ Pan'] as const).map(label => (
        <button key={label} className="px-2.5 h-6.5 rounded-md text-[0.72rem] font-medium text-text-muted hover:bg-bg-page hover:border hover:border-border transition-colors">
          {label}
        </button>
      ))}

      <div className="w-px h-4.5 bg-border mx-0.5" />

      {/* Mode toggle */}
      <div className="flex bg-bg-page rounded-lg p-0.5 border border-border">
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setCanvasMode(mode.id)}
            className={`px-2.5 h-6 rounded-md text-[0.67rem] font-semibold transition-colors ${
              state.canvasMode === mode.id
                ? 'bg-white text-indigo-dark shadow-sm'
                : 'text-[#9CA3AF] hover:text-text-muted'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setHudVisible(!state.hudVisible)}
        className={`px-2.5 h-6.5 rounded-md text-[0.72rem] font-medium transition-colors ${
          state.hudVisible
            ? 'bg-indigo-muted text-indigo-dark border border-[#C7D2FE]'
            : 'text-text-muted hover:bg-bg-page'
        }`}
      >
        ⊞ HUD
      </button>

      <div className="ml-auto">
        <button
          onClick={onUploadPhoto}
          className="btn-secondary text-[0.72rem] h-6.5"
        >
          📷 Subir foto
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement HudOverlay**

Create `frontend/components/simulator/HudOverlay.tsx`:

```tsx
'use client'

interface HudOverlayProps {
  width: number
  height: number
}

export function HudOverlay({ width, height }: HudOverlayProps) {
  if (width === 0 || height === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Horizontal midline (Frankfort plane approximation) */}
      <line
        x1={width * 0.1} y1={height * 0.38}
        x2={width * 0.9} y2={height * 0.38}
        stroke="rgba(79,172,254,0.4)" strokeWidth="1" strokeDasharray="4 3"
      />
      {/* End markers */}
      <circle cx={width * 0.1} cy={height * 0.38} r={3} fill="#4FACFE" />
      <circle cx={width * 0.9} cy={height * 0.38} r={3} fill="#4FACFE" />

      {/* Vertical midline */}
      <line
        x1={width * 0.5} y1={height * 0.05}
        x2={width * 0.5} y2={height * 0.95}
        stroke="rgba(79,172,254,0.25)" strokeWidth="1" strokeDasharray="4 3"
      />

      {/* Frankfort label */}
      <rect x={width * 0.5 - 36} y={height * 0.38 - 14} width={72} height={13} rx={3} fill="rgba(255,255,255,0.9)" />
      <text
        x={width * 0.5} y={height * 0.38 - 4}
        textAnchor="middle" fill="#4FACFE"
        fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif"
      >
        Plano Frankfort
      </text>
    </svg>
  )
}
```

- [ ] **Step 3: Implement AnnotationLayer**

Create `frontend/components/simulator/AnnotationLayer.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useSimulator } from './SimulatorContext'

interface AnnotationLayerProps {
  width: number
  height: number
}

export function AnnotationLayer({ width, height }: AnnotationLayerProps) {
  const { state, addPin, updatePinLabel, removePin } = useSimulator()
  const { pins, activeTool } = state
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool !== 'pin') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    addPin({ id: crypto.randomUUID(), x, y, label: 'Anotación' })
  }

  return (
    <div
      className="absolute inset-0"
      style={{ cursor: activeTool === 'pin' ? 'crosshair' : 'default' }}
      onClick={handleCanvasClick}
    >
      {pins.map(pin => (
        <div
          key={pin.id}
          className="absolute"
          style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, transform: 'translate(-50%, -50%)' }}
        >
          {/* Pin dot */}
          <div
            className="w-2.5 h-2.5 rounded-full bg-warning border-2 border-white shadow-sm cursor-pointer"
            onClick={e => { e.stopPropagation(); setEditingId(pin.id) }}
            title="Click para editar"
          />
          {/* Label */}
          {editingId === pin.id ? (
            <input
              autoFocus
              defaultValue={pin.label}
              className="absolute bottom-4 left-3 z-10 text-[0.68rem] px-1.5 py-0.5 rounded border border-[#FDE68A] bg-[#FEF3C7] text-[#92400E] w-24 outline-none shadow"
              onBlur={e => { updatePinLabel(pin.id, e.target.value); setEditingId(null) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { updatePinLabel(pin.id, e.currentTarget.value); setEditingId(null) }
                if (e.key === 'Delete' && e.metaKey) { removePin(pin.id); setEditingId(null) }
              }}
            />
          ) : (
            <span className="absolute bottom-3.5 left-3 text-[0.68rem] font-semibold text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#FDE68A] whitespace-nowrap shadow-sm pointer-events-none">
              {pin.label}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implement DrawingLayer**

Create `frontend/components/simulator/DrawingLayer.tsx`:

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { useSimulator } from './SimulatorContext'

interface DrawingLayerProps {
  width: number
  height: number
}

export function DrawingLayer({ width, height }: DrawingLayerProps) {
  const { state, addStroke } = useSimulator()
  const { activeTool, strokes } = state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const currentPoints = useRef<Array<{ x: number; y: number }>>([])

  // Re-render all strokes when they change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height)
      stroke.points.slice(1).forEach(p => ctx.lineTo(p.x * canvas.width, p.y * canvas.height))
      ctx.stroke()
    })
  }, [strokes, width, height])

  function getRelativePoint(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== 'draw') return
    isDrawing.current = true
    currentPoints.current = [getRelativePoint(e)]
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || activeTool !== 'draw') return
    currentPoints.current.push(getRelativePoint(e))

    // Live preview
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pts = currentPoints.current
    if (pts.length >= 2) {
      const prev = pts[pts.length - 2]
      const curr = pts[pts.length - 1]
      ctx.beginPath()
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height)
      ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height)
      ctx.stroke()
    }
  }

  function handleMouseUp() {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (currentPoints.current.length > 1) {
      addStroke({ id: crypto.randomUUID(), points: currentPoints.current, color: '#EF4444', width: 2 })
    }
    currentPoints.current = []
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0"
      style={{
        cursor: activeTool === 'draw' ? 'crosshair' : 'default',
        pointerEvents: activeTool === 'draw' ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/simulator/CanvasToolbar.tsx frontend/components/simulator/HudOverlay.tsx frontend/components/simulator/AnnotationLayer.tsx frontend/components/simulator/DrawingLayer.tsx
git commit -m "feat(simulator): add canvas toolbar, HUD overlay, annotation and drawing layers"
```

---

## Task 14: useCanvas and useLiquify hooks

**Files:**
- Create: `frontend/lib/canvas/useCanvas.ts`
- Create: `frontend/lib/canvas/useLiquify.ts`

- [ ] **Step 1: Implement useCanvas**

Create `frontend/lib/canvas/useCanvas.ts`:

```typescript
import { useRef, useEffect, useCallback } from 'react'

interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>
  width: number
  height: number
  loadImage: (url: string) => Promise<ImageData>
  getImageData: () => ImageData | null
}

export function useCanvas(): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const widthRef = useRef(0)
  const heightRef = useRef(0)

  const loadImage = useCallback(async (url: string): Promise<ImageData> => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('Canvas not mounted')
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    widthRef.current = img.naturalWidth
    heightRef.current = img.naturalHeight

    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight)
  }, [])

  const getImageData = useCallback((): ImageData | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')!
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }, [])

  return {
    canvasRef,
    width: widthRef.current,
    height: heightRef.current,
    loadImage,
    getImageData,
  }
}
```

- [ ] **Step 2: Implement useLiquify**

Create `frontend/lib/canvas/useLiquify.ts`:

```typescript
import { useRef, useEffect, useCallback } from 'react'
import type { LiquifyConfig, WorkerInMessage, WorkerOutMessage } from './types'

interface UseLiquifyReturn {
  initWorker: (canvas: OffscreenCanvas, imageData: ImageData) => Promise<void>
  applyConfig: (config: LiquifyConfig) => Promise<void>
  reset: () => Promise<void>
  isReady: boolean
}

export function useLiquify(): UseLiquifyReturn {
  const workerRef = useRef<Worker | null>(null)
  const readyRef = useRef(false)

  useEffect(() => {
    const worker = new Worker(
      new URL('./liquify.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  function sendAndWait(msg: WorkerInMessage, transfer?: Transferable[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current
      if (!worker) return reject(new Error('Worker not initialized'))

      function onMessage(e: MessageEvent<WorkerOutMessage>) {
        worker.removeEventListener('message', onMessage)
        if (e.data.type === 'ERROR') reject(new Error(e.data.message))
        else resolve()
      }

      worker.addEventListener('message', onMessage)
      if (transfer?.length) {
        worker.postMessage(msg, transfer)
      } else {
        worker.postMessage(msg)
      }
    })
  }

  const initWorker = useCallback(async (canvas: OffscreenCanvas, imageData: ImageData) => {
    await sendAndWait({ type: 'INIT', canvas, imageData }, [canvas])
    readyRef.current = true
  }, [])

  const applyConfig = useCallback(async (config: LiquifyConfig) => {
    if (!readyRef.current) return
    await sendAndWait({ type: 'APPLY', config })
  }, [])

  const reset = useCallback(async () => {
    if (!readyRef.current) return
    await sendAndWait({ type: 'RESET' })
  }, [])

  return { initWorker, applyConfig, reset, isReady: readyRef.current }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/canvas/useCanvas.ts frontend/lib/canvas/useLiquify.ts
git commit -m "feat(canvas): add useCanvas and useLiquify hooks"
```

---

## Task 15: CanvasWorkspace

**Files:**
- Create: `frontend/components/simulator/CanvasWorkspace.tsx`

- [ ] **Step 1: Implement CanvasWorkspace**

Create `frontend/components/simulator/CanvasWorkspace.tsx`:

```tsx
'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useSimulator } from './SimulatorContext'
import { useCanvas } from '@/lib/canvas/useCanvas'
import { useLiquify } from '@/lib/canvas/useLiquify'
import { CanvasToolbar } from './CanvasToolbar'
import { HudOverlay } from './HudOverlay'
import { AnnotationLayer } from './AnnotationLayer'
import { DrawingLayer } from './DrawingLayer'
import type { ControlPoint } from '@/lib/canvas/types'
import { SLIDERS_BY_PROCEDURE } from '@/lib/procedures'

const CONTROL_POINT_RADIUS = 80

function buildControlPoints(
  activeProcedures: ReturnType<typeof useSimulator>['state']['activeProcedures'],
  canvasWidth: number,
  canvasHeight: number,
): ControlPoint[] {
  const points: ControlPoint[] = []

  activeProcedures.forEach(proc => {
    if (proc.procedimiento !== 'RINOPLASTIA') return
    const scale = proc.intensity / 100
    const cx = canvasWidth * 0.5
    const gibaNasal = proc.sliderValues['giba-nasal'] ?? 0
    const proyeccion = proc.sliderValues['proyeccion-punta'] ?? 0
    const rotacion = proc.sliderValues['rotacion-punta'] ?? 0

    if (gibaNasal !== 0) {
      points.push({ x: cx, y: canvasHeight * 0.35, dx: 0, dy: gibaNasal * scale, radius: CONTROL_POINT_RADIUS })
    }
    if (proyeccion !== 0 || rotacion !== 0) {
      points.push({ x: cx, y: canvasHeight * 0.55, dx: rotacion * scale * 0.5, dy: -proyeccion * scale, radius: CONTROL_POINT_RADIUS })
    }
  })

  return points
}

export function CanvasWorkspace() {
  const { state, setImage } = useSimulator()
  const { canvasRef, loadImage } = useCanvas()
  const { initWorker, applyConfig } = useLiquify()
  const offscreenRef = useRef<OffscreenCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  // Track container size for overlays
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Apply liquify when slider values change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !offscreenRef.current || !state.imageUrl) return
    if (state.canvasMode === 'original') return

    const controlPoints = buildControlPoints(
      state.activeProcedures,
      canvas.width,
      canvas.height,
    )
    applyConfig({ width: canvas.width, height: canvas.height, controlPoints })
  }, [state.activeProcedures, state.canvasMode, applyConfig])

  const handleUploadPhoto = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      const imageData = await loadImage(url)
      state.imageUrl // keep existing if any

      const canvas = canvasRef.current!
      const offscreen = canvas.transferControlToOffscreen()
      offscreenRef.current = offscreen
      await initWorker(offscreen, imageData)
      setImage(url)
    }
    input.click()
  }, [loadImage, initWorker, setImage])

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-bg-page">
      <CanvasToolbar onUploadPhoto={handleUploadPhoto} />

      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(102,126,234,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {!state.imageUrl ? (
          <div className="text-center">
            <p className="text-[0.85rem] font-semibold text-text-primary mb-1.5">Sin fotografía</p>
            <p className="text-[0.75rem] text-[#9CA3AF] mb-4">Sube una foto del paciente para comenzar la simulación</p>
            <button onClick={handleUploadPhoto} className="btn-primary">
              📷 Subir foto
            </button>
          </div>
        ) : (
          <div className="relative shadow-[0_8px_32px_rgba(30,27,75,0.12)] rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="block max-w-full max-h-full" />
            {state.hudVisible && (
              <HudOverlay width={containerSize.w} height={containerSize.h} />
            )}
            <AnnotationLayer width={containerSize.w} height={containerSize.h} />
            <DrawingLayer width={containerSize.w} height={containerSize.h} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/simulator/CanvasWorkspace.tsx
git commit -m "feat(simulator): add CanvasWorkspace with liquify integration"
```

---

## Task 16: Barrel, page route and layout

**Files:**
- Create: `frontend/components/simulator/index.ts`
- Create: `frontend/app/(simulator)/layout.tsx`
- Create: `frontend/app/(simulator)/page.tsx`

- [ ] **Step 1: Create barrel export**

Create `frontend/components/simulator/index.ts`:

```typescript
export { SimulatorProvider, useSimulator } from './SimulatorContext'
export { SimulatorTopbar } from './SimulatorTopbar'
export { ProcedureSidebar } from './ProcedureSidebar'
export { CanvasWorkspace } from './CanvasWorkspace'
export { SlidersPanel } from './SlidersPanel'
export { SimulatorBottombar } from './SimulatorBottombar'
export type * from './types'
```

- [ ] **Step 2: Create simulator layout**

Create `frontend/app/(simulator)/layout.tsx`:

```tsx
export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-bg-page">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create simulator page**

Create `frontend/app/(simulator)/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { SimulatorProvider } from '@/components/simulator'
import {
  SimulatorTopbar,
  ProcedureSidebar,
  CanvasWorkspace,
  SlidersPanel,
  SimulatorBottombar,
} from '@/components/simulator'

export const metadata: Metadata = {
  title: 'Simulador — SimEstético',
}

export default function SimulatorPage() {
  // TODO Task 17: receive patientId and sessionId from search params or auth
  const patientId = null
  const sessionId = null

  return (
    <SimulatorProvider patientId={patientId} sessionId={sessionId}>
      <div className="grid h-screen overflow-hidden" style={{ gridTemplateRows: '44px 1fr 52px', gridTemplateColumns: '220px 1fr' }}>
        <SimulatorTopbar patientName="Paciente" sessionNumber={1} />
        <ProcedureSidebar />
        <div className="flex overflow-hidden">
          <CanvasWorkspace />
          <SlidersPanel />
        </div>
        <SimulatorBottombar
          onSave={async () => { /* Task 17 */ }}
          onExportPDF={() => { /* Task 18 */ }}
          onShare={() => { /* Task 18 */ }}
        />
      </div>
    </SimulatorProvider>
  )
}
```

- [ ] **Step 4: Run the dev server and verify the page loads**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/simulator` — should see the full simulator layout: dark sidebar, canvas workspace with "Sin fotografía" empty state, and sliders panel.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/simulator/index.ts frontend/app/\(simulator\)/layout.tsx frontend/app/\(simulator\)/page.tsx
git commit -m "feat(simulator): wire up simulator page and layout"
```

---

## Task 17: API integration — save session

**Files:**
- Create: `frontend/lib/api/sessions.ts`
- Create: `frontend/lib/canvas/useSaveSession.ts`
- Modify: `frontend/components/simulator/SimulatorBottombar.tsx`
- Modify: `frontend/app/(simulator)/page.tsx`

> Architecture note: `onSave` must live INSIDE a component that is a child of `SimulatorProvider` — the page itself can't call `useSimulator()` because it's the Provider's parent. `SimulatorBottombar` already has context access, so save logic goes there via a `useSaveSession` hook.

- [ ] **Step 1: Create sessions API client**

Create `frontend/lib/api/sessions.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface SaveSessionPayload {
  patientId: string
  procedimiento: string
  tecnica: string
  sliderConfig: Record<string, Record<string, number>>
  notas: string
  imagePublicId?: string
}

export async function saveSession(payload: SaveSessionPayload, token: string): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/api/patients/${payload.patientId}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      procedimiento: payload.procedimiento,
      tecnica: payload.tecnica,
      notas: payload.notas,
      sliderConfig: payload.sliderConfig,
      imagePublicId: payload.imagePublicId,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error desconocido' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }

  return res.json()
}
```

- [ ] **Step 2: Add NEXT_PUBLIC_API_URL to frontend env**

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 3: Create useSaveSession hook**

Create `frontend/lib/canvas/useSaveSession.ts`:

```typescript
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
      // token: integrate with auth session when auth module is implemented
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
```

- [ ] **Step 4: Update SimulatorBottombar to own save logic**

Replace `frontend/components/simulator/SimulatorBottombar.tsx` with:

```tsx
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
    <footer className="h-13 bg-white border-t border-border flex items-center px-3.5 gap-1.5">
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
```

- [ ] **Step 5: Update page to remove onSave prop**

In `frontend/app/(simulator)/page.tsx`, remove `onSave` from `SimulatorBottombar`:

```tsx
<SimulatorBottombar
  onExportPDF={() => { /* Task 18 */ }}
  onShare={() => { /* Task 18 */ }}
/>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/api/sessions.ts frontend/.env.local frontend/lib/canvas/useSaveSession.ts frontend/components/simulator/SimulatorBottombar.tsx frontend/app/\(simulator\)/page.tsx
git commit -m "feat(simulator): add session save with useSaveSession hook"
```

---

## Task 18: Cloudinary upload, PDF export, Share token

**Files:**
- Create: `frontend/lib/api/cloudinary.ts`
- Create: `frontend/lib/api/share.ts`

- [ ] **Step 1: Implement Cloudinary signed upload**

Create `frontend/lib/api/cloudinary.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function getCloudinarySignature(token: string): Promise<{
  signature: string
  timestamp: number
  cloudName: string
  apiKey: string
  folder: string
}> {
  const res = await fetch(`${API_BASE}/api/cloudinary/sign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to get Cloudinary signature')
  return res.json()
}

export async function uploadToCloudinary(
  file: File,
  token: string,
): Promise<{ publicId: string; secureUrl: string }> {
  const { signature, timestamp, cloudName, apiKey, folder } = await getCloudinarySignature(token)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json()
  return { publicId: data.public_id, secureUrl: data.secure_url }
}
```

- [ ] **Step 2: Implement share token**

Create `frontend/lib/api/share.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function createShareToken(
  sessionId: string,
  token: string,
): Promise<{ shareUrl: string; expiresAt: string }> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/share`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to create share token')
  return res.json()
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api/cloudinary.ts frontend/lib/api/share.ts
git commit -m "feat(simulator): add Cloudinary upload and share token API clients"
```

---

## Task 19: Smoke test — full page render

- [ ] **Step 1: Run all tests**

```bash
cd frontend && npm test
```
Expected: All tests passing (procedures, liquify, SimulatorContext, SliderControl, ProcedureTab)

- [ ] **Step 2: Start backend**

```bash
cd backend && npm run dev
```

- [ ] **Step 3: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 4: Manual verification checklist**

Open `http://localhost:3000/simulator` and verify:

- [ ] Layout renders: dark sidebar left, canvas center with empty state, sliders panel right
- [ ] Click procedure in sidebar → nav item turns blue, tab appears in sliders panel
- [ ] Add second procedure → second tab appears
- [ ] Move a slider → value updates in real time
- [ ] Change technique → technique pill highlights, giba-nasal min clamps in Rinomodelación
- [ ] Click "Subir foto" → file picker opens, photo loads into canvas
- [ ] HUD toggle → SVG lines appear over canvas
- [ ] "Pin de anotación" tool → clicking canvas places yellow pin with label
- [ ] "Dibujo libre" tool → drag on canvas draws red stroke
- [ ] Split mode → canvas mode toggle works (original/simulation/split)
- [ ] "+ Nuevo" preset → naming input appears, saves to pill list
- [ ] Notes textarea → types and updates

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(simulator): complete simulator UI — all components wired and verified"
```
