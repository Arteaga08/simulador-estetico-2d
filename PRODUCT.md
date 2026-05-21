# PRODUCT.md — LuminaMD

## Qué es

LuminaMD es un SaaS B2B de visualización quirúrgica que permite a cirujanos plásticos y médicos estéticos mostrar en tiempo real el resultado estimado de múltiples procedimientos estéticos faciales sobre la foto real del paciente.

El médico selecciona uno o varios procedimientos, ajusta sliders que deforman la imagen mediante un motor matemático (Liquify Engine), visualiza métricas en un HUD médico, anota sobre la simulación con pines quirúrgicos, y exporta el resultado al expediente digital del paciente.

## Usuarios

| Tipo | Rol |
|------|-----|
| Cirujano plástico / médico estético | Usuario principal — opera el simulador en consulta |
| Paciente | Usuario pasivo — visualiza el resultado vía share link |
| Admin de clínica | Gestiona usuarios, ve audit logs |

## Dos superficies

1. **Landing page pública** (`/`) — convierte cirujanos en usuarios de pago. Incluye demo interactiva, precios y prueba social. Estética: minimalismo clínico-premium.
2. **App privada (autenticada)** — simulador 2D en tiempo real, gestión de pacientes, historial de sesiones, exportación.

## Rutas de la app

| Ruta | Descripción |
|------|-------------|
| `/simulator` | Canvas + sliders + HUD + anotaciones |
| `/patients` | Lista y expedientes de pacientes |
| `/cases` | Banco de casos (historial de simulaciones) |
| `/admin` | Dashboard de administración + audit logs |
| `/share/[token]` | Vista pública before/after (expira 48h) |

## Procedimientos soportados

El simulador soporta selección múltiple simultánea — cada procedimiento activo abre un tab independiente en el panel de sliders:

| # | Procedimiento | Técnicas disponibles |
|---|---------------|----------------------|
| 1 | Rinoplastia | Quirúrgico · Rinomodelación · Endoscópico |
| 2 | Lifting de cejas | — |
| 3 | Aumento de mentón | — |
| 4 | Aumento de labios | — |
| 5 | Lifting de cuello | — |
| 6 | Blefaroplastia | — |
| 7 | Suavizado de piel | — |
| 8 | Feminización facial | — |

> La técnica seleccionada limita los deltas disponibles en los sliders (ej. Rinomodelación restringe valores negativos en giba — no puede "eliminar tejido").

---

## Funcionalidades clave

- Deformación de imagen en tiempo real (60fps) con Inverse Warp Bi-cuadrático en Web Worker
- Multi-procedimiento con tabs: el médico puede combinar varios procedimientos en la misma sesión
- HUD con ángulo nasolabial calculado en tiempo real (SVG overlay)
- Anotaciones quirúrgicas: pines numerados con notas
- Upload seguro a Cloudinary (EXIF stripped, URLs firmadas)
- Exportación: imagen con watermark → Cloudinary → BD
- Share link con QR (48h, HMAC-SHA256)
- Reporte PDF editorial con métricas, pines y firma digital del paciente
- Consentimiento informado digital
- 2FA mandatorio para cirujanos
- Audit log inmutable de todas las acciones

## Stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Express.js · PostgreSQL · Prisma · Cloudinary · Auth.js v5

## Tono del producto

Clínico, premium y confiable. Referencia visual: Palladio Group. Referencia de contenido: FaceTouchUp. Sin gradientes en texto ni en botones, máxima legibilidad.
