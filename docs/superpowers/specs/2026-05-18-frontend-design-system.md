# Design System — SimEstético Frontend
**Fecha:** 2026-05-18  
**Tipo:** Frontend Design Spec  
**Estado:** Aprobado — listo para implementación

---

## Contexto

SimEstético es un SaaS B2B dirigido a cirujanos y clínicas de estética facial. El producto tiene dos partes:

1. **Landing page pública** — convierte cirujanos en usuarios de pago. Incluye demo interactiva, precios y prueba social.
2. **App privada (autenticada)** — simulador 2D en tiempo real, gestión de pacientes, historial de sesiones y exportación.

El diseño sigue la estética de **minimalismo clínico-premium** (referencia: Palladio Group), adaptada a las necesidades de contenido de un SaaS B2B (referencia de contenido: FaceTouchUp).

---

## 1. Paleta de Color

### Tokens de marca

| Token | Valor | Uso |
|---|---|---|
| `gradient-primary` | `linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)` | Heroes, navbar, badges, sliders activos |
| `blue-400` | `#4FACFE` | Acentos, labels, iconos activos |
| `indigo-400` | `#667EEA` | Botón primario, focus rings |
| `indigo-700` | `#4338CA` | Hover de botón primario |
| `indigo-100` | `#E0E7FF` | Botón secundario background |
| `indigo-50` | `#EEF2FF` | Badge background, chip background |

### Regla del gradiente (crítica)
- ✅ Fondos de secciones hero / navbar / banners
- ✅ Badges de estado (pequeños elementos gráficos)
- ✅ Barras de progreso y sliders activos
- ✅ Iconos decorativos e ilustraciones
- ❌ **Nunca en texto** (siempre color sólido)
- ❌ **Nunca en botones** (siempre color sólido)
- ❌ **Nunca en logos con texto**

### Neutrales

| Token | Valor | Uso |
|---|---|---|
| `text-primary` | `#1E1B4B` | Títulos, texto principal |
| `text-secondary` | `#374151` | Cuerpo de texto |
| `text-muted` | `#6B7280` | Subtítulos, descripciones |
| `text-placeholder` | `#94A3B8` | Placeholders, captions |
| `border` | `#E9D5FF` | Bordes de cards, divisores |
| `bg-page` | `#F5F3FF` | Fondo general de la app |
| `bg-surface-alt` | `#FAFAF9` | Secciones alternas landing |
| `bg-surface` | `#FFFFFF` | Cards, modales, navbar blanca |

### Semánticos

| Token | Valor | Light bg |
|---|---|---|
| `success` | `#22C55E` | `#DCFCE7` |
| `error` | `#EF4444` | `#FEE2E2` |
| `warning` | `#F59E0B` | `#FEF9C3` |

---

## 2. Tipografía

**Fuente:** Inter (Google Fonts)  
**Modo:** Light mode únicamente

| Nombre | Tamaño | Peso | Letter-spacing | Line-height | Uso |
|---|---|---|---|---|---|
| `display` | 56px | 800 | -0.03em | 1.05 | Hero principal landing |
| `h1` | 44px | 800 | -0.025em | 1.1 | Títulos de sección hero |
| `h2` | 32px | 800 | -0.02em | 1.2 | Títulos de sección |
| `h3` | 22px | 700 | -0.015em | 1.3 | Subtítulos de sección |
| `h4` | 17px | 700 | -0.01em | 1.4 | Títulos de card |
| `body-lg` | 16px | 400 | 0 | 1.7 | Cuerpo principal landing |
| `body-md` | 14px | 400 | 0 | 1.65 | Cuerpo general app |
| `body-sm` | 13px | 400 | 0 | 1.6 | Texto secundario, FAQs |
| `label` | 11px | 700 | 0.08em | — | Section labels uppercase |
| `caption` | 11px | 400 | 0 | — | Metadata, timestamps |

---

## 3. Espaciado

Base: **4px**. Escala multiplicativa.

| Token | Valor | Usos comunes |
|---|---|---|
| `xs` | 4px | Gap entre iconos e inline text |
| `sm` | 8px | Gap entre elementos inline |
| `md` | 12px | Padding interno botones sm |
| `lg` | 16px | Gap entre cards, padding interno |
| `xl` | 20px | Gap entre cards en grid |
| `2xl` | 24px | Padding interno de cards |
| `3xl` | 32px | Margin entre grupos |
| `4xl` | 40px | Padding sección stats |
| `5xl` | 48px | Padding horizontal contenedor |
| `6xl` | 64px | Gap columnas hero |
| `7xl` | 80px | Padding vertical secciones landing |
| `8xl` | 96px | Padding hero principal |

**Contenedor máximo:** 1100px  
**Padding horizontal contenedor:** 48px

---

## 4. Border Radius

| Token | Valor | Uso |
|---|---|---|
| `xs` | 4px | Tags inline |
| `sm` | 6px | Badges / pills pequeñas |
| `md` | 8px | Botones small |
| `lg` | 10px | Botones medium |
| `xl` | 12px | Inputs, botones large |
| `2xl` | 14px | Cards |
| `3xl` | 16px | Modales, panels |
| `4xl` | 20px | Hero visual, imágenes grandes |
| `full` | 9999px | Pills de badge, avatares |

