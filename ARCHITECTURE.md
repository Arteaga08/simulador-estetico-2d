# ARCHITECTURE.md — Simulador Estético Quirúrgico 2D
## Rinoplastia en Tiempo Real | Single Source of Truth

> Última actualización: 2026-05-18
> Stack: Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Express.js · PostgreSQL · Prisma · Cloudinary

---

## 1. Visión del Producto

Herramienta SaaS de visualización quirúrgica que permite a cirujanos plásticos y médicos estéticos mostrar en tiempo real el resultado estimado de una rinoplastia (o rinomodelación con ácido hialurónico) sobre la foto real del paciente. El médico manipula sliders que deforman la imagen mediante un motor matemático (Liquify Engine), visualiza métricas en un HUD médico, anota sobre la simulación con pines quirúrgicos, y exporta el resultado al expediente digital del paciente.

**Usuario principal:** Cirujano plástico / médico estético en consulta
**Usuario secundario:** Paciente (visualización pasiva vía share link)

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| Frontend | Next.js App Router | 16.2.6 | SSR, routing, middleware de auth |
| UI | React + Tailwind CSS | 19 / 4 | Componentes + utilidades |
| Canvas Engine | HTML5 Canvas + Web Worker | Nativo | 60fps sin bloquear UI |
| Backend API | Express.js + TypeScript | 5.x | REST API desacoplada |
| Base de datos | PostgreSQL + Prisma | 16 / 6 | ACID, FK, JSONB, compliance médico |
| Almacenamiento | Cloudinary (Authenticated) | v2 | CDN médico, EXIF stripping, URLs firmadas |
| Auth | Auth.js v5 (NextAuth) | 5 | Sesiones cifradas, 2FA, RBAC |
| Validación | Zod | 3 | Schemas type-safe en frontend y backend |
| PDF | @react-pdf/renderer | 4 | Reportes editoriales de alta calidad |
| Lenguaje | TypeScript strict | 5 | Seguridad de tipos end-to-end |

---

## 3. Arquitectura del Repositorio

```
simulador-estetico-2d/                  ← raíz del monorepo
├── ARCHITECTURE.md                     ← este archivo (Single Source of Truth)
├── SECURITY.md                         ← arquitectura de seguridad detallada
├── backend/                            ← Express.js API (puerto 4000)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── patients.ts             ← CRUD expedientes
│   │   │   ├── sessions.ts             ← sesiones de consulta
│   │   │   ├── results.ts              ← resultados de simulación
│   │   │   ├── pins.ts                 ← anotaciones quirúrgicas
│   │   │   ├── presets.ts              ← presets anatómicos
│   │   │   ├── share.ts                ← tokens de consulta
│   │   │   ├── pdf.ts                  ← generación de reportes
│   │   │   ├── imageProxy.ts           ← proxy de imágenes Cloudinary
│   │   │   └── cloudinary.ts           ← firma de uploads
│   │   ├── middleware/
│   │   │   ├── auth.ts                 ← verificación JWT
│   │   │   ├── rbac.ts                 ← control de roles
│   │   │   ├── audit.ts                ← registro automático de acciones
│   │   │   ├── rateLimiter.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── cors.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts               ← singleton del cliente Prisma
│   │   │   ├── cloudinarySign.ts       ← generación de firmas
│   │   │   └── shareToken.ts           ← UUID + HMAC + expiración
│   │   └── index.ts                    ← entry point Express
│   ├── prisma/
│   │   └── schema.prisma               ← esquema de DB (fuente de verdad)
│   ├── package.json
│   └── tsconfig.json
└── frontend/                           ← Next.js frontend (puerto 3000)
    ├── app/
    │   ├── layout.tsx
    │   ├── middleware.ts               ← RBAC de rutas Next.js
    │   ├── page.tsx                    ← Dashboard principal
    │   ├── (simulator)/
    │   │   └── page.tsx               ← Simulador principal
    │   ├── (patients)/
    │   │   ├── page.tsx               ← Lista de pacientes
    │   │   └── [id]/page.tsx          ← Expediente del paciente
    │   ├── (cases)/
    │   │   └── page.tsx               ← Banco de casos
    │   ├── (admin)/
    │   │   └── page.tsx               ← Panel de administración
    │   └── share/
    │       └── [token]/page.tsx        ← Vista pública Antes/Después
    ├── components/
    │   ├── simulator/
    │   │   ├── SimulatorCanvas.tsx     ← Canvas principal + watermark
    │   │   ├── HudOverlay.tsx          ← SVG ángulos en tiempo real
    │   │   ├── ControlPanel.tsx        ← Panel de sliders
    │   │   ├── ModeSwitch.tsx          ← Quirúrgico | Rinomodelación
    │   │   ├── AnnotationLayer.tsx     ← Pines quirúrgicos (SVG)
    │   │   ├── PresetButtons.tsx       ← Presets anatómicos
    │   │   ├── ImageUploader.tsx       ← Upload con preview
    │   │   └── ExportButton.tsx        ← Exportar a Cloudinary
    │   ├── patients/
    │   │   ├── PatientCard.tsx
    │   │   ├── PatientForm.tsx
    │   │   └── PatientList.tsx
    │   ├── share/
    │   │   ├── BeforeAfterView.tsx
    │   │   └── QRCodeDisplay.tsx
    │   ├── pdf/
    │   │   └── ReportTemplate.tsx
    │   └── ui/
    │       ├── Slider.tsx
    │       ├── Button.tsx
    │       └── Modal.tsx
    ├── lib/
    │   ├── canvas/
    │   │   ├── liquify.ts              ← Algoritmo inverse warp
    │   │   ├── liquify.worker.ts       ← Web Worker (off-main-thread)
    │   │   └── textureFilter.ts        ← Filtro anti-stretch
    │   └── api/
    │       ├── patients.ts             ← fetch helpers → backend
    │       ├── sessions.ts
    │       ├── share.ts
    │       └── imageProxy.ts
    ├── hooks/
    │   ├── useCanvas.ts
    │   ├── useLiquify.ts               ← gestiona Web Worker
    │   ├── useHud.ts                   ← cálculo ángulo nasolabial
    │   ├── useAnnotations.ts
    │   └── useImageUpload.ts
    └── types/
        └── index.ts
```

