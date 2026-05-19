# Diseño UI — Simulador Principal (`/simulator`)

**Fecha:** 2026-05-18
**Estado:** Aprobado — listo para planificación de implementación
**Referencia funcional:** [FaceTouchUp Plastic Surgery Simulator](https://www.facetouchup.com/plastic-surgery-simulator/)

---

## Contexto

El simulador es la pantalla central del producto. Es donde el cirujano trabaja durante la consulta: carga la foto del paciente, aplica procedimientos estéticos mediante el canvas engine (liquify), anota observaciones y presenta el resultado al paciente. Es una herramienta clínica profesional, no un editor de consumo.

El diseño prioriza claridad operativa sobre expresividad visual. El canvas es el protagonista; los controles lo rodean sin competir con él.

---

## Layout: Sidebar izq + Canvas + Panel der

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR (44px)  Logo · Breadcrumb · Sesión badge · Undo/Redo   │
├──────────────┬──────────────────────────────┬───────────────────┤
│              │  Canvas toolbar (40px)        │                   │
│  SIDEBAR     │  ─────────────────────────── │  PANEL SLIDERS    │
│  220px       │                               │  240px            │
│  #1E1B4B     │        CANVAS                 │  #ffffff          │
│              │        workspace              │                   │
│  Procedim.   │        (liquify engine)       │  Tabs por proc.   │
│  Técnica     │                               │  Sliders          │
│  Herram.     │                               │  Intensidad       │
│              │                               │  Presets          │
│              │                               │  Notas clínicas   │
├──────────────┴──────────────────────────────┴───────────────────┤
│  BOTTOMBAR (52px)  Reset · Ángulos · [spacer] · PDF · Share · Guardar │
└─────────────────────────────────────────────────────────────────┘
```

---

## Zonas

### 1. Topbar

- **Fondo:** `#ffffff` · **Border-bottom:** `1px solid #E9D5FF`
- **Izquierda (220px):** Logo SimEstético — marca `#1E1B4B`, ícono gradiente `#4FACFE → #667EEA`
- **Centro:** Breadcrumb `Pacientes / Nombre Paciente / Sesión #N` · Badge de sesión activa (procedimiento + técnica), fondo `#EEF2FF`, texto `#4338CA`
- **Derecha:** Icon buttons (30×30px, border `#E9D5FF`): Deshacer, Rehacer, Configuración

### 2. Sidebar izquierda (220px · `#1E1B4B`)

**Sección: Procedimiento**
- Lista de 8 procedimientos como nav items
- Item inactivo: `rgba(255,255,255,0.45)` · Item activo: bg `rgba(79,172,254,0.15)`, texto `#4FACFE`, font-weight 600
- Procedimientos: Rinoplastia, Lifting de cejas, Aumento de mentón, Aumento de labios, Lifting de cuello, Blefaroplastia, Suavizado de piel, Feminización facial
- Selección múltiple habilitada — cada procedimiento activo abre un tab en el panel derecho

**Sección: Técnica**
- Pills de técnica filtradas por procedimiento activo (e.g. Rinoplastia → Quirúrgico / Rinomodelación / Endoscópico)
- Pill activa: bg `rgba(79,172,254,0.2)`, color `#4FACFE`, border `rgba(79,172,254,0.3)`
- Pill inactiva: bg `rgba(255,255,255,0.05)`, color `rgba(255,255,255,0.35)`
- La técnica seleccionada limita los deltas disponibles (Rinomodelación restringe valores negativos en giba)

**Sección: Herramientas de canvas**
- Pin de anotación — coloca pin amarillo (`#F59E0B`) con etiqueta editable
- Líneas de referencia HUD — activa/desactiva overlay de planos anatómicos
- Medición de ángulos — permite medir ángulos sobre el canvas
- Dibujo libre — pincel para trazar líneas y flechas directamente sobre la foto

**Footer sidebar**
- Link "← Volver al expediente" — navega a `/patients/[id]`

### 3. Canvas (flex: 1)

**Canvas toolbar (40px · `#ffffff` · border-bottom `#E9D5FF`)**
- Botones: Zoom, Pan, separador, Antes/Después toggle, Cuadrícula HUD
- Derecha: "Subir foto" (abre file picker, Cloudinary upload)

**Canvas workspace**
- Fondo: `#F5F3FF` con grid punteado `rgba(102,126,234,0.04)` (20×20px)
- Modo toggle (top-right del canvas): `Original | Simulación | Split`
  - **Original:** foto sin modificar
  - **Simulación:** resultado del liquify aplicado
  - **Split:** divider vertical arrastrable, mitad izq original / mitad der simulado
- HUD overlay: líneas de referencia anatómica (`rgba(79,172,254,0.35)`), puntos de anclaje, etiquetas de ángulo (`#4FACFE` sobre fondo blanco 90%)
- Pins de anotación: círculo `#F59E0B` con border `#fff`, tooltip con etiqueta
- Dibujo libre: trazos en color configurable, persistidos en `AnnotationPin`

**Canvas engine (implementación)**
- Web Worker + OffscreenCanvas para no bloquear el hilo principal
- Inverse warp mapping + interpolación bilineal
- 3 puntos de control para rinoplastia: giba nasal, proyección punta, rotación punta
- 60fps @ 1024×1024px

### 4. Panel de sliders (240px · `#ffffff` · border-left `#E9D5FF`)

**Tabs de procedimientos**
- Un tab por procedimiento activo, orden de activación
- Tab activo: bg `#F8F8FF`, color `#4338CA`, border-bottom `#667EEA` 2px
- Tab inactivo: color `#9CA3AF`
- Botón "+" al extremo derecho: activa modo selección de procedimiento adicional

**Contenido del tab activo**
- Nombre del procedimiento (font-weight 600, `#1E1B4B`) + pill de técnica (`#EEF2FF / #4338CA`)
- Sliders específicos del procedimiento (variables según `TECNICAS_POR_PROCEDIMIENTO`)
  - Track: 4px, bg `#E9D5FF`, border-radius 2px
  - Fill activo: gradiente `#4FACFE → #667EEA`
  - Thumb: 14px, border `#667EEA`, box-shadow `0 1px 4px rgba(102,126,234,0.3)`
  - Label izq: `#374151` 0.73rem · Valor der: `#4338CA` bold
- **Intensidad global:** slider separado, gradiente `#a78bfa → #667EEA`, valor en `#7C3AED`
- **Presets:** pills con presets del sistema (Natural, Definido, Proyectado, etc.) + chip "+" para guardar preset propio con nombre
- **Notas clínicas:** textarea estilizado, bg `#FAFAFA`, border `#E9D5FF`, para notas de la sesión

### 5. Bottombar (52px · `#ffffff` · border-top `#E9D5FF`)

- **Izquierda:** Reset total (secondary), Medir ángulos (ghost)
- **Derecha:** Exportar PDF (secondary), Compartir 48h (secondary), Guardar sesión (primary `#667EEA`)

---

## Flujo de la consulta

1. Médico abre sesión desde expediente del paciente (`/patients/[id]`)
2. Sube foto del paciente (Cloudinary signed upload, EXIF stripping automático)
3. Selecciona procedimiento(s) en sidebar — aparece tab en panel derecho
4. Elige técnica quirúrgica (filtra parámetros disponibles)
5. Ajusta sliders — canvas actualiza en tiempo real vía Web Worker
6. Usa herramientas: HUD para ángulos, pins para notas, dibujo libre para indicar zonas
7. Activa modo Split para mostrar antes/después al paciente en la misma pantalla
8. Guarda sesión → resultado persiste en `SimulationResult` con `sliderConfig` + `angulos`
9. Opcional: exporta PDF o genera link de compartir (token 48h) → `share/[token]`

---

## Tokens de diseño aplicados

| Elemento | Token | Valor |
|---|---|---|
| Sidebar bg | `#1E1B4B` | Indigo profundo |
| Nav item activo bg | `rgba(79,172,254,0.15)` | Azul translúcido |
| Nav item activo text | `#4FACFE` | Blue-400 |
| Content bg | `#F5F3FF` | Indigo-50 suave |
| Surface (panels) | `#ffffff` | Blanco |
| Border | `#E9D5FF` | Purple-200 |
| Slider fill | `#4FACFE → #667EEA` | Gradiente primario |
| Btn primary | `#667EEA` | Indigo-400 |
| Btn primary hover | `#4338CA` | Indigo-700 |
| Pin anotación | `#F59E0B` | Amber-400 |
| Fuente | Inter | 400/500/600/700 |

---

## Componentes a implementar

| Componente | Ruta propuesta |
|---|---|
| `SimulatorPage` | `app/(simulator)/page.tsx` |
| `SimulatorTopbar` | `components/simulator/SimulatorTopbar.tsx` |
| `ProcedureSidebar` | `components/simulator/ProcedureSidebar.tsx` |
| `CanvasWorkspace` | `components/simulator/CanvasWorkspace.tsx` |
| `CanvasToolbar` | `components/simulator/CanvasToolbar.tsx` |
| `HudOverlay` | `components/simulator/HudOverlay.tsx` |
| `AnnotationLayer` | `components/simulator/AnnotationLayer.tsx` |
| `DrawingLayer` | `components/simulator/DrawingLayer.tsx` |
| `SlidersPanel` | `components/simulator/SlidersPanel.tsx` |
| `ProcedureTab` | `components/simulator/ProcedureTab.tsx` |
| `SliderControl` | `components/simulator/SliderControl.tsx` |
| `PresetPicker` | `components/simulator/PresetPicker.tsx` |
| `SimulatorBottombar` | `components/simulator/SimulatorBottombar.tsx` |
| `useCanvas` | `lib/canvas/useCanvas.ts` |
| `useLiquify` | `lib/canvas/useLiquify.ts` |
| `useAnnotations` | `lib/canvas/useAnnotations.ts` |
| `liquify.worker` | `lib/canvas/liquify.worker.ts` |

---

## Verificación

- [ ] Subir foto → aparece en canvas dentro de 2s
- [ ] Mover slider → canvas actualiza en <16ms (60fps) sin bloquear UI
- [ ] Activar Split → divider arrastrable separa original y simulado
- [ ] Agregar 2do procedimiento → aparece segundo tab en panel derecho
- [ ] Pin de anotación → click en canvas coloca pin con tooltip editable
- [ ] Guardar sesión → `POST /api/patients/:id/sessions` con sliderConfig persistido
- [ ] Exportar PDF → descarga PDF con imagen antes/después + notas
- [ ] Compartir → genera link `/share/[token]` válido 48h
- [ ] Preset propio → "+" guarda configuración actual con nombre, aparece en pills
- [ ] Rinomodelación → sliders de giba bloqueados en valores negativos
