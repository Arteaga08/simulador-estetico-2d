# SECURITY.md — Arquitectura de Máxima Seguridad
## Simulador Estético Quirúrgico 2D | Datos Médicos Sensibles

> Última actualización: 2026-05-18
> Nivel de protección: Datos médicos de identidad (fotografías clínicas + expedientes)

---

## Resumen de Pilares

| Pilar | Tecnología | Estado |
|-------|-----------|--------|
| 1. Autenticación + RBAC | Auth.js v5, bcrypt, TOTP 2FA | Diseñado |
| 2. Imágenes Cloudinary | Signed URLs, Authenticated delivery, UUID, EXIF strip | Diseñado |
| 3. API + Validación | Zod, express-rate-limit, helmet, CSP | Diseñado |
| 4. Canvas Client-Side | Watermark en píxeles, Image Proxy, sin DOM exposure | Diseñado |
| 5. Audit Logs Inmutables | PostgreSQL Rules, append-only, compliance | Diseñado |

---

## PILAR 1 — Autenticación y Control de Acceso (RBAC)

### Roles del Sistema

| Rol | Acceso |
|-----|--------|
| `ADMIN` | Todo — usuarios, clínica, audit logs, configuración |
| `SURGEON` | Pacientes propios, simulador, expedientes, PDF, share |
| `PATIENT` | Solo su simulación vía token efímero (sin login) |

### Esquema de Usuario (Prisma)

```prisma
model User {
  id               String   @id @default(cuid())
  email            String   @unique
  passwordHash     String                    // bcrypt, cost factor 12
  role             Role     @default(SURGEON)
  clinicId         String?
  twoFactorSecret  String?                  // TOTP encriptado en DB (AES-256)
  twoFactorEnabled Boolean  @default(false)
  recoveryCodes    String[]                 // 8 códigos, hash bcrypt, uso único
  auditLogs        AuditLog[]
  createdAt        DateTime @default(now())
}

enum Role { ADMIN SURGEON PATIENT }
```

### Flujo de Autenticación — SURGEON (2FA Mandatorio)

```
1. POST /api/auth/login
   → Verificar email + bcrypt.compare(password, passwordHash)
   → Si twoFactorEnabled = false → forzar setup TOTP antes de continuar
   → Si twoFactorEnabled = true  → solicitar código TOTP de 6 dígitos

2. Setup TOTP (primer login):
   → Generar secret con @otplib/preset-totp
   → Cifrar secret con AES-256 antes de guardar en DB
   → Devolver QR code al frontend (Google Authenticator / Authy)
   → Pedir verificación del código antes de activar

3. Verificación TOTP:
   → totp.verify({ token: code, secret: decrypted_secret })
   → Ventana: 30 segundos + 1 período de gracia
   → En éxito: emitir JWT cifrado con AUTH_SECRET

4. Sesión JWT:
   → httpOnly: true, secure: true, sameSite: 'strict'
   → Expiración: 8 horas (jornada médica)
   → Renovación automática en cada request activo
   → Rotación de token al elevar privilegios
```

### Códigos de Recuperación

- 8 códigos de 16 caracteres generados en setup
- Almacenados como hash bcrypt (uso único — se marcan como usados)
- Mostrados al usuario una sola vez (no recuperables)

### Middleware de Rutas — Next.js (`middleware.ts`)

```
Ruta                  → Rol requerido
/simulator            → SURGEON, ADMIN
/patients/*           → SURGEON, ADMIN
/cases                → SURGEON, ADMIN
/admin/*              → ADMIN
/share/[token]        → Público (token-gated, sin sesión)
/api/*                → Verificado por Express según endpoint
```

### Middleware de Rutas — Express (`rbac.ts`)

```ts
requireRole('SURGEON')  // → verifica JWT + role en cada request
requireRole('ADMIN')
requireShareToken()     // → valida HMAC + expiración sin sesión
```

---

## PILAR 2 — Seguridad de Imágenes en Cloudinary

### Flujo de Upload Firmado (API_SECRET nunca sale del servidor)

```
Cliente
  → POST /api/cloudinary/sign
      Body: { folder, filename_override }

Backend
  → Genera public_id = "patients/{patientId}/{uuidv4()}"  ← UUID v4 obligatorio
  → params = { folder, public_id, timestamp, upload_preset: "medical_private" }
  → signature = sha1(sorted_params + CLOUDINARY_API_SECRET)
  → Retorna: { signature, timestamp, apiKey, cloudName }
  → Firma expira en 60 segundos

Cliente
  → PUT multipart/form-data a Cloudinary con la firma
  → Cloudinary verifica firma antes de aceptar
  → Si éxito: retorna { public_id, secure_url }

Cliente
  → POST /api/sessions/{id}/results
      Body: { cloudinaryPublicId, sliderConfig }
  → Backend guarda en DB
```

### Naming — Desvinculación Identidad / Archivo