---

## 4. Mapa de Componentes — Simulador Principal

```
SimulatorPage (/simulator)
│
├── ImageUploader
│   └── FileReader → URL.createObjectURL() → HTMLImageElement
│
├── [Canvas Stack — position:relative]
│   ├── SimulatorCanvas (z-index: 1)
│   │   ├── drawImage() → sourceImageData (inmutable, en Worker)
│   │   ├── putImageData() ← processedImageData desde Worker
│   │   └── watermark overlay (renderizado en píxeles, no CSS)
│   ├── HudOverlay (z-index: 2, SVG transparent)
│   │   ├── Líneas vectoriales de referencia anatómica
│   │   └── Etiqueta: "Ángulo Nasolabial: 102°"
│   └── AnnotationLayer (z-index: 3, SVG transparent)
│       └── Pines numerados + modal de nota
│
├── ControlPanel
│   ├── ModeSwitch [Quirúrgico | Rinomodelación]
│   ├── Slider — Giba Nasal (-50 a +50px)
│   ├── Slider — Proyección de Punta (-30 a +30px)
│   ├── Slider — Rotación de Punta (-15° a +15°)
│   └── PresetButtons [Giba Prominente | Punta Caída | Nariz Silla]
│
└── ActionBar
    ├── ExportButton → Cloudinary → DB
    ├── ShareButton → genera token → QR
    └── PDFButton → reporte editorial
```

---

## 5. Liquify Engine — Matemáticas

### Algoritmo: Inverse Warp con Desplazamiento Ponderado

**Principio:** Mapeo inverso — por cada píxel destino `(x, y)`, calculamos de dónde vino en la imagen fuente. Evita huecos en la salida.

**Para cada punto de control `Cᵢ = (cx, cy, Δx, Δy, R)`:**

```
Función de peso (bi-cuadrática, C¹ continua):
  d  = √((x - cx)² + (y - cy)²)
  wᵢ = max(0, 1 - d²/R²)²

Múltiples puntos de control (acumulación):
  x_src = x - Σ(Δxᵢ · wᵢ)
  y_src = y - Σ(Δyᵢ · wᵢ)

Interpolación bilineal en (x_src, y_src) por canal RGBA:
  x₀ = ⌊x_src⌋,  x₁ = x₀ + 1
  y₀ = ⌊y_src⌋,  y₁ = y₀ + 1
  fx = x_src - x₀,  fy = y_src - y₀

  P = (1-fx)(1-fy)·P(x₀,y₀) + fx(1-fy)·P(x₁,y₀)
    + (1-fx)·fy·P(x₀,y₁)   + fx·fy·P(x₁,y₁)
```

### Puntos de Control — Rinoplastia