---

## 5. Sombras

| Token | Valor | Uso |
|---|---|---|
| `shadow-xs` | `0 1px 3px rgba(0,0,0,0.06)` | Elementos muy sutiles |
| `shadow-sm` | `0 2px 8px rgba(0,0,0,0.08)` | Cards en reposo |
| `shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Cards estándar |
| `shadow-lg` | `0 8px 28px rgba(0,0,0,0.10)` | Cards en hover |
| `shadow-xl` | `0 16px 48px rgba(0,0,0,0.12)` | Modales, drawers |
| `shadow-brand` | `0 8px 40px rgba(102,126,234,0.20)` | CTAs, hero visual |

---

## 6. Iconografía

**Librería:** [Phosphor Icons](https://phosphoricons.com/)  
**Paquete:** `@phosphor-icons/react`  
**Variante por defecto:** Regular  
**Variante para acción/énfasis:** Fill  
**Variante para UI chrome:** Duotone (sparingly)  
**Tamaños:** 16px (inline), 20px (botones), 24px (standalone), 32px (feature cards)

---

## 7. Componentes UI

### Navbar
- **Landing:** Gradient (#4FACFE → #667EEA), logo blanco, links blancos semitransparentes, botón CTA blanco sólido
- **App (autenticada):** Sidebar oscura (#1E1B4B), logo blanco con acento #4FACFE

### Botones

| Variante | Background | Color texto | Uso |
|---|---|---|---|
| `primary` | `#667EEA` | white | Acción principal |
| `secondary` | `#E0E7FF` | `#4338CA` | Acción secundaria |
| `outline` | transparent | `#667EEA` | Acción alternativa |
| `ghost` | transparent | `#667EEA` | Acciones de navegación |
| `danger` | `#FEE2E2` | `#DC2626` | Destructivas |
| `white` | white | `#667EEA` | Sobre fondos de gradiente |

### Inputs
- Border por defecto: `1.5px solid #E9D5FF`
- Border focus: `1.5px solid #667EEA` + `box-shadow: 0 0 0 3px rgba(102,126,234,0.12)`
- Border error: `1.5px solid #EF4444`
- Border radius: `xl` (12px)
- Font size: 14px (body-md)

### Badges de estado
- Activo → `gradient-primary` bg, white text
- Pendiente → `indigo-50` bg, `indigo-700` text
- Completado → `#DCFCE7` bg, `#16A34A` text
- En revisión → `#FEF9C3` bg, `#CA8A04` text
- Cancelado → `#FEE2E2` bg, `#DC2626` text

---

## 8. Arquitectura de la Landing Page

Secciones en orden:

| # | Sección | Objetivo |
|---|---|---|
| 1 | **Hero** | Propuesta de valor + CTA principal + visual del simulador |
| 2 | **Logos / Prueba social** | Clínicas y cirujanos que ya lo usan |
| 3 | **Stats** | 4 métricas clave (procedimientos, fps, privacidad, share) |
| 4 | **Características (01)** | 6 features con Phosphor icons |
| 5 | **Cómo funciona (02)** | 4 pasos numerados estilo Palladio |
| 6 | **Evidencia científica (03)** | 2 estadísticas de estudios reales |
| 7 | **Precios (04)** | 3 planes: Starter $99/mo, Pro $199/mo, Enterprise |
| 8 | **Testimonios (05)** | 3 cirujanos con nombre, especialidad y cita |
| 9 | **FAQ (06)** | 6 preguntas en grid 2 columnas |
| 10 | **CTA Final** | Gradient bg, 2 botones, texto de reducción de fricción |
| 11 | **Footer** | 4 columnas: logo+desc, Producto, Legal, Contacto |

### Estilo visual landing
- Secciones numeradas con label `01 —` en azul (estilo Palladio)
- CTAs con flecha `→` (estilo Palladio)
- Máximo contraste texto: siempre sólido
- Fondo alterno entre `bg-surface` (white) y `bg-surface-alt` (#FAFAF9)

---

## 9. Arquitectura de la App Privada

### Layout
- **Sidebar izquierda:** 220px, bg `#1E1B4B` (oscuro)
  - Logo blanco con acento blue-400
  - Nav items: color `rgba(255,255,255,0.55)`, activo: `rgba(79,172,254,0.15)` + texto `#4FACFE`
- **Contenido principal:** bg `#FAFAF9`

### Rutas principales
- `/simulator` — Canvas + sliders + HUD + anotaciones
- `/patients` — Lista y expedientes de pacientes
- `/cases` — Banco de casos (historial)
- `/admin` — Dashboard de administración
- `/share/[token]` — Vista pública before/after (48h)

---

## 10. Verificación

- [ ] Abrir landing en Chrome: todas las secciones visibles, ningún texto con gradiente
- [ ] Verificar contraste navbar: logo blanco legible sobre gradient
- [ ] Revisar botones: ninguno usa gradiente como background
- [ ] Inter cargada desde Google Fonts (o bundle local con `next/font`)
- [ ] Phosphor Icons importados desde `@phosphor-icons/react`
- [ ] Spacing consistente: múltiplos de 4px en DevTools
- [ ] Mobile responsive: contenedor 48px padding colapsado a 16px en mobile