```
public_id = "patients/{patientId}/{uuid_v4}"

Ejemplo: "patients/clx9abc123/f47ac10b-58cc-4372-a567-0e02b2c3d479"

El nombre del paciente JAMÁS aparece en la ruta del archivo.
Solo la DB vincula el public_id con el paciente (relación Patient→Session→SimulationResult).
```

### EXIF Stripping — Configuración Cloudinary

```json
Upload Preset "medical_private" (configurado en Cloudinary Dashboard):
{
  "type": "authenticated",
  "access_mode": "authenticated",
  "exif": false,
  "image_metadata": false,
  "metadata": false,
  "unique_filename": true,
  "overwrite": false
}
```

Esto elimina: geolocalización GPS, datos de cámara, fecha de captura, software usado.

### Entrega Authenticated — URLs Firmadas con Expiración

```
Assets tipo "authenticated" en Cloudinary:
  → URL directa NO CARGA (Cloudinary rechaza sin firma)
  → Solo el backend puede generar URLs de entrega válidas

Backend genera signed delivery URL (expira en 5 minutos):
  cloudinary.url(public_id, {
    type: 'authenticated',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 300
  })

El cliente NUNCA recibe esta URL directamente.
```

### Image Proxy — Backend como Intermediario

```
Cliente solicita imagen:
  GET /api/image-proxy/{resultId}
  → Backend verifica sesión + permisos del SURGEON
  → Backend genera signed delivery URL (5 min)
  → Backend hace fetch a Cloudinary con la URL
  → Backend hace stream de la respuesta al cliente
  → Cliente recibe imagen desde nuestro dominio (mismo origen)

Beneficios:
  1. Canvas carga imagen de mismo origen → sin tainted canvas
  2. La URL de Cloudinary nunca llega al navegador
  3. Audit log: IMAGE_PROXY_ACCESSED por userId + resourceId
```

---

## PILAR 3 — Blindaje de API y Validación

### Validación con Zod (todos los endpoints)

```ts
// POST /api/patients
const createPatientSchema = z.object({
  nombre:          z.string().min(1).max(100).trim(),
  email:           z.string().email().toLowerCase(),
  telefono:        z.string().regex(/^\+?[0-9]{7,15}$/).optional(),
  fechaNacimiento: z.string().datetime().optional()
})

// Uso en route handler:
const parsed = createPatientSchema.safeParse(req.body)
if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
// Nunca exponer el error de Zod al cliente en producción (revela schema)
```

### Rate Limiting — express-rate-limit

| Endpoint | Límite | Ventana | Razón |
|----------|--------|---------|-------|
| `POST /api/auth/login` | 5 req | 15 min / IP | Anti-brute force |
| `POST /api/auth/2fa/verify` | 5 req | 15 min / usuario | Anti-brute force TOTP |
| `POST /api/cloudinary/sign` | 10 req | 1 min / usuario | Anti-abuse storage |
| `GET /api/image-proxy/*` | 60 req | 1 min / usuario | Anti-scraping |
| `GET /api/patients/*` | 100 req | 1 min / usuario | Normal usage |
| `GET /api/share/*` | 30 req | 1 min / IP | Anti-enumeration |

En exceso: respuesta `429 Too Many Requests` con `Retry-After` header.

### CSRF

- SameSite=Strict en cookies → protección CSRF nativa en todos los navegadores modernos
- Double Submit Cookie en endpoints críticos:
  - `POST /api/pdf/{id}` (genera reporte)
  - `DELETE /api/patients/{id}` (eliminar expediente)
  - `POST /api/share` (generar link de paciente)

### Secure Headers

**Next.js `next.config.ts`:**
```ts
headers: [
  {
    source: '/(.*)',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "img-src 'self' blob: data:",          // sin *.cloudinary.com (proxy)
          "connect-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",    // Tailwind requiere esto
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
        ].join('; ')
      },
      { key: 'X-Frame-Options',           value: 'DENY' },
      { key: 'X-Content-Type-Options',    value: 'nosniff' },
      { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
    ]
  }
]
```

**Express (`helmet`):**
```ts
app.use(helmet())  // Aplica todos los headers seguros por defecto
app.use(helmet.contentSecurityPolicy({ directives: { ... } }))
```

---

## PILAR 4 — Seguridad del HTML5 Canvas

### Prevención de Descarga de Imagen Original

| Técnica | Implementación |
|---------|---------------|
| No exponer en DOM | `drawImage()` directo al Canvas, sin tag `<img>` en HTML |
| Resolución limitada | Canvas renderizado máx 800px — original full-res solo en Worker |
| Fuera del DOM | `sourceImageData` vive en memoria del Web Worker (no en main thread) |
| Sin contextmenu | `canvas.addEventListener('contextmenu', e => e.preventDefault())` |
| CSS anti-drag | `user-select: none; -webkit-user-drag: none; pointer-events: auto` |
| Image Proxy | La URL de Cloudinary nunca llega al navegador |

### Marcas de Agua Dinámicas (en Píxeles — No CSS)