| Control | Posición anatómica | Slider | Eje | Radio |
|---------|-------------------|--------|-----|-------|
| Giba nasal | Dorso/puente | -50 a +50px | Y principal | 20% height |
| Proyección de punta | Tip nasal | -30 a +30px | Y | 15% height |
| Rotación de punta | Tip nasal | -15° a +15° | X+Y combinado | 15% height |

### HUD — Ángulo Nasolabial en Tiempo Real

```
θ_nasolabial = atan2(y_tip - y_base, x_tip - x_base) * (180/π)

Actualizado en cada frame después del warp.
Renderizado como SVG overlay (sin repintar píxeles del Canvas).
```

### Modo Rinomodelación — Restricción de Algoritmo

```
if (mode === 'rinomodelacion') {
  // Solo puntos anatómicos permitidos: radix, punta, ángulo nasofrontal
  // Δ negativos bloqueados en giba (no se puede limar tejido)
  Δy_giba = Math.max(0, sliderValue)
}
```

### Arquitectura de Rendimiento — Web Worker + OffscreenCanvas

```
Main Thread                           Web Worker
     │                                    │
     │── postMessage(                   ──│
     │     {sourceImageData,              │
     │      controlPoints, mode},         │
     │     [sourceImageData.data.buffer] )│  ← Transferable (sin copia)
     │                                    │
     │                              inverse_warp()
     │                              bilinear_interp()
     │                              texture_filter()  ← anti-stretch
     │                              apply_watermark() ← píxeles
     │                                    │
     │ ←── postMessage(processedData, ───│
     │       [processedData.data.buffer])│  ← Transferable (sin copia)
     │                                    │
  putImageData()                          │

Trigger: solo en onChange de slider (debounce 16ms)
Target: 60fps @ 1024×1024px
```

---

## 6. Flujo de Imágenes End-to-End

```
[UPLOAD]
  Usuario → <input type="file" accept="image/*">
  → FileReader / URL.createObjectURL()
  → HTMLImageElement.onload
  → POST /api/cloudinary/sign (backend firma, expira 60s)
  → PUT blob directo a Cloudinary (authenticated, EXIF stripped, UUID v4)
  → POST /api/patients/{id}/sessions (guarda cloudinaryPublicId en DB)

[RENDER EN SIMULADOR]
  GET /api/image-proxy/{resultId}        ← backend fetches de Cloudinary
  → drawImage() en Canvas (máx 800px)    ← mismo origen, sin taint
  → sourceImageData almacenada en Worker (nunca en DOM)

[DEFORMACIÓN EN TIEMPO REAL]
  Slider onChange
  → postMessage({sourceImageData, controlPoints}) → Worker
  → Worker: inverse_warp() + texture_filter() + watermark()
  → postMessage(processedImageData) → Main
  → putImageData() en Canvas visible

[EXPORTACIÓN]
  canvas.toBlob()
  → POST /api/cloudinary/sign (nueva firma)
  → PUT blob a Cloudinary (imagen final con watermark)
  → POST /api/patients/{id}/sessions/{sid}/results (sliderConfig + cloudinaryPublicId)
  → AuditLog: SIMULATION_EXPORTED

[SHARE]
  POST /api/share → genera UUID + HMAC-SHA256, expiración 48h
  → URL: /share/{token} → vista pública Before/After + logo clínica
  → QR code generado en cliente (librería qrcode)

[PDF]
  GET /api/pdf/{resultId}
  → Backend: fetch imagen de Cloudinary + datos DB
  → Genera PDF con @react-pdf/renderer
  → Incluye: Antes/Después, métricas, pines, firma digital
  → AuditLog: PDF_GENERATED
```

---

## 7. Base de Datos — Esquema Prisma Completo

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USUARIOS Y AUTH ──────────────────────────────────────────────────────────

model User {
  id               String   @id @default(cuid())
  email            String   @unique
  passwordHash     String
  role             Role     @default(SURGEON)
  clinicId         String?
  twoFactorSecret  String?
  twoFactorEnabled Boolean  @default(false)
  recoveryCodes    String[]
  auditLogs        AuditLog[]
  createdAt        DateTime @default(now())
}

enum Role { ADMIN SURGEON PATIENT }

// ─── EXPEDIENTES ──────────────────────────────────────────────────────────────

model Patient {
  id              String    @id @default(cuid())
  nombre          String
  email           String    @unique
  telefono        String?
  fechaNacimiento DateTime?
  clinicId        String?
  sessions        Session[]
  createdAt       DateTime  @default(now())
}

model Session {
  id            String             @id @default(cuid())
  patientId     String
  patient       Patient            @relation(fields: [patientId], references: [id])
  procedimiento String             @default("rinoplastia")
  modo          String             @default("quirurgico")
  fecha         DateTime           @default(now())
  notas         String?
  results       SimulationResult[]
}

model SimulationResult {
  id                 String              @id @default(cuid())
  sessionId          String
  session            Session             @relation(fields: [sessionId], references: [id])
  cloudinaryPublicId String
  cloudinaryUrl      String
  sliderConfig       Json
  angulos            Json?
  pins               AnnotationPin[]
  shareToken         String?             @unique
  shareExpiresAt     DateTime?
  firma              ConsentimientoFirma?
  createdAt          DateTime            @default(now())
}

model AnnotationPin {
  id                 String           @id @default(cuid())
  simulationResultId String
  simulationResult   SimulationResult @relation(fields: [simulationResultId], references: [id])
  x                  Float
  y                  Float
  numero             Int
  nota               String
  createdAt          DateTime         @default(now())
}

model Preset {
  id           String   @id @default(cuid())
  nombre       String
  descripcion  String?
  sliderConfig Json
  createdAt    DateTime @default(now())
}

model ConsentimientoFirma {
  id                 String           @id @default(cuid())
  simulationResultId String           @unique
  simulationResult   SimulationResult @relation(fields: [simulationResultId], references: [id])
  firmadoAt          DateTime
  ipAddress          String?
  signatureDataUrl   String
}

// ─── AUDIT LOG INMUTABLE ──────────────────────────────────────────────────────

model AuditLog {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  action     AuditAction
  resource   String
  resourceId String
  metadata   Json?
  ipAddress  String
  userAgent  String?
  createdAt  DateTime    @default(now())

  @@index([userId])
  @@index([resourceId])
  @@index([createdAt])
}