```ts
// Renderizado en el Web Worker DESPUÉS del inverse_warp, ANTES del retorno:
function applyWatermark(ctx, clinicName, date) {
  ctx.save()
  ctx.globalAlpha = 0.20
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px Arial'
  ctx.translate(canvasWidth/2, canvasHeight/2)
  ctx.rotate(-Math.PI / 4)

  const text = `SIMULACIÓN · ${clinicName} · ${date}`
  const step = 120

  for (let x = -canvasWidth; x < canvasWidth; x += step) {
    for (let y = -canvasHeight; y < canvasHeight; y += step) {
      ctx.fillText(text, x, y)
    }
  }
  ctx.restore()
}
```

**Esto significa:**
- La marca de agua es píxeles reales en el ImageData
- No es un overlay CSS — no se puede remover con DevTools
- La imagen exportada a Cloudinary también lleva la marca de agua
- La imagen en el share link también la tiene

### Tainted Canvas — Mitigado por Image Proxy

```
Sin Image Proxy (problemático):
  fetch('https://res.cloudinary.com/...')  ← CORS diferente origen
  → Canvas se "tainta"
  → canvas.toBlob() lanza SecurityError

Con Image Proxy (nuestra solución):
  fetch('https://nuestro-dominio.com/api/image-proxy/xyz')  ← mismo origen
  → Canvas NO se tainta
  → canvas.toBlob() funciona correctamente
  → toDataURL() funciona correctamente
```

---

## PILAR 5 — Audit Log Inmutable (Compliance)

### Esquema

```prisma
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
  PATIENT_VIEWED     PATIENT_CREATED    PATIENT_UPDATED   PATIENT_DELETED
  SESSION_CREATED    SIMULATION_VIEWED  SIMULATION_EXPORTED
  IMAGE_UPLOADED     IMAGE_DELIVERED    IMAGE_PROXY_ACCESSED
  SHARE_CREATED      SHARE_ACCESSED
  PDF_GENERATED
  LOGIN_SUCCESS      LOGIN_FAILED
  TWO_FACTOR_SUCCESS TWO_FACTOR_FAILED
}
```

### Inmutabilidad a Nivel de Base de Datos

```sql
-- Ejecutar post-migrate (en migration SQL o seed):

-- Prevenir UPDATE en AuditLog
CREATE RULE no_update_audit_log
  AS ON UPDATE TO "AuditLog"
  DO INSTEAD NOTHING;

-- Prevenir DELETE en AuditLog
CREATE RULE no_delete_audit_log
  AS ON DELETE TO "AuditLog"
  DO INSTEAD NOTHING;

-- Permisos del usuario de aplicación:
GRANT INSERT, SELECT ON "AuditLog" TO app_user;
-- Sin UPDATE, sin DELETE
```

### Middleware de Auditoría Automático (Express)

```ts
// middleware/audit.ts
export function auditMiddleware(action: AuditAction, resource: string) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode < 400) {
        const resourceId = req.params.id || body?.id || 'unknown'
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            resource,
            resourceId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          }
        }).catch(console.error)  // no bloquea la respuesta
      }
      return originalJson(body)
    }
    next()
  }
}

// Uso:
router.get('/patients/:id', requireRole('SURGEON'),
  auditMiddleware('PATIENT_VIEWED', 'patient'),
  getPatientHandler
)
```

### Qué se Registra

| Quién | userId del SURGEON o ADMIN autenticado |
|-------|---------------------------------------|
| Qué | AuditAction enum |
| Cuándo | createdAt (UTC) — inmutable |
| Recurso | resource + resourceId |
| Desde dónde | ipAddress (X-Forwarded-For en producción) |
| Contexto | metadata JSON (ej: sliderConfig exportado, token usado) |

---

## Checklist de Seguridad — Pre-Deploy

- [ ] `CLOUDINARY_API_SECRET` solo en variables de entorno del servidor
- [ ] `AUTH_SECRET` y `SHARE_TOKEN_SECRET` son strings de 256-bit aleatorios
- [ ] `DATABASE_URL` sin credenciales en código fuente
- [ ] Cloudinary upload preset configurado como `authenticated`
- [ ] PostgreSQL Rules de inmutabilidad aplicadas en AuditLog
- [ ] Rate limiting activo en todos los endpoints sensibles
- [ ] CSP headers verificados con [securityheaders.com](https://securityheaders.com)
- [ ] TOTP 2FA probado con Google Authenticator + Authy
- [ ] Image proxy sirve imagen sin URL de Cloudinary en cliente
- [ ] Canvas watermark aparece en imagen exportada (inspeccionar píxeles)
- [ ] Share link expira correctamente a las 48h
- [ ] Audit log registra todos los eventos (verificar en panel admin)
- [ ] UPDATE y DELETE en AuditLog son ignorados (probar directamente en DB)
- [ ] HTTPS forzado en producción (Vercel lo aplica automáticamente)
- [ ] `Strict-Transport-Security` header presente

---

*Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para la arquitectura técnica completa del sistema.*