enum AuditAction {
  PATIENT_VIEWED   PATIENT_CREATED   PATIENT_UPDATED   PATIENT_DELETED
  SESSION_CREATED  SIMULATION_VIEWED SIMULATION_EXPORTED
  IMAGE_UPLOADED   IMAGE_DELIVERED   IMAGE_PROXY_ACCESSED
  SHARE_CREATED    SHARE_ACCESSED
  PDF_GENERATED
  LOGIN_SUCCESS    LOGIN_FAILED
  TWO_FACTOR_SUCCESS  TWO_FACTOR_FAILED
}
```

**sliderConfig (JSONB):**
```json
{
  "giba":        { "value": -20, "controlPoint": {"x": 240, "y": 180}, "radius": 80 },
  "proyeccion":  { "value": 15,  "controlPoint": {"x": 248, "y": 310}, "radius": 60 },
  "rotacion":    { "value": -5,  "controlPoint": {"x": 248, "y": 310}, "radius": 60 }
}
```

---

## 8. API Routes — Backend Express

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Público | Login + 2FA |
| POST | `/api/auth/2fa/setup` | SURGEON | Setup TOTP |
| POST | `/api/auth/2fa/verify` | SURGEON | Verificar TOTP |
| GET | `/api/patients` | SURGEON+ | Lista de pacientes |
| POST | `/api/patients` | SURGEON+ | Crear paciente |
| GET | `/api/patients/:id` | SURGEON+ | Expediente |
| PUT | `/api/patients/:id` | SURGEON+ | Actualizar |
| DELETE | `/api/patients/:id` | ADMIN | Eliminar |
| POST | `/api/patients/:id/sessions` | SURGEON+ | Crear sesión |
| POST | `/api/sessions/:id/results` | SURGEON+ | Guardar simulación |
| POST | `/api/results/:id/pins` | SURGEON+ | Agregar pin |
| POST | `/api/cloudinary/sign` | SURGEON+ | Firmar upload |
| GET | `/api/image-proxy/:resultId` | SURGEON+ | Proxy imagen |
| POST | `/api/share` | SURGEON+ | Generar share token |
| GET | `/api/share/:token` | Público | Validar + datos |
| GET | `/api/pdf/:resultId` | SURGEON+ | Generar PDF |
| GET | `/api/presets` | SURGEON+ | Lista presets |
| GET | `/api/cases/search` | SURGEON+ | Banco de casos |
| GET | `/api/admin/audit-logs` | ADMIN | Ver logs |

---

## 9. Variables de Entorno

```env
# backend/.env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx          # NUNCA exponer al cliente
SHARE_TOKEN_SECRET=xxx             # 256-bit aleatorio
AUTH_SECRET=xxx                    # 256-bit aleatorio para JWT
PORT=4000
FRONTEND_URL=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
AUTH_SECRET=xxx                    # mismo valor que backend
```

---

## 10. Roadmap Técnico (8 Semanas)

### Fase 1 — Fundamentos (Sem 1-2)
- [ ] Express.js + TypeScript en `backend/`
- [ ] PostgreSQL + Prisma schema completo + `prisma migrate dev`
- [ ] PostgreSQL Rules de inmutabilidad en AuditLog
- [ ] CRUD Patients, Sessions, SimulationResult
- [ ] Auth: login, bcrypt, JWT, 2FA TOTP mandatorio para SURGEON
- [ ] CORS + Helmet + Rate Limiter base

### Fase 2 — Canvas Engine (Sem 3-4)
- [ ] `liquify.ts` — inverse warp + interpolación bilineal
- [ ] `liquify.worker.ts` — Web Worker con OffscreenCanvas
- [ ] `textureFilter.ts` — kernel anti-stretch 5×5
- [ ] Hook `useLiquify` con modo Quirúrgico/Rinomodelación
- [ ] `SimulatorCanvas` + watermark dinámico en píxeles
- [ ] `ControlPanel` — 3 sliders + `PresetButtons`
- [ ] `HudOverlay` — SVG ángulo nasolabial en tiempo real
- [ ] `ModeSwitch` — bloqueo de Δ negativos en rinomodelación
- [ ] Pruebas de rendimiento: target 60fps @ 1024px

### Fase 3 — Upload, Proxy y Anotaciones (Sem 5)
- [ ] `imageProxy.ts` — backend proxy Cloudinary authenticated
- [ ] `ImageUploader` con preview + Cloudinary signed upload
- [ ] `AnnotationLayer` — pines SVG + modal de notas
- [ ] `ExportButton` — toBlob → Cloudinary → DB
- [ ] Audit middleware automático en Express

### Fase 4 — Share, PDF y Banco de Casos (Sem 6-7)
- [ ] Share token: HMAC-SHA256 + 48h expiry
- [ ] `/share/[token]` — vista pública Before/After + logo clínica
- [ ] QR code (`qrcode` library)
- [ ] PDF editorial con `@react-pdf/renderer` — métricas + pines + firma
- [ ] `ConsentimientoFirma` — firma digital del paciente
- [ ] Banco de casos: GIN index en sliderConfig + search endpoint
- [ ] Auth.js v5 en Next.js + middleware RBAC de rutas

### Fase 5 — UI/UX Médico Final + Deploy (Sem 8)
- [ ] Diseño profesional (Tailwind — paleta clínica premium)
- [ ] Módulo de pacientes completo con historial de sesiones
- [ ] Panel de administración + visor de audit logs
- [ ] Deploy: Vercel (frontend) + Railway (Express + PostgreSQL)
- [ ] Variables de entorno en producción
- [ ] Tests E2E del flujo completo

---

## 11. Decisiones Técnicas (ADR)

| Decisión | Elegido | Alternativa descartada | Razón |
|----------|---------|----------------------|-------|
| DB | PostgreSQL + Prisma | MongoDB | ACID, FK, JSONB+GIN, compliance médico |
| Canvas engine | Web Worker + OffscreenCanvas | WebGL | Balance complejidad/rendimiento para MVP |
| Warp algorithm | Inverse Warp Bi-cuadrático | Forward mapping | Evita huecos, C¹ continuo |
| HUD overlay | SVG superpuesto | Canvas 2D | Vectorial, sin repintar píxeles |
| Watermark | Píxeles en Canvas | Overlay CSS | No removible con DevTools |
| Image delivery | Backend proxy | URL directa Cloudinary | Sin tainted canvas, seguridad total |
| PDF | @react-pdf/renderer | jsPDF | Calidad editorial, soporte imágenes |
| Share tokens | UUID + HMAC-SHA256 | JWT | Stateless, expiración simple |
| Anti-stretch | Kernel convolución 5×5 | Sin filtro | UX fotorrealista |
| Backend | Express.js separado | Next.js API Routes | Desacoplado, escalable, RBAC propio |
| Auth | Auth.js v5 | Passport.js | Integración nativa Next.js, sesiones cifradas |

---

*Ver [SECURITY.md](./SECURITY.md) para la arquitectura de seguridad completa.*
